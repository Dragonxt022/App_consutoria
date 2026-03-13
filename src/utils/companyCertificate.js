function normalizeHasExpiration(value) {
  return value === true || value === 'true' || value === '1' || value === 'on';
}

function getDateOnlyValue(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const stringValue = String(value).trim();
  return stringValue ? stringValue.slice(0, 10) : null;
}

function isCertificateExpired(hasExpiration, expirationDate, now = new Date()) {
  if (!normalizeHasExpiration(hasExpiration)) {
    return false;
  }

  const dateValue = getDateOnlyValue(expirationDate);
  if (!dateValue) {
    return false;
  }

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  return new Date(`${dateValue}T00:00:00`) < today;
}

function formatCertificateExpiration(hasExpiration, expirationDate) {
  if (!normalizeHasExpiration(hasExpiration)) {
    return 'Vitalicio';
  }

  const dateValue = getDateOnlyValue(expirationDate);
  if (!dateValue) {
    return '-';
  }

  return new Date(`${dateValue}T00:00:00`).toLocaleDateString('pt-BR');
}

module.exports = {
  normalizeHasExpiration,
  getDateOnlyValue,
  isCertificateExpired,
  formatCertificateExpiration
};
