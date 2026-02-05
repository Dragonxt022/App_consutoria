const { Enrollment, Course, User } = require('../models');
const { Op } = require('sequelize');

class CertificateController {
  
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

      res.render('certificate/template', {
        layout: false,
        enrollment,
        course: enrollment.Course,
        code: enrollment.certificateCode,
        validationUrl: `${req.protocol}://${req.get('host')}/validar-certificado`
      });

    } catch (error) {
      console.error(error);
      res.status(500).send('Erro ao gerar certificado');
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
