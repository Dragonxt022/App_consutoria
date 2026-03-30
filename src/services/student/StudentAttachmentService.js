const { Attachment, Course, Enrollment, User } = require('../../models');

const STATUS_LABELS = {
  pendente: 'Inscrição pendente',
  confirmado: 'Inscrição confirmada',
  completo: 'Curso concluído',
  cancelado: 'Inscrição cancelada'
};
const RECENT_ATTACHMENT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

function formatBytes(size) {
  if (!size || size <= 0) return 'Arquivo';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getAttachmentFiles(attachment) {
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

function isRecentAttachment(dateValue) {
  if (!dateValue) return false;
  const timestamp = new Date(dateValue).getTime();
  if (Number.isNaN(timestamp)) return false;
  return (Date.now() - timestamp) <= RECENT_ATTACHMENT_WINDOW_MS;
}

class StudentAttachmentService {
  async getVisibleAttachments(userId) {
    const [user, enrollments, directAttachments] = await Promise.all([
      User.findByPk(userId),
      Enrollment.findAll({
        where: { userId },
        include: [{ model: Course }],
        order: [['createdAt', 'DESC']]
      }),
      Attachment.findAll({
        where: {
          visibilityType: 'user',
          userId
        },
        include: [{ model: User, as: 'creator', attributes: ['id', 'name'] }],
        order: [['createdAt', 'DESC']]
      })
    ]);

    if (!user) {
      return null;
    }

    const courseBundles = await Promise.all(
      enrollments.map(async (enrollment) => {
        const attachments = await Attachment.findAll({
          where: {
            visibilityType: 'course',
            courseId: enrollment.courseId,
            requiredEnrollmentStatus: enrollment.status
          },
          include: [
            { model: Course, attributes: ['id', 'title'] },
            { model: User, as: 'creator', attributes: ['id', 'name'] }
          ],
          order: [['createdAt', 'DESC']]
        });

        return attachments.map((attachment) => ({ attachment, enrollment }));
      })
    );

    const map = new Map();

    directAttachments.forEach((attachment) => {
      map.set(attachment.id, {
        ...attachment.toJSON(),
        files: getAttachmentFiles(attachment.toJSON()).map((file) => ({
          ...file,
          fileSizeLabel: formatBytes(file.fileSize)
        })),
        isRecent: isRecentAttachment(attachment.createdAt),
        audienceLabel: 'Disponibilizado diretamente para você',
        requiredEnrollmentStatusLabel: 'Sem requisito',
        fileSizeLabel: formatBytes(attachment.fileSize),
        fileCountLabel: `${getAttachmentFiles(attachment.toJSON()).length} arquivo(s)`,
        courseContext: null
      });
    });

    courseBundles.flat().forEach(({ attachment, enrollment }) => {
      if (map.has(attachment.id)) return;

      map.set(attachment.id, {
        ...attachment.toJSON(),
        files: getAttachmentFiles(attachment.toJSON()).map((file) => ({
          ...file,
          fileSizeLabel: formatBytes(file.fileSize)
        })),
        isRecent: isRecentAttachment(attachment.createdAt),
        audienceLabel: `Liberado no curso ${attachment.Course?.title || 'curso'}`,
        requiredEnrollmentStatusLabel: STATUS_LABELS[attachment.requiredEnrollmentStatus] || 'Sem requisito',
        fileSizeLabel: formatBytes(attachment.fileSize),
        fileCountLabel: `${getAttachmentFiles(attachment.toJSON()).length} arquivo(s)`,
        courseContext: {
          enrollmentId: enrollment.id,
          enrollmentStatus: enrollment.status,
          courseTitle: enrollment.Course?.title || attachment.Course?.title || 'Curso'
        }
      });
    });

    return {
      user,
      attachments: Array.from(map.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    };
  }

  async getAttachmentDetails(userId, attachmentId) {
    const data = await this.getVisibleAttachments(userId);

    if (!data) {
      return null;
    }

    return {
      user: data.user,
      attachment: data.attachments.find((item) => String(item.id) === String(attachmentId)) || null
    };
  }
}

module.exports = new StudentAttachmentService();
