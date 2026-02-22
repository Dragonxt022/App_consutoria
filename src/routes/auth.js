const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { guestMiddleware } = require('../middleware/auth');

router.get('/login', (req, res) => AuthController.showLogin(req, res));
router.post('/login', (req, res) => AuthController.login(req, res));
router.get('/logout', (req, res) => AuthController.logout(req, res));

router.get('/confirmar-conta/:token', (req, res) => AuthController.showConfirmAccount(req, res));
router.post('/confirmar-conta', (req, res) => AuthController.handleConfirmAccount(req, res));

router.get('/esqueci-senha', (req, res) => AuthController.showForgotPassword(req, res));
router.post('/esqueci-senha', (req, res) => AuthController.handleForgotPassword(req, res));

router.get('/redefinir-senha/:token', (req, res) => AuthController.showResetPassword(req, res));
router.post('/redefinir-senha', (req, res) => AuthController.handleResetPassword(req, res));

// Rotas para primeiro admin
router.get('/primeiro-admin', (req, res) => AuthController.showFirstAdminSetup(req, res));
router.post('/primeiro-admin', (req, res) => AuthController.createFirstAdmin(req, res));
router.get('/api/admin-exists', (req, res) => AuthController.checkAdminExists(req, res));

module.exports = router;