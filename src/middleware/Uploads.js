const upload = require('../config/Multer');

const courseFilesUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'proposalDoc', maxCount: 1 }
]);

const settingsFilesFields = [
  { name: 'logo', maxCount: 1 },
  { name: 'cert_signature', maxCount: 1 }
];

for (let index = 0; index < 6; index += 1) {
  settingsFilesFields.push({ name: `banner_image_${index}`, maxCount: 1 });
}

function uploadSettingsFiles(req, res, next) {
  upload.fields(settingsFilesFields)(req, res, (error) => {
    if (!error) return next();

    console.error('Erro no upload de configuracoes:', error);

    const message = error.message || 'Erro ao processar upload dos arquivos.';
    return res.redirect(`/admin/configuracoes?error=${encodeURIComponent(message)}`);
  });
}

function uploadBlogImages(req, res, next) {
  upload.array('blog_image', 30)(req, res, (error) => {
    if (!error) return next();

    console.error('Erro no upload de imagens do blog:', error);

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        code: error.code,
        field: error.field || null,
        message: 'Uma das imagens excede o limite de 8MB.'
      });
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        code: error.code,
        field: error.field || null,
        message: 'Voce pode enviar no maximo 30 imagens por vez.'
      });
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      const tooManyFiles = error.field === 'blog_image';

      return res.status(400).json({
        success: false,
        code: error.code,
        field: error.field || null,
        message: tooManyFiles
          ? 'Voce excedeu o limite de 30 imagens por envio.'
          : `Campo de upload inesperado: ${error.field || 'desconhecido'}.`
      });
    }

    return res.status(400).json({
      success: false,
      code: error.code || 'UPLOAD_ERROR',
      field: error.field || null,
      message: error.message || 'Erro ao processar upload das imagens.'
    });
  });
}

module.exports = {
  upload,
  courseFilesUpload,
  uploadSettingsFiles,
  uploadBlogImages
};
