const jwt = require('jsonwebtoken');

const authMiddleware = (requiredRole = null) => {
  return (req, res, next) => {
    const token = req.session.token;

    if (!token) {
      return res.redirect('/login');
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;

      if (requiredRole && decoded.role !== requiredRole) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      next();
    } catch (error) {
      res.redirect('/login');
    }
  };
};

const guestMiddleware = (req, res, next) => {
  const token = req.session.token;
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role === 'admin') {
        return res.redirect('/admin/dashboard');
      } else {
        return res.redirect('/aluno/dashboard');
      }
    } catch (error) {
      next();
    }
  }
  
  next();
};

module.exports = { authMiddleware, guestMiddleware };