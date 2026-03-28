const jwt = require('jsonwebtoken');
const { User } = require('../models');

const normalizeRole = (role) => String(role || '').trim().toLowerCase();
const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const buildSessionUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar || null,
  active: Boolean(user.active)
});

const destroySessionToken = (req) => {
  if (req.session) {
    req.session.token = null;
  }
};

const findSessionUser = async (decoded) => {
  if (!decoded) {
    return null;
  }

  let user = null;

  if (decoded.id) {
    user = await User.findByPk(decoded.id);
  }

  if (!user && decoded.email) {
    user = await User.findOne({
      where: { email: normalizeEmail(decoded.email) }
    });
  }

  return user;
};

const authMiddleware = (requiredRole = null) => {
  return async (req, res, next) => {
    const token = req.session.token;

    if (!token) {
      return res.redirect('/login');
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await findSessionUser(decoded);

      if (!user) {
        destroySessionToken(req);
        return res.redirect('/login?error=Sessão expirada. Faça login novamente.');
      }

      const sessionUser = buildSessionUser(user);
      req.user = sessionUser;
      res.locals.user = sessionUser;

      if (requiredRole && normalizeRole(user.role) !== normalizeRole(requiredRole)) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      next();
    } catch (error) {
      destroySessionToken(req);
      res.redirect('/login');
    }
  };
};

const guestMiddleware = (req, res, next) => {
  const token = req.session.token;
  
  if (token) {
    (async () => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await findSessionUser(decoded);

        if (!user) {
          destroySessionToken(req);
          return next();
        }

        // Somente redireciona se tentar acessar páginas de login/registro
        // Permite que usuários autenticados acessem o site institucional
        if (req.path === '/login' || req.path === '/register') {
          if (normalizeRole(user.role) === 'admin') {
            return res.redirect('/admin/dashboard');
          }
          return res.redirect('/aluno/dashboard');
        }
        return next();
      } catch (error) {
        destroySessionToken(req);
        return next();
      }
    })();
    return;
  }
  
  next();
};

// Middleware para site institucional (público)
const publicMiddleware = (req, res, next) => {
  const token = req.session.token;
  
  if (token) {
    (async () => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await findSessionUser(decoded);

        if (!user) {
          destroySessionToken(req);
          return next();
        }

        const sessionUser = buildSessionUser(user);
        req.user = sessionUser;
        res.locals.user = sessionUser;
        return next();
      } catch (error) {
        destroySessionToken(req);
        return next();
      }
    })();
    return;
  }
  
  next();
};

module.exports = { authMiddleware, guestMiddleware, publicMiddleware };
