const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { guestMiddleware } = require('../middleware/auth');

router.get('/login', guestMiddleware, (req, res) => AuthController.showLogin(req, res));

router.post('/login', AuthController.login);
router.get('/logout', AuthController.logout);

router.get('/confirmar-conta/:token', AuthController.showConfirmAccount);
router.post('/confirmar-conta', AuthController.handleConfirmAccount);

router.get('/esqueci-senha', AuthController.showForgotPassword);
router.post('/esqueci-senha', AuthController.handleForgotPassword);

router.get('/redefinir-senha/:token', AuthController.showResetPassword);
router.post('/redefinir-senha', AuthController.handleResetPassword);

module.exports = router;