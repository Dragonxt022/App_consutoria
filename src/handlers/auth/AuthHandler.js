const { AuthService } = require('../../services');

function renderRegister(res, payload = {}) {
  return res.render('auth/register', {
    title: 'Criar Conta',
    layout: 'public/layout',
    ...payload
  });
}

function renderFirstAdmin(res, payload = {}) {
  return res.render('auth/first-admin', {
    title: 'Criar Conta de Administrador',
    layout: 'public/layout',
    ...payload
  });
}

const AuthHandler = {
  async showRegister(_req, res) {
    renderRegister(res);
  },

  async showLogin(_req, res) {
    const { shouldRedirectToFirstAdmin } = await AuthService.getLoginPageData();

    if (shouldRedirectToFirstAdmin) {
      return res.redirect('/primeiro-admin');
    }

    return res.render('login', {
      title: 'Acesso ao Sistema'
    });
  },

  async login(req, res) {
    const result = await AuthService.authenticate(req.body.email, req.body.password);

    if (result.error) {
      return res.redirect(`/login?error=${encodeURIComponent(result.error)}`);
    }

    req.session.token = result.sessionToken;
    return res.redirect(result.redirectPath);
  },

  async register(req, res) {
    const result = await AuthService.registerStudent(req);

    if (result.error) {
      return renderRegister(res, {
        error: result.error,
        ...(result.formData || {})
      });
    }

    return res.redirect(result.redirectTo);
  },

  async showConfirmAccount(req, res) {
    const data = await AuthService.getConfirmationPageData(req.params.token);

    if (!data) {
      return res.redirect('/login?error=Link de confirmação inválido ou expirado.');
    }

    return res.render('auth/confirm', {
      title: 'Confirmar Conta',
      layout: 'public/layout',
      ...data
    });
  },

  async handleConfirmAccount(req, res) {
    const result = await AuthService.confirmAccount(req);

    if (result.sessionToken) {
      req.session.token = result.sessionToken;
    }

    return res.redirect(result.redirectTo);
  },

  async showForgotPassword(_req, res) {
    res.render('auth/forgot', {
      title: 'Recuperar Senha',
      layout: 'public/layout'
    });
  },

  async handleForgotPassword(req, res) {
    const result = await AuthService.requestPasswordReset(req);
    return res.redirect(result.redirectTo);
  },

  async showResetPassword(req, res) {
    const data = await AuthService.getResetPasswordPageData(req.params.token);

    if (!data) {
      return res.redirect('/login?error=Link de recuperação inválido ou expirado.');
    }

    return res.render('auth/reset', {
      title: 'Redefinir Senha',
      layout: 'public/layout',
      ...data
    });
  },

  async handleResetPassword(req, res) {
    const result = await AuthService.resetPassword({
      token: req.body.token,
      password: req.body.password
    });

    return res.redirect(result.redirectTo);
  },

  async logout(req, res) {
    req.session.destroy();
    res.redirect('/?success=Logout realizado com sucesso');
  },

  async checkAdminExists(_req, res) {
    const result = await AuthService.adminExists();
    res.json(result);
  },

  async showFirstAdminSetup(_req, res) {
    const { shouldRedirectToLogin } = await AuthService.getFirstAdminPageData();

    if (shouldRedirectToLogin) {
      return res.redirect('/login');
    }

    return renderFirstAdmin(res);
  },

  async createFirstAdmin(req, res) {
    const result = await AuthService.createFirstAdmin(req);

    if (result.error) {
      return renderFirstAdmin(res, {
        error: result.error,
        ...(result.formData || {})
      });
    }

    req.session.token = result.sessionToken;
    return res.redirect(result.redirectTo);
  }
};

module.exports = AuthHandler;
