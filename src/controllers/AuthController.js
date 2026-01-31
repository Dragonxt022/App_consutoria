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

  async logout(req, res) {
    req.session.destroy();
    res.redirect('/?success=Logout realizado com sucesso');
  }
}

module.exports = new AuthController();