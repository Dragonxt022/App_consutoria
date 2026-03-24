const { User } = require('../models');
const { generateToken } = require('../middleware/jwt');
const { buildAppUrl } = require('../utils/url');

class AuthController {
  async showLogin(req, res) {
    try {
      // Verificar se há usuários no sistema
      const userCount = await User.count();
      
      // Se não há usuários, redireciona para cadastro de primeiro admin
      if (userCount === 0) {
        return res.redirect('/primeiro-admin');
      }

      res.render('login', {
        title: 'Acesso ao Sistema'
      });
    } catch (error) {
      console.error(error);
      res.render('login', {
        title: 'Acesso ao Sistema'
      });
    }
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

      const resetUrl = buildAppUrl(req, `/redefinir-senha/${token}`);
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

  // Verificar se há usuários no sistema
  async checkAdminExists(req, res) {
    try {
      const adminCount = await User.count();
      res.json({ exists: adminCount > 0 });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao verificar administrador' });
    }
  }

  // Mostrar formulário de cadastro do primeiro admin
  async showFirstAdminSetup(req, res) {
    try {
      const userCount = await User.count();
      
      // Se já existe usuário, redireciona para login
      if (userCount > 0) {
        return res.redirect('/login');
      }

      res.render('auth/first-admin', {
        title: 'Criar Conta de Administrador',
        layout: 'public/layout'
      });
    } catch (error) {
      console.error(error);
      res.redirect('/login?error=Erro ao verificar sistema');
    }
  }

  // Criar primeiro usuário admin
  async createFirstAdmin(req, res) {
    try {
      const { name, email, password, confirmPassword } = req.body;
      const cryptoRandomString = (await import('crypto-random-string')).default;

      // Verificar se já existe usuário
      const userCount = await User.count();
      if (userCount > 0) {
        return res.redirect('/login?error=Já existe um administrador cadastrado');
      }

      // Validações
      if (password !== confirmPassword) {
        return res.render('auth/first-admin', {
          title: 'Criar Conta de Administrador',
          error: 'As senhas não coincidem',
          name,
          email,
          layout: 'public/layout'
        });
      }

      if (password.length < 6) {
        return res.render('auth/first-admin', {
          title: 'Criar Conta de Administrador',
          error: 'A senha deve ter no mínimo 6 caracteres',
          name,
          email,
          layout: 'public/layout'
        });
      }

      // Verificar se email já existe
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.render('auth/first-admin', {
          title: 'Criar Conta de Administrador',
          error: 'Este e-mail já está cadastrado',
          name,
          layout: 'public/layout'
        });
      }

      // Criar o primeiro usuário como admin
      const newAdmin = await User.create({
        name,
        email,
        password,
        role: 'admin',
        active: true // Primeiro admin é ativado automaticamente
      });

      // Gerar token e fazer login automático
      const token = generateToken(newAdmin);
      req.session.token = token;

      res.redirect('/admin/dashboard?success=Conta de administrador criada com sucesso! Bem-vindo ao sistema.');
    } catch (error) {
      console.error(error);
      res.render('auth/first-admin', {
        title: 'Criar Conta de Administrador',
        error: 'Erro ao criar conta. Tente novamente.',
        layout: 'public/layout'
      });
    }
  }
}

module.exports = new AuthController();
