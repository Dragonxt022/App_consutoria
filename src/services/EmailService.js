const nodemailer = require('nodemailer');
const SettingController = require('../controllers/SettingController');

class EmailService {
  async sendEmail(to, subject, html) {
    try {
      const settings = await SettingController.getSettings();

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
        <h2 style="color: #4f46e5;">Bem-vindo ao ConsultPro!</h2>
        <p>OlÃ¡ <strong>${user.name}</strong>,</p>
        <p>Sua inscriÃ§Ã£o foi recebida com sucesso. Para garantir sua vaga e acessar sua Ã¡rea do aluno, vocÃª precisa confirmar sua conta.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #666;">Sua senha temporÃ¡ria Ã©:</p>
          <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; letter-spacing: 2px;">${tempPassword}</p>
        </div>

        <p>Clique no botÃ£o abaixo para definir sua senha definitiva e ativar seu acesso:</p>
        
        <a href="${url}" style="display: inline-block; background: #4f46e5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">Ativar Minha Conta</a>
        
        <p style="font-size: 12px; color: #999;">Esta confirmaÃ§Ã£o deve ser realizada em atÃ© 24 horas, ou sua inscriÃ§Ã£o serÃ¡ automaticamente cancelada.</p>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 11px; color: #999;">Se vocÃª nÃ£o realizou esta inscriÃ§Ã£o, ignore este e-mail.</p>
      </div>
    `;

    return await this.sendEmail(user.email, 'ConfirmaÃ§Ã£o de InscriÃ§Ã£o e Conta', html);
  }
  async sendPasswordReset(user, token, url) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #4f46e5;">RecuperaÃ§Ã£o de Senha</h2>
        <p>OlÃ¡ <strong>${user.name}</strong>,</p>
        <p>Recebemos uma solicitaÃ§Ã£o para redefinir a senha da sua conta no ConsultPro.</p>
        
        <p>Se vocÃª nÃ£o solicitou isso, pode ignorar este e-mail com seguranÃ§a.</p>
        
        <p>Para criar uma nova senha, clique no botÃ£o abaixo:</p>
        
        <a href="${url}" style="display: inline-block; background: #4f46e5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">Redefinir Minha Senha</a>
        
        <p style="font-size: 12px; color: #999;">Este link expira em 1 hora.</p>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 11px; color: #999;">Se o botÃ£o nÃ£o funcionar, copie e cole o link abaixo no seu navegador:<br>${url}</p>
      </div>
    `;

    return await this.sendEmail(user.email, 'RedefiniÃ§Ã£o de Senha', html);
  }
  async sendEmailChangeConfirmation(user, newEmail, url) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #4f46e5;">Confirmação de novo e-mail</h2>
        <p>Olá <strong>${user.name}</strong>,</p>
        <p>Recebemos uma solicitação para alterar o e-mail da conta administrativa para:</p>
        <p style="font-weight: 700; font-size: 16px;">${newEmail}</p>
        <p>Para concluir a troca, clique no botão abaixo:</p>
        <a href="${url}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 22px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">Confirmar novo e-mail</a>
        <p style="font-size: 12px; color: #999;">Este link expira em 1 hora.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="font-size: 11px; color: #999;">Se você não solicitou essa alteração, ignore este e-mail.</p>
      </div>
    `;

    return await this.sendEmail(newEmail, 'Confirmação de alteração de e-mail', html);
  }
}

module.exports = new EmailService();
