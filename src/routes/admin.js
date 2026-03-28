const express = require('express');
const {
  PublicHandler,
  AdminBlogHandler,
  AdminCertificateBuilderHandler,
  AdminCompanyCertificateHandler,
  AdminCourseHandler,
  AdminEnrollmentHandler,
  AdminProductHandler,
  AdminProfileHandler,
  AdminSalesHandler,
  AdminSettingHandler,
  AdminUserHandler
} = require('../handlers');
const { authMiddleware, publicMiddleware, uploads } = require('../middleware');
const { routeHandler } = require('../lib');

const {
  upload,
  courseFilesUpload,
  uploadSettingsFiles,
  uploadBlogImages
} = uploads;

const router = express.Router();

router.get('/admin/dashboard', authMiddleware('admin'), routeHandler(PublicHandler, 'adminDashboard'));

router.get('/admin/inscricoes', authMiddleware('admin'), routeHandler(AdminEnrollmentHandler, 'list'));
router.get('/admin/inscricoes/exportar', authMiddleware('admin'), routeHandler(AdminEnrollmentHandler, 'exportList'));
router.post('/admin/inscricoes/:id/status', authMiddleware('admin'), routeHandler(AdminEnrollmentHandler, 'updateStatus'));
router.post('/admin/inscricoes/:id/deletar', authMiddleware('admin'), routeHandler(AdminEnrollmentHandler, 'remove'));
router.get('/admin/inscricoes/:id/json', authMiddleware('admin'), routeHandler(AdminEnrollmentHandler, 'viewCertificate'));
router.get('/admin/inscricoes/:id/editar', authMiddleware('admin'), routeHandler(AdminEnrollmentHandler, 'showEdit'));
router.post('/admin/inscricoes/:id/edit', authMiddleware('admin'), routeHandler(AdminEnrollmentHandler, 'update'));
router.get('/admin/inscricoes/:id/comprovante', authMiddleware('admin'), routeHandler(AdminEnrollmentHandler, 'receipt'));

router.get('/admin/certificados', authMiddleware('admin'), routeHandler(AdminEnrollmentHandler, 'certificates'));
router.get('/admin/certificados/json/:courseId', authMiddleware('admin'), routeHandler(AdminEnrollmentHandler, 'generateJson'));
router.get('/admin/certificados/montar', authMiddleware('admin'), routeHandler(AdminCertificateBuilderHandler, 'show'));
router.post('/admin/certificados/montar', authMiddleware('admin'), routeHandler(AdminCertificateBuilderHandler, 'save'));
router.get('/admin/certidoes', authMiddleware('admin'), routeHandler(AdminCompanyCertificateHandler, 'list'));
router.get('/admin/certidoes/criar', authMiddleware('admin'), routeHandler(AdminCompanyCertificateHandler, 'showCreate'));
router.post('/admin/certidoes/criar', authMiddleware('admin'), upload.single('certificateFile'), routeHandler(AdminCompanyCertificateHandler, 'create'));
router.get('/admin/certidoes/:id/editar', authMiddleware('admin'), routeHandler(AdminCompanyCertificateHandler, 'showEdit'));
router.post('/admin/certidoes/:id/editar', authMiddleware('admin'), upload.single('certificateFile'), routeHandler(AdminCompanyCertificateHandler, 'update'));
router.post('/admin/certidoes/:id/deletar', authMiddleware('admin'), routeHandler(AdminCompanyCertificateHandler, 'remove'));

router.get('/admin/vendas', authMiddleware('admin'), routeHandler(AdminSalesHandler, 'dashboard'));

router.get('/admin/usuarios', authMiddleware('admin'), routeHandler(AdminUserHandler, 'list'));
router.post('/admin/usuarios/criar', authMiddleware('admin'), routeHandler(AdminUserHandler, 'create'));
router.get('/admin/usuarios/:id/editar', authMiddleware('admin'), routeHandler(AdminUserHandler, 'showEdit'));
router.post('/admin/usuarios/:id/editar', authMiddleware('admin'), routeHandler(AdminUserHandler, 'update'));
router.post('/admin/usuarios/:id/reenviar-acesso', authMiddleware('admin'), routeHandler(AdminUserHandler, 'resendAccess'));
router.post('/admin/usuarios/:id/deletar', authMiddleware('admin'), routeHandler(AdminUserHandler, 'delete'));

router.get('/admin/loja', authMiddleware('admin'), routeHandler(AdminProductHandler, 'list'));
router.get('/admin/loja/criar', authMiddleware('admin'), routeHandler(AdminProductHandler, 'showCreate'));
router.post('/admin/loja/criar', authMiddleware('admin'), upload.array('product_images', 5), routeHandler(AdminProductHandler, 'create'));
router.get('/admin/loja/:id/editar', authMiddleware('admin'), routeHandler(AdminProductHandler, 'showEdit'));
router.post('/admin/loja/:id/editar', authMiddleware('admin'), upload.array('product_images', 5), routeHandler(AdminProductHandler, 'update'));
router.post('/admin/loja/:id/status', authMiddleware('admin'), routeHandler(AdminProductHandler, 'toggleStatus'));
router.post('/admin/loja/:id/deletar', authMiddleware('admin'), routeHandler(AdminProductHandler, 'delete'));

router.get('/admin/configuracoes', authMiddleware('admin'), routeHandler(AdminSettingHandler, 'show'));
router.post('/admin/configuracoes', authMiddleware('admin'), uploadSettingsFiles, routeHandler(AdminSettingHandler, 'update'));

router.get('/admin/cursos', authMiddleware('admin'), routeHandler(AdminCourseHandler, 'list'));
router.get('/admin/cursos/criar', authMiddleware('admin'), routeHandler(AdminCourseHandler, 'showCreate'));
router.post('/admin/cursos/criar', authMiddleware('admin'), courseFilesUpload, routeHandler(AdminCourseHandler, 'create'));
router.get('/admin/cursos/:id/editar', authMiddleware('admin'), routeHandler(AdminCourseHandler, 'showEdit'));
router.post('/admin/cursos/:id/editar', authMiddleware('admin'), courseFilesUpload, routeHandler(AdminCourseHandler, 'update'));
router.post('/admin/cursos/:id/status', authMiddleware('admin'), routeHandler(AdminCourseHandler, 'toggleStatus'));
router.post('/admin/cursos/:id/deletar', authMiddleware('admin'), routeHandler(AdminCourseHandler, 'delete'));

router.get('/admin/blog', authMiddleware('admin'), routeHandler(AdminBlogHandler, 'list'));
router.get('/admin/blog/novo', authMiddleware('admin'), routeHandler(AdminBlogHandler, 'showCreate'));
router.post('/admin/blog/criar', authMiddleware('admin'), upload.single('coverImage'), routeHandler(AdminBlogHandler, 'create'));
router.get('/admin/blog/categorias', authMiddleware('admin'), routeHandler(AdminBlogHandler, 'categories'));
router.post('/admin/blog/categorias/criar', authMiddleware('admin'), routeHandler(AdminBlogHandler, 'createCategory'));
router.post('/admin/blog/categorias/:id/editar', authMiddleware('admin'), routeHandler(AdminBlogHandler, 'updateCategory'));
router.post('/admin/blog/autosave/novo', authMiddleware('admin'), routeHandler(AdminBlogHandler, 'autosave'));
router.post('/admin/blog/autosave/:id', authMiddleware('admin'), routeHandler(AdminBlogHandler, 'autosave'));
router.post('/admin/blog/upload-imagem', authMiddleware('admin'), uploadBlogImages, routeHandler(AdminBlogHandler, 'uploadBodyImage'));
router.get('/admin/blog/:id/editar', authMiddleware('admin'), routeHandler(AdminBlogHandler, 'showEdit'));
router.post('/admin/blog/:id/editar', authMiddleware('admin'), upload.single('coverImage'), routeHandler(AdminBlogHandler, 'update'));
router.post('/admin/blog/:id/deletar', authMiddleware('admin'), routeHandler(AdminBlogHandler, 'remove'));

router.get('/admin/perfil', authMiddleware('admin'), routeHandler(AdminProfileHandler, 'show'));
router.post('/admin/perfil/atualizar', authMiddleware('admin'), upload.single('avatar'), routeHandler(AdminProfileHandler, 'update'));
router.post('/admin/perfil/alterar-senha', authMiddleware('admin'), routeHandler(AdminProfileHandler, 'changePassword'));
router.get('/admin/perfil/confirmar-email/:token', publicMiddleware, routeHandler(AdminProfileHandler, 'confirmEmailChange'));

module.exports = router;
