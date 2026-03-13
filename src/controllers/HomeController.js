const { Course, User, Enrollment, Product } = require('../models');
const { formatCurrency } = require('../utils/currencyFormatter');

class HomeController {
  async index(req, res) {
    res.render('public/home', {
      title: 'Página Inicial',
      user: req.user
    });
  }

  async adminDashboard(req, res) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [
      courseCount,
      activeCourseCount,
      studentCount,
      pendingEnrollmentCount,
      confirmedSalesCount,
      activeProductCount,
      featuredProductCount,
      monthlyRevenue,
      recentEnrollments
    ] = await Promise.all([
      Course.count(),
      Course.count({ where: { active: true } }),
      User.count({ where: { role: 'aluno' } }),
      Enrollment.count({ where: { status: 'pendente' } }),
      Enrollment.count({ where: { status: ['confirmado', 'completo'] } }),
      Product.count({ where: { active: true } }),
      Product.count({ where: { active: true, featured: true } }),
      Enrollment.sum('finalPrice', {
        where: {
          status: ['confirmado', 'completo'],
          createdAt: {
            [require('sequelize').Op.gte]: monthStart,
            [require('sequelize').Op.lt]: nextMonthStart
          }
        }
      }),
      Enrollment.findAll({
        include: [{ model: Course, attributes: ['title'] }],
        order: [['createdAt', 'DESC']],
        limit: 5
      })
    ]);
    
    res.render('admin/dashboard', {
      title: 'Dashboard Administrativo',
      user: req.user,
      stats: {
        courses: courseCount,
        activeCourses: activeCourseCount,
        students: studentCount,
        enrollments: pendingEnrollmentCount,
        confirmedSales: confirmedSalesCount,
        products: activeProductCount,
        featuredProducts: featuredProductCount,
        monthlyRevenue: monthlyRevenue || 0
      },
      recentEnrollments,
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
      certificateCount,
      formatCurrency
    });
  }

  async contact(req, res) {
    res.render('public/contact', {
      title: 'Fale Conosco',
      layout: 'public/layout'
    });
  }

  async privacyPolicy(req, res) {
    res.render('public/privacy', {
      title: 'Política de Privacidade e LGPD',
      layout: 'public/layout'
    });
  }
}

module.exports = new HomeController();
