const { Setting } = require('../models');
const fs = require('fs');
const path = require('path');

class SettingController {
  resolveSignatureFilePath(signatureUrl) {
    if (!signatureUrl || typeof signatureUrl !== 'string') return null;
    const prefix = '/uploads/certificates/signatures/';
    if (!signatureUrl.startsWith(prefix)) return null;
    const filename = path.basename(signatureUrl);
    return path.join(__dirname, '..', 'public', 'uploads', 'certificates', 'signatures', filename);
  }

  async index(req, res) {
    const rawSettings = await Setting.findAll();
    const settings = {};
    rawSettings.forEach(s => settings[s.key] = s.value);

    const defaults = {
        site_name: 'ConsultPro',
        use_logo: 'false',
        logo_url: '',
        footer_email: 'contato@consultpro.com.br',
        footer_phone: '(11) 99999-9999',
        footer_address: 'Av. Paulista, 1000 - SP',
        footer_copyright: '2026 ConsultPro Treinamentos. Todos os direitos reservados.',
        link_aluno: '/login',
        link_cursos: '#cursos',
        smtp_host: 'smtp.mailtrap.io',
        smtp_port: '2525',
        smtp_user: '',
        smtp_pass: '',
        smtp_from: 'noreply@consultpro.com.br'
    };

      // Certificate defaults
      defaults.certificate_default_template = 'classic';
      defaults.certificate_signature_url = '';

    const finalSettings = { ...defaults, ...settings };

    res.render('admin/settings/index', {
      title: 'Configurações do Site',
      settings: finalSettings,
      user: req.user,
      layout: 'admin/layout'
    });
  }

  async update(req, res) {
    try {
      const settings = req.body;
      const currentSignature = await Setting.findOne({ where: { key: 'certificate_signature_url' } });
      const currentSignatureUrl = currentSignature ? currentSignature.value : '';
      let nextSignatureUrl = null;
      
      // Handle file upload for logo if present
      // multer.fields will populate req.files
      if (req.files) {
        if (req.files['logo'] && req.files['logo'][0]) {
          settings.logo_url = `/uploads/logos/${req.files['logo'][0].filename}`;
        }
        if (req.files['cert_signature'] && req.files['cert_signature'][0]) {
          nextSignatureUrl = `/uploads/certificates/signatures/${req.files['cert_signature'][0].filename}`;
        }
      }

      // If a base64 signature was drawn in the modal, save it to disk
      if (settings.certificate_signature_base64 && settings.certificate_signature_base64.startsWith('data:image')) {
        try {
          const matches = settings.certificate_signature_base64.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/);
          if (matches) {
            const ext = matches[2] === 'jpeg' ? 'jpg' : matches[2];
            const data = matches[3];
            const filename = `signature-${Date.now()}.${ext}`;
            const targetDir = path.join(__dirname, '..', 'public', 'uploads', 'certificates', 'signatures');
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
            const filePath = path.join(targetDir, filename);
            fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
            nextSignatureUrl = `/uploads/certificates/signatures/${filename}`;
          }
        } catch (err) {
          console.error('Erro ao salvar assinatura base64:', err);
        }
      }

      if (nextSignatureUrl) {
        settings.certificate_signature_url = nextSignatureUrl;
        if (currentSignatureUrl && currentSignatureUrl !== nextSignatureUrl) {
          const oldFilePath = this.resolveSignatureFilePath(currentSignatureUrl);
          if (oldFilePath && fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }
      }

      // Campos temporários de formulário não devem ir para a tabela de settings
      delete settings.certificate_signature_base64;

      for (let [key, value] of Object.entries(settings)) {
        // Handle checkbox/hidden input combo
        if (Array.isArray(value)) {
          value = value[value.length - 1];
        }
        await Setting.upsert({ key, value: String(value) });
      }

      res.redirect('/admin/configuracoes?success=Configurações atualizadas com sucesso!');
    } catch (error) {
      console.error(error);
      res.redirect('/admin/configuracoes?error=Erro ao atualizar configurações');
    }
  }

  // Helper to get settings in middleware
  async getSettings() {
    const rawSettings = await Setting.findAll();
    const settings = {};
    rawSettings.forEach(s => settings[s.key] = s.value);
    
    // Default values if not set
    const defaults = {
        site_name: 'ConsultPro',
        use_logo: 'false',
        logo_url: '',
        footer_email: 'contato@consultpro.com.br',
        footer_phone: '(11) 99999-9999',
        footer_address: 'Av. Paulista, 1000 - SP',
        footer_copyright: '2026 ConsultPro Treinamentos. Todos os direitos reservados.',
        link_aluno: '/login',
        link_cursos: '#cursos',
        smtp_host: 'smtp.mailtrap.io',
        smtp_port: '2525',
        smtp_user: '',
        smtp_pass: '',
        smtp_from: 'noreply@consultpro.com.br'
    };

      // Certificate defaults
      defaults.certificate_default_template = 'classic';
      defaults.certificate_signature_url = '';

    return { ...defaults, ...settings };
  }
}

module.exports = new SettingController();
