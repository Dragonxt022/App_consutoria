const jwt = require('jsonwebtoken');
const { SiteSettingsService } = require('../services');
const { BlogCategory, BlogPost } = require('../models');
const { getBaseUrl, buildAppUrl } = require('../utils/url');

async function requestContext(req, res, next) {
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

  res.locals.siteSettings = await SiteSettingsService.getSettings();
  res.locals.appBaseUrl = getBaseUrl(req);
  res.locals.currentUrl = buildAppUrl(req, req.originalUrl || req.url || '/');
  res.locals.blogMenuCategories = await BlogCategory.findAll({
    where: { active: true },
    include: [{
      model: BlogPost,
      as: 'posts',
      attributes: [],
      where: { status: 'publicado' },
      required: true
    }],
    attributes: ['id', 'name', 'slug'],
    order: [['name', 'ASC']],
    group: ['BlogCategory.id'],
    limit: 15
  });

  const flash = req.session.flash || null;
  delete req.session.flash;

  res.locals.toast = flash
    || (req.query.error ? { type: 'error', message: req.query.error } : null)
    || (req.query.success ? { type: 'success', message: req.query.success } : null);
  res.locals.error = null;
  res.locals.success = null;

  next();
}

module.exports = requestContext;
