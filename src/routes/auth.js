const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { guestMiddleware } = require('../middleware/auth');

router.get('/login', guestMiddleware, AuthController.showLogin);
router.get('/admin/login', guestMiddleware, AuthController.showAdminLogin);
router.get('/aluno/login', guestMiddleware, AuthController.showAlunoLogin);
router.post('/login', AuthController.login);
router.get('/logout', AuthController.logout);

module.exports = router;