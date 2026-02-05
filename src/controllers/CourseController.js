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

  async publicList(req, res) {
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

    res.render('public/courses', {
      title: 'Todos os Cursos | Consultoria',
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
      
      // Fetch course to get price
      const course = await Course.findByPk(courseId);
      if (!course) {
        return res.redirect('/?error=Curso não encontrado');
      }

      // Parse price logic: assuming price is string like "R$ 100,00" or simple number
      let priceValue = 0;
      if (course.price) {
        // Remove 'R$', dots, replace comma with dot
        const cleanPrice = course.price.toString().replace(/[^\d,]/g, '').replace(',', '.');
        priceValue = parseFloat(cleanPrice) || 0;
      }

      await Enrollment.create({
        studentName: name,
        studentEmail: email,
        studentPhone: phone,
        company,
        observations,
        courseId,
        userId: currentUser.id,
        status: 'pendente',
        coursePrice: priceValue,
        discount: 0,
        finalPrice: priceValue
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

  async adminEditForm(req, res) {
    try {
      const course = await Course.findByPk(req.params.id);
      if (!course) {
        return res.redirect('/admin/cursos?error=Curso não encontrado');
      }

      res.render('admin/courses/edit', {
        title: `Editar Curso: ${course.title}`,
        course,
        user: req.user,
        layout: 'admin/layout'
      });
    } catch (error) {
      console.error(error);
      res.redirect('/admin/cursos?error=Erro ao carregar o curso');
    }
  }

  async adminUpdate(req, res) {
    try {
      const { title, description, location, workload, price, startDate, spots, includes_material, includes_coffee, includes_cert, active } = req.body;
      const course = await Course.findByPk(req.params.id);

      if (!course) {
        return res.redirect('/admin/cursos?error=Curso não encontrado');
      }

      const slug = slugify(title, { lower: true, strict: true });
      
      const itemsIncluded = [];
      if (includes_material) itemsIncluded.push('Material didático completo');
      if (includes_coffee) itemsIncluded.push('Coffee break premium');
      if (includes_cert) itemsIncluded.push('Certificado impresso');

      const updateData = {
        title,
        slug,
        description,
        location,
        workload,
        price,
        startDate,
        spots,
        itemsIncluded,
        active: active === 'on' || active === true
      };

      if (req.files['image']) {
        updateData.image = `/uploads/courses/images/${req.files['image'][0].filename}`;
      }
      if (req.files['proposalDoc']) {
        updateData.proposalDoc = `/uploads/courses/documents/${req.files['proposalDoc'][0].filename}`;
      }

      await course.update(updateData);

      res.redirect('/admin/cursos?success=Curso atualizado com sucesso!');
    } catch (error) {
      console.error(error);
      res.redirect(`/admin/cursos/${req.params.id}/editar?error=Erro ao atualizar o curso`);
    }
  }

  async adminToggleStatus(req, res) {
    try {
      const course = await Course.findByPk(req.params.id);
      if (!course) {
        return res.status(404).json({ success: false, message: 'Curso não encontrado' });
      }

      await course.update({ active: !course.active });
      res.redirect('/admin/cursos?success=Status do curso atualizado!');
    } catch (error) {
      console.error(error);
      res.redirect('/admin/cursos?error=Erro ao atualizar status');
    }
  }

  async adminDelete(req, res) {
    try {
      const course = await Course.findByPk(req.params.id);
      if (!course) {
        return res.redirect('/admin/cursos?error=Curso não encontrado');
      }

      // Instead of hard delete, maybe just deactivate if there are enrollments?
      // For now, let's follow the user's request to "delete" which might mean deactivation.
      // But they also said "mudar o status do curso para desativado caso eu cansele ou delete".
      // Let's implement actual delete but with a confirmation on UI. 
      // Or just a soft delete by deactivating.
      
      // The user said: "mudar o status do curso para desativado caso eu cansele ou delete"
      // This suggests they want a button that "deactivates" but might be labeled "cancelar" or "deletar".
      
      await course.update({ active: false });
      res.redirect('/admin/cursos?success=Curso desativado com sucesso!');
    } catch (error) {
      console.error(error);
      res.redirect('/admin/cursos?error=Erro ao desativar curso');
    }
  }
}

module.exports = new CourseController();
