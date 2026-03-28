const nodemailer = require('nodemailer');
const SiteSettingsService = require('./SiteSettingsService');

class EmailService {
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
}

module.exports = new EmailService();
