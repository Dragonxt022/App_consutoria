const express = require('express');
const { AuthHandler } = require('../handlers');
const { guestMiddleware } = require('../middleware');
const { routeHandler } = require('../lib');

const router = express.Router();

router.get('/login', guestMiddleware, routeHandler(AuthHandler, 'showLogin'));
router.post('/login', routeHandler(AuthHandler, 'login'));
router.get('/logout', routeHandler(AuthHandler, 'logout'));

router.get('/cadastro', guestMiddleware, routeHandler(AuthHandler, 'showRegister'));
router.post('/cadastro', guestMiddleware, routeHandler(AuthHandler, 'register'));
router.get('/register', guestMiddleware, routeHandler(AuthHandler, 'showRegister'));
router.post('/register', guestMiddleware, routeHandler(AuthHandler, 'register'));

router.get('/confirmar-conta/:token', routeHandler(AuthHandler, 'showConfirmAccount'));
router.post('/confirmar-conta', routeHandler(AuthHandler, 'handleConfirmAccount'));

router.get('/esqueci-senha', routeHandler(AuthHandler, 'showForgotPassword'));
router.post('/esqueci-senha', routeHandler(AuthHandler, 'handleForgotPassword'));

router.get('/redefinir-senha/:token', routeHandler(AuthHandler, 'showResetPassword'));
router.post('/redefinir-senha', routeHandler(AuthHandler, 'handleResetPassword'));

router.get('/primeiro-admin', routeHandler(AuthHandler, 'showFirstAdminSetup'));
router.post('/primeiro-admin', routeHandler(AuthHandler, 'createFirstAdmin'));
router.get('/api/admin-exists', routeHandler(AuthHandler, 'checkAdminExists'));

module.exports = router;
