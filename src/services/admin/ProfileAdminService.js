const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const { User } = require('../../models');
const { EmailService } = require('../shared');
const { buildAppUrl } = require('../../utils/url');

async function getCryptoRandomString() {
  return (await import('crypto-random-string')).default;
}

class ProfileAdminService {
  removeAvatarIfNeeded(avatarUrl) {
    if (!avatarUrl || !avatarUrl.startsWith('/uploads/avatars/')) {
      return;
    }

    const avatarPath = path.join(__dirname, '..', '..', 'public', avatarUrl.replace('/uploads/', 'uploads/'));
    if (!fs.existsSync(avatarPath)) {
      return;
    }

    try {
      fs.unlinkSync(avatarPath);
    } catch (error) {
      console.warn('Não foi possível remover avatar antigo:', error.message || error);
    }
  }

  async getAdminUser(userId) {
    const user = await User.findByPk(userId);

    if (!user || user.role !== 'admin') {
      return null;
    }

    return user;
  }

  async updateProfile(req) {
    const user = await this.getAdminUser(req.user.id);

    if (!user) {
      return { accessDenied: true };
    }

    const { name, email, emailPassword } = req.body;
    const oldAvatar = user.avatar;

    if (!name || !String(name).trim()) {
      return { error: 'Informe o nome do administrador' };
    }

    user.name = String(name).trim();

    if (req.file) {
      user.avatar = `/uploads/avatars/${req.file.filename}`;
    }

    let emailChangeRequested = false;
    const normalizedEmail = (email || '').trim().toLowerCase();

    if (normalizedEmail && normalizedEmail !== user.email.toLowerCase()) {
      if (!emailPassword) {
        return { error: 'Informe sua senha atual para solicitar troca de e-mail' };
      }

      const validPassword = await user.checkPassword(emailPassword);
      if (!validPassword) {
        return { error: 'Senha atual inválida para troca de e-mail' };
      }

      const existingEmail = await User.findOne({
        where: {
          email: normalizedEmail,
          id: { [Op.ne]: user.id }
        }
      });

      if (existingEmail) {
        return { error: 'Este e-mail já está em uso por outra conta' };
      }

      const cryptoRandomString = await getCryptoRandomString();
      const token = cryptoRandomString({ length: 32, type: 'url-safe' });
      user.pendingEmail = normalizedEmail;
      user.emailChangeToken = token;
      user.emailChangeExpires = new Date(Date.now() + 60 * 60 * 1000);
      emailChangeRequested = true;

      const confirmUrl = buildAppUrl(req, `/admin/perfil/confirmar-email/${token}`);
      await EmailService.sendEmailChangeConfirmation(user, normalizedEmail, confirmUrl);
    }

    await user.save();

    if (req.file && oldAvatar && oldAvatar !== user.avatar) {
      this.removeAvatarIfNeeded(oldAvatar);
    }

    return {
      accessDenied: false,
      user,
      successMessage: emailChangeRequested
        ? 'Dados atualizados. Enviamos um link de confirmação para o novo e-mail.'
        : 'Perfil atualizado com sucesso'
    };
  }

  async changePassword(userId, body) {
    const user = await this.getAdminUser(userId);

    if (!user) {
      return { accessDenied: true };
    }

    const { currentPassword, newPassword, confirmPassword } = body;
    const validPassword = await user.checkPassword(currentPassword || '');

    if (!validPassword) {
      return { error: 'Senha atual incorreta' };
    }

    if (!newPassword || newPassword.length < 6) {
      return { error: 'A nova senha deve ter no mínimo 6 caracteres' };
    }

    if (newPassword !== confirmPassword) {
      return { error: 'As novas senhas não coincidem' };
    }

    user.password = newPassword;
    await user.save();

    return {
      accessDenied: false,
      user,
      successMessage: 'Senha atualizada com sucesso'
    };
  }

  async confirmEmailChange(token) {
    const user = await User.findOne({
      where: {
        emailChangeToken: token,
        emailChangeExpires: { [Op.gt]: new Date() }
      }
    });

    if (!user || !user.pendingEmail) {
      return { invalid: true };
    }

    const existingEmail = await User.findOne({
      where: {
        email: user.pendingEmail,
        id: { [Op.ne]: user.id }
      }
    });

    if (existingEmail) {
      user.pendingEmail = null;
      user.emailChangeToken = null;
      user.emailChangeExpires = null;
      await user.save();

      return {
        invalid: false,
        redirectTo: '/admin/perfil?error=O e-mail solicitado já foi usado por outra conta'
      };
    }

    user.email = user.pendingEmail;
    user.pendingEmail = null;
    user.emailChangeToken = null;
    user.emailChangeExpires = null;
    await user.save();

    return {
      invalid: false,
      user,
      redirectTo: '/admin/perfil?success=E-mail atualizado e confirmado com sucesso'
    };
  }
}

module.exports = new ProfileAdminService();
