const { User } = require('../models');

class ProfileController {
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

      // Atualizar apenas os campos permitidos
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

      // Validar senha atual
      const isPasswordCorrect = await user.checkPassword(currentPassword);
      if (!isPasswordCorrect) {
        return res.status(401).json({ 
          success: false, 
          message: 'Senha atual incorreta' 
        });
      }

      // Validar nova senha
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

      // Atualizar senha
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
}

module.exports = new ProfileController();
