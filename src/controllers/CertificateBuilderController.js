const { Setting } = require('../models');
const {
  SAMPLE_VALUES,
  listCertificateBackgrounds,
  getDefaultCertificateBuilderConfig,
  normalizeCertificateBuilderConfig,
  buildCertificateRenderElements
} = require('../utils/certificateBuilder');

class CertificateBuilderController {
  async getStoredConfig() {
    const entry = await Setting.findOne({ where: { key: 'certificate_builder_config' } });
    if (!entry || !entry.value) return null;

    try {
      return JSON.parse(entry.value);
    } catch (error) {
      console.error('Erro ao ler configuracao do montador de certificado:', error);
      return null;
    }
  }

  async showEditor(req, res) {
    const backgrounds = listCertificateBackgrounds();
    const storedConfig = await this.getStoredConfig();
    const signatureSetting = await Setting.findOne({ where: { key: 'certificate_signature_url' } });
    const config = normalizeCertificateBuilderConfig(
      storedConfig || getDefaultCertificateBuilderConfig(backgrounds[0] || ''),
      backgrounds
    );

    res.render('admin/certificates/builder', {
      title: 'Montar Certificado',
      backgrounds,
      builderConfig: config,
      previewElements: buildCertificateRenderElements(config, SAMPLE_VALUES, signatureSetting ? signatureSetting.value : ''),
      sampleValues: SAMPLE_VALUES,
      user: req.user,
      layout: 'admin/layout'
    });
  }

  async saveEditor(req, res) {
    try {
      const backgrounds = listCertificateBackgrounds();
      const parsed = req.body.certificate_builder_config
        ? JSON.parse(req.body.certificate_builder_config)
        : getDefaultCertificateBuilderConfig(backgrounds[0] || '');

      const config = normalizeCertificateBuilderConfig(parsed, backgrounds);

      await Setting.upsert({
        key: 'certificate_builder_config',
        value: JSON.stringify(config)
      });

      res.redirect('/admin/certificados/montar?success=Modelo padrao do certificado salvo com sucesso!');
    } catch (error) {
      console.error(error);
      res.redirect('/admin/certificados/montar?error=Erro ao salvar o modelo do certificado');
    }
  }
}

module.exports = new CertificateBuilderController();
