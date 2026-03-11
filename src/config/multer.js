const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = ['src/public/uploads/courses/images', 'src/public/uploads/courses/documents', 'src/public/uploads/logos', 'src/public/uploads/certificates/signatures', 'src/public/uploads/avatars'];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'image') {
      cb(null, 'src/public/uploads/courses/images');
    } else if (file.fieldname === 'logo') {
      cb(null, 'src/public/uploads/logos');
    } else if (file.fieldname === 'avatar') {
      cb(null, 'src/public/uploads/avatars');
    } else if (file.fieldname === 'cert_signature') {
      cb(null, 'src/public/uploads/certificates/signatures');
    } else {
      cb(null, 'src/public/uploads/courses/documents');
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 8 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'image' || file.fieldname === 'logo' || file.fieldname === 'cert_signature' || file.fieldname === 'avatar') {
      if (!file.originalname.match(/\.(jpg|jpeg|png|webp|gif)$/)) {
        return cb(new Error('Apenas arquivos de imagem são permitidos!'), false);
      }
    } else if (file.fieldname === 'proposalDoc') {
      if (!file.originalname.match(/\.(pdf|doc|docx)$/)) {
        return cb(new Error('Apenas documentos (PDF/DOC) são permitidos!'), false);
      }
    }
    cb(null, true);
  }
});

module.exports = upload;
