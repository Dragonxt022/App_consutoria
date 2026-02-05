const { User } = require('../models');
const { generateToken } = require('../middleware/jwt');

class AuthController {
  async showLogin(req, res) {
    res.render('login', {
      title: 'Acesso ao Sistema'
    });
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ 
        where: { 
          email, 
          active: true 
        } 
      });

      if (!user || !(await user.checkPassword(password))) {
        return res.redirect(`/login?error=Credenciais inválidas`);
      }

      const token = generateToken(user);
      req.session.token = token;

      const redirectPath = user.role === 'admin' ? '/admin/dashboard' : '/aluno/dashboard';
      res.redirect(redirectPath);
    } catch (error) {
      console.error('Login error:', error);
      res.redirect('/login?error=Ocorreu um erro no servidor');
    }
  }

  async showConfirmAccount(req, res) {
    const { token } = req.params;
    const { Op } = require('sequelize');
    const user = await User.findOne({ 
      where: { 
        confirmationToken: token,
        confirmationExpires: { [Op.gt]: new Date() }
      } 
    });

    if (!user) {
      return res.redirect('/login?error=Link de confirmação inválido ou expirado.');
    }

    res.render('auth/confirm', {
      title: 'Confirmar Conta',
      token,
      email: user.email,
      layout: 'public/layout'
    });
  }

  async handleConfirmAccount(req, res) {
    try {
      const { token, password } = req.body;
      const { Op } = require('sequelize');
      const user = await User.findOne({ 
        where: { 
          confirmationToken: token,
          confirmationExpires: { [Op.gt]: new Date() }
        } 
      });

      if (!user) {
        return res.redirect('/login?error=Link de confirmação inválido ou expirado.');
      }

      user.password = password;
      user.active = true;
      user.confirmationToken = null;
      user.confirmationExpires = null;
      await user.save();

      const tokenJwt = generateToken(user);
      req.session.token = tokenJwt;

      res.redirect('/aluno/dashboard?success=Conta ativada com sucesso! Bem-vindo.');
    } catch (error) {
      console.error(error);
      res.redirect('/login?error=Erro ao ativar conta.');
    }
  }

  async showForgotPassword(req, res) {
    res.render('auth/forgot', {
      title: 'Recuperar Senha',
      layout: 'public/layout'
    });
  }

  async handleForgotPassword(req, res) {
    try {
      const { email } = req.body;
      const cryptoRandomString = (await import('crypto-random-string')).default;
      const EmailService = require('../services/EmailService');
      const { Op } = require('sequelize');

      const user = await User.findOne({ where: { email } });

      // Always show success message to prevent email enumeration
      if (!user) {
        return res.redirect('/login?success=Se o e-mail estiver cadastrado, você receberá as instruções em breve.');
      }

      const token = cryptoRandomString({length: 32, type: 'url-safe'});
      user.resetPasswordToken = token;
      user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
      await user.save();

      const resetUrl = `${req.protocol}://${req.get('host')}/redefinir-senha/${token}`;
      await EmailService.sendPasswordReset(user, token, resetUrl);

      res.redirect('/login?success=Se o e-mail estiver cadastrado, você receberá as instruções em breve.');
    } catch (error) {
      console.error(error);
      res.redirect('/esqueci-senha?error=Erro ao processar solicitação.');
    }
  }

  async showResetPassword(req, res) {
    const { token } = req.params;
    const { Op } = require('sequelize');
    
    const user = await User.findOne({ 
      where: { 
        resetPasswordToken: token,
        resetPasswordExpires: { [Op.gt]: new Date() }
      } 
    });

    if (!user) {
      return res.redirect('/login?error=Link de recuperação inválido ou expirado.');
    }

    res.render('auth/reset', {
      title: 'Redefinir Senha',
      token,
      layout: 'public/layout'
    });
  }

  async handleResetPassword(req, res) {
    try {
      const { token, password } = req.body;
      const { Op } = require('sequelize');
      
      const user = await User.findOne({ 
        where: { 
          resetPasswordToken: token,
          resetPasswordExpires: { [Op.gt]: new Date() }
        } 
      });

      if (!user) {
        return res.redirect('/login?error=Link de recuperação inválido ou expirado.');
      }

      // Automatically hashes via hook
      user.password = password;
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();

      res.redirect('/login?success=Senha alterada com sucesso! Faça login.');
    } catch (error) {
      console.error(error);
      res.redirect(`/redefinir-senha/${req.body.token}?error=Erro ao redefinir senha.`);
    }
  }

  async logout(req, res) {
    req.session.destroy();
    res.redirect('/?success=Logout realizado com sucesso');
  }
}

module.exports = new AuthController();