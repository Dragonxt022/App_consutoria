const { Enrollment, Course, User, Setting } = require('../models');
const { Op } = require('sequelize');

class CertificateController {
  async loadSettings() {
    const rawSettings = await Setting.findAll();
    const settings = {};
    rawSettings.forEach((s) => { settings[s.key] = s.value; });
    return settings;
  }

  extractCourseTopics(course) {
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
  
  // Public View: Render certificate by code
  async view(req, res) {
    try {
      const { code } = req.params;
      
      const enrollment = await Enrollment.findOne({
        where: { certificateCode: code },
        include: [{ model: Course }]
      });

      if (!enrollment) {
        return res.status(404).render('error', { 
            title: 'Certificado não encontrado', 
            message: 'O código informado não corresponde a nenhum certificado válido.',
            layout: false 
        });
      }

      // Load settings for certificate (signature url, template)
      const settings = await this.loadSettings();

      res.render('certificate/template', {
        layout: false,
        enrollment,
        course: enrollment.Course,
        code: enrollment.certificateCode,
        validationUrl: `${req.protocol}://${req.get('host')}/validar-certificado`,
        settings
      });

    } catch (error) {
      console.error(error);
      res.status(500).send('Erro ao gerar certificado');
    }
  }

  async viewBack(req, res) {
    try {
      const { code } = req.params;
      const enrollment = await Enrollment.findOne({
        where: { certificateCode: code },
        include: [{ model: Course }]
      });

      if (!enrollment) {
        return res.status(404).render('error', {
          title: 'Certificado não encontrado',
          message: 'O código informado não corresponde a nenhum certificado válido.',
          layout: false
        });
      }

      const settings = await this.loadSettings();
      const course = enrollment.Course;
      const topics = this.extractCourseTopics(course);

      res.render('certificate/template-back', {
        layout: false,
        enrollment,
        course,
        code: enrollment.certificateCode,
        settings,
        topics
      });
    } catch (error) {
      console.error(error);
      res.status(500).send('Erro ao gerar verso do certificado');
    }
  }

  async viewDuplex(req, res) {
    try {
      const { code } = req.params;
      const enrollment = await Enrollment.findOne({
        where: { certificateCode: code },
        include: [{ model: Course }]
      });

      if (!enrollment) {
        return res.status(404).render('error', {
          title: 'Certificado não encontrado',
          message: 'O código informado não corresponde a nenhum certificado válido.',
          layout: false
        });
      }

      const settings = await this.loadSettings();
      const course = enrollment.Course;
      const topics = this.extractCourseTopics(course);

      res.render('certificate/template-duplex', {
        layout: false,
        enrollment,
        course,
        code: enrollment.certificateCode,
        validationUrl: `${req.protocol}://${req.get('host')}/validar-certificado`,
        settings,
        topics
      });
    } catch (error) {
      console.error(error);
      res.status(500).send('Erro ao gerar certificado frente e verso');
    }
  }

  // Public View: Validation Page
  async validate(req, res) {
    res.render('certificate/validate', {
      title: 'Validar Certificado',
      layout: 'public/layout',
      result: null,
      searchCode: ''
    });
  }

  // Public Action: Check certificate
  async check(req, res) {
    try {
      const { code } = req.body;
      const cleanCode = code ? code.trim() : '';

      const enrollment = await Enrollment.findOne({
        where: { certificateCode: cleanCode },
        include: [{ model: Course }]
      });

      res.render('certificate/validate', {
        title: 'Validar Certificado',
        layout: 'public/layout',
        result: enrollment ? {
            valid: true,
            studentName: enrollment.studentName,
            courseTitle: enrollment.Course.title,
            completionDate: enrollment.updatedAt,
            workload: enrollment.Course.workload
        } : { valid: false },
        searchCode: cleanCode
      });

    } catch (error) {
      console.error(error);
      res.redirect('/validar-certificado?error=Erro ao validar');
    }
  }
}

module.exports = new CertificateController();
