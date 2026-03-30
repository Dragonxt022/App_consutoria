const nodemailer = require('nodemailer');
const SiteSettingsService = require('./SiteSettingsService');

class EmailService {
  async sendBulkEmails(recipients, subject, buildHtml) {
    const uniqueRecipients = [...new Set((Array.isArray(recipients) ? recipients : []).map((item) => String(item || '').trim().toLowerCase()).filter(Boolean))];

    if (!uniqueRecipients.length) {
      return { attempted: 0, sent: 0 };
    }

    let sent = 0;

    for (const recipient of uniqueRecipients) {
      const delivered = await this.sendEmail(recipient, subject, buildHtml(recipient));
      if (delivered) sent += 1;
    }

    return {
      attempted: uniqueRecipients.length,
      sent
    };
  }

  async sendEmail(to, subject, html) {
    try {
      const settings = await SiteSettingsService.getSettings();

      // Skip if no SMTP user is configured (prevent errors during initial setup)
      if (!settings.smtp_user) {
        console.warn('EMAIL SERVICE: Skip sending email, SMTP not configured.');
        return false;
      }

      const transporter = nodemailer.createTransport({
        host: settings.smtp_host,
        port: parseInt(settings.smtp_port),
        secure: settings.smtp_port === '465',
        auth: {
          user: settings.smtp_user,
          pass: settings.smtp_pass
        }
      });

      await transporter.sendMail({
        from: `"${settings.site_name}" <${settings.smtp_from}>`,
        to,
        subject,
        html
      });

      return true;
    } catch (error) {
      console.error('EMAIL SERVICE ERROR:', error);
      return false;
    }
  }

  async sendAccountConfirmation(user, tempPassword, url) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #e57846;">Bem-vindo ao CIP ILIMITADA!</h2>
        <p>Olá <strong>${user.name}</strong>,</p>
        <p>Sua inscrição foi recebida com sucesso. Para garantir sua vaga e acessar sua área do aluno, você precisa confirmar sua conta.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #666;">Sua senha temporária é:</p>
          <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; letter-spacing: 2px;">${tempPassword}</p>
        </div>

        <p>Clique no botão abaixo para definir sua senha definitiva e ativar seu acesso:</p>
        
        <a href="${url}" style="display: inline-block; background: #e57846; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">Ativar Minha Conta</a>
        
        <p style="font-size: 12px; color: #999;">Esta confirmação deve ser realizada em até 24 horas, ou sua inscrição será automaticamente cancelada.</p>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 11px; color: #999;">Se você não realizou esta inscrição, ignore este e-mail.</p>
      </div>
    `;

    return await this.sendEmail(user.email, 'Confirmação de Inscrição e Conta', html);
  }
  async sendAccountActivationLink(user, url) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #e57846;">Ativacao de Conta</h2>
        <p>Ola <strong>${user.name}</strong>,</p>
        <p>Seu acesso ja esta cadastrado, mas a conta ainda precisa ser validada para liberar a entrada na plataforma.</p>

        <p>Para concluir a ativacao e definir sua senha, clique no botao abaixo:</p>

        <a href="${url}" style="display: inline-block; background: #e57846; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">Ativar Minha Conta</a>

        <p style="font-size: 12px; color: #999;">Este link expira em 24 horas.</p>

        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 11px; color: #999;">Se o botao nao funcionar, copie e cole o link abaixo no navegador:<br>${url}</p>
      </div>
    `;

    return await this.sendEmail(user.email, 'Ativacao de Conta', html);
  }
  async sendRegistrationConfirmation(user, url) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #e57846;">Confirmação de e-mail</h2>
        <p>Olá <strong>${user.name}</strong>,</p>
        <p>Recebemos o seu cadastro e agora precisamos confirmar o seu e-mail para liberar o acesso à área do aluno.</p>

        <p>Clique no botão abaixo para validar sua conta:</p>

        <a href="${url}" style="display: inline-block; background: #e57846; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">Confirmar meu e-mail</a>

        <p style="font-size: 12px; color: #999;">Este link expira em 24 horas.</p>

        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 11px; color: #999;">Se o botão não funcionar, copie e cole o link abaixo no navegador:<br>${url}</p>
      </div>
    `;

    return await this.sendEmail(user.email, 'Confirme seu e-mail', html);
  }
  async sendPasswordReset(user, token, url) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #e57846;">Recuperação de Senha</h2>
        <p>Olá <strong>${user.name}</strong>,</p>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta no ConsultPro.</p>
        
        <p>Se você não solicitou isso, pode ignorar este e-mail com segurança.</p>
        
        <p>Para criar uma nova senha, clique no botão abaixo:</p>
        
        <a href="${url}" style="display: inline-block; background: #e57846; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">Redefinir Minha Senha</a>
        
        <p style="font-size: 12px; color: #999;">Este link expira em 1 hora.</p>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 11px; color: #999;">Se o botão não funcionar, copie e cole o link abaixo no seu navegador:<br>${url}</p>
      </div>
    `;

    return await this.sendEmail(user.email, 'Redefinição de Senha', html);
  }
  async sendEmailChangeConfirmation(user, newEmail, url) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #e57846;">Confirmação de novo e-mail</h2>
        <p>Olá <strong>${user.name}</strong>,</p>
        <p>Recebemos uma solicitação para alterar o e-mail da conta administrativa para:</p>
        <p style="font-weight: 700; font-size: 16px;">${newEmail}</p>
        <p>Para concluir a troca, clique no botão abaixo:</p>
        <a href="${url}" style="display: inline-block; background: #e57846; color: white; padding: 12px 22px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">Confirmar novo e-mail</a>
        <p style="font-size: 12px; color: #999;">Este link expira em 1 hora.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="font-size: 11px; color: #999;">Se você não solicitou essa alteração, ignore este e-mail.</p>
      </div>
    `;

    return await this.sendEmail(newEmail, 'Confirmação de alteração de e-mail', html);
  }

  async sendNewEnrollmentAlertToAdmins({ adminRecipients, enrollment, course, manageUrl }) {
    const subject = `Nova inscrição recebida: ${course.title}`;

    return this.sendBulkEmails(adminRecipients, subject, () => `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #0f172a;">
        <h2 style="margin-bottom: 12px; color: #1d4ed8;">Nova inscrição realizada</h2>
        <p>Uma nova inscrição foi registrada no site e já está disponível para acompanhamento no painel.</p>

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:20px; margin:24px 0;">
          <p style="margin:0 0 8px;"><strong>Curso:</strong> ${course.title}</p>
          <p style="margin:0 0 8px;"><strong>Aluno:</strong> ${enrollment.studentName}</p>
          <p style="margin:0 0 8px;"><strong>E-mail:</strong> ${enrollment.studentEmail}</p>
          <p style="margin:0 0 8px;"><strong>Telefone:</strong> ${enrollment.studentPhone}</p>
          <p style="margin:0;"><strong>Empresa:</strong> ${enrollment.company || 'Não informada'}</p>
        </div>

        <a href="${manageUrl}" style="display:inline-block; background:#2563eb; color:#fff; padding:14px 24px; text-decoration:none; border-radius:10px; font-weight:700;">Abrir inscrição no painel</a>
      </div>
    `);
  }

  async sendCourseConfirmedNoticeToStudents({ recipients, course, dashboardUrl }) {
    const subject = `Turma confirmada: ${course.title}`;

    return this.sendBulkEmails(recipients, subject, () => `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #0f172a;">
        <h2 style="margin-bottom: 12px; color: #0284c7;">Turma confirmada</h2>
        <p>Temos uma ótima notícia: a turma do curso <strong>${course.title}</strong> foi confirmada.</p>

        <div style="background:#ecfeff; border:1px solid #a5f3fc; border-radius:14px; padding:20px; margin:24px 0;">
          <p style="margin:0 0 8px;"><strong>Curso:</strong> ${course.title}</p>
          <p style="margin:0 0 8px;"><strong>Local:</strong> ${course.location}</p>
          <p style="margin:0;"><strong>Início:</strong> ${new Date(course.startDate).toLocaleDateString('pt-BR')}</p>
        </div>

        <p>Você pode acompanhar sua inscrição e os detalhes atualizados na sua área do aluno.</p>
        <a href="${dashboardUrl}" style="display:inline-block; background:#0284c7; color:#fff; padding:14px 24px; text-decoration:none; border-radius:10px; font-weight:700;">Abrir área do aluno</a>

        <p style="margin-top:24px; font-size:13px; color:#475569;">O certificado será disponibilizado na plataforma após a conclusão e liberação do curso.</p>
      </div>
    `);
  }

  async sendEnrollmentConfirmedToStudent({ enrollment, course, dashboardUrl, certificatesUrl }) {
    const subject = `Sua inscrição foi confirmada: ${course.title}`;

    return this.sendEmail(enrollment.studentEmail, subject, `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #0f172a;">
        <h2 style="margin-bottom: 12px; color: #0284c7;">Inscrição confirmada</h2>
        <p>Olá <strong>${enrollment.studentName}</strong>,</p>
        <p>Sua inscrição no curso <strong>${course.title}</strong> foi confirmada com sucesso.</p>

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:20px; margin:24px 0;">
          <p style="margin:0 0 8px;"><strong>Curso:</strong> ${course.title}</p>
          <p style="margin:0 0 8px;"><strong>Local:</strong> ${course.location}</p>
          <p style="margin:0;"><strong>Data de início:</strong> ${new Date(course.startDate).toLocaleDateString('pt-BR')}</p>
        </div>

        <p>Você pode acompanhar sua inscrição e, quando o certificado for liberado, acessá-lo diretamente pela plataforma.</p>
        <div style="margin-top: 24px;">
          <a href="${dashboardUrl}" style="display:inline-block; background:#0284c7; color:#fff; padding:14px 24px; text-decoration:none; border-radius:10px; font-weight:700; margin-right:12px;">Ver minha inscrição</a>
          <a href="${certificatesUrl}" style="display:inline-block; background:#e2e8f0; color:#0f172a; padding:14px 24px; text-decoration:none; border-radius:10px; font-weight:700;">Meus certificados</a>
        </div>
      </div>
    `);
  }

  async sendEnrollmentCancelledToStudent({ enrollment, course, coursesUrl, contactEmail }) {
    const subject = `Atualização da sua inscrição: ${course.title}`;

    return this.sendEmail(enrollment.studentEmail, subject, `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #0f172a;">
        <h2 style="margin-bottom: 12px; color: #dc2626;">Inscrição cancelada</h2>
        <p>Olá <strong>${enrollment.studentName}</strong>,</p>
        <p>Sua inscrição no curso <strong>${course.title}</strong> foi cancelada.</p>

        <div style="background:#fff1f2; border:1px solid #fecdd3; border-radius:14px; padding:20px; margin:24px 0;">
          <p style="margin:0;">Agradecemos sinceramente pelo seu interesse. Esperamos ter a oportunidade de receber você em uma próxima turma.</p>
        </div>

        <p>Se quiser conhecer outras opções disponíveis, acesse nosso catálogo de cursos. Caso precise de suporte, fale conosco pelo e-mail <strong>${contactEmail}</strong>.</p>
        <a href="${coursesUrl}" style="display:inline-block; background:#dc2626; color:#fff; padding:14px 24px; text-decoration:none; border-radius:10px; font-weight:700;">Ver outros cursos</a>
      </div>
    `);
  }

  async sendCourseReminder24hToStudents({ recipients, course, dashboardUrl }) {
    const startDate = new Date(course.startDate).toLocaleString('pt-BR');
    const subject = `Lembrete: seu curso começa em até 24h`;

    return this.sendBulkEmails(recipients, subject, () => `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #0f172a;">
        <h2 style="margin-bottom: 12px; color: #1d4ed8;">Seu curso está chegando</h2>
        <p>Este é um lembrete automático para avisar que o curso <strong>${course.title}</strong> começa em até 24 horas.</p>

        <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:14px; padding:20px; margin:24px 0;">
          <p style="margin:0 0 8px;"><strong>Curso:</strong> ${course.title}</p>
          <p style="margin:0 0 8px;"><strong>Início:</strong> ${startDate}</p>
          <p style="margin:0;"><strong>Local:</strong> ${course.location}</p>
        </div>

        <p>Se precisar revisar sua inscrição ou consultar seus dados, acesse sua área do aluno.</p>
        <a href="${dashboardUrl}" style="display:inline-block; background:#1d4ed8; color:#fff; padding:14px 24px; text-decoration:none; border-radius:10px; font-weight:700;">Abrir área do aluno</a>
      </div>
    `);
  }

  async sendEnrollmentAttachmentReceivedToAdmins({ adminRecipients, enrollment, course, manageUrl }) {
    const subject = `Documento recebido na inscrição: ${course.title}`;

    return this.sendBulkEmails(adminRecipients, subject, () => `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #0f172a;">
        <h2 style="margin-bottom: 12px; color: #059669;">Documento da inscrição recebido</h2>
        <p>Um aluno enviou um documento complementar para análise administrativa.</p>

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:20px; margin:24px 0;">
          <p style="margin:0 0 8px;"><strong>Curso:</strong> ${course.title}</p>
          <p style="margin:0 0 8px;"><strong>Aluno:</strong> ${enrollment.studentName}</p>
          <p style="margin:0 0 8px;"><strong>E-mail:</strong> ${enrollment.studentEmail}</p>
          <p style="margin:0;"><strong>Status da inscrição:</strong> ${enrollment.status}</p>
        </div>

        <a href="${manageUrl}" style="display:inline-block; background:#059669; color:#fff; padding:14px 24px; text-decoration:none; border-radius:10px; font-weight:700;">Abrir inscrição no painel</a>
      </div>
    `);
  }

  async sendNewAttachmentAvailableToStudents({ recipients, attachmentTitle, dashboardUrl, detailsUrl }) {
    const subject = `Novo anexo disponível: ${attachmentTitle}`;

    return this.sendBulkEmails(recipients, subject, () => `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #0f172a;">
        <h2 style="margin-bottom: 12px; color: #2563eb;">Você recebeu um novo anexo</h2>
        <p>Um novo material foi disponibilizado para você na área do aluno.</p>

        <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:14px; padding:20px; margin:24px 0;">
          <p style="margin:0;"><strong>Anexo:</strong> ${attachmentTitle}</p>
        </div>

        <div style="margin-top: 24px;">
          <a href="${detailsUrl}" style="display:inline-block; background:#2563eb; color:#fff; padding:14px 24px; text-decoration:none; border-radius:10px; font-weight:700; margin-right:12px;">Abrir anexo</a>
          <a href="${dashboardUrl}" style="display:inline-block; background:#e2e8f0; color:#0f172a; padding:14px 24px; text-decoration:none; border-radius:10px; font-weight:700;">Ir para a área do aluno</a>
        </div>
      </div>
    `);
  }
}

module.exports = new EmailService();
