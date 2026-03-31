require('dotenv').config();

const { DataTypes } = require('sequelize');
const { syncDatabase, Notification } = require('../src/models');

function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000);
}

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function buildNotifications() {
  return [
    {
      type: 'new_enrollment',
      title: 'Nova inscrição',
      message: 'Ana Paula Rocha acabou de se inscrever em Governança, Transparência e Controle Interno.',
      link: '/admin/inscricoes/1/editar',
      dedupeKey: 'seed:new-enrollment:1',
      metadata: {
        enrollmentId: 1,
        courseTitle: 'Governança, Transparência e Controle Interno'
      },
      isRead: false,
      readAt: null,
      createdAt: minutesAgo(8),
      updatedAt: minutesAgo(8)
    },
    {
      type: 'expired_certificate',
      title: 'Certidão vencida',
      message: 'A certidão "Certidão de Regularidade Fiscal" venceu em 26/03/2026 e precisa ser atualizada.',
      link: '/admin/certidoes/1/editar',
      dedupeKey: 'seed:expired-certificate:1',
      metadata: {
        certificateId: 1
      },
      isRead: false,
      readAt: null,
      createdAt: hoursAgo(2),
      updatedAt: hoursAgo(2)
    },
    {
      type: 'blog_published',
      title: 'Novo post publicado',
      message: 'O post "Como estruturar um plano anual de capacitação sem improviso" foi publicado com sucesso.',
      link: '/admin/blog/2/editar',
      dedupeKey: 'seed:blog-published:1',
      metadata: {
        postId: 2
      },
      isRead: true,
      readAt: hoursAgo(10),
      createdAt: hoursAgo(12),
      updatedAt: hoursAgo(10)
    },
    {
      type: 'smtp_failure',
      title: 'Falha no envio SMTP',
      message: 'O sistema não conseguiu enviar o e-mail de teste. Revise host, porta, usuário e remetente configurados no painel.',
      link: '/admin/configuracoes?tab=email',
      dedupeKey: 'seed:smtp-failure:1',
      metadata: {
        context: 'email-test'
      },
      isRead: true,
      readAt: daysAgo(1),
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1)
    },
    {
      type: 'new_enrollment',
      title: 'Nova inscrição',
      message: 'Carlos Mendes concluiu o cadastro no curso Liderança Estratégica para Alta Gestão.',
      link: '/admin/inscricoes/2/editar',
      dedupeKey: 'seed:new-enrollment:2',
      metadata: {
        enrollmentId: 2,
        courseTitle: 'Liderança Estratégica para Alta Gestão'
      },
      isRead: true,
      readAt: hoursAgo(20),
      createdAt: daysAgo(2),
      updatedAt: hoursAgo(20)
    },
    {
      type: 'expired_certificate',
      title: 'Certidão vencida',
      message: 'A certidão "Certidão Trabalhista" está vencida e ficou destacada na área de certidões.',
      link: '/admin/certidoes/3/editar',
      dedupeKey: 'seed:expired-certificate:2',
      metadata: {
        certificateId: 3
      },
      isRead: false,
      readAt: null,
      createdAt: daysAgo(3),
      updatedAt: daysAgo(3)
    }
  ];
}

async function ensureNotificationTypeEnum() {
  const queryInterface = Notification.sequelize.getQueryInterface();

  await queryInterface.changeColumn('Notifications', 'type', {
    type: DataTypes.ENUM(
      'new_enrollment',
      'expired_certificate',
      'blog_published',
      'smtp_failure',
      'course_reminder_24h',
      'enrollment_attachment_received'
    ),
    allowNull: false
  });
}

async function seedNotifications() {
  await syncDatabase();
  await ensureNotificationTypeEnum();

  await Notification.destroy({
    where: {},
    force: true,
    truncate: true
  });

  await Notification.bulkCreate(buildNotifications());

  const total = await Notification.count();
  const unread = await Notification.count({ where: { isRead: false } });

  console.log(`Notificações de exemplo criadas com sucesso. Total: ${total}. Não lidas: ${unread}.`);
}

seedNotifications()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Erro ao criar notificações de exemplo:', error);
    process.exit(1);
  });
