const { Setting } = require('../models');

class SettingController {
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
      
      // Handle file upload for logo if present
      if (req.file) {
        settings.logo_url = `/uploads/courses/images/${req.file.filename}`;
      }

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

    return { ...defaults, ...settings };
  }
}

module.exports = new SettingController();
