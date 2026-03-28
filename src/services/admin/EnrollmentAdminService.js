const crypto = require('crypto');
const { Op } = require('sequelize');
const { Enrollment, Course } = require('../../models');
const { parseMoneyValue } = require('../../utils/money');

function buildCertificateCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase().match(/.{1,4}/g).join('-');
}

function buildCertificateJson(enrollment, course, verificationCode) {
  return {
    studentName: enrollment.studentName,
    courseTitle: course.title,
    workload: course.workload,
    completionDate: new Date().toLocaleDateString('pt-BR'),
    verificationCode
  };
}

class EnrollmentAdminService {
  buildAdminFilters(search) {
    const normalizedSearch = typeof search === 'string' ? search.trim() : '';
    const where = {};

    if (normalizedSearch) {
      where[Op.or] = [
        { studentName: { [Op.like]: `%${normalizedSearch}%` } },
        { studentEmail: { [Op.like]: `%${normalizedSearch}%` } },
        { '$Course.title$': { [Op.like]: `%${normalizedSearch}%` } }
      ];
    }

    return { normalizedSearch, where };
  }

  async getAdminListData(query) {
    const page = parseInt(query.page, 10) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const { normalizedSearch, where } = this.buildAdminFilters(query.search);

    const { count, rows: enrollments } = await Enrollment.findAndCountAll({
      where,
      include: [{ model: Course }],
      distinct: true,
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    return {
      enrollments,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count
      },
      filters: { search: normalizedSearch }
    };
  }

  async exportAdminList(search) {
    const { normalizedSearch, where } = this.buildAdminFilters(search);
    const enrollments = await Enrollment.findAll({
      where,
      include: [{ model: Course }],
      order: [['createdAt', 'DESC']]
    });

    const escapeCsvValue = (value) => {
      const stringValue = value == null ? '' : String(value);
      return `"${stringValue.replace(/"/g, '""')}"`;
    };

    const rows = [
      ['Nome', 'Email', 'Telefone', 'Empresa', 'Curso', 'Local', 'Data de Inscricao', 'Status']
    ];

    enrollments.forEach((enrollment) => {
      rows.push([
        enrollment.studentName,
        enrollment.studentEmail,
        enrollment.studentPhone,
        enrollment.company,
        enrollment.Course ? enrollment.Course.title : 'Curso removido',
        enrollment.Course ? enrollment.Course.location : '',
        new Date(enrollment.createdAt).toLocaleDateString('pt-BR'),
        enrollment.status
      ]);
    });

    return {
      csvContent: rows.map((row) => row.map(escapeCsvValue).join(';')).join('\n'),
      fileSuffix: normalizedSearch ? '-filtrado' : ''
    };
  }

  async updateStatus(id, status) {
    const enrollment = await Enrollment.findByPk(id);
    if (!enrollment) {
      return { notFound: true };
    }

    enrollment.status = status;

    if (status === 'completo') {
      const course = await enrollment.getCourse();
      const verificationCode = enrollment.certificateCode || buildCertificateCode();
      enrollment.certificateCode = verificationCode;
      enrollment.certificateJson = buildCertificateJson(enrollment, course, verificationCode);
    }

    await enrollment.save();
    return { notFound: false };
  }

  async getCertificatesPageData() {
    const courses = await Course.findAll({
      include: [{
        model: Enrollment,
        where: { status: 'completo' },
        required: false
      }]
    });

    return { courses };
  }

  async generateCertificateJson(courseId) {
    const enrollments = await Enrollment.findAll({
      where: { courseId, status: 'completo' },
      include: [{ model: Course }]
    });

    return enrollments.map((enrollment) => ({
      id: enrollment.id,
      ...enrollment.certificateJson
    }));
  }

  async resolveCertificateAccess(id, user) {
    const where = { id };

    if (user.role !== 'admin') {
      where.userId = user.id;
    }

    const enrollment = await Enrollment.findOne({ where });

    if (!enrollment || enrollment.status !== 'completo') {
      return { unavailable: true };
    }

    if (!enrollment.certificateCode) {
      const course = await enrollment.getCourse();
      const certificateCode = buildCertificateCode();
      enrollment.certificateCode = certificateCode;

      if (!enrollment.certificateJson) {
        enrollment.certificateJson = buildCertificateJson(enrollment, course, certificateCode);
      }

      await enrollment.save();
    }

    return {
      unavailable: false,
      redirectTo: `/certificado/${enrollment.certificateCode}`
    };
  }

  async getEnrollmentForEdit(id) {
    const enrollment = await Enrollment.findByPk(id, {
      include: [{ model: Course }]
    });

    if (!enrollment) {
      return null;
    }

    const courses = await Course.findAll({ attributes: ['id', 'title', 'price'] });
    const normalizedCourses = courses.map((course) => ({
      ...course.toJSON(),
      priceValue: parseMoneyValue(course.price)
    }));

    return {
      enrollment,
      courses: normalizedCourses
    };
  }

  async updateEnrollment(id, body) {
    const enrollment = await Enrollment.findByPk(id);
    if (!enrollment) {
      return { notFound: true };
    }

    const price = parseMoneyValue(body.coursePrice);
    const discount = parseMoneyValue(body.discount);
    const finalPrice = price - discount;

    enrollment.studentName = body.studentName;
    enrollment.studentEmail = body.studentEmail;
    enrollment.studentPhone = body.studentPhone;
    enrollment.company = body.company;
    enrollment.cpfCnpj = body.cpfCnpj;
    enrollment.entePublico = body.entePublico === '1';
    enrollment.pais = body.pais;
    enrollment.endereco = body.endereco;
    enrollment.cidade = body.cidade;
    enrollment.estado = body.estado;
    enrollment.cep = body.cep;
    enrollment.observations = body.observations;
    enrollment.courseId = body.courseId;
    enrollment.coursePrice = price;
    enrollment.discount = discount;
    enrollment.finalPrice = finalPrice;
    enrollment.status = body.status;

    if (body.status === 'completo') {
      const course = await Course.findByPk(body.courseId);

      if (!enrollment.certificateCode) {
        enrollment.certificateCode = buildCertificateCode();
      }

      enrollment.certificateJson = buildCertificateJson(enrollment, course, enrollment.certificateCode);
    }

    await enrollment.save();
    return { notFound: false };
  }

  async getReceiptData(id, user) {
    const enrollment = await Enrollment.findByPk(id, {
      include: [{ model: Course }]
    });

    if (!enrollment) {
      return { notFound: true };
    }

    if (user.role !== 'admin' && enrollment.userId !== user.id) {
      return { forbidden: true };
    }

    return {
      notFound: false,
      forbidden: false,
      enrollment,
      course: enrollment.Course,
      back_url: user.role === 'admin' ? '/admin/inscricoes' : '/aluno/dashboard'
    };
  }

  async getStudentReceiptData(id, userId) {
    const enrollment = await Enrollment.findOne({
      where: { id, userId },
      include: [{ model: Course }]
    });

    if (!enrollment) {
      return null;
    }

    return {
      enrollment,
      course: enrollment.Course,
      back_url: '/aluno/dashboard'
    };
  }

  async deleteEnrollment(id) {
    const enrollment = await Enrollment.findByPk(id);
    if (!enrollment) {
      return { notFound: true };
    }

    await enrollment.destroy();
    return { notFound: false };
  }
}

module.exports = new EnrollmentAdminService();
