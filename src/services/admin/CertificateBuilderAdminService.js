const { Setting } = require('../../models');
const {
  SAMPLE_VALUES,
  listCertificateBackgrounds,
  getDefaultCertificateBuilderConfig,
  normalizeCertificateBuilderConfig,
  buildCertificateRenderElements
} = require('../../utils/CertificateBuilder');

class CertificateBuilderAdminService {
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

  async getEditorData() {
    const backgrounds = listCertificateBackgrounds();
    const storedConfig = await this.getStoredConfig();
    const signatureSetting = await Setting.findOne({ where: { key: 'certificate_signature_url' } });
    const logoSetting = await Setting.findOne({ where: { key: 'logo_url' } });
    const config = normalizeCertificateBuilderConfig(
      storedConfig || getDefaultCertificateBuilderConfig(backgrounds[0] || ''),
      backgrounds
    );

    return {
      backgrounds,
      builderConfig: config,
      previewElements: buildCertificateRenderElements(config, SAMPLE_VALUES, {
        signatureUrl: signatureSetting ? signatureSetting.value : '',
        logoUrl: logoSetting ? logoSetting.value : ''
      }),
      sampleValues: SAMPLE_VALUES
    };
  }

  async saveEditor(rawConfig) {
    const backgrounds = listCertificateBackgrounds();
    const parsed = rawConfig
      ? JSON.parse(rawConfig)
      : getDefaultCertificateBuilderConfig(backgrounds[0] || '');

    const config = normalizeCertificateBuilderConfig(parsed, backgrounds);

    await Setting.upsert({
      key: 'certificate_builder_config',
      value: JSON.stringify(config)
    });
  }
}

module.exports = new CertificateBuilderAdminService();
