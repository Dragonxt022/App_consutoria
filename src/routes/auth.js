const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { guestMiddleware } = require('../middleware/auth');

router.get('/login', guestMiddleware, (req, res) => AuthController.showLogin(req, res));

router.post('/login', AuthController.login);
router.get('/logout', AuthController.logout);

module.exports = router;