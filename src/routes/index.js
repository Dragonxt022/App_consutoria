const express = require('express');
const authRoutes = require('./auth');
const publicRoutes = require('./public');
const studentRoutes = require('./student');
const adminRoutes = require('./admin');

const router = express.Router();

router.use(authRoutes);
router.use(publicRoutes);
router.use(studentRoutes);
router.use(adminRoutes);

module.exports = router;
