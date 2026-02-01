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

  async logout(req, res) {
    req.session.destroy();
    res.redirect('/?success=Logout realizado com sucesso');
  }
}

module.exports = new AuthController();