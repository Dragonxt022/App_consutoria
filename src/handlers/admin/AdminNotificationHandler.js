const { NotificationService } = require('../../services');

const AdminNotificationHandler = {
  async list(req, res) {
    const data = await NotificationService.getNotificationsPageData(req.query, req.user.id);

    return res.render('admin/notifications/list', {
      title: 'Notificacoes',
      user: req.user,
      layout: 'admin/layout',
      ...data
    });
  },

  async open(req, res) {
    const result = await NotificationService.openNotification(req.params.id, req.user.id);
    return res.redirect(result.redirectTo);
  },

  async markRead(req, res) {
    const result = await NotificationService.markAsRead(req.params.id, req.user.id);

    if (result.notFound) {
      return res.redirect('/admin/notificacoes?error=Notificação não encontrada');
    }

    return res.redirect('/admin/notificacoes?success=Notificação marcada como lida');
  },

  async markAllRead(req, res) {
    await NotificationService.markAllAsRead(req.user.id);
    return res.redirect('/admin/notificacoes?success=Todas as notificações foram marcadas como lidas');
  },

  async deleteSelected(req, res) {
    const result = await NotificationService.deleteSelected(req.body.notificationIds, req.user.id);

    if (!result.deletedCount) {
      return res.redirect('/admin/notificacoes?error=Selecione ao menos uma notificação para excluir');
    }

    return res.redirect(`/admin/notificacoes?success=${encodeURIComponent(`${result.deletedCount} notificação(ões) excluída(s)`)}`);
  },

  async deleteAll(req, res) {
    await NotificationService.deleteAll(req.user.id);
    return res.redirect('/admin/notificacoes?success=Todas as notificações foram excluídas');
  }
};

module.exports = AdminNotificationHandler;
