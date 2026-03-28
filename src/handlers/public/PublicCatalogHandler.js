const { PublicCatalogService } = require('../../services');

const PublicCatalogHandler = {
  async store(req, res) {
    const data = await PublicCatalogService.getStoreData();

    res.render('public/store', {
      title: 'Loja',
      layout: 'public/layout',
      ...data
    });
  },

  async storeDetails(req, res) {
    const product = await PublicCatalogService.getStoreProductDetails(req.params.slug);

    if (!product) {
      return res.status(404).render('error', {
        title: 'Produto nao encontrado',
        layout: false
      });
    }

    return res.render('public/store-details', {
      title: `${product.name} | Loja`,
      product,
      layout: 'public/layout'
    });
  },

  async redirectToAffiliate(req, res) {
    const affiliateUrl = await PublicCatalogService.registerAffiliateClick(req.params.slug);

    if (!affiliateUrl) {
      return res.redirect('/loja?error=Produto nao encontrado');
    }

    return res.redirect(affiliateUrl);
  },

  async companyCertificates(_req, res) {
    const data = await PublicCatalogService.getPublicCertificates();

    res.render('public/certidoes', {
      title: 'Certidoes',
      layout: 'public/layout',
      ...data
    });
  },

  async blogList(req, res) {
    const data = await PublicCatalogService.getBlogListData(req.query.categoria);

    res.render('public/blog-list', {
      title: data.currentCategory ? `Blog | ${data.currentCategory.name}` : 'Blog',
      layout: 'public/layout',
      ...data
    });
  },

  async blogDetails(req, res) {
    const data = await PublicCatalogService.getBlogDetailsData(req.params.slug);

    if (!data) {
      return res.status(404).render('error', {
        title: 'Post não encontrado',
        layout: false
      });
    }

    return res.render('public/blog-details', {
      title: data.post.title,
      layout: 'public/layout',
      ...data
    });
  }
};

module.exports = PublicCatalogHandler;
