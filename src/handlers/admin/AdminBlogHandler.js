const { BlogAdminService } = require('../../services');

const AdminBlogHandler = {
  async list(req, res) {
    const data = await BlogAdminService.getAdminListData();

    res.render('admin/blog/list', {
      title: 'Blog',
      user: req.user,
      layout: 'admin/layout',
      ...data
    });
  },

  async showCreate(req, res) {
    const data = await BlogAdminService.getCreateFormData(req.user);

    res.render('admin/blog/form', {
      title: 'Criar Novo Post',
      user: req.user,
      layout: 'admin/layout',
      ...data
    });
  },

  async create(req, res) {
    try {
      const post = await BlogAdminService.createPost(req);
      return res.redirect(`/admin/blog/${post.id}/editar?success=Post criado com sucesso`);
    } catch (error) {
      console.error(error);
      return res.redirect('/admin/blog/novo?error=Erro ao criar post');
    }
  },

  async showEdit(req, res) {
    const data = await BlogAdminService.getEditFormData(req.params.id);

    if (!data) {
      return res.redirect('/admin/blog?error=Post não encontrado');
    }

    return res.render('admin/blog/form', {
      title: 'Editar Post',
      user: req.user,
      layout: 'admin/layout',
      ...data
    });
  },

  async update(req, res) {
    try {
      const result = await BlogAdminService.updatePost(req);

      if (result.notFound) {
        return res.redirect('/admin/blog?error=Post não encontrado');
      }

      return res.redirect(`/admin/blog/${result.postId}/editar?success=Post atualizado com sucesso`);
    } catch (error) {
      console.error(error);
      return res.redirect(`/admin/blog/${req.params.id}/editar?error=Erro ao atualizar post`);
    }
  },

  async remove(req, res) {
    try {
      const result = await BlogAdminService.deletePost(req.params.id);

      if (result.notFound) {
        return res.redirect('/admin/blog?error=Post não encontrado');
      }

      return res.redirect('/admin/blog?success=Post removido com sucesso');
    } catch (error) {
      console.error(error);
      return res.redirect('/admin/blog?error=Erro ao remover post');
    }
  },

  async autosave(req, res) {
    try {
      const result = await BlogAdminService.autosave(req);
      return res.json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Erro ao salvar rascunho.' });
    }
  },

  async uploadBodyImage(req, res) {
    try {
      const result = await BlogAdminService.uploadBodyImage(req.files);

      if (!result) {
        return res.status(400).json({ success: false, message: 'Nenhuma imagem enviada.' });
      }

      return res.json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Erro ao enviar imagem.' });
    }
  },

  async categories(req, res) {
    const data = await BlogAdminService.getCategoriesPageData();

    res.render('admin/blog/categories', {
      title: 'Categorias do Blog',
      user: req.user,
      layout: 'admin/layout',
      ...data
    });
  },

  async createCategory(req, res) {
    try {
      const result = await BlogAdminService.createCategory(req.body);

      if (result.error) {
        return res.redirect(`/admin/blog/categorias?error=${encodeURIComponent(result.error)}`);
      }

      return res.redirect('/admin/blog/categorias?success=Categoria criada com sucesso');
    } catch (error) {
      console.error(error);
      return res.redirect('/admin/blog/categorias?error=Erro ao criar categoria');
    }
  },

  async updateCategory(req, res) {
    try {
      const result = await BlogAdminService.updateCategory(req.params.id, req.body);

      if (result.error) {
        return res.redirect(`/admin/blog/categorias?error=${encodeURIComponent(result.error)}`);
      }

      return res.redirect('/admin/blog/categorias?success=Categoria atualizada com sucesso');
    } catch (error) {
      console.error(error);
      return res.redirect('/admin/blog/categorias?error=Erro ao atualizar categoria');
    }
  }
};

module.exports = AdminBlogHandler;
