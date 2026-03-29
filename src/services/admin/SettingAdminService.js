const fs = require('fs');
const path = require('path');
const { Setting } = require('../../models');
const {
  ensureDir,
  getMutableUploadPath,
  resolveUploadUrlToPath
} = require('../../utils/UploadPaths');
const { EmailService, NotificationService, SiteSettingsService } = require('../shared');

class SettingAdminService {
  getAllowedTabs() {
    return ['identidade', 'seo', 'loja', 'certificados', 'rodape', 'banners', 'email'];
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
    return resolveUploadUrlToPath(logoUrl);
  }

  resolveSignatureFilePath(signatureUrl) {
    return resolveUploadUrlToPath(signatureUrl);
  }

  resolveBannerFilePath(bannerUrl) {
    return resolveUploadUrlToPath(bannerUrl);
  }

  async getSettingsPageData(activeTab) {
    const rawSettings = await Setting.findAll();
    const settings = {};

    rawSettings.forEach((setting) => {
      settings[setting.key] = setting.value;
    });

    const finalSettings = {
      ...SiteSettingsService.getDefaultSettings(),
      ...settings
    };

    finalSettings.home_banners = this.parseHomeBanners(finalSettings.home_banners);

    return {
      settings: finalSettings,
      activeTab: this.resolveActiveTab(activeTab)
    };
  }

  async saveSettings(req) {
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

    if (req.files) {
      if (req.files.logo && req.files.logo[0]) {
        nextLogoUrl = `/uploads/logos/${req.files.logo[0].filename}`;
      }
      if (req.files.cert_signature && req.files.cert_signature[0]) {
        nextSignatureUrl = `/uploads/certificates/signatures/${req.files.cert_signature[0].filename}`;
      }
    }

    if (nextLogoUrl) {
      settings.logo_url = nextLogoUrl;
    }

    if (settings.certificate_signature_base64 && settings.certificate_signature_base64.startsWith('data:image')) {
      try {
        const matches = settings.certificate_signature_base64.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/);
        if (matches) {
          const ext = matches[2] === 'jpeg' ? 'jpg' : matches[2];
          const data = matches[3];
          const filename = `signature-${Date.now()}.${ext}`;
          const targetDir = getMutableUploadPath('certificates', 'signatures');
          ensureDir(targetDir);
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
      if (Array.isArray(value)) {
        value = value[value.length - 1];
      }

      await Setting.upsert({ key, value: String(value) });
    }

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
        return {
          activeTab,
          redirectTo: `/admin/configuracoes?tab=${encodeURIComponent(activeTab)}&error=Não foi possível identificar o e-mail do administrador logado.`
        };
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
        await NotificationService.createSmtpFailureNotification({
          area: 'configuracoes-email',
          details: 'O teste manual do administrador falhou com a configuração SMTP atual.'
        });

        return {
          activeTab,
          redirectTo: `/admin/configuracoes?tab=${encodeURIComponent(activeTab)}&error=Falha ao enviar o e-mail de teste. Revise host, porta, usuário, senha e remetente SMTP.`
        };
      }

      return {
        activeTab,
        redirectTo: `/admin/configuracoes?tab=${encodeURIComponent(activeTab)}&success=E-mail de teste enviado para ${encodeURIComponent(recipient)}.`
      };
    }

    return {
      activeTab,
      redirectTo: `/admin/configuracoes?tab=${encodeURIComponent(activeTab)}&success=Configurações atualizadas com sucesso!`
    };
  }
}

module.exports = new SettingAdminService();
