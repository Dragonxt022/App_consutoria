const { StudentAttachmentService } = require('../../services');

const StudentAttachmentHandler = {
  async list(req, res) {
    const data = await StudentAttachmentService.getVisibleAttachments(req.user.id);

    if (!data) {
      return res.redirect('/login?error=Usuário não encontrado');
    }

    return res.render('aluno/attachments', {
      title: 'Arquivos Recebidos',
      user: data.user,
      attachments: data.attachments,
      currentStudentSection: 'attachments',
      layout: 'public/layout'
    });
  },

  async details(req, res) {
    const data = await StudentAttachmentService.getAttachmentDetails(req.user.id, req.params.id);

    if (!data) {
      return res.redirect('/login?error=Usuário não encontrado');
    }

    if (!data.attachment) {
      return res.redirect('/meus-arquivos?error=Arquivo não encontrado ou indisponível para sua conta.');
    }

    return res.render('aluno/attachment-details', {
      title: data.attachment.title,
      user: data.user,
      attachment: data.attachment,
      currentStudentSection: 'attachments',
      layout: 'public/layout'
    });
  }
};

module.exports = StudentAttachmentHandler;
