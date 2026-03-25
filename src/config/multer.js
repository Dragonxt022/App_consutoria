const multer = require('multer');
const path = require('path');
const fs = require('fs');

const publicRoot = path.join(__dirname, '..', 'public');
const uploadPaths = {
  courseImages: path.join(publicRoot, 'uploads', 'courses', 'images'),
  courseDocuments: path.join(publicRoot, 'uploads', 'courses', 'documents'),
  productImages: path.join(publicRoot, 'uploads', 'products'),
  logos: path.join(publicRoot, 'uploads', 'logos'),
  banners: path.join(publicRoot, 'uploads', 'banners'),
  certificateSignatures: path.join(publicRoot, 'uploads', 'certificates', 'signatures'),
  avatars: path.join(publicRoot, 'uploads', 'avatars'),
  companyCertificates: path.join(publicRoot, 'uploads', 'company-certificates')
};

// Ensure upload directories exist
const uploadDirs = Object.values(uploadPaths);

uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'image') {
      cb(null, uploadPaths.courseImages);
    } else if (file.fieldname === 'product_images') {
      cb(null, uploadPaths.productImages);
    } else if (file.fieldname === 'logo') {
      cb(null, uploadPaths.logos);
    } else if (file.fieldname.startsWith('banner_image_')) {
      cb(null, uploadPaths.banners);
    } else if (file.fieldname === 'avatar') {
      cb(null, uploadPaths.avatars);
    } else if (file.fieldname === 'cert_signature') {
      cb(null, uploadPaths.certificateSignatures);
    } else if (file.fieldname === 'certificateFile') {
      cb(null, uploadPaths.companyCertificates);
    } else {
      cb(null, uploadPaths.courseDocuments);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'image' || file.fieldname === 'product_images' || file.fieldname === 'logo' || file.fieldname === 'cert_signature' || file.fieldname === 'avatar' || file.fieldname.startsWith('banner_image_')) {
      if (!file.originalname.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
        return cb(new Error('Apenas arquivos de imagem sao permitidos!'), false);
      }
    } else if (file.fieldname === 'proposalDoc') {
      if (!file.originalname.match(/\.(pdf|doc|docx)$/i)) {
        return cb(new Error('Apenas documentos (PDF/DOC) sao permitidos!'), false);
      }
    } else if (file.fieldname === 'certificateFile') {
      if (!file.originalname.match(/\.pdf$/i)) {
        return cb(new Error('Apenas arquivos PDF sao permitidos!'), false);
      }
    }

    cb(null, true);
  }
});

module.exports = upload;
