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
        <p>Olá <strong>${user.name}</strong>,</p>
        <p>Sua inscrição foi recebida com sucesso. Para garantir sua vaga e acessar sua área do aluno, você precisa confirmar sua conta.</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #666;">Sua senha temporária é:</p>
          <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; letter-spacing: 2px;">${tempPassword}</p>
        </div>

        <p>Clique no botão abaixo para definir sua senha definitiva e ativar seu acesso:</p>
        
        <a href="${url}" style="display: inline-block; background: #4f46e5; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">Ativar Minha Conta</a>
        
        <p style="font-size: 12px; color: #999;">Esta confirmação deve ser realizada em até 24 horas, ou sua inscrição será automaticamente cancelada.</p>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 11px; color: #999;">Se você não realizou esta inscrição, ignore este e-mail.</p>
      </div>
    `;

    return await this.sendEmail(user.email, 'Confirmação de Inscrição e Conta', html);
  }
}

module.exports = new EmailService();
