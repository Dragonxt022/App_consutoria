const { NotificationService } = require('../../services');

const AdminNotificationHandler = {
  async list(req, res) {
    const data = await NotificationService.getNotificationsPageData(req.query);

    return res.render('admin/notifications/list', {
      title: 'Notificacoes',
      user: req.user,
      layout: 'admin/layout',
      ...data
    });
  },

  async open(req, res) {
    const result = await NotificationService.openNotification(req.params.id);
    return res.redirect(result.redirectTo);
  },

  async markRead(req, res) {
    const result = await NotificationService.markAsRead(req.params.id);

    if (result.notFound) {
      return res.redirect('/admin/notificacoes?error=Notificação não encontrada');
    }

    return res.redirect('/admin/notificacoes?success=Notificação marcada como lida');
  },

  async markAllRead(_req, res) {
    await NotificationService.markAllAsRead();
    return res.redirect('/admin/notificacoes?success=Todas as notificações foram marcadas como lidas');
  },

  async deleteSelected(req, res) {
    const result = await NotificationService.deleteSelected(req.body.notificationIds);

    if (!result.deletedCount) {
      return res.redirect('/admin/notificacoes?error=Selecione ao menos uma notificação para excluir');
    }

    return res.redirect(`/admin/notificacoes?success=${encodeURIComponent(`${result.deletedCount} notificação(ões) excluída(s)`)}`);
  },

  async deleteAll(_req, res) {
    await NotificationService.deleteAll();
    return res.redirect('/admin/notificacoes?success=Todas as notificações foram excluídas');
  }
};

module.exports = AdminNotificationHandler;
