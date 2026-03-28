const { CertificatePublicService } = require('../../services');

const notFoundPayload = {
  title: 'Certificado não encontrado',
  message: 'O código informado não corresponde a nenhum certificado válido.',
  layout: false
};

const PublicCertificateHandler = {
  async view(req, res) {
    try {
      const data = await CertificatePublicService.getFrontViewData(req.params.code, req);

      if (!data) {
        return res.status(404).render('error', notFoundPayload);
      }

      return res.render('certificate/template', {
        layout: false,
        ...data
      });
    } catch (error) {
      console.error(error);
      return res.status(500).send('Erro ao gerar certificado');
    }
  },

  async viewBack(req, res) {
    try {
      const data = await CertificatePublicService.getBackViewData(req.params.code);

      if (!data) {
        return res.status(404).render('error', notFoundPayload);
      }

      return res.render('certificate/template-back', {
        layout: false,
        ...data
      });
    } catch (error) {
      console.error(error);
      return res.status(500).send('Erro ao gerar verso do certificado');
    }
  },

  async viewDuplex(req, res) {
    try {
      const data = await CertificatePublicService.getDuplexViewData(req.params.code, req);

      if (!data) {
        return res.status(404).render('error', notFoundPayload);
      }

      return res.render('certificate/template-duplex', {
        layout: false,
        ...data
      });
    } catch (error) {
      console.error(error);
      return res.status(500).send('Erro ao gerar certificado frente e verso');
    }
  },

  async validate(_req, res) {
    res.render('certificate/validate', {
      title: 'Validar Certificado',
      layout: 'public/layout',
      result: null,
      searchCode: ''
    });
  },

  async check(req, res) {
    try {
      const data = await CertificatePublicService.validateCode(req.body.code);

      return res.render('certificate/validate', {
        title: 'Validar Certificado',
        layout: 'public/layout',
        ...data
      });
    } catch (error) {
      console.error(error);
      return res.redirect('/validar-certificado?error=Erro ao validar');
    }
  }
};

module.exports = PublicCertificateHandler;
