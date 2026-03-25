const { Course, Enrollment, User, Product, Setting } = require('../models');
const slugify = require('slugify');
const { Op } = require('sequelize');
const ProductController = require('./ProductController');
const { buildAppUrl } = require('../utils/url');
const { formatCurrency } = require('../utils/currencyFormatter');
const { parseMoneyValue } = require('../utils/money');
const fs = require('fs');
const path = require('path');

class CourseController {
  resolvePublicFilePath(fileUrl) {
    if (!fileUrl || typeof fileUrl !== 'string' || !fileUrl.startsWith('/uploads/')) {
      return null;
    }

    return path.join(__dirname, '..', 'public', fileUrl.replace(/^\/+/, ''));
  }

  removeFileIfExists(fileUrl) {
    const filePath = this.resolvePublicFilePath(fileUrl);

    if (!filePath || !fs.existsSync(filePath)) {
      return;
    }

    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error(`Erro ao remover arquivo antigo: ${filePath}`, error);
    }
  }

  cleanupUploadedFiles(req) {
    const uploadedFiles = Object.values(req.files || {}).flat();

    uploadedFiles.forEach((file) => {
      if (!file?.path) return;

      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (error) {
        console.error(`Erro ao limpar upload temporario: ${file.path}`, error);
      }
    });
  }

  async generateUniqueSlug(title, excludeId = null) {
    const baseSlug = slugify(title || 'curso', { lower: true, strict: true }) || 'curso';
    let candidateSlug = baseSlug;
    let counter = 2;

    while (true) {
      const where = { slug: candidateSlug };

      if (excludeId) {
        where.id = { [Op.ne]: excludeId };
      }

      const existingCourse = await Course.findOne({ where });

      if (!existingCourse) {
        return candidateSlug;
      }

      candidateSlug = `${baseSlug}-${counter}`;
      counter += 1;
    }
  }

  parseHomeBanners(rawValue) {
    if (!rawValue) return [];

    try {
      const parsed = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter((banner) => banner && banner.imageUrl)
        .map((banner, index) => ({
          id: banner.id || `banner-${index + 1}`,
          name: banner.name || `Banner ${index + 1}`,
          imageUrl: banner.imageUrl,
          link: banner.link || '',
          newTab: banner.newTab === true || banner.newTab === 'true'
        }))
        .slice(0, 6);
    } catch (error) {
      console.error('Erro ao carregar banners da home:', error);
      return [];
    }
  }

  normalizeCertificateTopics(rawTopics) {
    const normalizedInput = Array.isArray(rawTopics) ? rawTopics.join('\n') : (rawTopics || '');

    return String(normalizedInput)
      .replace(/\r/g, '\n')
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  serializeCourse(course, now = new Date()) {
    const data = course.toJSON();
    const priceValue = parseMoneyValue(data.price);

    return {
      ...data,
      price: priceValue,
      priceValue,
      priceDisplay: formatCurrency(priceValue),
      priceInputValue: priceValue.toFixed(2),
      isExpired: new Date(data.startDate) < now
    };
  }

  // Public Methods
  async index(req, res) {
    const [courses, featuredProducts, homeBannersSetting] = await Promise.all([
      Course.findAll({
        where: { active: true },
        order: [['startDate', 'ASC']]
      }),
      Product.findAll({
        where: { active: true, featured: true },
        order: [['createdAt', 'DESC']],
        limit: 3
      }),
      Setting.findOne({ where: { key: 'home_banners' } })
    ]);

    const now = new Date();
    const formattedCourses = courses.map((course) => this.serializeCourse(course, now));

    res.render('public/home', {
      title: 'Consultoria Profissional | Início',
      courses: formattedCourses,
      featuredProducts: featuredProducts.map((product) => ProductController.formatProduct(product)),
      homeBanners: this.parseHomeBanners(homeBannersSetting ? homeBannersSetting.value : '[]'),
      layout: 'public/layout'
    });
  }

  async publicList(req, res) {
    const courses = await Course.findAll({
      where: { active: true },
      order: [['startDate', 'ASC']]
    });

    const now = new Date();
    const formattedCourses = courses.map((course) => this.serializeCourse(course, now));

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

    const showCourseStoreOffersSetting = await Setting.findOne({
      where: { key: 'show_course_store_offers' }
    });

    const data = this.serializeCourse(course, new Date());

    let courseStoreOffers = [];
    const showCourseStoreOffers = showCourseStoreOffersSetting && showCourseStoreOffersSetting.value === 'true';

    if (showCourseStoreOffers) {
      const storeOffers = await Product.findAll({
        where: { active: true },
        order: [['featured', 'DESC'], ['createdAt', 'DESC']],
        limit: 4
      });

      courseStoreOffers = storeOffers.map((product) => ProductController.formatProduct(product));
    }

    res.render('public/course-details', {
      title: `${data.title} | Consultoria`,
      course: data,
      courseStoreOffers,
      showCourseStoreOffers,
      layout: 'public/layout'
    });
  }

  async enrollForm(req, res) {
    const course = await Course.findOne({ where: { id: req.params.id, active: true } });
    if (!course || new Date(course.startDate) < new Date()) {
      return res.redirect('/?error=Inscrições encerradas para este curso');
    }

    let lastEnrollment = null;
    if (req.user) {
      lastEnrollment = await Enrollment.findOne({
        where: { userId: req.user.id },
        order: [['createdAt', 'DESC']]
      });
    }

    res.render('public/enroll', {
      title: `Inscrição - ${course.title}`,
      course: this.serializeCourse(course, new Date()),
      lastEnrollment,
      layout: 'public/layout'
    });
  }

  async submitEnrollment(req, res) {
    try {
      const { name, email, phone, company, observations, courseId, create_account, cpfCnpj, entePublico, pais, endereco, cidade, estado, cep } = req.body;
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

            const confirmationUrl = buildAppUrl(req, `/confirmar-conta/${confirmationToken}`);
            await EmailService.sendAccountConfirmation(currentUser, tempPassword, confirmationUrl);
        }
      }
      
      // Fetch course to get price
      const course = await Course.findByPk(courseId);
      if (!course) {
        return res.redirect('/?error=Curso não encontrado');
      }

      const priceValue = parseMoneyValue(course.price);

      await Enrollment.create({
        studentName: name,
        studentEmail: email,
        studentPhone: phone,
        company,
        cpfCnpj,
        entePublico: entePublico === '1' ? true : false,
        pais,
        endereco,
        cidade,
        estado,
        cep,
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

    const formattedCourses = courses.map((course) => this.serializeCourse(course, now));

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
      title: 'Cadastrar Curso',
      user: req.user,
      layout: 'admin/layout'
    });
  }

  async adminStore(req, res) {
    try {
      const { title, description, location, workload, price, startDate, spots, certificateTopics } = req.body;
      const slug = await this.generateUniqueSlug(title);
      
      // Support itemsIncluded[] coming from the form (dynamic list)
      let itemsIncluded = req.body.itemsIncluded || [];
      if (typeof itemsIncluded === 'string') {
        // single item
        itemsIncluded = [itemsIncluded];
      }
      // Normalize and filter empty
      itemsIncluded = (Array.isArray(itemsIncluded) ? itemsIncluded : []).map(i => (i || '').toString().trim()).filter(Boolean);

      // If nothing provided, set defaults (uppercase as requested)
      if (itemsIncluded.length === 0) {
        itemsIncluded = [
          'COPO E CANETA.',
          'COFFEE-BREAK.',
          'CERTIFICADO DE PARTICIPAÇÃO.'
        ];
      }

      const normalizedCertificateTopics = this.normalizeCertificateTopics(certificateTopics);

      const imageUrl = req.files?.image?.[0] ? `/uploads/courses/images/${req.files.image[0].filename}` : null;
      const docUrl = req.files?.proposalDoc?.[0] ? `/uploads/courses/documents/${req.files.proposalDoc[0].filename}` : null;

      await Course.create({
        title,
        slug,
        description,
        location,
        workload,
        price: parseMoneyValue(price),
        startDate,
        spots,
        itemsIncluded,
        certificateTopics: normalizedCertificateTopics,
        image: imageUrl,
        proposalDoc: docUrl
      });

      res.redirect('/admin/cursos?success=Curso cadastrado com sucesso!');
    } catch (error) {
      console.error(error);
      this.cleanupUploadedFiles(req);
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
        title: 'Editar Curso',
        course: this.serializeCourse(course, new Date()),
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
      const { title, description, location, workload, price, startDate, spots, active, certificateTopics } = req.body;
      const course = await Course.findByPk(req.params.id);

      if (!course) {
        return res.redirect('/admin/cursos?error=Curso não encontrado');
      }

      const slug = await this.generateUniqueSlug(title, course.id);
      
      let itemsIncluded = req.body.itemsIncluded || [];
      if (typeof itemsIncluded === 'string') itemsIncluded = [itemsIncluded];
      itemsIncluded = (Array.isArray(itemsIncluded) ? itemsIncluded : []).map(i => (i || '').toString().trim()).filter(Boolean);

      if (itemsIncluded.length === 0) {
        itemsIncluded = [
          'COPO E CANETA.',
          'COFFEE-BREAK.',
          'CERTIFICADO DE PARTICIPAÇÃO.'
        ];
      }

      const normalizedCertificateTopics = this.normalizeCertificateTopics(certificateTopics);

      const updateData = {
        title,
        slug,
        description,
        location,
        workload,
        price: parseMoneyValue(price),
        startDate,
        spots,
        itemsIncluded,
        certificateTopics: normalizedCertificateTopics,
        active: active === 'on' || active === true
      };

      const previousImage = course.image;
      const previousProposalDoc = course.proposalDoc;

      if (req.files?.image?.[0]) {
        updateData.image = `/uploads/courses/images/${req.files.image[0].filename}`;
      }
      if (req.files?.proposalDoc?.[0]) {
        updateData.proposalDoc = `/uploads/courses/documents/${req.files.proposalDoc[0].filename}`;
      }

      await course.update(updateData);

      if (updateData.image && previousImage && previousImage !== updateData.image) {
        this.removeFileIfExists(previousImage);
      }

      if (updateData.proposalDoc && previousProposalDoc && previousProposalDoc !== updateData.proposalDoc) {
        this.removeFileIfExists(previousProposalDoc);
      }

      res.redirect('/admin/cursos?success=Curso atualizado com sucesso!');
    } catch (error) {
      console.error(error);
      this.cleanupUploadedFiles(req);
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
