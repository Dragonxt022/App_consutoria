const { User } = require('../models');
const { generateToken } = require('../middleware/jwt');

class AuthController {
  async showLogin(req, res) {
    res.render('public/login', { 
      title: 'Login',
      error: req.query.error,
      success: req.query.success
    });
  }

  async showAdminLogin(req, res) {
    res.render('admin/login', { 
      title: 'Login Administrador',
      error: req.query.error
    });
  }

  async showAlunoLogin(req, res) {
    res.render('aluno/login', { 
      title: 'Login Aluno',
      error: req.query.error
    });
  }

  async login(req, res) {
    try {
      const { email, password, role } = req.body;

      const user = await User.findOne({ 
        where: { 
          email, 
          role,
          active: true 
        } 
      });

      if (!user || !(await user.checkPassword(password))) {
        const loginPath = role === 'admin' ? '/admin/login' : '/aluno/login';
        return res.redirect(`${loginPath}?error=Credenciais inválidas`);
      }

      const token = generateToken(user);
      req.session.token = token;

      const redirectPath = role === 'admin' ? '/admin/dashboard' : '/aluno/dashboard';
      res.redirect(redirectPath);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Erro no login' });
    }
  }

  async logout(req, res) {
    req.session.destroy();
    res.redirect('/?success=Logout realizado com sucesso');
  }
}

module.exports = new AuthController();