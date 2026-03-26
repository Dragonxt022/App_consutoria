const { User, Enrollment, Course } = require('../models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const EmailService = require('../services/EmailService');
const { generateToken } = require('../middleware/jwt');
const { buildAppUrl } = require('../utils/url');
const { formatCurrency } = require('../utils/currencyFormatter');

class ProfileController {
  removeAvatarIfNeeded(avatarUrl) {
    if (!avatarUrl || !avatarUrl.startsWith('/uploads/avatars/')) {
      return;
    }

    const avatarPath = path.join(__dirname, '..', 'public', avatarUrl.replace('/uploads/', 'uploads/'));
    if (!fs.existsSync(avatarPath)) {
      return;
    }

    try {
      fs.unlinkSync(avatarPath);
    } catch (error) {
      console.warn('Não foi possível remover avatar antigo:', error.message || error);
    }
  }

  async getStudentEnrollments(userId) {
    return Enrollment.findAll({
      where: { userId },
      include: [{ model: Course }],
      order: [['createdAt', 'DESC']]
    });
  }

  getStudentStats(enrollments) {
    return {
      totalCourses: enrollments.length,
      totalCertificates: enrollments.filter((enrollment) => enrollment.status === 'completo').length,
      totalInProgress: enrollments.filter((enrollment) => ['pendente', 'confirmado'].includes(enrollment.status)).length
    };
  }

  async show(req, res) {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).render('error', { title: 'Usuário não encontrado', layout: false });
      }

      const enrollments = await this.getStudentEnrollments(user.id);

      res.render('aluno/profile', {
        title: 'Meu Perfil',
        user,
        stats: this.getStudentStats(enrollments),
        layout: 'public/layout'
      });
    } catch (error) {
      console.error(error);
      res.redirect('/aluno/dashboard?error=Erro ao carregar perfil');
    }
  }

  async update(req, res) {
    try {
      const user = await User.findByPk(req.user.id);

      if (!user) {
        return res.redirect('/perfil?error=Usuário não encontrado');
      }

      const oldAvatar = user.avatar;

      if (req.file) {
        user.avatar = `/uploads/avatars/${req.file.filename}`;
      }

      await user.save();
      req.session.token = generateToken(user);

      if (req.file && oldAvatar && oldAvatar !== user.avatar) {
        this.removeAvatarIfNeeded(oldAvatar);
      }

      return res.redirect('/perfil?success=Foto de perfil atualizada com sucesso');
    } catch (error) {
      console.error(error);
      return res.redirect('/perfil?error=Erro ao atualizar a foto de perfil');
    }
  }

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      const user = await User.findByPk(req.user.id);

      if (!user) {
        return res.redirect('/perfil?error=Usuário não encontrado');
      }

      const isPasswordCorrect = await user.checkPassword(currentPassword);
      if (!isPasswordCorrect) {
        return res.redirect('/perfil?error=Senha atual incorreta');
      }

      if (newPassword !== confirmPassword) {
        return res.redirect('/perfil?error=As senhas não coincidem');
      }

      if (newPassword.length < 6) {
        return res.redirect('/perfil?error=A nova senha deve ter no mínimo 6 caracteres');
      }

      user.password = newPassword;
      await user.save();
      req.session.token = generateToken(user);

      return res.redirect('/perfil?success=Senha alterada com sucesso');
    } catch (error) {
      console.error(error);
      return res.redirect('/perfil?error=Erro ao alterar senha');
    }
  }

  async studentCourses(req, res) {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.redirect('/login?error=Usuário não encontrado');
      }

      const enrollments = await this.getStudentEnrollments(user.id);

      return res.render('aluno/courses', {
        title: 'Meus Cursos',
        user,
        enrollments,
        stats: this.getStudentStats(enrollments),
        formatCurrency,
        layout: 'public/layout'
      });
    } catch (error) {
      console.error(error);
      return res.redirect('/aluno/dashboard?error=Erro ao carregar seus cursos');
    }
  }

  async studentCertificates(req, res) {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.redirect('/login?error=Usuário não encontrado');
      }

      const enrollments = await this.getStudentEnrollments(user.id);
      const certificates = enrollments.filter((enrollment) => enrollment.status === 'completo');

      return res.render('aluno/certificates', {
        title: 'Meus Certificados',
        user,
        certificates,
        stats: this.getStudentStats(enrollments),
        layout: 'public/layout'
      });
    } catch (error) {
      console.error(error);
      return res.redirect('/aluno/dashboard?error=Erro ao carregar seus certificados');
    }
  }

  // Perfil administrativo
  async adminShow(req, res) {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user || user.role !== 'admin') {
        return res.redirect('/admin/dashboard?error=Acesso negado');
      }

      res.render('admin/profile', {
        title: 'Perfil do Administrador',
        user,
        layout: 'admin/layout'
      });
    } catch (error) {
      console.error(error);
      res.redirect('/admin/dashboard?error=Erro ao carregar perfil');
    }
  }

  async adminUpdate(req, res) {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user || user.role !== 'admin') {
        return res.redirect('/admin/dashboard?error=Acesso negado');
      }

      const { name, email, emailPassword } = req.body;
      const oldAvatar = user.avatar;

      if (!name || !String(name).trim()) {
        return res.redirect('/admin/perfil?error=Informe o nome do administrador');
      }

      user.name = String(name).trim();

      if (req.file) {
        user.avatar = `/uploads/avatars/${req.file.filename}`;
      }

      let emailChangeRequested = false;
      const normalizedEmail = (email || '').trim().toLowerCase();
      if (normalizedEmail && normalizedEmail !== user.email.toLowerCase()) {
        if (!emailPassword) {
          return res.redirect('/admin/perfil?error=Informe sua senha atual para solicitar troca de e-mail');
        }

        const validPassword = await user.checkPassword(emailPassword);
        if (!validPassword) {
          return res.redirect('/admin/perfil?error=Senha atual inválida para troca de e-mail');
        }

        const existingEmail = await User.findOne({ where: { email: normalizedEmail, id: { [Op.ne]: user.id } } });
        if (existingEmail) {
          return res.redirect('/admin/perfil?error=Este e-mail já está em uso por outra conta');
        }

        const cryptoRandomString = (await import('crypto-random-string')).default;
        const token = cryptoRandomString({ length: 32, type: 'url-safe' });
        user.pendingEmail = normalizedEmail;
        user.emailChangeToken = token;
        user.emailChangeExpires = new Date(Date.now() + 60 * 60 * 1000);
        emailChangeRequested = true;

        const confirmUrl = buildAppUrl(req, `/admin/perfil/confirmar-email/${token}`);
        await EmailService.sendEmailChangeConfirmation(user, normalizedEmail, confirmUrl);
      }

      await user.save();
      req.session.token = generateToken(user);

      if (req.file && oldAvatar && oldAvatar.startsWith('/uploads/avatars/')) {
        const oldAvatarPath = path.join(__dirname, '..', 'public', oldAvatar.replace('/uploads/', 'uploads/'));
        if (fs.existsSync(oldAvatarPath)) {
          try {
            fs.unlinkSync(oldAvatarPath);
          } catch (err) {
            console.warn('Não foi possível remover avatar antigo:', err.message || err);
          }
        }
      }

      if (emailChangeRequested) {
        return res.redirect('/admin/perfil?success=Dados atualizados. Enviamos um link de confirmação para o novo e-mail.');
      }

      return res.redirect('/admin/perfil?success=Perfil atualizado com sucesso');
    } catch (error) {
      console.error(error);
      return res.redirect('/admin/perfil?error=Erro ao atualizar perfil do administrador');
    }
  }

  async adminChangePassword(req, res) {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      const user = await User.findByPk(req.user.id);

      if (!user || user.role !== 'admin') {
        return res.redirect('/admin/dashboard?error=Acesso negado');
      }

      const validPassword = await user.checkPassword(currentPassword || '');
      if (!validPassword) {
        return res.redirect('/admin/perfil?error=Senha atual incorreta');
      }

      if (!newPassword || newPassword.length < 6) {
        return res.redirect('/admin/perfil?error=A nova senha deve ter no mínimo 6 caracteres');
      }

      if (newPassword !== confirmPassword) {
        return res.redirect('/admin/perfil?error=As novas senhas não coincidem');
      }

      user.password = newPassword;
      await user.save();
      req.session.token = generateToken(user);

      return res.redirect('/admin/perfil?success=Senha atualizada com sucesso');
    } catch (error) {
      console.error(error);
      return res.redirect('/admin/perfil?error=Erro ao atualizar senha');
    }
  }

  async confirmAdminEmailChange(req, res) {
    try {
      const { token } = req.params;

      const user = await User.findOne({
        where: {
          emailChangeToken: token,
          emailChangeExpires: { [Op.gt]: new Date() }
        }
      });

      if (!user || !user.pendingEmail) {
        return res.redirect('/login?error=Link de confirmação de e-mail inválido ou expirado');
      }

      const existingEmail = await User.findOne({
        where: {
          email: user.pendingEmail,
          id: { [Op.ne]: user.id }
        }
      });

      if (existingEmail) {
        user.pendingEmail = null;
        user.emailChangeToken = null;
        user.emailChangeExpires = null;
        await user.save();
        return res.redirect('/admin/perfil?error=O e-mail solicitado já foi usado por outra conta');
      }

      user.email = user.pendingEmail;
      user.pendingEmail = null;
      user.emailChangeToken = null;
      user.emailChangeExpires = null;
      await user.save();

      if (req.session) {
        req.session.token = generateToken(user);
      }

      return res.redirect('/admin/perfil?success=E-mail atualizado e confirmado com sucesso');
    } catch (error) {
      console.error(error);
      return res.redirect('/login?error=Erro ao confirmar novo e-mail');
    }
  }
}

module.exports = new ProfileController();
