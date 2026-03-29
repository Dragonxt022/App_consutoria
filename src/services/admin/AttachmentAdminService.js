const fs = require('fs');
const { Op } = require('sequelize');
const { Attachment, Course, User } = require('../../models');
const { resolveUploadUrlToPath } = require('../../utils/UploadPaths');

const STATUS_LABELS = {
  pendente: 'Inscrição pendente',
  confirmado: 'Inscrição confirmada',
  completo: 'Curso concluído',
  cancelado: 'Inscrição cancelada'
};

function formatBytes(size) {
  if (!size || size <= 0) return 'Arquivo';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

class AttachmentAdminService {
  getStatusOptions() {
    return Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));
  }

  cleanupUploadedFile(fileOrFiles) {
    const files = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles].filter(Boolean);

    files.forEach((file) => {
      if (!file?.path) return;

      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (error) {
        console.error(`Erro ao limpar upload de anexo: ${file.path}`, error);
      }
    });
  }

  removeFileIfExists(fileUrl) {
    const filePath = resolveUploadUrlToPath(fileUrl);
    if (!filePath || !fs.existsSync(filePath)) return;

    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error(`Erro ao remover arquivo do anexo: ${filePath}`, error);
    }
  }

  getAttachmentFiles(attachment) {
    if (!attachment) return [];

    try {
      const rawFiles = attachment.filesJson ? JSON.parse(attachment.filesJson) : null;
      if (Array.isArray(rawFiles) && rawFiles.length) {
        return rawFiles;
      }
    } catch (error) {
      console.error('Erro ao ler arquivos do anexo:', error);
    }

    if (attachment.fileUrl) {
      return [{
        fileUrl: attachment.fileUrl,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize
      }];
    }

    return [];
  }

  mapAttachmentRecord(attachment) {
    const files = this.getAttachmentFiles(attachment.toJSON ? attachment.toJSON() : attachment);
    const totalSize = files.reduce((sum, file) => sum + (Number(file.fileSize) || 0), 0);

    return {
      ...(attachment.toJSON ? attachment.toJSON() : attachment),
      files,
      fileCount: files.length,
      fileCountLabel: `${files.length} arquivo(s)`,
      fileSizeLabel: formatBytes(totalSize || (attachment.fileSize || 0)),
      visibilityLabel: attachment.visibilityType === 'course' ? 'Todos do curso' : 'Usuário específico',
      requiredEnrollmentStatusLabel: attachment.requiredEnrollmentStatus ? STATUS_LABELS[attachment.requiredEnrollmentStatus] : 'Sem requisito'
    };
  }

  normalizeFilters(rawFilters = {}) {
    return {
      visibilityType: ['course', 'user'].includes(rawFilters.visibilityType) ? rawFilters.visibilityType : '',
      courseId: rawFilters.courseId ? String(rawFilters.courseId) : '',
      userId: rawFilters.userId ? String(rawFilters.userId) : '',
      search: rawFilters.search ? String(rawFilters.search).trim() : ''
    };
  }

  async getListData(rawFilters = {}) {
    const filters = this.normalizeFilters(rawFilters);
    const where = {};

    if (filters.visibilityType) {
      where.visibilityType = filters.visibilityType;
    }

    if (filters.courseId) {
      where.courseId = Number(filters.courseId);
    }

    if (filters.userId) {
      where.userId = Number(filters.userId);
    }

    if (filters.search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${filters.search}%` } },
        { originalName: { [Op.like]: `%${filters.search}%` } },
        { description: { [Op.like]: `%${filters.search}%` } }
      ];
    }

    const [attachments, courses, students] = await Promise.all([
      Attachment.findAll({
        where,
        include: [
          { model: Course, attributes: ['id', 'title'] },
          { model: User, as: 'recipient', attributes: ['id', 'name', 'email'] },
          { model: User, as: 'creator', attributes: ['id', 'name'] }
        ],
        order: [['createdAt', 'DESC']]
      }),
      Course.findAll({
        attributes: ['id', 'title'],
        order: [['title', 'ASC']]
      }),
      User.findAll({
        where: { role: 'aluno' },
        attributes: ['id', 'name', 'email'],
        order: [['name', 'ASC']]
      })
    ]);

    return {
      attachments: attachments.map((attachment) => this.mapAttachmentRecord(attachment)),
      filters,
      courses,
      students,
      statusOptions: this.getStatusOptions()
    };
  }

  validatePayload(body, files) {
    if (!body.title || !String(body.title).trim()) {
      return 'Informe um nome para o anexo.';
    }

    if (!Array.isArray(files) || !files.length) {
      return 'Selecione ao menos um arquivo para disponibilizar.';
    }

    if (!['course', 'user'].includes(body.visibilityType)) {
      return 'Selecione corretamente o destino do anexo.';
    }

    if (body.visibilityType === 'course') {
      if (!body.courseId) {
        return 'Escolha o curso que receberá o anexo.';
      }

      if (!body.requiredEnrollmentStatus) {
        return 'Defina o status necessário para o aluno visualizar o anexo.';
      }
    }

    if (body.visibilityType === 'user' && !body.userId) {
      return 'Escolha o usuário específico que receberá o anexo.';
    }

    return null;
  }

  async createAttachment(req) {
    const files = Array.isArray(req.files) ? req.files : [];
    const validationError = this.validatePayload(req.body, files);
    if (validationError) {
      return { error: validationError };
    }

    const serializedFiles = files.map((file) => ({
      fileUrl: `/uploads/attachments/${file.filename}`,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size
    }));

    const payload = {
      title: String(req.body.title || '').trim(),
      description: String(req.body.description || '').trim() || null,
      fileUrl: serializedFiles[0].fileUrl,
      originalName: serializedFiles[0].originalName,
      mimeType: serializedFiles[0].mimeType,
      fileSize: serializedFiles.reduce((sum, file) => sum + (Number(file.fileSize) || 0), 0),
      filesJson: JSON.stringify(serializedFiles),
      visibilityType: req.body.visibilityType,
      requiredEnrollmentStatus: req.body.visibilityType === 'course' ? req.body.requiredEnrollmentStatus : null,
      courseId: req.body.visibilityType === 'course' ? Number(req.body.courseId) : null,
      userId: req.body.visibilityType === 'user' ? Number(req.body.userId) : null,
      createdBy: req.user.id
    };

    if (payload.courseId) {
      const course = await Course.findByPk(payload.courseId);
      if (!course) {
        return { error: 'Curso não encontrado para vincular o anexo.' };
      }
    }

    if (payload.userId) {
      const user = await User.findOne({
        where: {
          id: payload.userId,
          role: 'aluno'
        }
      });

      if (!user) {
        return { error: 'Usuário não encontrado para receber o anexo.' };
      }
    }

    await Attachment.create(payload);
    return { success: true };
  }

  async deleteAttachment(attachmentId) {
    const attachment = await Attachment.findByPk(attachmentId);

    if (!attachment) {
      return { notFound: true };
    }

    const files = this.getAttachmentFiles(attachment.toJSON());
    files.forEach((file) => this.removeFileIfExists(file.fileUrl));
    await attachment.destroy();

    return { notFound: false };
  }
}

module.exports = new AttachmentAdminService();
