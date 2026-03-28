const { formatCurrency } = require('../../utils/CurrencyFormatter');
const { EnrollmentAdminService } = require('../../services');

const AdminEnrollmentHandler = {
  async list(req, res) {
    const data = await EnrollmentAdminService.getAdminListData(req.query);

    res.render('admin/enrollments/list', {
      title: 'Gestão de Inscrições',
      user: req.user,
      layout: 'admin/layout',
      ...data
    });
  },

  async exportList(req, res) {
    try {
      const { csvContent, fileSuffix } = await EnrollmentAdminService.exportAdminList(req.query.search);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="inscricoes${fileSuffix}.csv"`);
      res.send(`\uFEFF${csvContent}`);
    } catch (error) {
      console.error(error);
      res.redirect('/admin/inscricoes?error=Erro ao exportar inscrições');
    }
  },

  async updateStatus(req, res) {
    try {
      const result = await EnrollmentAdminService.updateStatus(req.params.id, req.body.status);

      if (result.notFound) {
        return res.status(404).json({ error: 'Inscrição não encontrada' });
      }

      return res.redirect('/admin/inscricoes?success=Status atualizado com sucesso');
    } catch (error) {
      console.error(error);
      return res.redirect('/admin/inscricoes?error=Erro ao atualizar status');
    }
  },

  async certificates(req, res) {
    const data = await EnrollmentAdminService.getCertificatesPageData();

    res.render('admin/certificates/index', {
      title: 'Gerador de Certificados',
      user: req.user,
      layout: 'admin/layout',
      ...data
    });
  },

  async generateJson(req, res) {
    try {
      const exportData = await EnrollmentAdminService.generateCertificateJson(req.params.courseId);
      res.header('Content-Type', 'application/json');
      res.attachment(`certificados-curso-${req.params.courseId}.json`);
      res.send(JSON.stringify(exportData, null, 2));
    } catch (error) {
      console.error(error);
      res.redirect('/admin/certificados?error=Erro ao gerar JSON');
    }
  },

  async viewCertificate(req, res) {
    try {
      const result = await EnrollmentAdminService.resolveCertificateAccess(req.params.id, req.user);

      if (result.unavailable) {
        const redirectUrl = req.user.role === 'admin' ? '/admin/inscricoes' : '/aluno/dashboard';
        return res.redirect(`${redirectUrl}?error=Certificado não disponível`);
      }

      return res.redirect(result.redirectTo);
    } catch (error) {
      console.error(error);
      const redirectUrl = req.user.role === 'admin' ? '/admin/inscricoes' : '/aluno/dashboard';
      return res.redirect(`${redirectUrl}?error=Erro ao visualizar certificado`);
    }
  },

  async showEdit(req, res) {
    const data = await EnrollmentAdminService.getEnrollmentForEdit(req.params.id);

    if (!data) {
      return res.redirect('/admin/inscricoes?error=Inscrição não encontrada');
    }

    return res.render('admin/enrollments/edit', {
      title: 'Editar Inscrição',
      user: req.user,
      layout: 'admin/layout',
      ...data
    });
  },

  async update(req, res) {
    try {
      const result = await EnrollmentAdminService.updateEnrollment(req.params.id, req.body);

      if (result.notFound) {
        return res.redirect('/admin/inscricoes?error=Inscrição não encontrada');
      }

      return res.redirect('/admin/inscricoes?success=Inscrição atualizada com sucesso');
    } catch (error) {
      console.error(error);
      return res.redirect(`/admin/inscricoes/${req.params.id}/editar?error=Erro ao atualizar inscrição`);
    }
  },

  async receipt(req, res) {
    try {
      const data = await EnrollmentAdminService.getReceiptData(req.params.id, req.user);

      if (data.notFound) {
        return res.status(404).render('error', { title: 'Comprovante não encontrado', layout: false });
      }

      if (data.forbidden) {
        return res.status(403).render('error', { title: 'Acesso negado', layout: false });
      }

      return res.render('certificate/enrollment-receipt', {
        title: req.user.role === 'admin' ? 'Comprovante de Inscrição' : 'Meu Comprovante de Inscrição',
        formatCurrency,
        layout: false,
        ...data
      });
    } catch (error) {
      console.error(error);
      return res.status(500).render('error', { title: 'Erro ao gerar comprovante', layout: false });
    }
  },

  async studentReceipt(req, res) {
    try {
      const data = await EnrollmentAdminService.getStudentReceiptData(req.params.id, req.user.id);

      if (!data) {
        return res.status(404).render('error', { title: 'Comprovante não encontrado', layout: false });
      }

      return res.render('certificate/enrollment-receipt', {
        title: 'Meu Comprovante de Inscrição',
        formatCurrency,
        layout: false,
        ...data
      });
    } catch (error) {
      console.error(error);
      return res.status(500).render('error', { title: 'Erro ao gerar comprovante', layout: false });
    }
  },

  async remove(req, res) {
    try {
      const result = await EnrollmentAdminService.deleteEnrollment(req.params.id);

      if (result.notFound) {
        return res.redirect('/admin/inscricoes?error=Inscrição não encontrada');
      }

      return res.redirect('/admin/inscricoes?success=Inscrição excluída com sucesso');
    } catch (error) {
      console.error(error);
      return res.redirect('/admin/inscricoes?error=Erro ao excluir inscrição');
    }
  }
};

module.exports = AdminEnrollmentHandler;
