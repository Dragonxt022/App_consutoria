const { Product } = require('../models');
const slugify = require('slugify');
const { redirectWithFlash } = require('../utils/flash');
const fs = require('fs');
const path = require('path');

class ProductController {
  normalizeGalleryImages(rawImages, fallbackImage = '') {
    const source = Array.isArray(rawImages) ? rawImages : [rawImages];
    const normalized = source
      .flatMap((value) => String(value || '').split('\n'))
      .map((value) => value.trim())
      .filter(Boolean);

    if (fallbackImage && !normalized.includes(fallbackImage)) {
      normalized.unshift(fallbackImage);
    }

    return normalized.slice(0, 5);
  }

  resolveProductImageUrls(files = []) {
    return files
      .filter((file) => file && file.filename)
      .map((file) => `/uploads/products/${file.filename}`)
      .slice(0, 5);
  }

  resolvePublicFilePath(fileUrl) {
    if (!fileUrl || typeof fileUrl !== 'string' || !fileUrl.startsWith('/uploads/')) {
      return null;
    }

    return path.join(__dirname, '..', 'public', fileUrl.replace(/^\/+/, ''));
  }

  removeFileIfExists(fileUrl) {
    const filePath = this.resolvePublicFilePath(fileUrl);
    if (!filePath || !fs.existsSync(filePath)) return;

    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error(`Erro ao remover arquivo do produto: ${filePath}`, error);
    }
  }

  cleanupUploadedFiles(req) {
    (req.files || []).forEach((file) => {
      if (!file?.path) return;

      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (error) {
        console.error(`Erro ao limpar upload temporario do produto: ${file.path}`, error);
      }
    });
  }

  formatProduct(product) {
    const data = product.toJSON ? product.toJSON() : { ...product };
    const galleryImages = this.normalizeGalleryImages(data.galleryImages, data.imageUrl || '');

    return {
      ...data,
      galleryImages,
      primaryImage: galleryImages[0] || null
    };
  }

  buildPayload(body, uploadedImages = [], existingSlug = null) {
    const name = (body.name || '').trim();
    const existingGalleryImages = this.normalizeGalleryImages(body.existingGalleryImages || [], body.existingImageUrl || '');
    const galleryImages = uploadedImages.length ? uploadedImages : existingGalleryImages;
    const imageUrl = galleryImages[0] || null;

    return {
      name,
      slug: slugify(name || existingSlug || '', { lower: true, strict: true }),
      shortDescription: (body.shortDescription || '').trim(),
      description: (body.description || '').trim(),
      imageUrl: galleryImages[0] || imageUrl,
      galleryImages,
      price: (body.price || '').trim() || null,
      category: (body.category || 'Geral').trim() || 'Geral',
      affiliateUrl: (body.affiliateUrl || '').trim(),
      platform: (body.platform || 'Hotmart').trim() || 'Hotmart',
      active: body.active === 'on' || body.active === true,
      featured: body.featured === 'on' || body.featured === true
    };
  }

  validatePayload(payload) {
    if (!payload.name) return 'Informe o nome do produto.';
    if (!payload.slug) return 'Nao foi possivel gerar o identificador do produto.';
    if (!payload.shortDescription) return 'Informe uma descricao curta.';
    if (!payload.description) return 'Informe a descricao completa.';
    if (!payload.affiliateUrl) return 'Informe o link de afiliado.';
    if (!payload.galleryImages.length) return 'Envie pelo menos uma imagem do produto.';

    try {
      new URL(payload.affiliateUrl);
    } catch (error) {
      return 'Informe uma URL valida para o link de afiliado.';
    }

    if (payload.galleryImages.length > 5) {
      return 'Informe no maximo 5 imagens por produto.';
    }

    return null;
  }

  async ensureUniqueSlug(payload, currentId = null) {
    const existing = await Product.findOne({ where: { slug: payload.slug } });
    if (!existing) return null;
    if (currentId && existing.id === currentId) return null;
    return 'Ja existe um produto com este nome/slug.';
  }

  async adminList(req, res) {
    try {
      const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const limit = 10;
      const offset = (page - 1) * limit;

      const { count, rows: products } = await Product.findAndCountAll({
        limit,
        offset,
        order: [['featured', 'DESC'], ['createdAt', 'DESC']]
      });

      res.render('admin/store/list', {
        title: 'Loja',
        products: products.map((product) => this.formatProduct(product)),
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
      redirectWithFlash(req, res, '/admin/dashboard', 'error', 'Erro ao carregar produtos da loja');
    }
  }

  async adminCreateForm(req, res) {
    res.render('admin/store/create', {
      title: 'Cadastrar Produto',
      product: {
        name: '',
        shortDescription: '',
        description: '',
        imageUrl: '',
        galleryImages: [],
        price: '',
        category: 'Geral',
        affiliateUrl: '',
        platform: 'Hotmart',
        active: true,
        featured: false
      },
      user: req.user,
      layout: 'admin/layout'
    });
  }

  async adminStore(req, res) {
    try {
      const uploadedImages = this.resolveProductImageUrls(req.files);
      const payload = this.buildPayload(req.body, uploadedImages);
      const validationError = this.validatePayload(payload) || await this.ensureUniqueSlug(payload);

      if (validationError) {
        this.cleanupUploadedFiles(req);
        return redirectWithFlash(req, res, '/admin/loja/criar', 'error', validationError);
      }

      await Product.create(payload);
      redirectWithFlash(req, res, '/admin/loja', 'success', 'Produto cadastrado com sucesso!');
    } catch (error) {
      console.error(error);
      this.cleanupUploadedFiles(req);
      redirectWithFlash(req, res, '/admin/loja/criar', 'error', 'Erro ao cadastrar produto');
    }
  }

  async adminEditForm(req, res) {
    try {
      const product = await Product.findByPk(req.params.id);

      if (!product) {
        return redirectWithFlash(req, res, '/admin/loja', 'error', 'Produto nao encontrado');
      }

      res.render('admin/store/edit', {
        title: 'Editar Produto',
        product: this.formatProduct(product),
        user: req.user,
        layout: 'admin/layout'
      });
    } catch (error) {
      console.error(error);
      redirectWithFlash(req, res, '/admin/loja', 'error', 'Erro ao carregar produto');
    }
  }

  async adminUpdate(req, res) {
    try {
      const product = await Product.findByPk(req.params.id);

      if (!product) {
        return redirectWithFlash(req, res, '/admin/loja', 'error', 'Produto nao encontrado');
      }

      const previousGalleryImages = this.normalizeGalleryImages(product.galleryImages, product.imageUrl || '');
      const uploadedImages = this.resolveProductImageUrls(req.files);
      const payload = this.buildPayload(req.body, uploadedImages, product.slug);
      const validationError = this.validatePayload(payload) || await this.ensureUniqueSlug(payload, product.id);

      if (validationError) {
        this.cleanupUploadedFiles(req);
        return redirectWithFlash(req, res, `/admin/loja/${product.id}/editar`, 'error', validationError);
      }

      await product.update(payload);

      if (uploadedImages.length) {
        previousGalleryImages.forEach((imageUrl) => {
          if (!payload.galleryImages.includes(imageUrl)) {
            this.removeFileIfExists(imageUrl);
          }
        });
      }

      redirectWithFlash(req, res, '/admin/loja', 'success', 'Produto atualizado com sucesso!');
    } catch (error) {
      console.error(error);
      this.cleanupUploadedFiles(req);
      redirectWithFlash(req, res, `/admin/loja/${req.params.id}/editar`, 'error', 'Erro ao atualizar produto');
    }
  }

  async adminToggleStatus(req, res) {
    try {
      const product = await Product.findByPk(req.params.id);

      if (!product) {
        return redirectWithFlash(req, res, '/admin/loja', 'error', 'Produto nao encontrado');
      }

      await product.update({ active: !product.active });
      redirectWithFlash(req, res, '/admin/loja', 'success', 'Status do produto atualizado com sucesso!');
    } catch (error) {
      console.error(error);
      redirectWithFlash(req, res, '/admin/loja', 'error', 'Erro ao atualizar status do produto');
    }
  }

  async adminDelete(req, res) {
    try {
      const product = await Product.findByPk(req.params.id);

      if (!product) {
        return redirectWithFlash(req, res, '/admin/loja', 'error', 'Produto nao encontrado');
      }

      this.normalizeGalleryImages(product.galleryImages, product.imageUrl || '').forEach((imageUrl) => {
        this.removeFileIfExists(imageUrl);
      });

      await product.destroy();
      redirectWithFlash(req, res, '/admin/loja', 'success', 'Produto excluido com sucesso!');
    } catch (error) {
      console.error(error);
      redirectWithFlash(req, res, '/admin/loja', 'error', 'Erro ao remover produto');
    }
  }

  async publicList(req, res) {
    try {
      const products = await Product.findAll({
        where: { active: true },
        order: [['featured', 'DESC'], ['createdAt', 'DESC']]
      });

      res.render('public/store', {
        title: 'Loja',
        products: products.map((product) => this.formatProduct(product)),
        layout: 'public/layout'
      });
    } catch (error) {
      console.error(error);
      res.redirect('/?error=Erro ao carregar produtos da loja');
    }
  }

  async publicDetails(req, res) {
    try {
      const product = await Product.findOne({
        where: {
          slug: req.params.slug,
          active: true
        }
      });

      if (!product) {
        return res.status(404).render('error', {
          title: 'Produto nao encontrado',
          layout: false
        });
      }

      res.render('public/store-details', {
        title: `${product.name} | Loja`,
        product: this.formatProduct(product),
        layout: 'public/layout'
      });
    } catch (error) {
      console.error(error);
      res.redirect('/loja?error=Erro ao carregar produto');
    }
  }

  async redirectToAffiliate(req, res) {
    try {
      const product = await Product.findOne({
        where: {
          slug: req.params.slug,
          active: true
        }
      });

      if (!product) {
        return res.redirect('/loja?error=Produto nao encontrado');
      }

      await product.increment('clickCount');
      res.redirect(product.affiliateUrl);
    } catch (error) {
      console.error(error);
      res.redirect('/loja?error=Erro ao redirecionar para compra');
    }
  }
}

module.exports = new ProductController();
