const { SalesAdminService } = require('../../services');

const AdminSalesHandler = {
  async dashboard(req, res) {
    try {
      const data = await SalesAdminService.getDashboardData(req.query);

      res.render('admin/sales/dashboard', {
        title: 'Dashboard de Vendas',
        user: req.user,
        layout: 'admin/layout',
        ...data
      });
    } catch (error) {
      console.error(error);
      res.redirect('/admin/dashboard?error=Erro ao carregar vendas');
    }
  }
};

module.exports = AdminSalesHandler;
