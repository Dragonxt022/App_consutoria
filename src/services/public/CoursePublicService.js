const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
const slugify = require('slugify');
const { Course, Enrollment, User, Product, Setting } = require('../../models');
const { buildAppUrl } = require('../../utils/Url');
const { formatCurrency } = require('../../utils/CurrencyFormatter');
const { parseMoneyValue } = require('../../utils/Money');
const { ProductFormatter, EmailService } = require('../shared');
const { formatProduct } = ProductFormatter;

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

class CoursePublicService {
  resolvePublicFilePath(fileUrl) {
    if (!fileUrl || typeof fileUrl !== 'string' || !fileUrl.startsWith('/uploads/')) {
      return null;
    }

    return path.join(__dirname, '..', '..', 'public', fileUrl.replace(/^\/+/, ''));
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
      descriptionPlain: stripHtml(data.description),
      isExpired: new Date(data.startDate) < now
    };
  }

  async listPublicCourses() {
    const courses = await Course.findAll({
      where: { active: true },
      order: [['startDate', 'ASC']]
    });

    const now = new Date();
    return courses.map((course) => this.serializeCourse(course, now));
  }

  async getPublicCourseDetails(courseId) {
    const course = await Course.findOne({ where: { id: courseId, active: true } });

    if (!course) {
      return null;
    }

    const showCourseStoreOffersSetting = await Setting.findOne({
      where: { key: 'show_course_store_offers' }
    });

    const showCourseStoreOffers = showCourseStoreOffersSetting?.value === 'true';
    let courseStoreOffers = [];

    if (showCourseStoreOffers) {
      const storeOffers = await Product.findAll({
        where: { active: true },
        order: [['featured', 'DESC'], ['createdAt', 'DESC']],
        limit: 4
      });

      courseStoreOffers = storeOffers.map((product) => formatProduct(product));
    }

    return {
      course: this.serializeCourse(course, new Date()),
      courseStoreOffers,
      showCourseStoreOffers
    };
  }

  async getEnrollmentFormData(courseId, user) {
    const course = await Course.findOne({ where: { id: courseId, active: true } });

    if (!course || new Date(course.startDate) < new Date()) {
      return null;
    }

    let lastEnrollment = null;

    if (user) {
      lastEnrollment = await Enrollment.findOne({
        where: { userId: user.id },
        order: [['createdAt', 'DESC']]
      });
    }

    return {
      course: this.serializeCourse(course, new Date()),
      lastEnrollment
    };
  }

  async submitEnrollment(req) {
    const {
      name,
      email,
      phone,
      company,
      observations,
      courseId,
      create_account,
      cpfCnpj,
      entePublico,
      pais,
      endereco,
      cidade,
      estado,
      cep
    } = req.body;

    const cryptoRandomString = (await import('crypto-random-string')).default;
    let currentUser = req.user ? await User.findByPk(req.user.id) : null;

    if (!currentUser) {
      currentUser = await User.findOne({ where: { email } });

      if (!currentUser) {
        if (create_account !== 'on') {
          return {
            redirectTo: `/curso/${courseId}?error=Para se inscrever, você precisa autorizar a criação da sua conta.`
          };
        }

        const tempPassword = cryptoRandomString({ length: 10, type: 'alphanumeric' });
        const confirmationToken = cryptoRandomString({ length: 32, type: 'url-safe' });

        currentUser = await User.create({
          name,
          email,
          password: tempPassword,
          role: 'aluno',
          active: false,
          confirmationToken,
          confirmationExpires: new Date(Date.now() + 24 * 3600 * 1000)
        });

        const confirmationUrl = buildAppUrl(req, `/confirmar-conta/${confirmationToken}`);
        await EmailService.sendAccountConfirmation(currentUser, tempPassword, confirmationUrl);
      }
    }

    const course = await Course.findByPk(courseId);

    if (!course) {
      return { redirectTo: '/?error=Curso não encontrado' };
    }

    const priceValue = parseMoneyValue(course.price);

    await Enrollment.create({
      studentName: name,
      studentEmail: email,
      studentPhone: phone,
      company,
      cpfCnpj,
      entePublico: entePublico === '1',
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

    return { redirectTo: '/obrigado' };
  }
}

module.exports = new CoursePublicService();
