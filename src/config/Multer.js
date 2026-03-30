const multer = require('multer');
const path = require('path');
const {
  ensureDir,
  getMutableUploadPath,
  getPrivateStoragePath
} = require('../utils/UploadPaths');

const uploadPaths = {
  courseImages: getMutableUploadPath('courses', 'images'),
  courseDocuments: getMutableUploadPath('courses', 'documents'),
  productImages: getMutableUploadPath('products'),
  logos: getMutableUploadPath('logos'),
  banners: getMutableUploadPath('banners'),
  certificateSignatures: getMutableUploadPath('certificates', 'signatures'),
  avatars: getMutableUploadPath('avatars'),
  companyCertificates: getMutableUploadPath('company-certificates'),
  blogCovers: getMutableUploadPath('blog', 'covers'),
  blogContent: getMutableUploadPath('blog', 'content'),
  attachments: getMutableUploadPath('attachments'),
  enrollmentDocuments: getPrivateStoragePath('enrollment-documents')
};

// Ensure upload directories exist
const uploadDirs = Object.values(uploadPaths);

uploadDirs.forEach((dir) => {
  ensureDir(dir);
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'image') {
      cb(null, uploadPaths.courseImages);
    } else if (file.fieldname === 'product_images') {
      cb(null, uploadPaths.productImages);
    } else if (file.fieldname === 'logo') {
      cb(null, uploadPaths.logos);
    } else if (file.fieldname === 'app_icon') {
      cb(null, uploadPaths.logos);
    } else if (file.fieldname.startsWith('banner_image_')) {
      cb(null, uploadPaths.banners);
    } else if (file.fieldname === 'avatar') {
      cb(null, uploadPaths.avatars);
    } else if (file.fieldname === 'cert_signature') {
      cb(null, uploadPaths.certificateSignatures);
    } else if (file.fieldname === 'certificateFile') {
      cb(null, uploadPaths.companyCertificates);
    } else if (file.fieldname === 'coverImage') {
      cb(null, uploadPaths.blogCovers);
    } else if (file.fieldname === 'blog_image') {
      cb(null, uploadPaths.blogContent);
    } else if (file.fieldname === 'attachmentFile') {
      cb(null, uploadPaths.attachments);
    } else if (file.fieldname === 'enrollmentAttachment') {
      cb(null, uploadPaths.enrollmentDocuments);
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
    fileSize: 8 * 1024 * 1024,
    files: 30
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'app_icon') {
      if (!file.originalname.match(/\.(png|jpg|jpeg|webp)$/i)) {
        return cb(new Error('O ícone da aplicação deve estar em PNG, JPG ou WEBP.'), false);
      }
    } else if (file.fieldname === 'image' || file.fieldname === 'product_images' || file.fieldname === 'logo' || file.fieldname === 'cert_signature' || file.fieldname === 'avatar' || file.fieldname === 'coverImage' || file.fieldname === 'blog_image' || file.fieldname.startsWith('banner_image_')) {
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
    } else if (file.fieldname === 'attachmentFile') {
      if (!file.originalname.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|jpg|jpeg|png|webp)$/i)) {
        return cb(new Error('O anexo deve estar em PDF, DOC, XLS, PPT, ZIP ou imagem.'), false);
      }
    } else if (file.fieldname === 'enrollmentAttachment') {
      if (!file.originalname.match(/\.(pdf|doc|docx|jpg|jpeg|png|webp)$/i)) {
        return cb(new Error('O documento da inscrição deve estar em PDF, DOC ou imagem.'), false);
      }
    }

    cb(null, true);
  }
});

module.exports = upload;
