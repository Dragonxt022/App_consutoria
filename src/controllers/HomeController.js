class HomeController {
  async index(req, res) {
    res.render('public/home', { 
      title: 'Página Inicial',
      user: req.user
    });
  }

  async adminDashboard(req, res) {
    res.render('admin/dashboard', { 
      title: 'Dashboard Administrativo',
      user: req.user
    });
  }

  async alunoDashboard(req, res) {
    res.render('aluno/dashboard', { 
      title: 'Dashboard Aluno',
      user: req.user
    });
  }
}

module.exports = new HomeController();