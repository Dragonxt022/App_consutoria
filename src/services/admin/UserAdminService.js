const { Op } = require('sequelize');
const { User, Enrollment, BlogPost } = require('../../models');
const { buildAppUrl } = require('../../utils/Url');
const { EmailService } = require('../shared');

async function getCryptoRandomString() {
  return (await import('crypto-random-string')).default;
}

class UserAdminService {
  logUserDeletion(actor, managedUser) {
    console.warn('[AUDIT] admin_user_delete', {
      actorId: actor?.id || null,
      actorEmail: actor?.email || null,
      targetUserId: managedUser.id,
      targetUserEmail: managedUser.email,
      targetUserRole: managedUser.role,
      occurredAt: new Date().toISOString()
    });
  }

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

  async getListData(query = {}) {
    const page = parseInt(query.page, 10) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    const { where, filters } = this.buildFilters(query);

    const { count, rows: users } = await User.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    return {
      users,
      filters,
      formData: {
        name: '',
        email: '',
        role: 'aluno',
        active: true,
        phone: '',
        company: ''
      },
      pagination: {
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(count / limit)),
        totalItems: count
      }
    };
  }

  async getUserForEdit(userId) {
    const managedUser = await User.findByPk(userId);

    if (!managedUser) {
      return null;
    }

    return this.buildUserFormData(managedUser);
  }

  async createUser(body) {
    const name = (body.name || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';
    const role = body.role;
    const active = body.active === 'on';
    const phone = (body.phone || '').trim();
    const company = (body.company || '').trim();

    if (!name || !email || !password) {
      return { error: 'Nome, email e senha sao obrigatorios' };
    }

    if (!['admin', 'aluno'].includes(role)) {
      return { error: 'Perfil de acesso invalido' };
    }

    if (password.length < 6) {
      return { error: 'A senha deve ter no minimo 6 caracteres' };
    }

    const existingUser = await User.findOne({ where: { email }, paranoid: false });
    if (existingUser) {
      return { error: 'Este email ja esta em uso' };
    }

    await User.create({
      name,
      email,
      password,
      role,
      active,
      phone: phone || null,
      company: company || null
    });

    return { error: null };
  }

  async updateUser(actor, userId, body) {
    const managedUser = await User.findByPk(userId);

    if (!managedUser) {
      return { error: 'Usuario nao encontrado', redirectTo: '/admin/usuarios' };
    }

    const name = (body.name || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const role = body.role;
    const active = body.active === 'on';
    const phone = (body.phone || '').trim();
    const cpfCnpj = (body.cpfCnpj || '').trim();
    const company = (body.company || '').trim();
    const pais = (body.pais || '').trim();
    const endereco = (body.endereco || '').trim();
    const cidade = (body.cidade || '').trim();
    const estado = (body.estado || '').trim();
    const cep = (body.cep || '').trim();
    const entePublico = body.entePublico === '1';

    if (!name || !email) {
      return { error: 'Nome e email sao obrigatorios', redirectTo: `/admin/usuarios/${managedUser.id}/editar` };
    }

    if (!['admin', 'aluno'].includes(role)) {
      return { error: 'Perfil de acesso invalido', redirectTo: `/admin/usuarios/${managedUser.id}/editar` };
    }

    const emailInUse = await User.findOne({
      where: {
        email,
        id: { [Op.ne]: managedUser.id }
      },
      paranoid: false
    });

    if (emailInUse) {
      return { error: 'Este email ja esta em uso', redirectTo: `/admin/usuarios/${managedUser.id}/editar` };
    }

    if (actor.id === managedUser.id && (!active || role !== 'admin')) {
      return {
        error: 'Voce nao pode desativar ou remover seu proprio acesso administrativo',
        redirectTo: `/admin/usuarios/${managedUser.id}/editar`
      };
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

    return { error: null, redirectTo: '/admin/usuarios' };
  }

  async resendAccess(req) {
    const managedUser = await User.findByPk(req.params.id);

    if (!managedUser) {
      return { error: 'Usuario nao encontrado' };
    }

    const cryptoRandomString = await getCryptoRandomString();
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
      return { error: 'Nao foi possivel enviar o email. Verifique as configuracoes SMTP' };
    }

    return {
      error: null,
      success: managedUser.active
        ? 'Email de redefinicao de senha reenviado com sucesso'
        : 'Link de ativacao reenviado com sucesso'
    };
  }

  async deleteUser(actor, userId) {
    const managedUser = await User.findByPk(userId);

    if (!managedUser) {
      return { error: 'Usuario nao encontrado' };
    }

    if (actor.id === managedUser.id) {
      return { error: 'Voce nao pode excluir seu proprio usuario' };
    }

    const [enrollmentCount, blogPostCount] = await Promise.all([
      Enrollment.count({ where: { userId: managedUser.id }, paranoid: false }),
      BlogPost.count({ where: { authorId: managedUser.id }, paranoid: false })
    ]);

    if (enrollmentCount > 0 || blogPostCount > 0) {
      return {
        error: 'Este usuario possui inscricoes ou publicacoes vinculadas e nao pode ser excluido.'
      };
    }

    this.logUserDeletion(actor, managedUser);
    await managedUser.destroy();
    return { error: null };
  }
}

module.exports = new UserAdminService();
