const { redirectWithFlash } = require('../../utils/Flash');
const { UserAdminService } = require('../../services');

const AdminUserHandler = {
  async list(req, res) {
    const data = await UserAdminService.getListData(req.query);

    res.render('admin/users/list', {
      title: 'Usuários',
      user: req.user,
      layout: 'admin/layout',
      ...data
    });
  },

  async showEdit(req, res) {
    const managedUser = await UserAdminService.getUserForEdit(req.params.id);

    if (!managedUser) {
      return redirectWithFlash(req, res, '/admin/usuarios', 'error', 'Usuário não encontrado');
    }

    return res.render('admin/users/edit', {
      title: 'Editar Usuário',
      managedUser,
      user: req.user,
      layout: 'admin/layout'
    });
  },

  async create(req, res) {
    try {
      const result = await UserAdminService.createUser(req.body);

      if (result.error) {
        return redirectWithFlash(req, res, '/admin/usuarios', 'error', result.error);
      }

      return redirectWithFlash(req, res, '/admin/usuarios', 'success', 'Usuário cadastrado com sucesso');
    } catch (error) {
      console.error(error);
      return redirectWithFlash(req, res, '/admin/usuarios', 'error', 'Erro ao cadastrar usuario');
    }
  },

  async update(req, res) {
    try {
      const result = await UserAdminService.updateUser(req.user, req.params.id, req.body);

      if (result.error) {
        return redirectWithFlash(req, res, result.redirectTo, 'error', result.error);
      }

      return redirectWithFlash(req, res, '/admin/usuarios', 'success', 'Usuário atualizado com sucesso');
    } catch (error) {
      console.error(error);
      return redirectWithFlash(req, res, `/admin/usuarios/${req.params.id}/editar`, 'error', 'Erro ao atualizar usuario');
    }
  },

  async resendAccess(req, res) {
    try {
      const result = await UserAdminService.resendAccess(req);

      if (result.error) {
        return redirectWithFlash(req, res, '/admin/usuarios', 'error', result.error);
      }

      return redirectWithFlash(req, res, '/admin/usuarios', 'success', result.success);
    } catch (error) {
      console.error(error);
      return redirectWithFlash(req, res, '/admin/usuarios', 'error', 'Erro ao reenviar email de acesso');
    }
  },

  async delete(req, res) {
    try {
      const result = await UserAdminService.deleteUser(req.user, req.params.id);

      if (result.error) {
        return redirectWithFlash(req, res, '/admin/usuarios', 'error', result.error);
      }

      return redirectWithFlash(req, res, '/admin/usuarios', 'success', 'Usuário excluído com sucesso');
    } catch (error) {
      console.error(error);
      return redirectWithFlash(req, res, '/admin/usuarios', 'error', 'Erro ao excluir usuario');
    }
  }
};

module.exports = AdminUserHandler;
