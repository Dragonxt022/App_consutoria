const { CourseAdminService } = require('../../services');

const AdminCourseHandler = {
  async list(req, res) {
    const page = parseInt(req.query.page, 10) || 1;
    const data = await CourseAdminService.getAdminListData(page, req.query);

    res.render('admin/courses/list', {
      title: 'Listagem de Cursos',
      user: req.user,
      layout: 'admin/layout',
      ...data
    });
  },

  async showCreate(_req, res) {
    res.render('admin/courses/create', {
      title: 'Cadastrar Curso',
      user: res.locals.user,
      layout: 'admin/layout'
    });
  },

  async create(req, res) {
    try {
      await CourseAdminService.createCourse(req);
      res.redirect('/admin/cursos?success=Curso cadastrado com sucesso!');
    } catch (error) {
      console.error(error);
      CourseAdminService.cleanupUploadedFiles(req);
      res.redirect('/admin/cursos/criar?error=Erro ao salvar o curso');
    }
  },

  async showEdit(req, res) {
    const course = await CourseAdminService.getCourseForEdit(req.params.id);

    if (!course) {
      return res.redirect('/admin/cursos?error=Curso não encontrado');
    }

    return res.render('admin/courses/edit', {
      title: 'Editar Curso',
      course,
      user: req.user,
      layout: 'admin/layout'
    });
  },

  async update(req, res) {
    try {
      const result = await CourseAdminService.updateCourse(req);

      if (result.notFound) {
        return res.redirect('/admin/cursos?error=Curso não encontrado');
      }

      return res.redirect('/admin/cursos?success=Curso atualizado com sucesso!');
    } catch (error) {
      console.error(error);
      CourseAdminService.cleanupUploadedFiles(req);
      return res.redirect(`/admin/cursos/${req.params.id}/editar?error=Erro ao atualizar o curso`);
    }
  },

  async toggleStatus(req, res) {
    const result = await CourseAdminService.toggleStatus(req.params.id);

    if (result.notFound) {
      return res.status(404).json({ success: false, message: 'Curso não encontrado' });
    }

    return res.redirect('/admin/cursos?success=Status do curso atualizado!');
  },

  async delete(req, res) {
    const result = await CourseAdminService.deactivate(req.params.id);

    if (result.notFound) {
      return res.redirect('/admin/cursos?error=Curso não encontrado');
    }

    return res.redirect('/admin/cursos?success=Curso desativado com sucesso!');
  }
};

module.exports = AdminCourseHandler;
