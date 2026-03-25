function parseMoneyValue(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const stringValue = String(value ?? '').trim();
  if (!stringValue) {
    return 0;
  }

  const sanitized = stringValue.replace(/\s+/g, '').replace(/R\$/gi, '');
  const lastComma = sanitized.lastIndexOf(',');
  const lastDot = sanitized.lastIndexOf('.');

  let normalized = sanitized;

  if (lastComma > lastDot) {
    normalized = sanitized.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    normalized = sanitized.replace(/,/g, '');
  } else {
    normalized = sanitized.replace(',', '.');
  }

  normalized = normalized.replace(/[^\d.-]/g, '');

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toMoneyStorage(value) {
  return parseMoneyValue(value).toFixed(2);
}

module.exports = {
  parseMoneyValue,
  toMoneyStorage
};
