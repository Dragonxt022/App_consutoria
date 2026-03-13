const fs = require('fs');
const path = require('path');

const { CompanyCertificate } = require('../models');
const {
  normalizeHasExpiration,
  getDateOnlyValue,
  isCertificateExpired,
  formatCertificateExpiration
} = require('../utils/companyCertificate');

class CompanyCertificateController {
  resolveStoredFilePath(fileUrl) {
    if (!fileUrl || typeof fileUrl !== 'string') return null;
    const prefix = '/uploads/company-certificates/';
    if (!fileUrl.startsWith(prefix)) return null;

    return path.join(__dirname, '..', 'public', 'uploads', 'company-certificates', path.basename(fileUrl));
  }

  removeFileIfExists(fileUrl) {
    const filePath = this.resolveStoredFilePath(fileUrl);
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  formatRecord(record) {
    const data = record.toJSON ? record.toJSON() : { ...record };
    const hasExpiration = normalizeHasExpiration(data.hasExpiration);

    return {
      ...data,
      hasExpiration,
      expirationDate: getDateOnlyValue(data.expirationDate),
      expirationLabel: formatCertificateExpiration(hasExpiration, data.expirationDate),
      isExpired: isCertificateExpired(hasExpiration, data.expirationDate)
    };
  }

  buildPayload(body, fileUrl) {
    const hasExpiration = normalizeHasExpiration(body.hasExpiration);

    return {
      name: (body.name || '').trim(),
      fileUrl,
      hasExpiration,
      expirationDate: hasExpiration ? getDateOnlyValue(body.expirationDate) : null
    };
  }

  validatePayload(payload, requireFile) {
    if (!payload.name) return 'Informe o nome da certidao.';
    if (requireFile && !payload.fileUrl) return 'Envie o arquivo PDF da certidao.';
    if (payload.hasExpiration && !payload.expirationDate) return 'Informe a data de validade da certidao.';
    return null;
  }

  async adminList(req, res) {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = 10;
    const offset = (page - 1) * limit;

    const { count, rows: certificates } = await CompanyCertificate.findAndCountAll({
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.render('admin/certidoes/list', {
      title: 'Certidoes',
      certificates: certificates.map((record) => this.formatRecord(record)),
      pagination: {
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(count / limit)),
        totalItems: count
      },
      user: req.user,
      layout: 'admin/layout'
    });
  }

  async adminCreateForm(req, res) {
    res.render('admin/certidoes/create', {
      title: 'Cadastrar Certidao',
      certificate: {
        name: '',
        hasExpiration: false,
        expirationDate: ''
      },
      user: req.user,
      layout: 'admin/layout'
    });
  }

  async adminStore(req, res) {
    const fileUrl = req.file ? `/uploads/company-certificates/${req.file.filename}` : null;

    try {
      const payload = this.buildPayload(req.body, fileUrl);
      const validationError = this.validatePayload(payload, true);

      if (validationError) {
        if (fileUrl) this.removeFileIfExists(fileUrl);
        return res.redirect(`/admin/certidoes/criar?error=${encodeURIComponent(validationError)}`);
      }

      await CompanyCertificate.create(payload);

      res.redirect('/admin/certidoes?success=Certidao cadastrada com sucesso!');
    } catch (error) {
      if (fileUrl) this.removeFileIfExists(fileUrl);
      console.error(error);
      res.redirect('/admin/certidoes/criar?error=Erro ao cadastrar certidao');
    }
  }

  async adminEditForm(req, res) {
    try {
      const certificate = await CompanyCertificate.findByPk(req.params.id);

      if (!certificate) {
        return res.redirect('/admin/certidoes?error=Certidao nao encontrada');
      }

      res.render('admin/certidoes/edit', {
        title: 'Editar Certidao',
        certificate: this.formatRecord(certificate),
        user: req.user,
        layout: 'admin/layout'
      });
    } catch (error) {
      console.error(error);
      res.redirect('/admin/certidoes?error=Erro ao carregar certidao');
    }
  }

  async adminUpdate(req, res) {
    const newFileUrl = req.file ? `/uploads/company-certificates/${req.file.filename}` : null;

    try {
      const certificate = await CompanyCertificate.findByPk(req.params.id);

      if (!certificate) {
        if (newFileUrl) this.removeFileIfExists(newFileUrl);
        return res.redirect('/admin/certidoes?error=Certidao nao encontrada');
      }

      const payload = this.buildPayload(req.body, newFileUrl || certificate.fileUrl);
      const validationError = this.validatePayload(payload, false);

      if (validationError) {
        if (newFileUrl) this.removeFileIfExists(newFileUrl);
        return res.redirect(`/admin/certidoes/${req.params.id}/editar?error=${encodeURIComponent(validationError)}`);
      }

      const oldFileUrl = certificate.fileUrl;
      await certificate.update(payload);

      if (newFileUrl && oldFileUrl !== newFileUrl) {
        this.removeFileIfExists(oldFileUrl);
      }

      res.redirect('/admin/certidoes?success=Certidao atualizada com sucesso!');
    } catch (error) {
      if (newFileUrl) this.removeFileIfExists(newFileUrl);
      console.error(error);
      res.redirect(`/admin/certidoes/${req.params.id}/editar?error=Erro ao atualizar certidao`);
    }
  }

  async adminDelete(req, res) {
    try {
      const certificate = await CompanyCertificate.findByPk(req.params.id);

      if (!certificate) {
        return res.redirect('/admin/certidoes?error=Certidao nao encontrada');
      }

      const fileUrl = certificate.fileUrl;
      await certificate.destroy();
      this.removeFileIfExists(fileUrl);

      res.redirect('/admin/certidoes?success=Certidao excluida com sucesso!');
    } catch (error) {
      console.error(error);
      res.redirect('/admin/certidoes?error=Erro ao excluir certidao');
    }
  }

  async publicList(req, res) {
    try {
      const certificates = await CompanyCertificate.findAll({
        order: [['name', 'ASC']]
      });

      res.render('public/certidoes', {
        title: 'Certidoes',
        certificates: certificates.map((record) => this.formatRecord(record)),
        layout: 'public/layout'
      });
    } catch (error) {
      console.error(error);
      res.redirect('/?error=Erro ao carregar certidoes');
    }
  }
}

module.exports = new CompanyCertificateController();
