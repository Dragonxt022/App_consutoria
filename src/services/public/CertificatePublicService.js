const { Enrollment, Course, Setting } = require('../../models');
const {
  listCertificateBackgrounds,
  getDefaultCertificateBuilderConfig,
  normalizeCertificateBuilderConfig,
  buildCertificateRenderValues,
  buildCertificateRenderElements
} = require('../../utils/CertificateBuilder');
const { buildAppUrl } = require('../../utils/Url');

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

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

  sanitizeCertificateBackContent(rawHtml) {
    return String(rawHtml || '')
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/\son[a-z]+="[^"]*"/gi, '')
      .replace(/\son[a-z]+='[^']*'/gi, '')
      .replace(/\sstyle="[^"]*"/gi, '')
      .replace(/\sstyle='[^']*'/gi, '')
      .trim();
  }

  extractCertificateItemsFromHtml(rawHtml) {
    return decodeHtmlEntities(
      String(rawHtml || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6)>/gi, '\n')
        .replace(/<[^>]*>/g, ' ')
    )
      .replace(/\r/g, '\n')
      .split('\n')
      .map((item) => item.trim())
      .filter((item) => item.length > 1);
  }

  extractCertificateTopicsData(course) {
    const rawValue = course.certificateTopics;

    if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
      const html = this.sanitizeCertificateBackContent(rawValue.html || '');
      const items = Array.isArray(rawValue.items)
        ? rawValue.items.map((item) => String(item).trim()).filter((item) => item.length > 1)
        : this.extractCertificateItemsFromHtml(html);

      return {
        html,
        items: items.slice(0, 40)
      };
    }

    const items = Array.isArray(rawValue)
      ? rawValue.map((item) => String(item).trim()).filter((item) => item.length > 1)
      : [];

    return {
      html: '',
      items: items.slice(0, 40)
    };
  }

  extractCourseTopics(course) {
    const structuredTopics = this.extractCertificateTopicsData(course);
    const fromDedicatedField = structuredTopics.items;

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
      {
        signatureUrl: settings.certificate_signature_url || '',
        logoUrl: settings.logo_url || ''
      }
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
    const topicsData = this.extractCertificateTopicsData(course);

    return {
      enrollment,
      course,
      code: enrollment.certificateCode,
      settings,
      topics: this.extractCourseTopics(course),
      topicsHtml: topicsData.html
    };
  }

  async getDuplexViewData(code, req) {
    const front = await this.getFrontViewData(code, req);

    if (!front) {
      return null;
    }

    const topicsData = this.extractCertificateTopicsData(front.course);

    return {
      ...front,
      topics: this.extractCourseTopics(front.course),
      topicsHtml: topicsData.html
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
