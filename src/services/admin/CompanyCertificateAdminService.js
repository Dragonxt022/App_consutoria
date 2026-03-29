const fs = require('fs');
const { CompanyCertificate } = require('../../models');
const { resolveUploadUrlToPath } = require('../../utils/UploadPaths');
const {
  normalizeHasExpiration,
  getDateOnlyValue,
  isCertificateExpired,
  formatCertificateExpiration
} = require('../../utils/CompanyCertificate');

class CompanyCertificateAdminService {
  resolveStoredFilePath(fileUrl) {
    return resolveUploadUrlToPath(fileUrl);
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

  async getAdminListData(page = 1) {
    const limit = 10;
    const offset = (page - 1) * limit;

    const { count, rows: certificates } = await CompanyCertificate.findAndCountAll({
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    return {
      certificates: certificates.map((record) => this.formatRecord(record)),
      pagination: {
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(count / limit)),
        totalItems: count
      }
    };
  }

  getEmptyCertificate() {
    return {
      name: '',
      hasExpiration: false,
      expirationDate: ''
    };
  }

  async createCertificate(body, file) {
    const fileUrl = file ? `/uploads/company-certificates/${file.filename}` : null;
    const payload = this.buildPayload(body, fileUrl);
    const validationError = this.validatePayload(payload, true);

    if (validationError) {
      if (fileUrl) this.removeFileIfExists(fileUrl);
      return { validationError };
    }

    await CompanyCertificate.create(payload);
    return { validationError: null };
  }

  async getCertificateForEdit(id) {
    const certificate = await CompanyCertificate.findByPk(id);
    if (!certificate) {
      return null;
    }

    return this.formatRecord(certificate);
  }

  async updateCertificate(id, body, file) {
    const newFileUrl = file ? `/uploads/company-certificates/${file.filename}` : null;
    const certificate = await CompanyCertificate.findByPk(id);

    if (!certificate) {
      if (newFileUrl) this.removeFileIfExists(newFileUrl);
      return { notFound: true };
    }

    const payload = this.buildPayload(body, newFileUrl || certificate.fileUrl);
    const validationError = this.validatePayload(payload, false);

    if (validationError) {
      if (newFileUrl) this.removeFileIfExists(newFileUrl);
      return { notFound: false, validationError };
    }

    const oldFileUrl = certificate.fileUrl;
    await certificate.update(payload);

    if (newFileUrl && oldFileUrl !== newFileUrl) {
      this.removeFileIfExists(oldFileUrl);
    }

    return { notFound: false, validationError: null };
  }

  async deleteCertificate(id) {
    const certificate = await CompanyCertificate.findByPk(id);
    if (!certificate) {
      return { notFound: true };
    }

    const fileUrl = certificate.fileUrl;
    await certificate.destroy();
    this.removeFileIfExists(fileUrl);

    return { notFound: false };
  }
}

module.exports = new CompanyCertificateAdminService();
