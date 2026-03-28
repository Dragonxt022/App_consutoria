const express = require('express');
const { PublicHandler, StudentProfileHandler } = require('../handlers');
const { authMiddleware, uploads } = require('../middleware');
const { routeHandler } = require('../lib');

const { upload } = uploads;

const router = express.Router();

router.get('/aluno/dashboard', authMiddleware('aluno'), routeHandler(PublicHandler, 'studentDashboard'));
router.get('/meus-cursos', authMiddleware('aluno'), routeHandler(StudentProfileHandler, 'courses'));
router.get('/meus-certificados', authMiddleware('aluno'), routeHandler(StudentProfileHandler, 'certificates'));
router.get('/perfil', authMiddleware('aluno'), routeHandler(StudentProfileHandler, 'show'));
router.post('/perfil/atualizar', authMiddleware('aluno'), upload.single('avatar'), routeHandler(StudentProfileHandler, 'update'));
router.post('/perfil/alterar-senha', authMiddleware('aluno'), routeHandler(StudentProfileHandler, 'changePassword'));

module.exports = router;
