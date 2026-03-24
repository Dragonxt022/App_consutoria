function getBaseUrl(req) {
  const configuredBaseUrl = process.env.APP_URL;
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, '');
  }

  return `${req.protocol}://${req.get('host')}`;
}

function buildAppUrl(req, path = '') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getBaseUrl(req)}${normalizedPath}`;
}

module.exports = {
  getBaseUrl,
  buildAppUrl
};
