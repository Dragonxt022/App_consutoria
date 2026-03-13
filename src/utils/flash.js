function setFlash(req, type, message) {
  if (!req || !req.session) return;
  req.session.flash = { type, message };
}

function redirectWithFlash(req, res, url, type, message) {
  setFlash(req, type, message);
  return res.redirect(url);
}

module.exports = {
  setFlash,
  redirectWithFlash
};
