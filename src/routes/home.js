const express = require('express');
const router = express.Router();
const HomeController = require('../controllers/HomeController');
const CourseController = require('../controllers/CourseController');
const SettingController = require('../controllers/SettingController');
const EnrollmentController = require('../controllers/EnrollmentController');
const { authMiddleware, guestMiddleware } = require('../middleware/auth');
const upload = require('../config/multer');

router.get('/', guestMiddleware, (req, res) => CourseController.index(req, res));
router.get('/curso/:id', guestMiddleware, (req, res) => CourseController.details(req, res));
router.get('/inscrever/:id', guestMiddleware, (req, res) => CourseController.enrollForm(req, res));
router.post('/inscrever', guestMiddleware, (req, res) => CourseController.submitEnrollment(req, res));
router.get('/obrigado', guestMiddleware, (req, res) => CourseController.thankYou(req, res));
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

router.get('/admin/dashboard', authMiddleware('admin'), (req, res) => HomeController.adminDashboard(req, res));
router.get('/aluno/dashboard', authMiddleware('aluno'), (req, res) => HomeController.alunoDashboard(req, res));

module.exports = router;