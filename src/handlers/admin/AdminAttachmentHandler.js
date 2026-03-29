const { redirectWithFlash } = require('../../utils/Flash');
const { AttachmentAdminService } = require('../../services');

const AdminAttachmentHandler = {
  async showCreate(req, res) {
    const data = await AttachmentAdminService.getListData(req.query);

    return res.render('admin/attachments/create', {
      title: 'Anexos',
      user: req.user,
      layout: 'admin/layout',
      ...data
    });
  },

  async list(req, res) {
    const data = await AttachmentAdminService.getListData(req.query);

    return res.render('admin/attachments/records', {
      title: 'Histórico de Anexos',
      user: req.user,
      layout: 'admin/layout',
      ...data
    });
  },

  async create(req, res) {
    try {
      const result = await AttachmentAdminService.createAttachment(req);

      if (result.error) {
        AttachmentAdminService.cleanupUploadedFile(req.files);
        return redirectWithFlash(req, res, '/admin/anexos', 'error', result.error);
      }

      return redirectWithFlash(req, res, '/admin/anexos', 'success', 'Anexo disponibilizado com sucesso.');
    } catch (error) {
      console.error(error);
      AttachmentAdminService.cleanupUploadedFile(req.files);
      return redirectWithFlash(req, res, '/admin/anexos', 'error', 'Erro ao salvar o anexo.');
    }
  },

  async remove(req, res) {
    try {
      const result = await AttachmentAdminService.deleteAttachment(req.params.id);

      if (result.notFound) {
        return redirectWithFlash(req, res, '/admin/anexos/historico', 'error', 'Anexo não encontrado.');
      }

      return redirectWithFlash(req, res, '/admin/anexos/historico', 'success', 'Anexo removido com sucesso.');
    } catch (error) {
      console.error(error);
      return redirectWithFlash(req, res, '/admin/anexos/historico', 'error', 'Erro ao remover o anexo.');
    }
  }
};

module.exports = AdminAttachmentHandler;
