const fs = require('fs');
const slugify = require('slugify');
const { Op } = require('sequelize');
const { Product } = require('../../models');
const { resolveUploadUrlToPath } = require('../../utils/UploadPaths');
const { ProductFormatter } = require('../shared');
const { formatProduct, normalizeGalleryImages } = ProductFormatter;

class ProductAdminService {
  resolveProductImageUrls(files = []) {
    return files
      .filter((file) => file && file.filename)
      .map((file) => `/uploads/products/${file.filename}`)
      .slice(0, 5);
  }

  resolvePublicFilePath(fileUrl) {
    return resolveUploadUrlToPath(fileUrl);
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

  buildPayload(body, uploadedImages = [], existingSlug = null) {
    const name = (body.name || '').trim();
    const existingGalleryImages = normalizeGalleryImages(body.existingGalleryImages || [], body.existingImageUrl || '');
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

  async getAdminListData(page = 1, rawFilters = {}) {
    const limit = 10;
    const offset = (page - 1) * limit;
    const filters = {
      search: String(rawFilters.search || '').trim(),
      status: String(rawFilters.status || '').trim(),
      category: String(rawFilters.category || '').trim()
    };
    const where = {};

    if (filters.search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${filters.search}%` } },
        { shortDescription: { [Op.like]: `%${filters.search}%` } },
        { description: { [Op.like]: `%${filters.search}%` } }
      ];
    }

    if (filters.status === 'ativo') {
      where.active = true;
    } else if (filters.status === 'desativado') {
      where.active = false;
    } else if (filters.status === 'destaque') {
      where.featured = true;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    const [{ count, rows: products }, categoryRows] = await Promise.all([
      Product.findAndCountAll({
        where,
        limit,
        offset,
        order: [['featured', 'DESC'], ['createdAt', 'DESC']]
      }),
      Product.findAll({
        attributes: ['category'],
        where: {
          category: {
            [Op.ne]: null
          }
        },
        group: ['category'],
        order: [['category', 'ASC']]
      })
    ]);

    return {
      products: products.map((product) => formatProduct(product)),
      categories: categoryRows.map((row) => row.category).filter(Boolean),
      pagination: {
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(count / limit)),
        totalItems: count
      },
      filters
    };
  }

  getEmptyProduct() {
    return {
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
    };
  }

  async getProductForEdit(productId) {
    const product = await Product.findByPk(productId);

    if (!product) {
      return null;
    }

    return formatProduct(product);
  }

  async createProduct(req) {
    const uploadedImages = this.resolveProductImageUrls(req.files);
    const payload = this.buildPayload(req.body, uploadedImages);
    const validationError = this.validatePayload(payload) || await this.ensureUniqueSlug(payload);

    if (validationError) {
      return { validationError };
    }

    await Product.create(payload);
    return { validationError: null };
  }

  async updateProduct(req) {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return { notFound: true };
    }

    const previousGalleryImages = normalizeGalleryImages(product.galleryImages, product.imageUrl || '');
    const uploadedImages = this.resolveProductImageUrls(req.files);
    const payload = this.buildPayload(req.body, uploadedImages, product.slug);
    const validationError = this.validatePayload(payload) || await this.ensureUniqueSlug(payload, product.id);

    if (validationError) {
      return {
        notFound: false,
        validationError
      };
    }

    await product.update(payload);

    if (uploadedImages.length) {
      previousGalleryImages.forEach((imageUrl) => {
        if (!payload.galleryImages.includes(imageUrl)) {
          this.removeFileIfExists(imageUrl);
        }
      });
    }

    return {
      notFound: false,
      validationError: null
    };
  }

  async toggleStatus(productId) {
    const product = await Product.findByPk(productId);

    if (!product) {
      return { notFound: true };
    }

    await product.update({ active: !product.active });
    return { notFound: false };
  }

  async deleteProduct(productId) {
    const product = await Product.findByPk(productId);

    if (!product) {
      return { notFound: true };
    }

    normalizeGalleryImages(product.galleryImages, product.imageUrl || '').forEach((imageUrl) => {
      this.removeFileIfExists(imageUrl);
    });

    await product.destroy();
    return { notFound: false };
  }
}

module.exports = new ProductAdminService();
