const { Op } = require('sequelize');
const { Product, BlogPost, BlogCategory, User, sequelize, CompanyCertificate } = require('../../models');
const { ProductFormatter } = require('../shared');
const CompanyCertificateAdminService = require('../admin/CompanyCertificateAdminService');
const { formatProduct } = ProductFormatter;

class PublicCatalogService {
  async getStoreData() {
    const products = await Product.findAll({
      where: { active: true },
      order: [['featured', 'DESC'], ['createdAt', 'DESC']]
    });

    return {
      products: products.map((product) => formatProduct(product))
    };
  }

  async getStoreProductDetails(slug) {
    const product = await Product.findOne({
      where: {
        slug,
        active: true
      }
    });

    if (!product) {
      return null;
    }

    return formatProduct(product);
  }

  async registerAffiliateClick(slug) {
    const product = await Product.findOne({
      where: {
        slug,
        active: true
      }
    });

    if (!product) {
      return null;
    }

    await product.increment('clickCount');
    return product.affiliateUrl;
  }

  async getPublicCertificates() {
    const certificates = await CompanyCertificate.findAll({
      order: [['name', 'ASC']]
    });

    return {
      certificates: certificates.map((record) => CompanyCertificateAdminService.formatRecord(record))
    };
  }

  async getBlogListData(categorySlug) {
    const currentCategory = categorySlug
      ? await BlogCategory.findOne({ where: { slug: categorySlug, active: true } })
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

    return {
      posts,
      currentCategory
    };
  }

  async getBlogDetailsData(slug) {
    const post = await BlogPost.findOne({
      where: {
        slug,
        status: 'publicado'
      },
      include: [
        { model: BlogCategory, as: 'category' },
        { model: User, as: 'author', attributes: ['id', 'name'] }
      ]
    });

    if (!post) {
      return null;
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

    return {
      post,
      relatedPosts
    };
  }
}

module.exports = new PublicCatalogService();
