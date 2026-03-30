const crypto = require('crypto');
const { Op } = require('sequelize');
const { Enrollment, Course } = require('../../models');
const { parseMoneyValue } = require('../../utils/Money');
const { buildAppUrl } = require('../../utils/Url');
const { EmailService, SiteSettingsService } = require('../shared');

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
  async handleEnrollmentStatusEmails({ previousStatus, nextStatus, enrollment, course, req }) {
    if (!req || previousStatus === nextStatus) {
      return;
    }

    const settings = await SiteSettingsService.getSettings();
    const dashboardUrl = buildAppUrl(req, '/aluno/dashboard');
    const certificatesUrl = buildAppUrl(req, '/meus-certificados');
    const coursesUrl = buildAppUrl(req, '/cursos');

    if (nextStatus === 'confirmado' && String(settings.email_notify_student_enrollment_confirmed || 'false') === 'true') {
      await EmailService.sendEnrollmentConfirmedToStudent({
        enrollment,
        course,
        dashboardUrl,
        certificatesUrl
      });
    }

    if (nextStatus === 'cancelado' && String(settings.email_notify_student_enrollment_cancelled || 'false') === 'true') {
      await EmailService.sendEnrollmentCancelledToStudent({
        enrollment,
        course,
        coursesUrl,
        contactEmail: settings.footer_email || settings.smtp_from || 'contato@consultpro.com.br'
      });
    }
  }

  buildAdminFilters(query = {}) {
    const normalizedSearch = typeof query.search === 'string' ? query.search.trim() : '';
    const normalizedStatus = typeof query.status === 'string' ? query.status.trim() : '';
    const normalizedCourseId = typeof query.courseId === 'string' ? query.courseId.trim() : '';
    const where = {};

    if (normalizedSearch) {
      where[Op.or] = [
        { studentName: { [Op.like]: `%${normalizedSearch}%` } },
        { studentEmail: { [Op.like]: `%${normalizedSearch}%` } },
        { '$Course.title$': { [Op.like]: `%${normalizedSearch}%` } }
      ];
    }

    if (normalizedStatus) {
      where.status = normalizedStatus;
    }

    if (normalizedCourseId) {
      where.courseId = normalizedCourseId;
    }

    return {
      normalizedSearch,
      normalizedStatus,
      normalizedCourseId,
      where
    };
  }

  async getAdminListData(query) {
    const page = parseInt(query.page, 10) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const { normalizedSearch, normalizedStatus, normalizedCourseId, where } = this.buildAdminFilters(query);

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
      filters: {
        search: normalizedSearch,
        status: normalizedStatus,
        courseId: normalizedCourseId
      }
    };
  }

  async exportAdminList(search) {
    const { normalizedSearch, where } = this.buildAdminFilters({ search });
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

  async updateStatus(id, status, req) {
    const enrollment = await Enrollment.findByPk(id);
    if (!enrollment) {
      return { notFound: true };
    }

    const previousStatus = enrollment.status;
    enrollment.status = status;
    const course = await enrollment.getCourse();

    if (status === 'completo') {
      const verificationCode = enrollment.certificateCode || buildCertificateCode();
      enrollment.certificateCode = verificationCode;
      enrollment.certificateJson = buildCertificateJson(enrollment, course, verificationCode);
    }

    await enrollment.save();

    try {
      await this.handleEnrollmentStatusEmails({
        previousStatus,
        nextStatus: enrollment.status,
        enrollment,
        course,
        req
      });
    } catch (error) {
      console.error('Erro ao enviar e-mails de status da inscrição:', error);
    }

    return { notFound: false };
  }

  async getCertificatesPageData(query = {}) {
    const filters = {
      search: String(query.search || '').trim(),
      operationalStatus: String(query.operationalStatus || '').trim()
    };

    const courseWhere = {};

    if (filters.search) {
      courseWhere[Op.or] = [
        { title: { [Op.like]: `%${filters.search}%` } },
        { location: { [Op.like]: `%${filters.search}%` } }
      ];
    }

    const courses = await Course.findAll({
      where: courseWhere,
      include: [{
        model: Enrollment,
        required: false,
        attributes: ['id', 'studentName', 'status', 'certificateCode']
      }],
      order: [['title', 'ASC']]
    });

    const normalizedCourses = courses.map((course) => {
      const enrollments = Array.isArray(course.Enrollments) ? course.Enrollments : [];
      const completedCount = enrollments.filter((enrollment) => enrollment.status === 'completo').length;
      const confirmedCount = enrollments.filter((enrollment) => enrollment.status === 'confirmado').length;
      const certificateCount = enrollments.filter((enrollment) => enrollment.status === 'completo' && enrollment.certificateCode).length;
      const pendingActionCount = Math.max(confirmedCount - certificateCount, 0);

      let operationalStatus = 'sem-aptos';

      if (completedCount > 0) {
        operationalStatus = 'aptos';
      } else if (confirmedCount > 0) {
        operationalStatus = 'pendencias';
      }

      return {
        ...course.toJSON(),
        completedCount,
        confirmedCount,
        certificateCount,
        pendingActionCount,
        operationalStatus,
        enrollmentPreview: enrollments.slice(0, 3)
      };
    }).filter((course) => {
      if (filters.operationalStatus === 'aptos') {
        return course.operationalStatus === 'aptos';
      }

      if (filters.operationalStatus === 'pendencias') {
        return course.operationalStatus === 'pendencias';
      }

      if (filters.operationalStatus === 'sem-aptos') {
        return course.operationalStatus === 'sem-aptos';
      }

      return true;
    });

    return {
      courses: normalizedCourses,
      filters
    };
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

  async updateEnrollment(id, body, req) {
    const enrollment = await Enrollment.findByPk(id);
    if (!enrollment) {
      return { notFound: true };
    }

    const previousStatus = enrollment.status;
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

    const course = await Course.findByPk(body.courseId);

    if (body.status === 'completo') {

      if (!enrollment.certificateCode) {
        enrollment.certificateCode = buildCertificateCode();
      }

      enrollment.certificateJson = buildCertificateJson(enrollment, course, enrollment.certificateCode);
    }

    await enrollment.save();

    try {
      await this.handleEnrollmentStatusEmails({
        previousStatus,
        nextStatus: enrollment.status,
        enrollment,
        course,
        req
      });
    } catch (error) {
      console.error('Erro ao enviar e-mails após editar inscrição:', error);
    }

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
