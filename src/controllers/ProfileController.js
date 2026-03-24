const { User } = require('../models');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const EmailService = require('../services/EmailService');
const { generateToken } = require('../middleware/jwt');
const { buildAppUrl } = require('../utils/url');

class ProfileController {
  // Perfil do aluno (fluxo existente)
  async show(req, res) {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).render('error', { title: 'Usuário não encontrado', layout: false });
      }

      res.render('aluno/profile', {
        title: 'Meu Perfil',
        user,
        layout: 'public/layout'
      });
    } catch (error) {
      console.error(error);
      res.redirect('/aluno/dashboard?error=Erro ao carregar perfil');
    }
  }

  async update(req, res) {
    try {
      const { name, phone, cpfCnpj, company, entePublico, pais, endereco, cidade, estado, cep } = req.body;
      const user = await User.findByPk(req.user.id);

      if (!user) {
        return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
      }

      user.name = name || user.name;
      user.phone = phone || user.phone;
      user.cpfCnpj = cpfCnpj || user.cpfCnpj;
      user.company = company || user.company;
      user.entePublico = entePublico !== undefined ? entePublico : user.entePublico;
      user.pais = pais || user.pais;
      user.endereco = endereco || user.endereco;
      user.cidade = cidade || user.cidade;
      user.estado = estado || user.estado;
      user.cep = cep || user.cep;

      await user.save();
      req.session.token = generateToken(user);

      return res.json({
        success: true,
        message: 'Perfil atualizado com sucesso',
        user: user.toJSON()
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao atualizar perfil'
      });
    }
  }

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      const user = await User.findByPk(req.user.id);

      if (!user) {
        return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
      }

      const isPasswordCorrect = await user.checkPassword(currentPassword);
      if (!isPasswordCorrect) {
        return res.status(401).json({
          success: false,
          message: 'Senha atual incorreta'
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'As senhas não coincidem'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'A nova senha deve ter no mínimo 6 caracteres'
        });
      }

      user.password = newPassword;
      await user.save();

      return res.json({
        success: true,
        message: 'Senha alterada com sucesso'
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: 'Erro ao alterar senha'
      });
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
