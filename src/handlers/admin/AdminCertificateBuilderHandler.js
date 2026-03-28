const { CertificateBuilderAdminService } = require('../../services');

const AdminCertificateBuilderHandler = {
  async show(req, res) {
    const data = await CertificateBuilderAdminService.getEditorData();

    res.render('admin/certificates/builder', {
      title: 'Montar Certificado',
      user: req.user,
      layout: 'admin/layout',
      ...data
    });
  },

  async save(req, res) {
    try {
      await CertificateBuilderAdminService.saveEditor(req.body.certificate_builder_config);
      return res.redirect('/admin/certificados/montar?success=Modelo padrao do certificado salvo com sucesso!');
    } catch (error) {
      console.error(error);
      return res.redirect('/admin/certificados/montar?error=Erro ao salvar o modelo do certificado');
    }
  }
};

module.exports = AdminCertificateBuilderHandler;
