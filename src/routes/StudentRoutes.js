const express = require('express');
const { PublicHandler, StudentAttachmentHandler, StudentProfileHandler } = require('../handlers');
const { authMiddleware, uploads } = require('../middleware');
const { routeHandler } = require('../lib');

const { upload, uploadEnrollmentAttachmentFile } = uploads;

const router = express.Router();

router.get('/aluno/dashboard', authMiddleware('aluno'), routeHandler(PublicHandler, 'studentDashboard'));
router.get('/meus-cursos', authMiddleware('aluno'), routeHandler(StudentProfileHandler, 'courses'));
router.get('/meus-cursos/:id/anexo', authMiddleware('aluno'), routeHandler(StudentProfileHandler, 'showEnrollmentAttachment'));
router.post('/meus-cursos/:id/anexo', authMiddleware('aluno'), uploadEnrollmentAttachmentFile, routeHandler(StudentProfileHandler, 'uploadEnrollmentAttachment'));
router.get('/meus-cursos/:id/anexo/download', authMiddleware('aluno'), routeHandler(StudentProfileHandler, 'downloadEnrollmentAttachment'));
router.get('/meus-certificados', authMiddleware('aluno'), routeHandler(StudentProfileHandler, 'certificates'));
router.get('/meus-arquivos', authMiddleware('aluno'), routeHandler(StudentAttachmentHandler, 'list'));
router.get('/meus-arquivos/:id', authMiddleware('aluno'), routeHandler(StudentAttachmentHandler, 'details'));
router.get('/perfil', authMiddleware('aluno'), routeHandler(StudentProfileHandler, 'show'));
router.post('/perfil/atualizar', authMiddleware('aluno'), upload.single('avatar'), routeHandler(StudentProfileHandler, 'update'));
router.post('/perfil/alterar-senha', authMiddleware('aluno'), routeHandler(StudentProfileHandler, 'changePassword'));

module.exports = router;
