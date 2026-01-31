const { Enrollment, Course, User } = require('../models');
const { Op } = require('sequelize');

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
        filters: { search, courseId },
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
          completionDate: new Date().toLocaleDateString('pt-BR'),
          verificationCode: Math.random().toString(36).substring(2, 10).toUpperCase()
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

  async generateIndividualJson(req, res) {
    try {
      const { id } = req.params;
      const enrollment = await Enrollment.findByPk(id);
      if (!enrollment || enrollment.status !== 'completo') {
        return res.status(404).json({ error: 'Certificado não disponível' });
      }

      res.header("Content-Type", "application/json");
      res.attachment(`certificado-${enrollment.studentName}-${id}.json`);
      res.send(JSON.stringify(enrollment.certificateJson, null, 2));
    } catch (error) {
      console.error(error);
      res.redirect('/admin/inscricoes?error=Erro ao gerar JSON');
    }
  }
}

module.exports = new EnrollmentController();
