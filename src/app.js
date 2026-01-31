const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const { sequelize } = require('./models');
const cleanupUnconfirmed = require('./utils/cleanup');

const expressLayouts = require('express-ejs-layouts');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout'); // default layout at src/views/layout.ejs

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.JWT_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

const jwt = require('jsonwebtoken');

const SettingController = require('./controllers/SettingController');

app.use(async (req, res, next) => {
  const token = req.session.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      req.user = decoded;
      res.locals.user = decoded;
    } catch (err) {
      delete req.session.token;
    }
  } else {
    res.locals.user = null;
  }
  
  // Site-wide settings
  res.locals.siteSettings = await SettingController.getSettings();
  
  res.locals.error = req.query.error || null;
  res.locals.success = req.query.success || null;
  next();
});

// Redirect legacy auth routes
app.use('/auth', (req, res, next) => {
  if (req.path === '/login') return res.redirect('/login');
  if (req.path === '/logout') return res.redirect('/logout');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

const homeRoutes = require('./routes/home');
const authRoutes = require('./routes/auth');

app.use('/', homeRoutes);
app.use('/', authRoutes);

app.use((req, res) => {
  res.status(404).render('error', { title: 'Página não encontrada', layout: false });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await sequelize.sync({ force: false });
    console.log('Database synchronized');
    
    await cleanupUnconfirmed();
    // Run cleanup every hour
    setInterval(cleanupUnconfirmed, 60 * 60 * 1000);
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
}

startServer();