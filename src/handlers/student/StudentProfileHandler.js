const { generateToken } = require('../../middleware/Jwt');
const { formatCurrency } = require('../../utils/CurrencyFormatter');
const { StudentProfileService } = require('../../services');

const StudentProfileHandler = {
  async show(req, res) {
    const data = await StudentProfileService.getProfileData(req.user.id);

    if (!data) {
      return res.status(404).render('error', {
        title: 'Usuário não encontrado',
        layout: false
      });
    }

    return res.render('aluno/profile', {
      title: 'Meu Perfil',
      layout: 'public/layout',
      currentStudentSection: 'profile',
      ...data
    });
  },

  async update(req, res) {
    try {
      const user = await StudentProfileService.updateAvatar(req.user.id, req.file);

      if (!user) {
        return res.redirect('/perfil?error=Usuário não encontrado');
      }

      req.session.token = generateToken(user);
      return res.redirect('/perfil?success=Foto de perfil atualizada com sucesso');
    } catch (error) {
      console.error(error);
      return res.redirect('/perfil?error=Erro ao atualizar a foto de perfil');
    }
  },

  async changePassword(req, res) {
    try {
      const result = await StudentProfileService.changePassword(req.user.id, req.body);

      if (result.notFound) {
        return res.redirect('/perfil?error=Usuário não encontrado');
      }

      if (result.error) {
        return res.redirect(`/perfil?error=${encodeURIComponent(result.error)}`);
      }

      req.session.token = generateToken(result.user);
      return res.redirect('/perfil?success=Senha alterada com sucesso');
    } catch (error) {
      console.error(error);
      return res.redirect('/perfil?error=Erro ao alterar senha');
    }
  },

  async courses(req, res) {
    const data = await StudentProfileService.getProfileData(req.user.id);

    if (!data) {
      return res.redirect('/login?error=Usuário não encontrado');
    }

    return res.render('aluno/courses', {
      title: 'Meus Cursos',
      user: data.user,
      enrollments: data.enrollments,
      stats: data.stats,
      formatCurrency,
      layout: 'public/layout',
      currentStudentSection: 'courses'
    });
  },

  async certificates(req, res) {
    const data = await StudentProfileService.getProfileData(req.user.id);

    if (!data) {
      return res.redirect('/login?error=Usuário não encontrado');
    }

    return res.render('aluno/certificates', {
      title: 'Meus Certificados',
      user: data.user,
      certificates: data.enrollments.filter((enrollment) => enrollment.status === 'completo'),
      stats: data.stats,
      layout: 'public/layout',
      currentStudentSection: 'certificates'
    });
  }
};

module.exports = StudentProfileHandler;
