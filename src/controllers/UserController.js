const { User, Enrollment } = require('../models');
const { Op } = require('sequelize');
const { redirectWithFlash } = require('../utils/flash');
const { buildAppUrl } = require('../utils/url');

class UserController {
  async buildUserFormData(managedUser) {
    const latestEnrollment = await Enrollment.findOne({
      where: { userId: managedUser.id },
      order: [['createdAt', 'DESC']]
    });

    return {
      ...managedUser.toJSON(),
      phone: managedUser.phone || latestEnrollment?.studentPhone || '',
      cpfCnpj: managedUser.cpfCnpj || latestEnrollment?.cpfCnpj || '',
      company: managedUser.company || latestEnrollment?.company || '',
      pais: managedUser.pais || latestEnrollment?.pais || '',
      endereco: managedUser.endereco || latestEnrollment?.endereco || '',
      cidade: managedUser.cidade || latestEnrollment?.cidade || '',
      estado: managedUser.estado || latestEnrollment?.estado || '',
      cep: managedUser.cep || latestEnrollment?.cep || '',
      entePublico: managedUser.entePublico ?? latestEnrollment?.entePublico ?? false
    };
  }

  buildFilters(query = {}) {
    const search = typeof query.search === 'string' ? query.search.trim() : '';
    const status = typeof query.status === 'string' ? query.status.trim() : '';
    const role = typeof query.role === 'string' ? query.role.trim() : '';
    const where = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { company: { [Op.like]: `%${search}%` } }
      ];
    }

    if (status === 'ativo') {
      where.active = true;
    } else if (status === 'inativo') {
      where.active = false;
    }

    if (['admin', 'aluno'].includes(role)) {
      where.role = role;
    }

    return {
      where,
      filters: { search, status, role }
    };
  }

  async index(req, res) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = 10;
      const offset = (page - 1) * limit;
      const { where, filters } = this.buildFilters(req.query);

      const { count, rows: users } = await User.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      res.render('admin/users/list', {
        title: 'Usuarios',
        users,
        filters,
        pagination: {
          currentPage: page,
          totalPages: Math.max(1, Math.ceil(count / limit)),
          totalItems: count
        },
        user: req.user,
        layout: 'admin/layout'
      });
    } catch (error) {
      console.error(error);
      redirectWithFlash(req, res, '/admin/dashboard', 'error', 'Erro ao carregar usuarios');
    }
  }

  async edit(req, res) {
    try {
      const managedUser = await User.findByPk(req.params.id);

      if (!managedUser) {
        return redirectWithFlash(req, res, '/admin/usuarios', 'error', 'Usuario nao encontrado');
      }

      const userFormData = await this.buildUserFormData(managedUser);

      res.render('admin/users/edit', {
        title: 'Editar Usuario',
        managedUser: userFormData,
        user: req.user,
        layout: 'admin/layout'
      });
    } catch (error) {
      console.error(error);
      redirectWithFlash(req, res, '/admin/usuarios', 'error', 'Erro ao carregar usuario');
    }
  }

  async update(req, res) {
    try {
      const managedUser = await User.findByPk(req.params.id);

      if (!managedUser) {
        return redirectWithFlash(req, res, '/admin/usuarios', 'error', 'Usuario nao encontrado');
      }

      const name = (req.body.name || '').trim();
      const email = (req.body.email || '').trim().toLowerCase();
      const role = req.body.role;
      const active = req.body.active === 'on';
      const phone = (req.body.phone || '').trim();
      const cpfCnpj = (req.body.cpfCnpj || '').trim();
      const company = (req.body.company || '').trim();
      const pais = (req.body.pais || '').trim();
      const endereco = (req.body.endereco || '').trim();
      const cidade = (req.body.cidade || '').trim();
      const estado = (req.body.estado || '').trim();
      const cep = (req.body.cep || '').trim();
      const entePublico = req.body.entePublico === '1';

      if (!name || !email) {
        return redirectWithFlash(req, res, `/admin/usuarios/${managedUser.id}/editar`, 'error', 'Nome e email sao obrigatorios');
      }

      if (!['admin', 'aluno'].includes(role)) {
        return redirectWithFlash(req, res, `/admin/usuarios/${managedUser.id}/editar`, 'error', 'Perfil de acesso invalido');
      }

      const emailInUse = await User.findOne({
        where: {
          email,
          id: { [Op.ne]: managedUser.id }
        }
      });

      if (emailInUse) {
        return redirectWithFlash(req, res, `/admin/usuarios/${managedUser.id}/editar`, 'error', 'Este email ja esta em uso');
      }

      if (req.user.id === managedUser.id && (!active || role !== 'admin')) {
        return redirectWithFlash(req, res, `/admin/usuarios/${managedUser.id}/editar`, 'error', 'Voce nao pode desativar ou remover seu proprio acesso administrativo');
      }

      await managedUser.update({
        name,
        email,
        role,
        active,
        phone: phone || null,
        cpfCnpj: cpfCnpj || null,
        company: company || null,
        pais: pais || null,
        endereco: endereco || null,
        cidade: cidade || null,
        estado: estado || null,
        cep: cep || null,
        entePublico
      });

      redirectWithFlash(req, res, '/admin/usuarios', 'success', 'Usuario atualizado com sucesso');
    } catch (error) {
      console.error(error);
      redirectWithFlash(req, res, `/admin/usuarios/${req.params.id}/editar`, 'error', 'Erro ao atualizar usuario');
    }
  }

  async resendAccess(req, res) {
    try {
      const managedUser = await User.findByPk(req.params.id);

      if (!managedUser) {
        return redirectWithFlash(req, res, '/admin/usuarios', 'error', 'Usuario nao encontrado');
      }

      const cryptoRandomString = (await import('crypto-random-string')).default;
      const EmailService = require('../services/EmailService');

      let sent = false;

      if (managedUser.active) {
        const resetToken = cryptoRandomString({ length: 32, type: 'url-safe' });
        managedUser.resetPasswordToken = resetToken;
        managedUser.resetPasswordExpires = new Date(Date.now() + 3600000);
        await managedUser.save();

        const resetUrl = buildAppUrl(req, `/redefinir-senha/${resetToken}`);
        sent = await EmailService.sendPasswordReset(managedUser, resetToken, resetUrl);
      } else {
        const confirmationToken = cryptoRandomString({ length: 32, type: 'url-safe' });
        managedUser.confirmationToken = confirmationToken;
        managedUser.confirmationExpires = new Date(Date.now() + 24 * 3600 * 1000);
        await managedUser.save();

        const confirmationUrl = buildAppUrl(req, `/confirmar-conta/${confirmationToken}`);
        sent = await EmailService.sendAccountActivationLink(managedUser, confirmationUrl);
      }

      if (!sent) {
        return redirectWithFlash(req, res, '/admin/usuarios', 'error', 'Nao foi possivel enviar o email. Verifique as configuracoes SMTP');
      }

      const successMessage = managedUser.active
        ? 'Email de redefinicao de senha reenviado com sucesso'
        : 'Link de ativacao reenviado com sucesso';

      redirectWithFlash(req, res, '/admin/usuarios', 'success', successMessage);
    } catch (error) {
      console.error(error);
      redirectWithFlash(req, res, '/admin/usuarios', 'error', 'Erro ao reenviar email de acesso');
    }
  }
}

module.exports = new UserController();
