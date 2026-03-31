#!/usr/bin/env node
require('dotenv').config();

const { sequelize } = require('../src/models');
const { EmailService, SiteSettingsService } = require('../src/services/shared');

const DEFAULT_RECIPIENT = 'pissinatti2019@gmail.com';

function getCliRecipient() {
  const candidate = process.argv[2];
  return candidate && candidate.includes('@') ? candidate.trim().toLowerCase() : DEFAULT_RECIPIENT;
}

function getBaseUrl() {
  return (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

function buildUrl(pathname) {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${getBaseUrl()}${normalizedPath}`;
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

async function main() {
  const recipient = getCliRecipient();

  try {
    await sequelize.authenticate();

    const settings = await SiteSettingsService.getSettings();
    if (!settings.smtp_user) {
      console.error('SMTP nao configurado. Defina smtp_host, smtp_port, smtp_user, smtp_pass e smtp_from nas configuracoes.');
      process.exitCode = 1;
      return;
    }

    const now = new Date();
    const course = {
      id: 999,
      title: 'Curso de Teste das Automacoes de E-mail',
      location: 'Ambiente de homologacao',
      startDate: addHours(now, 23).toISOString()
    };

    const enrollment = {
      id: 999,
      studentName: 'Destinatario de Teste',
      studentEmail: recipient,
      studentPhone: '(41) 99999-9999',
      company: 'CIP Ilimitada',
      status: 'confirmado'
    };

    const user = {
      name: 'Destinatario de Teste',
      email: recipient
    };

    const dashboardUrl = buildUrl('/aluno/dashboard');
    const certificatesUrl = buildUrl('/aluno/certificados');
    const coursesUrl = buildUrl('/cursos');
    const manageEnrollmentUrl = buildUrl(`/admin/inscricoes/${enrollment.id}/editar`);
    const attachmentDetailsUrl = buildUrl('/aluno/anexos/999');
    const accountConfirmationUrl = buildUrl('/confirmar-conta/token-de-teste');
    const resetPasswordUrl = buildUrl('/redefinir-senha/token-de-teste');
    const confirmEmailChangeUrl = buildUrl('/confirmar-email/token-de-teste');
    const accountActivationUrl = buildUrl('/confirmar-conta/ativacao-de-teste');

    const jobs = [
      {
        label: 'Automacao: admins sobre nova inscricao',
        run: () => EmailService.sendNewEnrollmentAlertToAdmins({
          adminRecipients: [recipient],
          enrollment,
          course,
          manageUrl: manageEnrollmentUrl
        })
      },
      {
        label: 'Automacao: admins sobre documento/anexo da inscricao',
        run: () => EmailService.sendEnrollmentAttachmentReceivedToAdmins({
          adminRecipients: [recipient],
          enrollment,
          course,
          manageUrl: manageEnrollmentUrl
        })
      },
      {
        label: 'Automacao: inscritos quando a turma for confirmada',
        run: () => EmailService.sendCourseConfirmedNoticeToStudents({
          recipients: [recipient],
          course,
          dashboardUrl
        })
      },
      {
        label: 'Automacao: aluno quando a inscricao for confirmada',
        run: () => EmailService.sendEnrollmentConfirmedToStudent({
          enrollment,
          course,
          dashboardUrl,
          certificatesUrl
        })
      },
      {
        label: 'Automacao: aluno quando a inscricao for cancelada',
        run: () => EmailService.sendEnrollmentCancelledToStudent({
          enrollment: { ...enrollment, status: 'cancelado' },
          course,
          coursesUrl,
          contactEmail: settings.footer_email || settings.smtp_from || recipient
        })
      },
      {
        label: 'Automacao: lembrete automatico 24h antes do curso',
        run: () => EmailService.sendCourseReminder24hToStudents({
          recipients: [recipient],
          course,
          dashboardUrl
        })
      },
      {
        label: 'Automacao: aluno recebe novo anexo',
        run: () => EmailService.sendNewAttachmentAvailableToStudents({
          recipients: [recipient],
          attachmentTitle: 'Material de teste - automacoes de e-mail',
          dashboardUrl,
          detailsUrl: attachmentDetailsUrl
        })
      },
      {
        label: 'Fluxo de conta: confirmacao de conta com senha temporaria',
        run: () => EmailService.sendAccountConfirmation(user, 'TEMP1234', accountConfirmationUrl)
      },
      {
        label: 'Fluxo de conta: confirmacao de cadastro por e-mail',
        run: () => EmailService.sendRegistrationConfirmation(user, accountConfirmationUrl)
      },
      {
        label: 'Fluxo de conta: ativacao de conta',
        run: () => EmailService.sendAccountActivationLink(user, accountActivationUrl)
      },
      {
        label: 'Fluxo de conta: redefinicao de senha',
        run: () => EmailService.sendPasswordReset(user, 'token-de-teste', resetPasswordUrl)
      },
      {
        label: 'Fluxo de conta: confirmacao de troca de e-mail',
        run: () => EmailService.sendEmailChangeConfirmation(user, recipient, confirmEmailChangeUrl)
      }
    ];

    console.log(`Disparando ${jobs.length} e-mails de teste para ${recipient} usando o SMTP configurado no sistema...`);

    let successCount = 0;

    for (const job of jobs) {
      const result = await job.run();
      const success = typeof result === 'boolean' ? result : Boolean(result && result.sent);
      if (success) {
        successCount += 1;
        console.log(`[OK] ${job.label}`);
      } else {
        console.log(`[FALHOU] ${job.label}`);
      }
    }

    console.log(`Concluido: ${successCount}/${jobs.length} envios reportados como bem-sucedidos.`);
  } catch (error) {
    console.error('Falha ao executar o teste de automacoes de e-mail:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close().catch(() => {});
  }
}

main();
