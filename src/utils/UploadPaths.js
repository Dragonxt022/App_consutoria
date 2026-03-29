const fs = require('fs');
const path = require('path');

const publicRoot = path.join(__dirname, '..', 'public');
const legacyUploadsRoot = path.join(publicRoot, 'uploads');
const mutableUploadsRoot = path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), 'storage', 'uploads'));

const STATIC_UPLOAD_PREFIXES = [
  '/uploads/icons/',
  '/uploads/templete-certificados/'
];

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function isUploadUrl(fileUrl) {
  return typeof fileUrl === 'string' && fileUrl.startsWith('/uploads/');
}

function isStaticSystemUpload(fileUrl) {
  return STATIC_UPLOAD_PREFIXES.some((prefix) => fileUrl.startsWith(prefix));
}

function toRelativeUploadPath(fileUrl) {
  if (!isUploadUrl(fileUrl)) {
    return null;
  }

  return fileUrl.replace(/^\/uploads\/+/, '');
}

function getLegacyUploadPath(...segments) {
  return path.join(legacyUploadsRoot, ...segments);
}

function getMutableUploadPath(...segments) {
  return path.join(mutableUploadsRoot, ...segments);
}

function resolveUploadUrlToPath(fileUrl) {
  const relativeUploadPath = toRelativeUploadPath(fileUrl);

  if (!relativeUploadPath) {
    return null;
  }

  if (isStaticSystemUpload(fileUrl)) {
    return getLegacyUploadPath(relativeUploadPath);
  }

  const mutablePath = getMutableUploadPath(relativeUploadPath);
  if (fs.existsSync(mutablePath)) {
    return mutablePath;
  }

  const legacyPath = getLegacyUploadPath(relativeUploadPath);
  if (fs.existsSync(legacyPath)) {
    return legacyPath;
  }

  return mutablePath;
}

module.exports = {
  publicRoot,
  legacyUploadsRoot,
  mutableUploadsRoot,
  ensureDir,
  isUploadUrl,
  isStaticSystemUpload,
  toRelativeUploadPath,
  getLegacyUploadPath,
  getMutableUploadPath,
  resolveUploadUrlToPath
};
