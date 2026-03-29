const { ProductAdminService } = require('../../services');
const { redirectWithFlash } = require('../../utils/Flash');

const AdminProductHandler = {
  async list(req, res) {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const data = await ProductAdminService.getAdminListData(page, req.query);

    res.render('admin/store/list', {
      title: 'Loja',
      user: req.user,
      layout: 'admin/layout',
      ...data
    });
  },

  async showCreate(req, res) {
    res.render('admin/store/create', {
      title: 'Cadastrar Produto',
      product: ProductAdminService.getEmptyProduct(),
      user: req.user,
      layout: 'admin/layout'
    });
  },

  async create(req, res) {
    try {
      const result = await ProductAdminService.createProduct(req);

      if (result.validationError) {
        ProductAdminService.cleanupUploadedFiles(req);
        return redirectWithFlash(req, res, '/admin/loja/criar', 'error', result.validationError);
      }

      return redirectWithFlash(req, res, '/admin/loja', 'success', 'Produto cadastrado com sucesso!');
    } catch (error) {
      console.error(error);
      ProductAdminService.cleanupUploadedFiles(req);
      return redirectWithFlash(req, res, '/admin/loja/criar', 'error', 'Erro ao cadastrar produto');
    }
  },

  async showEdit(req, res) {
    const product = await ProductAdminService.getProductForEdit(req.params.id);

    if (!product) {
      return redirectWithFlash(req, res, '/admin/loja', 'error', 'Produto nao encontrado');
    }

    return res.render('admin/store/edit', {
      title: 'Editar Produto',
      product,
      user: req.user,
      layout: 'admin/layout'
    });
  },

  async update(req, res) {
    try {
      const result = await ProductAdminService.updateProduct(req);

      if (result.notFound) {
        return redirectWithFlash(req, res, '/admin/loja', 'error', 'Produto nao encontrado');
      }

      if (result.validationError) {
        ProductAdminService.cleanupUploadedFiles(req);
        return redirectWithFlash(req, res, `/admin/loja/${req.params.id}/editar`, 'error', result.validationError);
      }

      return redirectWithFlash(req, res, '/admin/loja', 'success', 'Produto atualizado com sucesso!');
    } catch (error) {
      console.error(error);
      ProductAdminService.cleanupUploadedFiles(req);
      return redirectWithFlash(req, res, `/admin/loja/${req.params.id}/editar`, 'error', 'Erro ao atualizar produto');
    }
  },

  async toggleStatus(req, res) {
    const result = await ProductAdminService.toggleStatus(req.params.id);

    if (result.notFound) {
      return redirectWithFlash(req, res, '/admin/loja', 'error', 'Produto nao encontrado');
    }

    return redirectWithFlash(req, res, '/admin/loja', 'success', 'Status do produto atualizado com sucesso!');
  },

  async delete(req, res) {
    const result = await ProductAdminService.deleteProduct(req.params.id);

    if (result.notFound) {
      return redirectWithFlash(req, res, '/admin/loja', 'error', 'Produto nao encontrado');
    }

    return redirectWithFlash(req, res, '/admin/loja', 'success', 'Produto excluido com sucesso!');
  }
};

module.exports = AdminProductHandler;
