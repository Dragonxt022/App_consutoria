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
const BlogController = require('../controllers/BlogController');
const { authMiddleware, guestMiddleware, publicMiddleware } = require('../middleware/auth'); // Adicione publicMiddleware
const upload = require('../config/multer');

const uploadSettingsFiles = (req, res, next) => {
  const settingUploadFields = [
    { name: 'logo', maxCount: 1 },
    { name: 'cert_signature', maxCount: 1 }
  ];

  for (let index = 0; index < 6; index += 1) {
    settingUploadFields.push({ name: `banner_image_${index}`, maxCount: 1 });
  }

  upload.fields(settingUploadFields)(req, res, (error) => {
    if (!error) return next();

    console.error('Erro no upload de configuracoes:', error);

    const message = error.message || 'Erro ao processar upload dos arquivos.';
    return res.redirect(`/admin/configuracoes?error=${encodeURIComponent(message)}`);
  });
};

const uploadBlogImages = (req, res, next) => {
  upload.array('blog_image', 30)(req, res, (error) => {
    if (!error) return next();

    console.error('Erro no upload de imagens do blog:', error);

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        code: error.code,
        field: error.field || null,
        message: 'Uma das imagens excede o limite de 8MB.'
      });
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        code: error.code,
        field: error.field || null,
        message: 'Voce pode enviar no maximo 30 imagens por vez.'
      });
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      const tooManyFiles = error.field === 'blog_image';

      return res.status(400).json({
        success: false,
        code: error.code,
        field: error.field || null,
        message: tooManyFiles
          ? 'Voce excedeu o limite de 30 imagens por envio.'
          : `Campo de upload inesperado: ${error.field || 'desconhecido'}.`
      });
    }

    return res.status(400).json({
      success: false,
      code: error.code || 'UPLOAD_ERROR',
      field: error.field || null,
      message: error.message || 'Erro ao processar upload das imagens.'
    });
  });
};

// Rotas públicas do site institucional - use publicMiddleware
router.get('/', publicMiddleware, (req, res) => CourseController.index(req, res));
router.get('/cursos', publicMiddleware, (req, res) => CourseController.publicList(req, res));
router.get('/loja', publicMiddleware, (req, res) => ProductController.publicList(req, res));
router.get('/loja/:slug', publicMiddleware, (req, res) => ProductController.publicDetails(req, res));
router.get('/loja/:slug/comprar', publicMiddleware, (req, res) => ProductController.redirectToAffiliate(req, res));
router.get('/certidoes', publicMiddleware, (req, res) => CompanyCertificateController.publicList(req, res));
router.get('/blog', publicMiddleware, (req, res) => BlogController.publicList(req, res));
router.get('/blog/:slug', publicMiddleware, (req, res) => BlogController.publicDetails(req, res));
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
router.post('/admin/usuarios/criar', authMiddleware('admin'), (req, res) => UserController.store(req, res));
router.get('/admin/usuarios/:id/editar', authMiddleware('admin'), (req, res) => UserController.edit(req, res));
router.post('/admin/usuarios/:id/editar', authMiddleware('admin'), (req, res) => UserController.update(req, res));
router.post('/admin/usuarios/:id/reenviar-acesso', authMiddleware('admin'), (req, res) => UserController.resendAccess(req, res));
router.post('/admin/usuarios/:id/deletar', authMiddleware('admin'), (req, res) => UserController.delete(req, res));

// Admin Store Routes
router.get('/admin/loja', authMiddleware('admin'), (req, res) => ProductController.adminList(req, res));
router.get('/admin/loja/criar', authMiddleware('admin'), (req, res) => ProductController.adminCreateForm(req, res));
router.post('/admin/loja/criar', authMiddleware('admin'), upload.array('product_images', 5), (req, res) => ProductController.adminStore(req, res));
router.get('/admin/loja/:id/editar', authMiddleware('admin'), (req, res) => ProductController.adminEditForm(req, res));
router.post('/admin/loja/:id/editar', authMiddleware('admin'), upload.array('product_images', 5), (req, res) => ProductController.adminUpdate(req, res));
router.post('/admin/loja/:id/status', authMiddleware('admin'), (req, res) => ProductController.adminToggleStatus(req, res));
router.post('/admin/loja/:id/deletar', authMiddleware('admin'), (req, res) => ProductController.adminDelete(req, res));

// Admin Settings Routes
router.get('/admin/configuracoes', authMiddleware('admin'), (req, res) => SettingController.index(req, res));
router.post('/admin/configuracoes', authMiddleware('admin'), uploadSettingsFiles, (req, res) => SettingController.update(req, res));

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

// Admin Blog Routes
router.get('/admin/blog', authMiddleware('admin'), (req, res) => BlogController.adminList(req, res));
router.get('/admin/blog/novo', authMiddleware('admin'), (req, res) => BlogController.adminCreateForm(req, res));
router.post('/admin/blog/criar', authMiddleware('admin'), upload.single('coverImage'), (req, res) => BlogController.adminStore(req, res));
router.get('/admin/blog/categorias', authMiddleware('admin'), (req, res) => BlogController.adminCategories(req, res));
router.post('/admin/blog/categorias/criar', authMiddleware('admin'), (req, res) => BlogController.storeCategory(req, res));
router.post('/admin/blog/categorias/:id/editar', authMiddleware('admin'), (req, res) => BlogController.updateCategory(req, res));
router.post('/admin/blog/autosave/novo', authMiddleware('admin'), (req, res) => BlogController.autosave(req, res));
router.post('/admin/blog/autosave/:id', authMiddleware('admin'), (req, res) => BlogController.autosave(req, res));
router.post('/admin/blog/upload-imagem', authMiddleware('admin'), uploadBlogImages, (req, res) => BlogController.uploadBodyImage(req, res));
router.get('/admin/blog/:id/editar', authMiddleware('admin'), (req, res) => BlogController.adminEditForm(req, res));
router.post('/admin/blog/:id/editar', authMiddleware('admin'), upload.single('coverImage'), (req, res) => BlogController.adminUpdate(req, res));
router.post('/admin/blog/:id/deletar', authMiddleware('admin'), (req, res) => BlogController.adminDelete(req, res));

// Dashboard Routes
router.get('/admin/dashboard', authMiddleware('admin'), (req, res) => HomeController.adminDashboard(req, res));
router.get('/aluno/dashboard', authMiddleware('aluno'), (req, res) => HomeController.alunoDashboard(req, res));
router.get('/meus-cursos', authMiddleware('aluno'), (req, res) => ProfileController.studentCourses(req, res));
router.get('/meus-certificados', authMiddleware('aluno'), (req, res) => ProfileController.studentCertificates(req, res));

// Adicione também as rotas de login/registro
router.get('/login', guestMiddleware, (req, res) => AuthController.showLogin(req, res));
router.get('/cadastro', guestMiddleware, (req, res) => AuthController.showRegister(req, res));
router.post('/cadastro', guestMiddleware, (req, res) => AuthController.register(req, res));
router.get('/register', guestMiddleware, (req, res) => AuthController.showRegister(req, res));
router.post('/register', guestMiddleware, (req, res) => AuthController.register(req, res));

// Rotas de Perfil do Aluno
router.get('/perfil', authMiddleware('aluno'), (req, res) => ProfileController.show(req, res));
router.post('/perfil/atualizar', authMiddleware('aluno'), upload.single('avatar'), (req, res) => ProfileController.update(req, res));
router.post('/perfil/alterar-senha', authMiddleware('aluno'), (req, res) => ProfileController.changePassword(req, res));

// Rotas de Perfil do Administrador
router.get('/admin/perfil', authMiddleware('admin'), (req, res) => ProfileController.adminShow(req, res));
router.post('/admin/perfil/atualizar', authMiddleware('admin'), upload.single('avatar'), (req, res) => ProfileController.adminUpdate(req, res));
router.post('/admin/perfil/alterar-senha', authMiddleware('admin'), (req, res) => ProfileController.adminChangePassword(req, res));
router.get('/admin/perfil/confirmar-email/:token', publicMiddleware, (req, res) => ProfileController.confirmAdminEmailChange(req, res));

module.exports = router;
