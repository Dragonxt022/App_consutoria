const fs = require('fs');
const path = require('path');
const slugify = require('slugify');
const { Op } = require('sequelize');
const { BlogPost, BlogCategory, User, sequelize } = require('../models');

class BlogController {
  extractContentImageUrls(content) {
    const source = String(content || '');
    const matches = source.match(/\/uploads\/blog\/content\/[^"')\s>]+/g) || [];
    return [...new Set(matches)];
  }

  resolvePublicFilePath(fileUrl) {
    if (!fileUrl || typeof fileUrl !== 'string' || !fileUrl.startsWith('/uploads/')) {
      return null;
    }

    return path.join(__dirname, '..', 'public', fileUrl.replace(/^\/+/, ''));
  }

  removeFileIfExists(fileUrl) {
    const filePath = this.resolvePublicFilePath(fileUrl);
    if (!filePath || !fs.existsSync(filePath)) {
      return;
    }

    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error(`Erro ao remover arquivo do blog: ${filePath}`, error);
    }
  }

  async isFileUsedInOtherPosts(fileUrl, excludePostId = null) {
    if (!fileUrl) {
      return false;
    }

    const where = {
      [Op.or]: [
        { coverImage: fileUrl },
        { content: { [Op.like]: `%${fileUrl}%` } }
      ]
    };

    if (excludePostId) {
      where.id = { [Op.ne]: excludePostId };
    }

    const existing = await BlogPost.findOne({
      where,
      paranoid: false,
      attributes: ['id']
    });

    return Boolean(existing);
  }

  async cleanupRemovedBodyImages(previousContent, nextContent, excludePostId = null) {
    const previousUrls = this.extractContentImageUrls(previousContent);
    const nextUrls = new Set(this.extractContentImageUrls(nextContent));
    const removedUrls = previousUrls.filter((url) => !nextUrls.has(url));

    for (const url of removedUrls) {
      const isStillInUse = await this.isFileUsedInOtherPosts(url, excludePostId);
      if (!isStillInUse) {
        this.removeFileIfExists(url);
      }
    }
  }

  async cleanupFileIfUnused(fileUrl, excludePostId = null) {
    if (!fileUrl) {
      return;
    }

    const isStillInUse = await this.isFileUsedInOtherPosts(fileUrl, excludePostId);
    if (!isStillInUse) {
      this.removeFileIfExists(fileUrl);
    }
  }

  async ensureDefaultCategory() {
    const existing = await BlogCategory.findOne({ where: { slug: 'outros' } });
    if (existing) {
      return existing;
    }

    return BlogCategory.create({
      name: 'Outros',
      slug: 'outros',
      description: 'Categoria padrão para publicações gerais.'
    });
  }

  async generateUniqueSlug(model, value, excludeId = null) {
    const baseSlug = slugify(value || 'item', { lower: true, strict: true }) || 'item';
    let candidateSlug = baseSlug;
    let counter = 2;

    while (true) {
      const where = { slug: candidateSlug };
      if (excludeId) {
        where.id = { [Op.ne]: excludeId };
      }

      const existing = await model.findOne({ where });
      if (!existing) {
        return candidateSlug;
      }

      candidateSlug = `${baseSlug}-${counter}`;
      counter += 1;
    }
  }

  async getFormDependencies() {
    const [categories, authors, defaultCategory] = await Promise.all([
      BlogCategory.findAll({ where: { active: true }, order: [['name', 'ASC']] }),
      User.findAll({ where: { active: true }, order: [['name', 'ASC']] }),
      this.ensureDefaultCategory()
    ]);

    return {
      categories,
      authors,
      defaultCategory
    };
  }

  normalizePostPayload(body, reqUser, fallbackCategoryId) {
    const title = (body.title || '').trim() || 'Rascunho sem título';
    return {
      title,
      excerpt: (body.excerpt || '').trim(),
      content: body.content || '',
      categoryId: body.categoryId || fallbackCategoryId,
      authorId: body.authorId || reqUser.id,
      status: body.status === 'publicado' ? 'publicado' : 'rascunho'
    };
  }

  buildCoverImage(req) {
    return req.file ? `/uploads/blog/covers/${req.file.filename}` : null;
  }

  async adminList(req, res) {
    const posts = await BlogPost.findAll({
      include: [
        { model: BlogCategory, as: 'category' },
        { model: User, as: 'author', attributes: ['id', 'name'] }
      ],
      order: [['updatedAt', 'DESC']]
    });

    res.render('admin/blog/list', {
      title: 'Blog',
      posts,
      user: req.user,
      layout: 'admin/layout'
    });
  }

  async adminCreateForm(req, res) {
    const { categories, authors, defaultCategory } = await this.getFormDependencies();

    res.render('admin/blog/form', {
      title: 'Criar Novo Post',
      formMode: 'create',
      post: {
        id: null,
        title: '',
        excerpt: '',
        content: '',
        status: 'rascunho',
        coverImage: null,
        categoryId: defaultCategory.id,
        authorId: req.user.id
      },
      categories,
      authors,
      user: req.user,
      layout: 'admin/layout'
    });
  }

  async adminStore(req, res) {
    try {
      const defaultCategory = await this.ensureDefaultCategory();
      const payload = this.normalizePostPayload(req.body, req.user, defaultCategory.id);
      const slug = await this.generateUniqueSlug(BlogPost, payload.title);
      const coverImage = this.buildCoverImage(req);

      const post = await BlogPost.create({
        ...payload,
        slug,
        coverImage,
        publishedAt: payload.status === 'publicado' ? new Date() : null
      });

      res.redirect(`/admin/blog/${post.id}/editar?success=Post criado com sucesso`);
    } catch (error) {
      console.error(error);
      res.redirect('/admin/blog/novo?error=Erro ao criar post');
    }
  }

  async adminEditForm(req, res) {
    const [post, dependencies] = await Promise.all([
      BlogPost.findByPk(req.params.id),
      this.getFormDependencies()
    ]);

    if (!post) {
      return res.redirect('/admin/blog?error=Post não encontrado');
    }

    res.render('admin/blog/form', {
      title: 'Editar Post',
      formMode: 'edit',
      post,
      categories: dependencies.categories,
      authors: dependencies.authors,
      user: req.user,
      layout: 'admin/layout'
    });
  }

  async adminUpdate(req, res) {
    try {
      const post = await BlogPost.findByPk(req.params.id);
      if (!post) {
        return res.redirect('/admin/blog?error=Post não encontrado');
      }

      const previousContent = post.content || '';
      const defaultCategory = await this.ensureDefaultCategory();
      const payload = this.normalizePostPayload(req.body, req.user, defaultCategory.id);
      const slug = await this.generateUniqueSlug(BlogPost, payload.title, post.id);
      const updateData = {
        ...payload,
        slug,
        publishedAt: payload.status === 'publicado' ? (post.publishedAt || new Date()) : null
      };

      if (req.file) {
        updateData.coverImage = this.buildCoverImage(req);
      } else if (req.body.removeCoverImage === 'on') {
        updateData.coverImage = null;
      }

      const previousCover = post.coverImage;
      await post.update(updateData);

      await this.cleanupRemovedBodyImages(previousContent, updateData.content, post.id);

      if (previousCover && previousCover !== post.coverImage) {
        await this.cleanupFileIfUnused(previousCover, post.id);
      }

      res.redirect(`/admin/blog/${post.id}/editar?success=Post atualizado com sucesso`);
    } catch (error) {
      console.error(error);
      res.redirect(`/admin/blog/${req.params.id}/editar?error=Erro ao atualizar post`);
    }
  }

  async adminDelete(req, res) {
    try {
      const post = await BlogPost.findByPk(req.params.id);
      if (!post) {
        return res.redirect('/admin/blog?error=Post não encontrado');
      }

      const coverImage = post.coverImage;
      const contentImageUrls = this.extractContentImageUrls(post.content);
      await post.destroy();

      await this.cleanupFileIfUnused(coverImage, post.id);
      for (const url of contentImageUrls) {
        await this.cleanupFileIfUnused(url, post.id);
      }

      res.redirect('/admin/blog?success=Post removido com sucesso');
    } catch (error) {
      console.error(error);
      res.redirect('/admin/blog?error=Erro ao remover post');
    }
  }

  async autosave(req, res) {
    try {
      const defaultCategory = await this.ensureDefaultCategory();
      const payload = this.normalizePostPayload(req.body, req.user, defaultCategory.id);
      const postId = req.params.id && req.params.id !== 'novo' ? req.params.id : null;
      let post = postId ? await BlogPost.findByPk(postId) : null;

      if (!post) {
        const slug = await this.generateUniqueSlug(BlogPost, payload.title || 'rascunho');
        post = await BlogPost.create({
          ...payload,
          slug,
          status: 'rascunho',
          lastAutoSavedAt: new Date(),
          publishedAt: null
        });
      } else {
        const previousContent = post.content || '';
        const slug = await this.generateUniqueSlug(BlogPost, payload.title || post.title, post.id);
        await post.update({
          ...payload,
          slug,
          status: req.body.status === 'publicado' ? 'publicado' : 'rascunho',
          lastAutoSavedAt: new Date(),
          publishedAt: req.body.status === 'publicado' ? (post.publishedAt || new Date()) : null
        });

        await this.cleanupRemovedBodyImages(previousContent, payload.content, post.id);
      }

      return res.json({
        success: true,
        postId: post.id,
        savedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Erro ao salvar rascunho.' });
    }
  }

  async uploadBodyImage(req, res) {
    try {
      const uploadedFiles = Array.isArray(req.files) ? req.files : [];

      if (!uploadedFiles.length) {
        return res.status(400).json({ success: false, message: 'Nenhuma imagem enviada.' });
      }

      return res.json({
        success: true,
        urls: uploadedFiles.map((file) => `/uploads/blog/content/${file.filename}`)
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Erro ao enviar imagem.' });
    }
  }

  async adminCategories(req, res) {
    await this.ensureDefaultCategory();
    const categories = await BlogCategory.findAll({
      include: [{ model: BlogPost, as: 'posts', attributes: ['id'] }],
      order: [['name', 'ASC']]
    });

    res.render('admin/blog/categories', {
      title: 'Categorias do Blog',
      categories,
      user: req.user,
      layout: 'admin/layout'
    });
  }

  async storeCategory(req, res) {
    try {
      const name = (req.body.name || '').trim();
      const description = (req.body.description || '').trim();

      if (!name) {
        return res.redirect('/admin/blog/categorias?error=Informe o nome da categoria');
      }

      const slug = await this.generateUniqueSlug(BlogCategory, name);
      await BlogCategory.create({ name, slug, description });
      res.redirect('/admin/blog/categorias?success=Categoria criada com sucesso');
    } catch (error) {
      console.error(error);
      res.redirect('/admin/blog/categorias?error=Erro ao criar categoria');
    }
  }

  async updateCategory(req, res) {
    try {
      const category = await BlogCategory.findByPk(req.params.id);
      if (!category) {
        return res.redirect('/admin/blog/categorias?error=Categoria não encontrada');
      }

      const name = (req.body.name || '').trim();
      if (!name) {
        return res.redirect('/admin/blog/categorias?error=Informe o nome da categoria');
      }

      const isDefault = category.slug === 'outros';
      await category.update({
        name,
        description: (req.body.description || '').trim(),
        active: isDefault ? true : req.body.active === 'on',
        slug: isDefault ? 'outros' : await this.generateUniqueSlug(BlogCategory, name, category.id)
      });

      res.redirect('/admin/blog/categorias?success=Categoria atualizada com sucesso');
    } catch (error) {
      console.error(error);
      res.redirect('/admin/blog/categorias?error=Erro ao atualizar categoria');
    }
  }

  async publicList(req, res) {
    const currentCategory = req.query.categoria
      ? await BlogCategory.findOne({ where: { slug: req.query.categoria, active: true } })
      : null;

    const posts = await BlogPost.findAll({
      where: {
        status: 'publicado',
        ...(currentCategory ? { categoryId: currentCategory.id } : {})
      },
      include: [
        { model: BlogCategory, as: 'category' },
        { model: User, as: 'author', attributes: ['id', 'name'] }
      ],
      order: [['publishedAt', 'DESC'], ['createdAt', 'DESC']]
    });

    res.render('public/blog-list', {
      title: currentCategory ? `Blog | ${currentCategory.name}` : 'Blog',
      posts,
      currentCategory,
      layout: 'public/layout'
    });
  }

  async publicDetails(req, res) {
    const post = await BlogPost.findOne({
      where: {
        slug: req.params.slug,
        status: 'publicado'
      },
      include: [
        { model: BlogCategory, as: 'category' },
        { model: User, as: 'author', attributes: ['id', 'name'] }
      ]
    });

    if (!post) {
      return res.status(404).render('error', { title: 'Post não encontrado', layout: false });
    }

    const relatedPosts = await BlogPost.findAll({
      where: {
        status: 'publicado',
        categoryId: post.categoryId,
        id: { [Op.ne]: post.id }
      },
      include: [
        { model: BlogCategory, as: 'category' },
        { model: User, as: 'author', attributes: ['id', 'name'] }
      ],
      order: sequelize.random(),
      limit: 4
    });

    res.render('public/blog-details', {
      title: post.title,
      post,
      relatedPosts,
      layout: 'public/layout'
    });
  }
}

module.exports = new BlogController();
