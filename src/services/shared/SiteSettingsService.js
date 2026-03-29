const { Setting } = require('../../models');

const defaultSettings = {
  site_name: 'ConsultPro',
  seo_site_title: 'ConsultPro | Início',
  seo_site_description: 'Treinamentos, cursos e conteúdos para capacitação profissional no setor público e privado.',
  seo_site_keywords: 'cursos, treinamentos, capacitação, certificações',
  use_logo: 'false',
  logo_url: '',
  app_icon_url: '',
  show_course_store_offers: 'false',
  footer_email: 'contato@consultpro.com.br',
  footer_phone: '(11) 99999-9999',
  footer_address: 'Av. Paulista, 1000 - SP',
  footer_copyright: '2026 ConsultPro Treinamentos. Todos os direitos reservados.',
  social_instagram: '',
  social_facebook: '',
  social_linkedin: '',
  social_youtube: '',
  social_whatsapp: '',
  link_aluno: '/login',
  link_cursos: '#cursos',
  smtp_host: 'smtp.mailtrap.io',
  smtp_port: '2525',
  smtp_user: '',
  smtp_pass: '',
  smtp_from: 'noreply@consultpro.com.br',
  email_notify_admin_new_enrollment: 'true',
  email_notify_students_course_confirmed: 'true',
  email_notify_student_enrollment_confirmed: 'true',
  email_notify_student_enrollment_cancelled: 'true',
  certificate_signature_url: '',
  home_banners: []
};

class SiteSettingsService {
  async getSettings() {
    const rawSettings = await Setting.findAll();
    const settings = {};
    rawSettings.forEach((setting) => {
      settings[setting.key] = setting.value;
    });

    return {
      ...defaultSettings,
      ...settings
    };
  }

  getDefaultSettings() {
    return { ...defaultSettings };
  }
}

module.exports = new SiteSettingsService();
