const { Enrollment, Course, User } = require('../models');
const { Op } = require('sequelize');
const crypto = require('crypto');

class EnrollmentController {
  async adminList(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const offset = (page - 1) * limit;
      const { search, courseId } = req.query;

      const where = {};
      if (search) {
        where[Op.or] = [
          { studentName: { [Op.like]: `%${search}%` } },
          { studentEmail: { [Op.like]: `%${search}%` } }
        ];
      }
      if (courseId) {
        where.courseId = courseId;
      }
      if (req.query.status) {
        where.status = req.query.status;
      }

      const { count, rows: enrollments } = await Enrollment.findAndCountAll({
        where,
        include: [{ model: Course }],
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      const courses = await Course.findAll({ attributes: ['id', 'title'] });
      const totalPages = Math.ceil(count / limit);

      res.render('admin/enrollments/list', {
        title: 'Gestão de Inscrições',
        enrollments,
        courses,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: count
        },
        filters: { search, courseId, status: req.query.status },
        user: req.user,
        layout: 'admin/layout'
      });
    } catch (error) {
      console.error(error);
      res.redirect('/admin/dashboard?error=Erro ao carregar inscrições');
    }
  }

  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const enrollment = await Enrollment.findByPk(id);
      if (!enrollment) {
        return res.status(404).json({ error: 'Inscrição não encontrada' });
      }

      enrollment.status = status;

      // If status is complete, generate the certificate JSON metadata
      if (status === 'completo') {
        const course = await enrollment.getCourse();
        enrollment.certificateJson = {
          studentName: enrollment.studentName,
          courseTitle: course.title,
          workload: course.workload,
          workload: course.workload,
          completionDate: new Date().toLocaleDateString('pt-BR'),
          verificationCode: crypto.randomBytes(4).toString('hex').toUpperCase()
        };
      }

      await enrollment.save();
      res.redirect('/admin/inscricoes?success=Status atualizado com sucesso');
    } catch (error) {
      console.error(error);
      res.redirect('/admin/inscricoes?error=Erro ao atualizar status');
    }
  }

  async adminCertificates(req, res) {
    try {
      const courses = await Course.findAll({
        include: [{ 
          model: Enrollment, 
          where: { status: 'completo' },
          required: false
        }]
      });

      res.render('admin/certificates/index', {
        title: 'Gerador de Certificados',
        courses,
        user: req.user,
        layout: 'admin/layout'
      });
    } catch (error) {
      console.error(error);
      res.redirect('/admin/dashboard?error=Erro ao carregar certificados');
    }
  }

  async generateJson(req, res) {
    try {
      const { courseId } = req.params;
      const enrollments = await Enrollment.findAll({
        where: { courseId, status: 'completo' },
        include: [{ model: Course }]
      });

      const exportData = enrollments.map(e => ({
        id: e.id,
        ...e.certificateJson
      }));

      res.header("Content-Type", "application/json");
      res.attachment(`certificados-curso-${courseId}.json`);
      res.send(JSON.stringify(exportData, null, 2));
    } catch (error) {
      console.error(error);
      res.redirect('/admin/certificados?error=Erro ao gerar JSON');
    }
  }

  async viewStudentCertificate(req, res) {
    try {
      const { id } = req.params;
      
      const where = { id };
      // Se não for admin, restringe ao próprio usuário
      if (req.user.role !== 'admin') {
        where.userId = req.user.id;
      }

      const enrollment = await Enrollment.findOne({ where });

      if (!enrollment || enrollment.status !== 'completo') {
        const redirectUrl = req.user.role === 'admin' ? '/admin/inscricoes' : '/aluno/dashboard';
        return res.redirect(`${redirectUrl}?error=Certificado não disponível`);
      }

      // Se não tiver código, gera agora (Self-healing)
      if (!enrollment.certificateCode) {
         enrollment.certificateCode = crypto.randomBytes(4).toString('hex').toUpperCase().match(/.{1,4}/g).join('-');
         
         // Garante também o JSON se faltar
         if (!enrollment.certificateJson) {
             const course = await enrollment.getCourse();
             enrollment.certificateJson = {
                 studentName: enrollment.studentName,
                 courseTitle: course.title,
                 workload: course.workload,
                 completionDate: new Date().toLocaleDateString('pt-BR'),
                 verificationCode: enrollment.certificateCode
             };
         }
         await enrollment.save();
      }

      res.redirect(`/certificado/${enrollment.certificateCode}`);
    } catch (error) {
      console.error(error);
      const redirectUrl = req.user.role === 'admin' ? '/admin/inscricoes' : '/aluno/dashboard';
      res.redirect(`${redirectUrl}?error=Erro ao visualizar certificado`);
    }
  }
  async edit(req, res) {
    try {
      const { id } = req.params;
      const enrollment = await Enrollment.findByPk(id, {
        include: [{ model: Course }]
      });
      
      if (!enrollment) {
        return res.redirect('/admin/inscricoes?error=Inscrição não encontrada');
      }

      const courses = await Course.findAll({ attributes: ['id', 'title', 'price'] });

      res.render('admin/enrollments/edit', {
        title: 'Editar Inscrição',
        enrollment,
        courses,
        user: req.user,
        layout: 'admin/layout'
      });
    } catch (error) {
      console.error(error);
      res.redirect('/admin/inscricoes?error=Erro ao carregar edição');
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { studentName, studentEmail, studentPhone, company, observations, courseId, coursePrice, discount, status } = req.body;

      const enrollment = await Enrollment.findByPk(id);
      if (!enrollment) {
        return res.redirect('/admin/inscricoes?error=Inscrição não encontrada');
      }

      // Calculate final price
      const price = parseFloat(coursePrice) || 0;
      const disc = parseFloat(discount) || 0;
      const final = price - disc;

      enrollment.studentName = studentName;
      enrollment.studentEmail = studentEmail;
      enrollment.studentPhone = studentPhone;
      enrollment.company = company;
      enrollment.observations = observations;
      enrollment.courseId = courseId;
      enrollment.coursePrice = price;
      enrollment.discount = disc;
      enrollment.finalPrice = final;
      enrollment.status = status;

      // Check if status changed to complete to generate certificate data
      if (status === 'completo') {
         if (!enrollment.certificateJson) {
             const course = await Course.findByPk(courseId);
             enrollment.certificateJson = {
                 studentName: enrollment.studentName,
                 courseName: course.title,
                 date: new Date(),
                 workload: course.workload
             };
         }
         
         if (!enrollment.certificateCode) {
             enrollment.certificateCode = crypto.randomBytes(4).toString('hex').toUpperCase().match(/.{1,4}/g).join('-');
         }
      }

      await enrollment.save();

      res.redirect('/admin/inscricoes?success=Inscrição atualizada com sucesso');
    } catch (error) {
      console.error(error);
      res.redirect(`/admin/inscricoes/${req.params.id}/editar?error=Erro ao atualizar inscrição`);
    }
  }
}

module.exports = new EnrollmentController();
