const express = require('express');
const router = express.Router();
const HomeController = require('../controllers/HomeController');
const AuthController = require('../controllers/AuthController');
const CourseController = require('../controllers/CourseController');
const SettingController = require('../controllers/SettingController');
const EnrollmentController = require('../controllers/EnrollmentController');
const SalesController = require('../controllers/SalesController');
const CertificateController = require('../controllers/CertificateController');
const CertificateBuilderController = require('../controllers/CertificateBuilderController');
const ProfileController = require('../controllers/ProfileController');
const CompanyCertificateController = require('../controllers/CompanyCertificateController');
const UserController = require('../controllers/UserController');
const ProductController = require('../controllers/ProductController');
const { authMiddleware, guestMiddleware, publicMiddleware } = require('../middleware/auth'); // Adicione publicMiddleware
const upload = require('../config/multer');

// Rotas públicas do site institucional - use publicMiddleware
router.get('/', publicMiddleware, (req, res) => CourseController.index(req, res));
router.get('/cursos', publicMiddleware, (req, res) => CourseController.publicList(req, res));
router.get('/loja', publicMiddleware, (req, res) => ProductController.publicList(req, res));
router.get('/loja/:slug', publicMiddleware, (req, res) => ProductController.publicDetails(req, res));
router.get('/loja/:slug/comprar', publicMiddleware, (req, res) => ProductController.redirectToAffiliate(req, res));
router.get('/certidoes', publicMiddleware, (req, res) => CompanyCertificateController.publicList(req, res));
router.get('/contato', publicMiddleware, (req, res) => HomeController.contact(req, res));
router.get('/politica-de-privacidade', publicMiddleware, (req, res) => HomeController.privacyPolicy(req, res));
router.get('/curso/:id', publicMiddleware, (req, res) => CourseController.details(req, res));
router.get('/inscrever/:id', publicMiddleware, (req, res) => CourseController.enrollForm(req, res));
router.post('/inscrever', publicMiddleware, (req, res) => CourseController.submitEnrollment(req, res));
router.get('/obrigado', publicMiddleware, (req, res) => CourseController.thankYou(req, res));

// Rotas de Certificado Público
router.get('/certificado/:code', publicMiddleware, (req, res) => CertificateController.view(req, res));
router.get('/certificado/:code/verso', publicMiddleware, (req, res) => CertificateController.viewBack(req, res));
router.get('/certificado/:code/duplex', publicMiddleware, (req, res) => CertificateController.viewDuplex(req, res));
router.get('/validar-certificado', publicMiddleware, (req, res) => CertificateController.validate(req, res));
router.post('/validar-certificado', publicMiddleware, (req, res) => CertificateController.check(req, res));

// Rota para certificado individual (requer autenticação)
router.get('/meu-certificado/:id', authMiddleware('aluno'), (req, res) => EnrollmentController.viewStudentCertificate(req, res));
router.get('/meu-comprovante/:id', authMiddleware('aluno'), (req, res) => EnrollmentController.viewMyReceipt(req, res));

// Admin Enrollment Routes
router.get('/admin/inscricoes', authMiddleware('admin'), (req, res) => EnrollmentController.adminList(req, res));
router.get('/admin/inscricoes/exportar', authMiddleware('admin'), (req, res) => EnrollmentController.exportAdminList(req, res));
router.post('/admin/inscricoes/:id/status', authMiddleware('admin'), (req, res) => EnrollmentController.updateStatus(req, res));
router.post('/admin/inscricoes/:id/deletar', authMiddleware('admin'), (req, res) => EnrollmentController.delete(req, res));
router.get('/admin/inscricoes/:id/json', authMiddleware('admin'), (req, res) => EnrollmentController.viewStudentCertificate(req, res));

// Admin Certificate Routes
router.get('/admin/certificados', authMiddleware('admin'), (req, res) => EnrollmentController.adminCertificates(req, res));
router.get('/admin/certificados/json/:courseId', authMiddleware('admin'), (req, res) => EnrollmentController.generateJson(req, res));
router.get('/admin/certificados/montar', authMiddleware('admin'), (req, res) => CertificateBuilderController.showEditor(req, res));
router.post('/admin/certificados/montar', authMiddleware('admin'), (req, res) => CertificateBuilderController.saveEditor(req, res));
router.get('/admin/certidoes', authMiddleware('admin'), (req, res) => CompanyCertificateController.adminList(req, res));
router.get('/admin/certidoes/criar', authMiddleware('admin'), (req, res) => CompanyCertificateController.adminCreateForm(req, res));
router.post('/admin/certidoes/criar', authMiddleware('admin'), upload.single('certificateFile'), (req, res) => CompanyCertificateController.adminStore(req, res));
router.get('/admin/certidoes/:id/editar', authMiddleware('admin'), (req, res) => CompanyCertificateController.adminEditForm(req, res));
router.post('/admin/certidoes/:id/editar', authMiddleware('admin'), upload.single('certificateFile'), (req, res) => CompanyCertificateController.adminUpdate(req, res));
router.post('/admin/certidoes/:id/deletar', authMiddleware('admin'), (req, res) => CompanyCertificateController.adminDelete(req, res));

// Admin Enrollment Edit Routes
router.get('/admin/inscricoes/:id/editar', authMiddleware('admin'), (req, res) => EnrollmentController.edit(req, res));
router.post('/admin/inscricoes/:id/edit', authMiddleware('admin'), (req, res) => EnrollmentController.update(req, res));
router.get('/admin/inscricoes/:id/comprovante', authMiddleware('admin'), (req, res) => EnrollmentController.viewReceipt(req, res));

// Admin Sales Routes
router.get('/admin/vendas', authMiddleware('admin'), (req, res) => SalesController.index(req, res));

// Admin User Routes
router.get('/admin/usuarios', authMiddleware('admin'), (req, res) => UserController.index(req, res));
router.get('/admin/usuarios/:id/editar', authMiddleware('admin'), (req, res) => UserController.edit(req, res));
router.post('/admin/usuarios/:id/editar', authMiddleware('admin'), (req, res) => UserController.update(req, res));
router.post('/admin/usuarios/:id/reenviar-acesso', authMiddleware('admin'), (req, res) => UserController.resendAccess(req, res));

// Admin Store Routes
router.get('/admin/loja', authMiddleware('admin'), (req, res) => ProductController.adminList(req, res));
router.get('/admin/loja/criar', authMiddleware('admin'), (req, res) => ProductController.adminCreateForm(req, res));
router.post('/admin/loja/criar', authMiddleware('admin'), (req, res) => ProductController.adminStore(req, res));
router.get('/admin/loja/:id/editar', authMiddleware('admin'), (req, res) => ProductController.adminEditForm(req, res));
router.post('/admin/loja/:id/editar', authMiddleware('admin'), (req, res) => ProductController.adminUpdate(req, res));
router.post('/admin/loja/:id/status', authMiddleware('admin'), (req, res) => ProductController.adminToggleStatus(req, res));
router.post('/admin/loja/:id/deletar', authMiddleware('admin'), (req, res) => ProductController.adminDelete(req, res));

// Admin Settings Routes
router.get('/admin/configuracoes', authMiddleware('admin'), (req, res) => SettingController.index(req, res));
router.post('/admin/configuracoes', authMiddleware('admin'), upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'cert_signature', maxCount: 1 }
]), (req, res) => SettingController.update(req, res));

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
router.get('/login', guestMiddleware, (req, res) => AuthController.showLogin(req, res));

router.get('/register', guestMiddleware, (req, res) => {
  res.render('register', { title: 'Registro' });
});

// Rotas de Perfil do Aluno
router.get('/perfil', authMiddleware('aluno'), (req, res) => ProfileController.show(req, res));
router.post('/perfil/atualizar', authMiddleware('aluno'), (req, res) => ProfileController.update(req, res));
router.post('/perfil/alterar-senha', authMiddleware('aluno'), (req, res) => ProfileController.changePassword(req, res));

// Rotas de Perfil do Administrador
router.get('/admin/perfil', authMiddleware('admin'), (req, res) => ProfileController.adminShow(req, res));
router.post('/admin/perfil/atualizar', authMiddleware('admin'), upload.single('avatar'), (req, res) => ProfileController.adminUpdate(req, res));
router.post('/admin/perfil/alterar-senha', authMiddleware('admin'), (req, res) => ProfileController.adminChangePassword(req, res));
router.get('/admin/perfil/confirmar-email/:token', publicMiddleware, (req, res) => ProfileController.confirmAdminEmailChange(req, res));

module.exports = router;
