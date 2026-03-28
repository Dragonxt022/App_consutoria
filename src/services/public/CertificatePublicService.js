const { Enrollment, Course, Setting } = require('../../models');
const {
  listCertificateBackgrounds,
  getDefaultCertificateBuilderConfig,
  normalizeCertificateBuilderConfig,
  buildCertificateRenderValues,
  buildCertificateRenderElements
} = require('../../utils/certificateBuilder');
const { buildAppUrl } = require('../../utils/url');

class CertificatePublicService {
  async loadSettings() {
    const rawSettings = await Setting.findAll();
    const settings = {};
    rawSettings.forEach((entry) => {
      settings[entry.key] = entry.value;
    });
    return settings;
  }

  loadBuilderConfig(settings) {
    const backgrounds = listCertificateBackgrounds();
    let parsed = null;

    if (settings.certificate_builder_config) {
      try {
        parsed = JSON.parse(settings.certificate_builder_config);
      } catch (error) {
        console.error('Erro ao interpretar layout salvo do certificado:', error);
      }
    }

    return normalizeCertificateBuilderConfig(
      parsed || getDefaultCertificateBuilderConfig(backgrounds[0] || ''),
      backgrounds
    );
  }

  extractCourseTopics(course) {
    const fromDedicatedField = Array.isArray(course.certificateTopics)
      ? course.certificateTopics.map((item) => String(item).trim()).filter((item) => item.length > 1)
      : [];

    if (fromDedicatedField.length > 0) {
      return fromDedicatedField.slice(0, 40);
    }

    const fromDescription = (course.description || '')
      .replace(/\r/g, '\n')
      .split(/\n|•|-|;/g)
      .map((item) => item.trim())
      .filter((item) => item.length > 4);

    const fromSentences = fromDescription.length > 0
      ? fromDescription
      : (course.description || '')
          .split('.')
          .map((item) => item.trim())
          .filter((item) => item.length > 8);

    const fromItemsIncluded = Array.isArray(course.itemsIncluded)
      ? course.itemsIncluded.map((item) => String(item).trim()).filter((item) => item.length > 1)
      : [];

    const merged = [...fromSentences, ...fromItemsIncluded];
    const unique = [];
    const seen = new Set();

    for (const topic of merged) {
      const normalized = topic.toLowerCase();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      unique.push(topic.replace(/\.$/, ''));
    }

    return unique.slice(0, 40);
  }

  async getEnrollmentByCode(code) {
    return Enrollment.findOne({
      where: { certificateCode: code },
      include: [{ model: Course }]
    });
  }

  async getFrontViewData(code, req) {
    const enrollment = await Enrollment.findOne({
      where: { certificateCode: code },
      include: [{ model: Course }]
    });

    if (!enrollment) {
      return null;
    }

    const settings = await this.loadSettings();
    const builderConfig = this.loadBuilderConfig(settings);
    const renderValues = buildCertificateRenderValues({
      enrollment,
      course: enrollment.Course,
      code: enrollment.certificateCode,
      validationUrl: buildAppUrl(req, '/validar-certificado')
    });
    const renderElements = buildCertificateRenderElements(
      builderConfig,
      renderValues,
      settings.certificate_signature_url || ''
    );

    return {
      enrollment,
      course: enrollment.Course,
      code: enrollment.certificateCode,
      validationUrl: buildAppUrl(req, '/validar-certificado'),
      settings,
      builderConfig,
      renderElements
    };
  }

  async getBackViewData(code) {
    const enrollment = await Enrollment.findOne({
      where: { certificateCode: code },
      include: [{ model: Course }]
    });

    if (!enrollment) {
      return null;
    }

    const settings = await this.loadSettings();
    const course = enrollment.Course;

    return {
      enrollment,
      course,
      code: enrollment.certificateCode,
      settings,
      topics: this.extractCourseTopics(course)
    };
  }

  async getDuplexViewData(code, req) {
    const front = await this.getFrontViewData(code, req);

    if (!front) {
      return null;
    }

    return {
      ...front,
      topics: this.extractCourseTopics(front.course)
    };
  }

  async validateCode(code) {
    const cleanCode = code ? code.trim() : '';
    const enrollment = await Enrollment.findOne({
      where: { certificateCode: cleanCode },
      include: [{ model: Course }]
    });

    return {
      searchCode: cleanCode,
      result: enrollment ? {
        valid: true,
        studentName: enrollment.studentName,
        courseTitle: enrollment.Course.title,
        completionDate: enrollment.updatedAt,
        workload: enrollment.Course.workload
      } : { valid: false }
    };
  }
}

module.exports = new CertificatePublicService();
