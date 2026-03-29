const fs = require('fs');
const slugify = require('slugify');
const { Op } = require('sequelize');
const { Course, Enrollment } = require('../../models');
const { parseMoneyValue } = require('../../utils/Money');
const { buildAppUrl } = require('../../utils/Url');
const { resolveUploadUrlToPath } = require('../../utils/UploadPaths');
const { CoursePublicService } = require('../public');
const { EmailService, SiteSettingsService } = require('../shared');

const DEFAULT_ITEMS_INCLUDED = [
  'COPO E CANETA.',
  'COFFEE-BREAK.',
  'CERTIFICADO DE PARTICIPAÇÃO.'
];

function normalizeItemsIncluded(rawItemsIncluded) {
  let itemsIncluded = rawItemsIncluded || [];

  if (typeof itemsIncluded === 'string') {
    itemsIncluded = [itemsIncluded];
  }

  itemsIncluded = (Array.isArray(itemsIncluded) ? itemsIncluded : [])
    .map((item) => (item || '').toString().trim())
    .filter(Boolean);

  return itemsIncluded.length ? itemsIncluded : [...DEFAULT_ITEMS_INCLUDED];
}

class CourseAdminService {
  async notifyStudentsWhenCourseConfirmed({ previousStatus, course, req }) {
    if (!req || previousStatus === 'confirmado' || course.status !== 'confirmado') {
      return;
    }

    const settings = await SiteSettingsService.getSettings();
    if (String(settings.email_notify_students_course_confirmed || 'false') !== 'true') {
      return;
    }

    const enrollments = await Enrollment.findAll({
      where: {
        courseId: course.id,
        status: {
          [Op.ne]: 'cancelado'
        }
      },
      attributes: ['studentEmail']
    });

    const recipients = enrollments.map((enrollment) => enrollment.studentEmail).filter(Boolean);

    await EmailService.sendCourseConfirmedNoticeToStudents({
      recipients,
      course,
      dashboardUrl: buildAppUrl(req, '/aluno/dashboard')
    });
  }

  resolvePublicFilePath(fileUrl) {
    return resolveUploadUrlToPath(fileUrl);
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

  buildPersistedPayload(body, files, slug) {
    const normalizedCertificateTopics = CoursePublicService.normalizeCertificateTopicsPayload(
      body.certificateTopics,
      body.certificateBackContent
    );

    return {
      title: body.title,
      slug,
      description: body.description,
      location: body.location,
      workload: body.workload,
      status: body.status === 'confirmado' ? 'confirmado' : 'ativo',
      price: parseMoneyValue(body.price),
      startDate: body.startDate,
      spots: body.spots,
      itemsIncluded: normalizeItemsIncluded(body.itemsIncluded),
      certificateTopics: normalizedCertificateTopics,
      image: files?.image?.[0] ? `/uploads/courses/images/${files.image[0].filename}` : null,
      proposalDoc: files?.proposalDoc?.[0] ? `/uploads/courses/documents/${files.proposalDoc[0].filename}` : null
    };
  }

  async getAdminListData(page = 1) {
    const limit = 10;
    const offset = (page - 1) * limit;

    const { count, rows: courses } = await Course.findAndCountAll({
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    const now = new Date();

    return {
      courses: courses.map((course) => CoursePublicService.serializeCourse(course, now)),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count
      }
    };
  }

  async getCourseForEdit(courseId) {
    const course = await Course.findByPk(courseId);

    if (!course) {
      return null;
    }

    return CoursePublicService.serializeCourse(course, new Date());
  }

  async createCourse(req) {
    const slug = await this.generateUniqueSlug(req.body.title);
    const payload = this.buildPersistedPayload(req.body, req.files, slug);

    await Course.create(payload);
  }

  async updateCourse(req) {
    const course = await Course.findByPk(req.params.id);

    if (!course) {
      return { notFound: true };
    }

    const slug = await this.generateUniqueSlug(req.body.title, course.id);
    const previousStatus = course.status;
    const updateData = {
      ...this.buildPersistedPayload(req.body, req.files, slug),
      active: req.body.active === 'on' || req.body.active === true
    };

    const previousImage = course.image;
    const previousProposalDoc = course.proposalDoc;

    if (!req.files?.image?.[0]) {
      updateData.image = previousImage;
    }

    if (!req.files?.proposalDoc?.[0]) {
      updateData.proposalDoc = previousProposalDoc;
    }

    await course.update(updateData);

    try {
      await this.notifyStudentsWhenCourseConfirmed({ previousStatus, course, req });
    } catch (error) {
      console.error('Erro ao enviar e-mail de curso confirmado:', error);
    }

    if (req.files?.image?.[0] && previousImage && previousImage !== updateData.image) {
      this.removeFileIfExists(previousImage);
    }

    if (req.files?.proposalDoc?.[0] && previousProposalDoc && previousProposalDoc !== updateData.proposalDoc) {
      this.removeFileIfExists(previousProposalDoc);
    }

    return { notFound: false };
  }

  async toggleStatus(courseId) {
    const course = await Course.findByPk(courseId);

    if (!course) {
      return { notFound: true };
    }

    await course.update({ active: !course.active });
    return { notFound: false };
  }

  async deactivate(courseId) {
    const course = await Course.findByPk(courseId);

    if (!course) {
      return { notFound: true };
    }

    await course.update({ active: false });
    return { notFound: false };
  }
}

module.exports = new CourseAdminService();
