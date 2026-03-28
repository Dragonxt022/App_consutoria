/**
 * Formata valor em moeda brasileira (R$ com ponto para milhar e vírgula para centavos)
 * @param {number} value - Valor a formatar
 * @returns {string} Valor formatado como "R$ 1.234,56"
 */
function formatCurrency(value) {
  if (!value || isNaN(value)) {
    return 'R$ 0,00';
  }

  const number = parseFloat(value).toFixed(2);
  const [integerPart, decimalPart] = number.split('.');

  // Adiciona ponto para separador de milhar
  const formattedInteger = parseInt(integerPart, 10).toLocaleString('pt-BR');

  return `R$ ${formattedInteger},${decimalPart}`;
}

module.exports = { formatCurrency };
