const { Op } = require('sequelize');
const { Notification, CompanyCertificate } = require('../../models');
const { normalizeHasExpiration, isCertificateExpired, formatCertificateExpiration } = require('../../utils/CompanyCertificate');

class NotificationService {
  constructor() {
    this.lastCertificateSyncAt = 0;
  }

  getTypeMeta(type) {
    switch (type) {
      case 'new_enrollment':
        return {
          iconBgClass: 'bg-emerald-50',
          iconTextClass: 'text-emerald-600',
          badgeClass: 'bg-emerald-50 text-emerald-700',
          label: 'Nova inscrição'
        };
      case 'expired_certificate':
        return {
          iconBgClass: 'bg-amber-50',
          iconTextClass: 'text-amber-600',
          badgeClass: 'bg-amber-50 text-amber-700',
          label: 'Certidão vencida'
        };
      case 'auto_closed':
        return {
          iconBgClass: 'bg-rose-50',
          iconTextClass: 'text-rose-600',
          badgeClass: 'bg-rose-50 text-rose-700',
          label: 'Encerrado automaticamente'
        };
      case 'blog_published':
        return {
          iconBgClass: 'bg-violet-50',
          iconTextClass: 'text-violet-600',
          badgeClass: 'bg-violet-50 text-violet-700',
          label: 'Post publicado'
        };
      case 'smtp_failure':
        return {
          iconBgClass: 'bg-orange-50',
          iconTextClass: 'text-orange-600',
          badgeClass: 'bg-orange-50 text-orange-700',
          label: 'Falha SMTP'
        };
      case 'course_reminder_24h':
        return {
          iconBgClass: 'bg-sky-50',
          iconTextClass: 'text-sky-600',
          badgeClass: 'bg-sky-50 text-sky-700',
          label: 'Lembrete 24h'
        };
      default:
        return {
          iconBgClass: 'bg-slate-100',
          iconTextClass: 'text-slate-600',
          badgeClass: 'bg-slate-100 text-slate-700',
          label: 'Notificação'
        };
    }
  }

  formatDateTime(date) {
    if (!date) return '';
    return new Date(date).toLocaleString('pt-BR');
  }

  formatNotification(notification) {
    const data = notification.toJSON ? notification.toJSON() : { ...notification };
    return {
      ...data,
      ...this.getTypeMeta(data.type),
      createdAtLabel: this.formatDateTime(data.createdAt),
      readAtLabel: data.readAt ? this.formatDateTime(data.readAt) : null
    };
  }

  async createNotification(payload) {
    if (payload.dedupeKey) {
      const existingNotification = await Notification.findOne({
        where: { dedupeKey: payload.dedupeKey }
      });

      if (existingNotification) {
        return existingNotification;
      }
    }

    return Notification.create({
      type: payload.type,
      title: payload.title,
      message: payload.message,
      link: payload.link || null,
      dedupeKey: payload.dedupeKey || null,
      metadata: payload.metadata || null,
      isRead: false,
      readAt: null
    });
  }

  async createEnrollmentNotification(enrollment, course) {
    return this.createNotification({
      type: 'new_enrollment',
      title: 'Nova inscrição',
      message: `${enrollment.studentName} acabou de se inscrever em ${course.title}.`,
      link: `/admin/inscricoes/${enrollment.id}/editar`,
      dedupeKey: `enrollment:${enrollment.id}`,
      metadata: {
        enrollmentId: enrollment.id,
        courseId: course.id
      }
    });
  }

  async createExpiredCertificateNotification(certificate) {
    const expirationLabel = formatCertificateExpiration(
      normalizeHasExpiration(certificate.hasExpiration),
      certificate.expirationDate
    );

    return this.createNotification({
      type: 'expired_certificate',
      title: 'Certidão vencida',
      message: `A certidão "${certificate.name}" está vencida desde ${expirationLabel} e precisa ser atualizada.`,
      link: `/admin/certidoes/${certificate.id}/editar`,
      dedupeKey: `expired-certificate:${certificate.id}:${certificate.expirationDate || 'sem-data'}`,
      metadata: {
        certificateId: certificate.id
      }
    });
  }

  async createAutoClosedNotification({ removedUsers, removedEnrollments }) {
    if (!removedUsers && !removedEnrollments) {
      return null;
    }

    return this.createNotification({
      type: 'auto_closed',
      title: 'Encerrado automaticamente',
      message: `O sistema encerrou ${removedUsers} cadastro(s) pendente(s) e removeu ${removedEnrollments} inscrição(ões) expiradas automaticamente.`,
      link: '/admin/inscricoes',
      metadata: {
        removedUsers,
        removedEnrollments
      }
    });
  }

  async createBlogPublishedNotification(post) {
    return this.createNotification({
      type: 'blog_published',
      title: 'Novo post publicado',
      message: `O post "${post.title}" foi publicado e já está disponível no blog.`,
      link: `/admin/blog/${post.id}/editar`,
      dedupeKey: `blog-published:${post.id}:${post.updatedAt ? new Date(post.updatedAt).getTime() : Date.now()}`,
      metadata: {
        postId: post.id
      }
    });
  }

  async createSmtpFailureNotification(context = {}) {
    const details = context.details || 'Revise host, porta, credenciais e remetente configurados no painel.';

    return this.createNotification({
      type: 'smtp_failure',
      title: 'Falha no envio SMTP',
      message: `O sistema não conseguiu enviar o e-mail de teste. ${details}`,
      link: '/admin/configuracoes?tab=email',
      dedupeKey: `smtp-failure:${new Date().toISOString().slice(0, 13)}`,
      metadata: context
    });
  }

  async createCourseReminder24hNotification({ course, attemptedRecipients, sentRecipients }) {
    return this.createNotification({
      type: 'course_reminder_24h',
      title: 'Lembrete automático enviado',
      message: `O curso "${course.title}" recebeu lembrete automático de 24h para ${sentRecipients} de ${attemptedRecipients} inscrito(s).`,
      link: `/admin/cursos/${course.id}/editar`,
      dedupeKey: `course-reminder-24h:${course.id}:${new Date(course.startDate).toISOString()}`,
      metadata: {
        courseId: course.id,
        attemptedRecipients,
        sentRecipients,
        startDate: course.startDate
      }
    });
  }

  async syncExpiredCertificateNotifications(force = false) {
    const now = Date.now();

    if (!force && now - this.lastCertificateSyncAt < 5 * 60 * 1000) {
      return;
    }

    this.lastCertificateSyncAt = now;

    const certificates = await CompanyCertificate.findAll({
      where: {
        hasExpiration: true,
        expirationDate: {
          [Op.ne]: null,
          [Op.lte]: new Date().toISOString().slice(0, 10)
        }
      }
    });

    for (const certificate of certificates) {
      if (isCertificateExpired(certificate.hasExpiration, certificate.expirationDate)) {
        await this.createExpiredCertificateNotification(certificate);
      }
    }
  }

  async getNavbarNotifications() {
    const [unreadCount, latestNotifications] = await Promise.all([
      Notification.count({ where: { isRead: false } }),
      Notification.findAll({
        order: [['createdAt', 'DESC']],
        limit: 5
      })
    ]);

    return {
      unreadCount,
      latest: latestNotifications.map((notification) => this.formatNotification(notification))
    };
  }

  async getNotificationsPageData(query) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await Notification.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    return {
      notifications: rows.map((notification) => this.formatNotification(notification)),
      unreadCount: await Notification.count({ where: { isRead: false } }),
      pagination: {
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(count / limit)),
        totalItems: count
      }
    };
  }

  async markAsRead(id) {
    const notification = await Notification.findByPk(id);

    if (!notification) {
      return { notFound: true };
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    return { notFound: false, notification };
  }

  async openNotification(id) {
    const result = await this.markAsRead(id);

    if (result.notFound) {
      return { notFound: true, redirectTo: '/admin/notificacoes?error=Notificação não encontrada' };
    }

    return {
      notFound: false,
      redirectTo: result.notification.link || '/admin/notificacoes'
    };
  }

  async markAllAsRead() {
    await Notification.update(
      { isRead: true, readAt: new Date() },
      { where: { isRead: false } }
    );
  }

  async deleteSelected(ids) {
    const normalizedIds = (Array.isArray(ids) ? ids : [ids])
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);

    if (!normalizedIds.length) {
      return { deletedCount: 0 };
    }

    const deletedCount = await Notification.destroy({
      where: { id: normalizedIds }
    });

    return { deletedCount };
  }

  async deleteAll() {
    return Notification.destroy({
      where: {}
    });
  }
}

module.exports = new NotificationService();
