const express = require('express');
const session = require('express-session');
const MySQLStoreFactory = require('express-mysql-session');
const path = require('path');
require('dotenv').config();

const { syncDatabase } = require('./models');
const cleanupUnconfirmed = require('./utils/cleanup');

const expressLayouts = require('express-ejs-layouts');
const { getSafeImage, imgTag, bgImage } = require('./utils/imageHelper.js');
const { requestContext } = require('./middleware');
const routes = require('./routes');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const trustProxy = process.env.TRUST_PROXY || (isProduction ? '1' : '0');
const sessionSecret = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'secret';
const sessionStoreDialect = (process.env.DB_DIALECT || (process.env.DB_HOST ? 'mysql' : 'sqlite')).toLowerCase();

function parseBoolean(value, fallback = false) {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function buildSessionStore() {
  const shouldUseMySqlStore = sessionStoreDialect === 'mysql' && parseBoolean(process.env.SESSION_USE_DB_STORE, true);

  if (!shouldUseMySqlStore) {
    return null;
  }

  const MySQLStore = MySQLStoreFactory(session);
  return new MySQLStore({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    clearExpired: true,
    checkExpirationInterval: Number(process.env.SESSION_CHECK_EXPIRATION_MS || 15 * 60 * 1000),
    expiration: Number(process.env.SESSION_MAX_AGE_MS || 1000 * 60 * 60 * 24 * 7),
    createDatabaseTable: true,
    schema: {
      tableName: process.env.SESSION_TABLE_NAME || 'user_sessions',
      columnNames: {
        session_id: 'session_id',
        expires: 'expires',
        data: 'data'
      }
    }
  });
}

app.set('trust proxy', trustProxy);

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

const secureCookie = parseBoolean(process.env.SESSION_COOKIE_SECURE, isProduction);
const sameSite = process.env.SESSION_COOKIE_SAME_SITE || 'lax';
const sessionMaxAge = Number(process.env.SESSION_MAX_AGE_MS || 1000 * 60 * 60 * 24 * 7);
const sessionStore = buildSessionStore();

app.use(session({
  name: process.env.SESSION_COOKIE_NAME || 'consultoria.sid',
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: sessionStore || undefined,
  proxy: parseBoolean(trustProxy, isProduction),
  cookie: {
    httpOnly: true,
    sameSite,
    secure: secureCookie,
    maxAge: sessionMaxAge
  }
}));

/* =======================
   Auth + settings globais
======================= */
app.use(requestContext);

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
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/', routes);

/* =======================
   404
======================= */
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Página não encontrada',
    layout: false
  });
});

app.use((error, req, res, _next) => {
  console.error(error);

  if (res.headersSent) {
    return;
  }

  if (req.accepts('json') && !req.accepts('html')) {
    res.status(error.status || 500).json({
      error: error.message || 'Erro interno do servidor'
    });
    return;
  }

  res.status(error.status || 500).render('error', {
    title: 'Erro interno do servidor',
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
