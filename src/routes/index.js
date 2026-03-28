const express = require('express');
const authRoutes = require('./AuthRoutes');
const publicRoutes = require('./PublicRoutes');
const studentRoutes = require('./StudentRoutes');
const adminRoutes = require('./AdminRoutes');

const router = express.Router();

router.use(authRoutes);
router.use(publicRoutes);
router.use(studentRoutes);
router.use(adminRoutes);

module.exports = router;
