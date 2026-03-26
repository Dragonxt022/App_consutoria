const { Setting } = require('../models');
const fs = require('fs');
const path = require('path');
const EmailService = require('../services/EmailService');
const SiteSettingsService = require('../services/SiteSettingsService');

class SettingController {
  getAllowedTabs() {
    return ['identidade', 'seo', 'loja', 'certificados', 'rodape', 'banners', 'email'];
  }

  getDefaultSettings() {
    return SiteSettingsService.getDefaultSettings();
  }

  resolveActiveTab(tab) {
    return this.getAllowedTabs().includes(tab) ? tab : 'identidade';
  }

  parseHomeBanners(rawValue) {
    if (!rawValue) return [];

    try {
      const parsed = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter(Boolean)
        .map((banner, index) => ({
          id: banner.id || `banner-${index + 1}`,
          name: banner.name || '',
          imageUrl: banner.imageUrl || '',
          link: banner.link || '',
          newTab: banner.newTab === true || banner.newTab === 'true'
        }))
        .slice(0, 6);
    } catch (error) {
      console.error('Erro ao interpretar banners da home:', error);
      return [];
    }
  }

  resolveLogoFilePath(logoUrl) {
    if (!logoUrl || typeof logoUrl !== 'string') return null;
    const prefix = '/uploads/logos/';
    if (!logoUrl.startsWith(prefix)) return null;
    const filename = path.basename(logoUrl);
    return path.join(__dirname, '..', 'public', 'uploads', 'logos', filename);
  }

  resolveSignatureFilePath(signatureUrl) {
    if (!signatureUrl || typeof signatureUrl !== 'string') return null;
    const prefix = '/uploads/certificates/signatures/';
    if (!signatureUrl.startsWith(prefix)) return null;
    const filename = path.basename(signatureUrl);
    return path.join(__dirname, '..', 'public', 'uploads', 'certificates', 'signatures', filename);
  }

  resolveBannerFilePath(bannerUrl) {
    if (!bannerUrl || typeof bannerUrl !== 'string') return null;
    const prefix = '/uploads/banners/';
    if (!bannerUrl.startsWith(prefix)) return null;
    const filename = path.basename(bannerUrl);
    return path.join(__dirname, '..', 'public', 'uploads', 'banners', filename);
  }

  async index(req, res) {
    const rawSettings = await Setting.findAll();
    const settings = {};
    rawSettings.forEach(s => settings[s.key] = s.value);

    const defaults = this.getDefaultSettings();
    const finalSettings = { ...defaults, ...settings };
    finalSettings.home_banners = this.parseHomeBanners(finalSettings.home_banners);
    const activeTab = this.resolveActiveTab(typeof req.query.tab === 'string' ? req.query.tab.trim() : '');

    res.render('admin/settings/index', {
      title: 'Configurações do Site',
      settings: finalSettings,
      activeTab,
      user: req.user,
      layout: 'admin/layout'
    });
  }

  async update(req, res) {
    try {
      const settings = req.body;
      const activeTab = this.resolveActiveTab(typeof req.body.active_tab === 'string' ? req.body.active_tab.trim() : '');
      const submitAction = typeof req.body.submit_action === 'string' ? req.body.submit_action.trim() : 'save';
      const currentLogo = await Setting.findOne({ where: { key: 'logo_url' } });
      const currentLogoUrl = currentLogo ? currentLogo.value : '';
      const currentSignature = await Setting.findOne({ where: { key: 'certificate_signature_url' } });
      const currentSignatureUrl = currentSignature ? currentSignature.value : '';
      const currentBannersSetting = await Setting.findOne({ where: { key: 'home_banners' } });
      const currentBanners = this.parseHomeBanners(currentBannersSetting ? currentBannersSetting.value : '[]');
      let nextSignatureUrl = null;
      let nextLogoUrl = null;
      let nextBanners = currentBanners;
      
      // Handle file upload for logo if present
      // multer.fields will populate req.files
      if (req.files) {
        if (req.files['logo'] && req.files['logo'][0]) {
          nextLogoUrl = `/uploads/logos/${req.files['logo'][0].filename}`;
        }
        if (req.files['cert_signature'] && req.files['cert_signature'][0]) {
          nextSignatureUrl = `/uploads/certificates/signatures/${req.files['cert_signature'][0].filename}`;
        }
      }

      if (nextLogoUrl) {
        settings.logo_url = nextLogoUrl;
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
      }

      const uploadedBannerFiles = req.files || {};
      const parsedBanners = [];
      const previousBannerImages = currentBanners.map((banner) => banner.imageUrl).filter(Boolean);

      for (let index = 0; index < 6; index += 1) {
        const name = String(settings[`banner_name_${index}`] || '').trim();
        const link = String(settings[`banner_link_${index}`] || '').trim();
        const newTab = settings[`banner_new_tab_${index}`] === '1';
        const existingImage = String(settings[`banner_existing_image_${index}`] || '').trim();
        const removeBanner = settings[`banner_remove_${index}`] === '1';
        const uploadedFile = uploadedBannerFiles[`banner_image_${index}`] && uploadedBannerFiles[`banner_image_${index}`][0];
        const nextImageUrl = uploadedFile ? `/uploads/banners/${uploadedFile.filename}` : existingImage;

        if (removeBanner || (!name && !link && !uploadedFile && !existingImage)) {
          continue;
        }

        if (!nextImageUrl) {
          continue;
        }

        parsedBanners.push({
          id: `banner-${index + 1}`,
          name: name || `Banner ${index + 1}`,
          imageUrl: nextImageUrl,
          link,
          newTab
        });
      }

      nextBanners = parsedBanners.slice(0, 6);
      settings.home_banners = JSON.stringify(nextBanners);

      // Campos temporários de formulário não devem ir para a tabela de settings
      delete settings.certificate_signature_base64;
      delete settings.active_tab;
      delete settings.submit_action;
      for (let index = 0; index < 6; index += 1) {
        delete settings[`banner_name_${index}`];
        delete settings[`banner_link_${index}`];
        delete settings[`banner_new_tab_${index}`];
        delete settings[`banner_existing_image_${index}`];
        delete settings[`banner_remove_${index}`];
      }

      for (let [key, value] of Object.entries(settings)) {
        // Handle checkbox/hidden input combo
        if (Array.isArray(value)) {
          value = value[value.length - 1];
        }
        await Setting.upsert({ key, value: String(value) });
      }

      // Remove arquivos antigos somente depois de persistir com sucesso
      if (nextLogoUrl && currentLogoUrl && currentLogoUrl !== nextLogoUrl) {
        const oldLogoPath = this.resolveLogoFilePath(currentLogoUrl);
        if (oldLogoPath && fs.existsSync(oldLogoPath)) {
          fs.unlinkSync(oldLogoPath);
        }
      }

      if (nextSignatureUrl && currentSignatureUrl && currentSignatureUrl !== nextSignatureUrl) {
        const oldFilePath = this.resolveSignatureFilePath(currentSignatureUrl);
        if (oldFilePath && fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      const currentBannerImagesSet = new Set(previousBannerImages);
      const nextBannerImagesSet = new Set(nextBanners.map((banner) => banner.imageUrl).filter(Boolean));
      currentBannerImagesSet.forEach((imageUrl) => {
        if (!nextBannerImagesSet.has(imageUrl)) {
          const oldBannerPath = this.resolveBannerFilePath(imageUrl);
          if (oldBannerPath && fs.existsSync(oldBannerPath)) {
            fs.unlinkSync(oldBannerPath);
          }
        }
      });

      if (submitAction === 'test_email') {
        const recipient = req.user?.email;

        if (!recipient) {
          return res.redirect(`/admin/configuracoes?tab=${encodeURIComponent(activeTab)}&error=Não foi possível identificar o e-mail do administrador logado.`);
        }

        const sent = await EmailService.sendEmail(
          recipient,
          'Teste de configuração SMTP',
          `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
              <h2 style="color: #4f46e5;">Teste de envio concluído</h2>
              <p>Olá,</p>
              <p>Este e-mail confirma que a configuração SMTP salva no painel conseguiu realizar o envio com sucesso.</p>
              <p><strong>Data do teste:</strong> ${new Date().toLocaleString('pt-BR')}</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;">
              <p style="font-size: 12px; color: #777;">Se você recebeu esta mensagem, o envio de confirmações e notificações já está operacional.</p>
            </div>
          `
        );

        if (!sent) {
          return res.redirect(`/admin/configuracoes?tab=${encodeURIComponent(activeTab)}&error=Falha ao enviar o e-mail de teste. Revise host, porta, usuário, senha e remetente SMTP.`);
        }

        return res.redirect(`/admin/configuracoes?tab=${encodeURIComponent(activeTab)}&success=E-mail de teste enviado para ${encodeURIComponent(recipient)}.`);
      }

      res.redirect(`/admin/configuracoes?tab=${encodeURIComponent(activeTab)}&success=Configurações atualizadas com sucesso!`);
    } catch (error) {
      console.error(error);
      const activeTab = this.resolveActiveTab(typeof req.body.active_tab === 'string' ? req.body.active_tab.trim() : '');
      res.redirect(`/admin/configuracoes?tab=${encodeURIComponent(activeTab)}&error=Erro ao atualizar configurações`);
    }
  }

  // Helper to get settings in middleware
  async getSettings() {
    const finalSettings = await SiteSettingsService.getSettings();
    finalSettings.home_banners = this.parseHomeBanners(finalSettings.home_banners);
    return finalSettings;
  }
}

module.exports = new SettingController();
