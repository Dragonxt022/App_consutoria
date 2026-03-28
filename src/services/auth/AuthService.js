const { Op } = require('sequelize');
const { User } = require('../../models');
const { generateToken } = require('../../middleware/jwt');
const { buildAppUrl } = require('../../utils/url');
const { EmailService } = require('../shared');

async function getCryptoRandomString() {
  return (await import('crypto-random-string')).default;
}

class AuthService {
  isConfirmationExpired(user) {
    if (!user || !user.confirmationExpires) {
      return true;
    }

    const expiresAt = new Date(user.confirmationExpires);
    return Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date();
  }

  async getLoginPageData() {
    const userCount = await User.count();

    return {
      shouldRedirectToFirstAdmin: userCount === 0
    };
  }

  async authenticate(email, password) {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const user = await User.findOne({ where: { email: normalizedEmail } });

    if (!user) {
      return { error: 'Credenciais inválidas' };
    }

    if (!user.active) {
      return { error: 'Sua conta ainda não foi confirmada. Verifique seu e-mail para ativar o acesso.' };
    }

    if (!(await user.checkPassword(password))) {
      return { error: 'Credenciais inválidas' };
    }

    return {
      user,
      sessionToken: generateToken(user),
      redirectPath: user.role === 'admin' ? '/admin/dashboard' : '/aluno/dashboard'
    };
  }

  async registerStudent(req) {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const { password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return {
        error: 'Preencha todos os campos obrigatórios.',
        formData: { name, email }
      };
    }

    if (password !== confirmPassword) {
      return {
        error: 'As senhas não coincidem.',
        formData: { name, email }
      };
    }

    if (password.length < 6) {
      return {
        error: 'A senha deve ter no mínimo 6 caracteres.',
        formData: { name, email }
      };
    }

    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      return {
        error: existingUser.active
          ? 'Este e-mail já está cadastrado.'
          : 'Este e-mail já foi cadastrado, mas ainda aguarda confirmação. Verifique sua caixa de entrada.',
        formData: { name, email }
      };
    }

    const cryptoRandomString = await getCryptoRandomString();
    const user = await User.create({
      name,
      email,
      password,
      role: 'aluno',
      active: false,
      confirmationToken: `activate_${cryptoRandomString({ length: 32, type: 'url-safe' })}`,
      confirmationExpires: new Date(Date.now() + 24 * 3600 * 1000)
    });

    const confirmationUrl = buildAppUrl(req, `/confirmar-conta/${user.confirmationToken}`);
    const emailSent = await EmailService.sendRegistrationConfirmation(user, confirmationUrl);

    if (!emailSent) {
      await user.destroy();

      return {
        error: 'Não foi possível enviar o e-mail de confirmação. Verifique as configurações de envio e tente novamente.',
        formData: { name, email }
      };
    }

    return {
      redirectTo: '/login?success=Cadastro realizado com sucesso. Confirme seu e-mail para ativar a conta.'
    };
  }

  async getConfirmationPageData(token) {
    const user = await User.findOne({
      where: {
        confirmationToken: token
      }
    });

    if (!user || this.isConfirmationExpired(user)) {
      return null;
    }

    return {
      token,
      email: user.email,
      requiresPasswordSetup: !String(user.confirmationToken || '').startsWith('activate_')
    };
  }

  async confirmAccount(req) {
    const { token, password, password_confirm } = req.body;
    const user = await User.findOne({
      where: {
        confirmationToken: token
      }
    });

    if (!user || this.isConfirmationExpired(user)) {
      return { redirectTo: '/login?error=Link de confirmação inválido ou expirado.' };
    }

    const requiresPasswordSetup = !String(user.confirmationToken || '').startsWith('activate_');

    if (requiresPasswordSetup) {
      if (!password || password.length < 6) {
        return { redirectTo: `/confirmar-conta/${token}?error=A senha deve ter no mínimo 6 caracteres.` };
      }

      if (password !== password_confirm) {
        return { redirectTo: `/confirmar-conta/${token}?error=As senhas informadas não coincidem.` };
      }

      user.password = password;
    }

    user.active = true;
    user.confirmationToken = null;
    user.confirmationExpires = null;
    await user.save();

    return {
      sessionToken: generateToken(user),
      redirectTo: requiresPasswordSetup
        ? '/aluno/dashboard?success=Conta ativada com sucesso! Bem-vindo.'
        : '/perfil?success=E-mail confirmado com sucesso. Agora complete e valide seu perfil.'
    };
  }

  async requestPasswordReset(req) {
    const email = (req.body.email || '').trim().toLowerCase();
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return {
        redirectTo: '/login?success=Se o e-mail estiver cadastrado, você receberá as instruções em breve.'
      };
    }

    const cryptoRandomString = await getCryptoRandomString();
    const token = cryptoRandomString({ length: 32, type: 'url-safe' });
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600000);
    await user.save();

    const resetUrl = buildAppUrl(req, `/redefinir-senha/${token}`);
    await EmailService.sendPasswordReset(user, token, resetUrl);

    return {
      redirectTo: '/login?success=Se o e-mail estiver cadastrado, você receberá as instruções em breve.'
    };
  }

  async getResetPasswordPageData(token) {
    const user = await User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return null;
    }

    return { token };
  }

  async resetPassword({ token, password }) {
    const user = await User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return { redirectTo: '/login?error=Link de recuperação inválido ou expirado.' };
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return { redirectTo: '/login?success=Senha alterada com sucesso! Faça login.' };
  }

  async getFirstAdminPageData() {
    const userCount = await User.count();
    return {
      shouldRedirectToLogin: userCount > 0
    };
  }

  async createFirstAdmin(req) {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const { password, confirmPassword } = req.body;

    const userCount = await User.count();
    if (userCount > 0) {
      return { redirectTo: '/login?error=Já existe um administrador cadastrado' };
    }

    if (password !== confirmPassword) {
      return {
        error: 'As senhas não coincidem',
        formData: { name, email }
      };
    }

    if (!password || password.length < 6) {
      return {
        error: 'A senha deve ter no mínimo 6 caracteres',
        formData: { name, email }
      };
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return {
        error: 'Este e-mail já está cadastrado',
        formData: { name, email }
      };
    }

    const newAdmin = await User.create({
      name,
      email,
      password,
      role: 'admin',
      active: true
    });

    return {
      sessionToken: generateToken(newAdmin),
      redirectTo: '/admin/dashboard?success=Conta de administrador criada com sucesso! Bem-vindo ao sistema.'
    };
  }

  async adminExists() {
    const adminCount = await User.count();
    return { exists: adminCount > 0 };
  }
}

module.exports = new AuthService();
