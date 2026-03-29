const test = require('node:test');
const assert = require('node:assert/strict');

const { formatCurrency } = require('../../src/utils/CurrencyFormatter');

test('formatCurrency returns zero for empty or invalid values', () => {
  assert.equal(formatCurrency(), 'R$ 0,00');
  assert.equal(formatCurrency(null), 'R$ 0,00');
  assert.equal(formatCurrency('abc'), 'R$ 0,00');
});

test('formatCurrency formats numbers in pt-BR currency style', () => {
  assert.equal(formatCurrency(1234.5), 'R$ 1.234,50');
  assert.equal(formatCurrency('99.9'), 'R$ 99,90');
  assert.equal(formatCurrency(-5678), 'R$ -5.678,00');
});
