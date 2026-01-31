const { Course, User, Enrollment } = require('../models');

class HomeController {
  async index(req, res) {
    res.render('public/home', {
      title: 'Página Inicial',
      user: req.user
    });
  }

  async adminDashboard(req, res) {
    const courseCount = await Course.count();
    const studentCount = await User.count({ where: { role: 'aluno' } });
    const enrollmentCount = await Enrollment.count({ where: { status: 'pendente' } });
    
    res.render('admin/dashboard', {
      title: 'Dashboard Administrativo',
      user: req.user,
      stats: {
        courses: courseCount,
        students: studentCount,
        enrollments: enrollmentCount
      },
      layout: 'admin/layout'
    });
  }

  async alunoDashboard(req, res) {
    const enrollments = await Enrollment.findAll({
      where: { userId: req.user.id },
      include: [{ model: Course }]
    });

    const certificateCount = enrollments.filter(e => e.status === 'completo').length;

    res.render('aluno/dashboard', {
      title: 'Dashboard Aluno',
      user: req.user,
      enrollments,
      certificateCount
    });
  }
}

module.exports = new HomeController();