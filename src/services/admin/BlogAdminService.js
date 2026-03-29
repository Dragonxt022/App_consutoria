const fs = require('fs');
const slugify = require('slugify');
const { Op } = require('sequelize');
const { BlogPost, BlogCategory, User } = require('../../models');
const { resolveUploadUrlToPath } = require('../../utils/UploadPaths');
const { NotificationService } = require('../shared');

class BlogAdminService {
  extractContentImageUrls(content) {
    const source = String(content || '');
    const matches = source.match(/\/uploads\/blog\/content\/[^"')\s>]+/g) || [];
    return [...new Set(matches)];
  }

  resolvePublicFilePath(fileUrl) {
    return resolveUploadUrlToPath(fileUrl);
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

  async getAdminListData() {
    const posts = await BlogPost.findAll({
      include: [
        { model: BlogCategory, as: 'category' },
        { model: User, as: 'author', attributes: ['id', 'name'] }
      ],
      order: [['updatedAt', 'DESC']]
    });

    return { posts };
  }

  async getCreateFormData(user) {
    const { categories, authors, defaultCategory } = await this.getFormDependencies();

    return {
      formMode: 'create',
      post: {
        id: null,
        title: '',
        excerpt: '',
        content: '',
        status: 'rascunho',
        coverImage: null,
        categoryId: defaultCategory.id,
        authorId: user.id
      },
      categories,
      authors
    };
  }

  async createPost(req) {
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

    if (post.status === 'publicado') {
      await NotificationService.createBlogPublishedNotification(post);
    }

    return post;
  }

  async getEditFormData(postId) {
    const [post, dependencies] = await Promise.all([
      BlogPost.findByPk(postId),
      this.getFormDependencies()
    ]);

    if (!post) {
      return null;
    }

    return {
      formMode: 'edit',
      post,
      categories: dependencies.categories,
      authors: dependencies.authors
    };
  }

  async updatePost(req) {
    const post = await BlogPost.findByPk(req.params.id);
    if (!post) {
      return { notFound: true };
    }

    const wasPublished = post.status === 'publicado';
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

    if (post.status === 'publicado' && !wasPublished) {
      await NotificationService.createBlogPublishedNotification(post);
    }

    await this.cleanupRemovedBodyImages(previousContent, updateData.content, post.id);

    if (previousCover && previousCover !== post.coverImage) {
      await this.cleanupFileIfUnused(previousCover, post.id);
    }

    return { notFound: false, postId: post.id };
  }

  async deletePost(postId) {
    const post = await BlogPost.findByPk(postId);
    if (!post) {
      return { notFound: true };
    }

    const coverImage = post.coverImage;
    const contentImageUrls = this.extractContentImageUrls(post.content);
    await post.destroy();

    await this.cleanupFileIfUnused(coverImage, post.id);
    for (const url of contentImageUrls) {
      await this.cleanupFileIfUnused(url, post.id);
    }

    return { notFound: false };
  }

  async autosave(req) {
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

    return {
      success: true,
      postId: post.id,
      savedAt: new Date().toISOString()
    };
  }

  async uploadBodyImage(files) {
    const uploadedFiles = Array.isArray(files) ? files : [];

    if (!uploadedFiles.length) {
      return null;
    }

    return {
      success: true,
      urls: uploadedFiles.map((file) => `/uploads/blog/content/${file.filename}`)
    };
  }

  async getCategoriesPageData() {
    await this.ensureDefaultCategory();
    const categories = await BlogCategory.findAll({
      include: [{ model: BlogPost, as: 'posts', attributes: ['id'] }],
      order: [['name', 'ASC']]
    });

    return { categories };
  }

  async createCategory(body) {
    const name = (body.name || '').trim();
    const description = (body.description || '').trim();

    if (!name) {
      return { error: 'Informe o nome da categoria' };
    }

    const slug = await this.generateUniqueSlug(BlogCategory, name);
    await BlogCategory.create({ name, slug, description });

    return { error: null };
  }

  async updateCategory(categoryId, body) {
    const category = await BlogCategory.findByPk(categoryId);
    if (!category) {
      return { error: 'Categoria não encontrada' };
    }

    const name = (body.name || '').trim();
    if (!name) {
      return { error: 'Informe o nome da categoria' };
    }

    const isDefault = category.slug === 'outros';
    await category.update({
      name,
      description: (body.description || '').trim(),
      active: isDefault ? true : body.active === 'on',
      slug: isDefault ? 'outros' : await this.generateUniqueSlug(BlogCategory, name, category.id)
    });

    return { error: null };
  }
}

module.exports = new BlogAdminService();
