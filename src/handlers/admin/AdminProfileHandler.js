const { generateToken } = require('../../middleware/Jwt');
const { ProfileAdminService } = require('../../services');

const AdminProfileHandler = {
  async show(req, res) {
    const user = await ProfileAdminService.getAdminUser(req.user.id);

    if (!user) {
      return res.redirect('/admin/dashboard?error=Acesso negado');
    }

    return res.render('admin/profile', {
      title: 'Perfil do Administrador',
      user,
      layout: 'admin/layout'
    });
  },

  async update(req, res) {
    try {
      const result = await ProfileAdminService.updateProfile(req);

      if (result.accessDenied) {
        return res.redirect('/admin/dashboard?error=Acesso negado');
      }

      if (result.error) {
        return res.redirect(`/admin/perfil?error=${encodeURIComponent(result.error)}`);
      }

      req.session.token = generateToken(result.user);
      return res.redirect(`/admin/perfil?success=${encodeURIComponent(result.successMessage)}`);
    } catch (error) {
      console.error(error);
      return res.redirect('/admin/perfil?error=Erro ao atualizar perfil do administrador');
    }
  },

  async changePassword(req, res) {
    try {
      const result = await ProfileAdminService.changePassword(req.user.id, req.body);

      if (result.accessDenied) {
        return res.redirect('/admin/dashboard?error=Acesso negado');
      }

      if (result.error) {
        return res.redirect(`/admin/perfil?error=${encodeURIComponent(result.error)}`);
      }

      req.session.token = generateToken(result.user);
      return res.redirect(`/admin/perfil?success=${encodeURIComponent(result.successMessage)}`);
    } catch (error) {
      console.error(error);
      return res.redirect('/admin/perfil?error=Erro ao atualizar senha');
    }
  },

  async confirmEmailChange(req, res) {
    try {
      const result = await ProfileAdminService.confirmEmailChange(req.params.token);

      if (result.invalid) {
        return res.redirect('/login?error=Link de confirmação de e-mail inválido ou expirado');
      }

      if (result.user && req.session) {
        req.session.token = generateToken(result.user);
      }

      return res.redirect(result.redirectTo);
    } catch (error) {
      console.error(error);
      return res.redirect('/login?error=Erro ao confirmar novo e-mail');
    }
  }
};

module.exports = AdminProfileHandler;
