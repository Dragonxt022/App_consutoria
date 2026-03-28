const { SettingAdminService } = require('../../services');

const AdminSettingHandler = {
  async show(req, res) {
    const data = await SettingAdminService.getSettingsPageData(
      typeof req.query.tab === 'string' ? req.query.tab.trim() : ''
    );

    res.render('admin/settings/index', {
      title: 'Configurações do Site',
      user: req.user,
      layout: 'admin/layout',
      ...data
    });
  },

  async update(req, res) {
    try {
      const result = await SettingAdminService.saveSettings(req);
      return res.redirect(result.redirectTo);
    } catch (error) {
      console.error(error);
      const activeTab = SettingAdminService.resolveActiveTab(
        typeof req.body.active_tab === 'string' ? req.body.active_tab.trim() : ''
      );
      return res.redirect(`/admin/configuracoes?tab=${encodeURIComponent(activeTab)}&error=Erro ao atualizar configurações`);
    }
  }
};

module.exports = AdminSettingHandler;
