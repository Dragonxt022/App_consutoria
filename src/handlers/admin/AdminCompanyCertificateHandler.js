const { CompanyCertificateAdminService } = require('../../services');

const AdminCompanyCertificateHandler = {
  async list(req, res) {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const data = await CompanyCertificateAdminService.getAdminListData(page);

    res.render('admin/certidoes/list', {
      title: 'Certidoes',
      user: req.user,
      layout: 'admin/layout',
      ...data
    });
  },

  async showCreate(req, res) {
    res.render('admin/certidoes/create', {
      title: 'Cadastrar Certidao',
      certificate: CompanyCertificateAdminService.getEmptyCertificate(),
      user: req.user,
      layout: 'admin/layout'
    });
  },

  async create(req, res) {
    try {
      const result = await CompanyCertificateAdminService.createCertificate(req.body, req.file);

      if (result.validationError) {
        return res.redirect(`/admin/certidoes/criar?error=${encodeURIComponent(result.validationError)}`);
      }

      return res.redirect('/admin/certidoes?success=Certidao cadastrada com sucesso!');
    } catch (error) {
      console.error(error);
      return res.redirect('/admin/certidoes/criar?error=Erro ao cadastrar certidao');
    }
  },

  async showEdit(req, res) {
    const certificate = await CompanyCertificateAdminService.getCertificateForEdit(req.params.id);

    if (!certificate) {
      return res.redirect('/admin/certidoes?error=Certidao nao encontrada');
    }

    return res.render('admin/certidoes/edit', {
      title: 'Editar Certidao',
      certificate,
      user: req.user,
      layout: 'admin/layout'
    });
  },

  async update(req, res) {
    try {
      const result = await CompanyCertificateAdminService.updateCertificate(req.params.id, req.body, req.file);

      if (result.notFound) {
        return res.redirect('/admin/certidoes?error=Certidao nao encontrada');
      }

      if (result.validationError) {
        return res.redirect(`/admin/certidoes/${req.params.id}/editar?error=${encodeURIComponent(result.validationError)}`);
      }

      return res.redirect('/admin/certidoes?success=Certidao atualizada com sucesso!');
    } catch (error) {
      console.error(error);
      return res.redirect(`/admin/certidoes/${req.params.id}/editar?error=Erro ao atualizar certidao`);
    }
  },

  async remove(req, res) {
    try {
      const result = await CompanyCertificateAdminService.deleteCertificate(req.params.id);

      if (result.notFound) {
        return res.redirect('/admin/certidoes?error=Certidao nao encontrada');
      }

      return res.redirect('/admin/certidoes?success=Certidao excluida com sucesso!');
    } catch (error) {
      console.error(error);
      return res.redirect('/admin/certidoes?error=Erro ao excluir certidao');
    }
  }
};

module.exports = AdminCompanyCertificateHandler;
