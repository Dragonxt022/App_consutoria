const { UpdateAdminService } = require('../../services');

const AdminUpdateHandler = {
  async show(req, res) {
    const data = await UpdateAdminService.getUpdatesPageData();

    res.render('admin/updates/index', {
      title: 'Atualizações da Aplicação',
      user: req.user,
      layout: 'admin/layout',
      ...data
    });
  }
};

module.exports = AdminUpdateHandler;
