const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const { syncDatabase } = require('./models');
const cleanupUnconfirmed = require('./utils/cleanup');

const expressLayouts = require('express-ejs-layouts');
const jwt = require('jsonwebtoken');

const SettingController = require('./controllers/SettingController');
const { getSafeImage, imgTag, bgImage } = require('./utils/imageHelper.js');

const homeRoutes = require('./routes/home');
const authRoutes = require('./routes/auth');

const app = express();

/* =======================
   View engine & layouts
======================= */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

/* =======================
   View helpers
======================= */
app.locals.getSafeImage = getSafeImage;
app.locals.imgTag = imgTag;
app.locals.bgImage = bgImage;

app.locals.courseImage = (imagePath) =>
  getSafeImage(imagePath, 'course');

app.locals.courseImgTag = (imagePath, alt = '', className = '') =>
  imgTag(imagePath, alt, className, 'course');

/* =======================
   Middlewares básicos
======================= */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.JWT_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

/* =======================
   Auth + settings globais
======================= */
app.use(async (req, res, next) => {
  const token = req.session.token;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      req.user = decoded;
      res.locals.user = decoded;
    } catch {
      delete req.session.token;
      res.locals.user = null;
    }
  } else {
    res.locals.user = null;
  }

  res.locals.siteSettings = await SettingController.getSettings();
  res.locals.error = req.query.error || null;
  res.locals.success = req.query.success || null;

  next();
});

/* =======================
   Redirect auth legacy
======================= */
app.use('/auth', (req, res, next) => {
  if (req.path === '/login') return res.redirect('/login');
  if (req.path === '/logout') return res.redirect('/logout');
  next();
});

/* =======================
   Static files
======================= */
app.use(express.static(path.join(__dirname, 'public')));

/* =======================
   Routes
======================= */
app.use('/', homeRoutes);
app.use('/', authRoutes);

/* =======================
   404
======================= */
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Página não encontrada',
    layout: false
  });
});

/* =======================
   Bootstrap
======================= */
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await syncDatabase();

    await cleanupUnconfirmed();
    setInterval(cleanupUnconfirmed, 60 * 60 * 1000);

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
