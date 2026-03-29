const { HomeService, CoursePublicService } = require('../../services');
const { formatCurrency } = require('../../utils/CurrencyFormatter');

const PublicHandler = {
  async home(req, res) {
    const data = await HomeService.getHomePageData();

    res.render('public/home', {
      title: 'Consultoria Profissional | Início',
      layout: 'public/layout',
      ...data
    });
  },

  async contact(_req, res) {
    res.render('public/contact', {
      title: 'Fale Conosco',
      layout: 'public/layout'
    });
  },

  async privacyPolicy(_req, res) {
    res.render('public/privacy', {
      title: 'Política de Privacidade e LGPD',
      layout: 'public/layout'
    });
  },

  async publicCourses(_req, res) {
    const courses = await CoursePublicService.listPublicCourses();

    res.render('public/courses', {
      title: 'Todos os Cursos | Consultoria',
      courses,
      layout: 'public/layout'
    });
  },

  async courseDetails(req, res) {
    const data = await CoursePublicService.getPublicCourseDetails(req.params.id);

    if (!data) {
      return res.status(404).render('error', {
        title: 'Curso não encontrado',
        layout: false
      });
    }

    return res.render('public/course-details', {
      title: `${data.course.title} | Consultoria`,
      layout: 'public/layout',
      ...data
    });
  },

  async enrollForm(req, res) {
    const data = await CoursePublicService.getEnrollmentFormData(req.params.id, req.user);

    if (!data) {
      return res.redirect('/?error=Inscrições encerradas para este curso');
    }

    return res.render('public/enroll', {
      title: `Inscrição - ${data.course.title}`,
      layout: 'public/layout',
      ...data
    });
  },

  async submitEnrollment(req, res) {
    const result = await CoursePublicService.submitEnrollment(req);
    return res.redirect(result.redirectTo);
  },

  async thankYou(_req, res) {
    res.render('public/thank-you', {
      title: 'Obrigado pela sua Inscrição!',
      layout: 'public/layout'
    });
  },

  async adminDashboard(req, res) {
    const data = await HomeService.getAdminDashboardData();

    res.render('admin/dashboard', {
      title: 'Dashboard Administrativo',
      user: req.user,
      layout: 'admin/layout',
      ...data
    });
  },

  async studentDashboard(req, res) {
    const data = await HomeService.getStudentDashboardData(req.user.id);

    res.render('aluno/dashboard', {
      title: 'Dashboard Aluno',
      user: req.user,
      formatCurrency,
      layout: 'public/layout',
      currentStudentSection: 'dashboard',
      ...data
    });
  }
};

module.exports = PublicHandler;
