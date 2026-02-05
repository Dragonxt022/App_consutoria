const express = require('express');
const router = express.Router();
const HomeController = require('../controllers/HomeController');
const CourseController = require('../controllers/CourseController');
const SettingController = require('../controllers/SettingController');
const EnrollmentController = require('../controllers/EnrollmentController');
const { authMiddleware, guestMiddleware, publicMiddleware } = require('../middleware/auth'); // Adicione publicMiddleware
const upload = require('../config/multer');

// Rotas públicas do site institucional - use publicMiddleware
router.get('/', publicMiddleware, (req, res) => CourseController.index(req, res));
router.get('/cursos', publicMiddleware, (req, res) => CourseController.publicList(req, res));
router.get('/contato', publicMiddleware, (req, res) => HomeController.contact(req, res));
router.get('/politica-de-privacidade', publicMiddleware, (req, res) => HomeController.privacyPolicy(req, res));
router.get('/curso/:id', publicMiddleware, (req, res) => CourseController.details(req, res));
router.get('/inscrever/:id', publicMiddleware, (req, res) => CourseController.enrollForm(req, res));
router.post('/inscrever', publicMiddleware, (req, res) => CourseController.submitEnrollment(req, res));
router.get('/obrigado', publicMiddleware, (req, res) => CourseController.thankYou(req, res));

// Rota para certificado individual (requer autenticação)
router.get('/meu-certificado/:id', authMiddleware('aluno'), (req, res) => EnrollmentController.generateIndividualJson(req, res));

// Admin Enrollment Routes
router.get('/admin/inscricoes', authMiddleware('admin'), (req, res) => EnrollmentController.adminList(req, res));
router.post('/admin/inscricoes/:id/status', authMiddleware('admin'), (req, res) => EnrollmentController.updateStatus(req, res));
router.get('/admin/inscricoes/:id/json', authMiddleware('admin'), (req, res) => EnrollmentController.generateIndividualJson(req, res));

// Admin Certificate Routes
router.get('/admin/certificados', authMiddleware('admin'), (req, res) => EnrollmentController.adminCertificates(req, res));
router.get('/admin/certificados/json/:courseId', authMiddleware('admin'), (req, res) => EnrollmentController.generateJson(req, res));

// Admin Settings Routes
router.get('/admin/configuracoes', authMiddleware('admin'), (req, res) => SettingController.index(req, res));
router.post('/admin/configuracoes', authMiddleware('admin'), upload.single('logo'), (req, res) => SettingController.update(req, res));

// Admin Course Routes
router.get('/admin/cursos', authMiddleware('admin'), (req, res) => CourseController.adminList(req, res));
router.get('/admin/cursos/criar', authMiddleware('admin'), (req, res) => CourseController.adminCreateForm(req, res));
router.post('/admin/cursos/criar', authMiddleware('admin'), upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'proposalDoc', maxCount: 1 }
]), (req, res) => CourseController.adminStore(req, res));
router.get('/admin/cursos/:id/editar', authMiddleware('admin'), (req, res) => CourseController.adminEditForm(req, res));
router.post('/admin/cursos/:id/editar', authMiddleware('admin'), upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'proposalDoc', maxCount: 1 }
]), (req, res) => CourseController.adminUpdate(req, res));
router.post('/admin/cursos/:id/status', authMiddleware('admin'), (req, res) => CourseController.adminToggleStatus(req, res));
router.post('/admin/cursos/:id/deletar', authMiddleware('admin'), (req, res) => CourseController.adminDelete(req, res));

// Dashboard Routes
router.get('/admin/dashboard', authMiddleware('admin'), (req, res) => HomeController.adminDashboard(req, res));
router.get('/aluno/dashboard', authMiddleware('aluno'), (req, res) => HomeController.alunoDashboard(req, res));

// Adicione também as rotas de login/registro
router.get('/login', guestMiddleware, (req, res) => {
  // Verifica se já existe um layout de login, senão use o padrão
  res.render('login', { title: 'Login' });
});

router.get('/register', guestMiddleware, (req, res) => {
  res.render('register', { title: 'Registro' });
});

module.exports = router;