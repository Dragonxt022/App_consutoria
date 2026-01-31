const { Course, Enrollment, User } = require('../models');
const slugify = require('slugify');
const { Op } = require('sequelize');

class CourseController {
  // Public Methods
  async index(req, res) {
    const courses = await Course.findAll({
      where: { active: true },
      order: [['startDate', 'ASC']]
    });

    const now = new Date();
    const formattedCourses = courses.map(course => {
      const data = course.toJSON();
      data.isExpired = new Date(data.startDate) < now;
      return data;
    });

    res.render('public/home', {
      title: 'Consultoria Profissional | Início',
      courses: formattedCourses,
      layout: 'public/layout'
    });
  }

  async details(req, res) {
    const course = await Course.findOne({ where: { id: req.params.id, active: true } });
    if (!course) {
      return res.status(404).render('error', { title: 'Curso não encontrado', layout: false });
    }

    const data = course.toJSON();
    data.isExpired = new Date(data.startDate) < new Date();

    res.render('public/course-details', {
      title: `${data.title} | Consultoria`,
      course: data,
      layout: 'public/layout'
    });
  }

  async enrollForm(req, res) {
    const course = await Course.findOne({ where: { id: req.params.id, active: true } });
    if (!course || new Date(course.startDate) < new Date()) {
      return res.redirect('/?error=Inscrições encerradas para este curso');
    }

    res.render('public/enroll', {
      title: `Inscrição - ${course.title}`,
      course,
      layout: 'public/layout'
    });
  }

  async submitEnrollment(req, res) {
    try {
      const { name, email, phone, company, observations, courseId, create_account } = req.body;
      const cryptoRandomString = (await import('crypto-random-string')).default;
      const EmailService = require('../services/EmailService');

      let currentUser = req.user ? await User.findByPk(req.user.id) : null;

      // If guest, ensure they checked create_account and manage the user creation
      if (!currentUser) {
        currentUser = await User.findOne({ where: { email } });

        if (!currentUser) {
            if (create_account !== 'on') {
                return res.redirect(`/curso/${courseId}?error=Para se inscrever, você precisa autorizar a criação da sua conta.`);
            }

            const tempPassword = cryptoRandomString({length: 10, type: 'alphanumeric'});
            const confirmationToken = cryptoRandomString({length: 32, type: 'url-safe'});
            
            currentUser = await User.create({
                name,
                email,
                password: tempPassword,
                role: 'aluno',
                active: false,
                confirmationToken,
                confirmationExpires: new Date(Date.now() + 24 * 3600 * 1000) // 24 hours
            });

            const confirmationUrl = `${req.protocol}://${req.get('host')}/confirmar-conta/${confirmationToken}`;
            await EmailService.sendAccountConfirmation(currentUser, tempPassword, confirmationUrl);
        }
      }
      
      await Enrollment.create({
        studentName: name,
        studentEmail: email,
        studentPhone: phone,
        company,
        observations,
        courseId,
        userId: currentUser.id,
        status: 'pendente'
      });

      res.redirect('/obrigado');
    } catch (error) {
      console.error(error);
      res.redirect('/?error=Erro ao processar sua inscrição. Tente novamente.');
    }
  }

  async thankYou(req, res) {
    res.render('public/thank-you', {
      title: 'Obrigado pela sua Inscrição!',
      layout: 'public/layout'
    });
  }

  // Admin Methods
  async adminList(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const { count, rows: courses } = await Course.findAndCountAll({
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    const totalPages = Math.ceil(count / limit);
    const now = new Date();

    const formattedCourses = courses.map(course => {
      const data = course.toJSON();
      data.isExpired = new Date(data.startDate) < now;
      return data;
    });

    res.render('admin/courses/list', {
      title: 'Listagem de Cursos',
      courses: formattedCourses,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: count
      },
      user: req.user,
      layout: 'admin/layout'
    });
  }

  async adminCreateForm(req, res) {
    res.render('admin/courses/create', {
      title: 'Cadastrar Novo Curso',
      user: req.user,
      layout: 'admin/layout'
    });
  }

  async adminStore(req, res) {
    try {
      const { title, description, location, workload, price, startDate, spots, includes_material, includes_coffee, includes_cert } = req.body;
      
      const slug = slugify(title, { lower: true, strict: true });
      
      const itemsIncluded = [];
      if (includes_material) itemsIncluded.push('Material didático completo');
      if (includes_coffee) itemsIncluded.push('Coffee break premium');
      if (includes_cert) itemsIncluded.push('Certificado impresso');

      const imageUrl = req.files['image'] ? `/uploads/courses/images/${req.files['image'][0].filename}` : null;
      const docUrl = req.files['proposalDoc'] ? `/uploads/courses/documents/${req.files['proposalDoc'][0].filename}` : null;

      await Course.create({
        title,
        slug,
        description,
        location,
        workload,
        price,
        startDate,
        spots,
        itemsIncluded,
        image: imageUrl,
        proposalDoc: docUrl
      });

      res.redirect('/admin/cursos?success=Curso cadastrado com sucesso!');
    } catch (error) {
      console.error(error);
      res.redirect('/admin/cursos/criar?error=Erro ao salvar o curso');
    }
  }
}

module.exports = new CourseController();
