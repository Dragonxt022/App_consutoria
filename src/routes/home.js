const express = require('express');
const router = express.Router();
const HomeController = require('../controllers/HomeController');
const { authMiddleware, guestMiddleware } = require('../middleware/auth');

router.get('/', guestMiddleware, HomeController.index);

router.get('/admin/dashboard', authMiddleware('admin'), HomeController.adminDashboard);
router.get('/aluno/dashboard', authMiddleware('aluno'), HomeController.alunoDashboard);

module.exports = router;