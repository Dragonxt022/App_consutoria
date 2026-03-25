(function () {
    if (typeof window === 'undefined' || typeof window.numeral === 'undefined') {
        return;
    }

    if (window.numeral.locales && window.numeral.locales['pt-br']) {
        window.numeral.locale('pt-br');
    }

    function parseCurrency(value) {
        if (typeof value === 'number') return value;

        const stringValue = String(value || '').trim();
        if (!stringValue) return 0;

        const sanitized = stringValue.replace(/\s+/g, '').replace(/R\$/gi, '');
        const hasComma = sanitized.includes(',');
        const hasDot = sanitized.includes('.');

        if (hasComma || hasDot) {
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

        const digits = sanitized.replace(/\D/g, '');
        if (!digits) return 0;

        return Number(digits) / 100;
    }

    function formatCurrency(value, prefix) {
        const normalized = Number.isFinite(value) ? value : 0;
        return `${prefix}${window.numeral(normalized).format('0,0.00')}`.trim();
    }

    function updateInputValue(input) {
        const prefix = input.dataset.currencyPrefix || 'R$ ';
        const parsed = parseCurrency(input.value);
        input.dataset.currencyValue = String(parsed);
        input.value = input.value.trim() ? formatCurrency(parsed, prefix) : '';
    }

    function bindCurrencyInput(input) {
        if (!input) return;

        updateInputValue(input);

        input.addEventListener('input', function () {
            updateInputValue(input);
        });

        input.addEventListener('blur', function () {
            updateInputValue(input);
        });
    }

    function setNumericValue(input, value) {
        if (!input) return;
        const prefix = input.dataset.currencyPrefix || 'R$ ';
        const parsed = Number(value) || 0;
        input.dataset.currencyValue = String(parsed);
        input.value = formatCurrency(parsed, prefix);
    }

    function normalizeFormCurrencyFields(form) {
        form.querySelectorAll('[data-currency-input]').forEach((input) => {
            const parsed = parseCurrency(input.value);
            const storage = input.dataset.currencyStorage || 'decimal';
            input.dataset.currencyValue = String(parsed);

            if (storage === 'formatted') {
                const prefix = input.dataset.currencyPrefix || 'R$ ';
                input.value = formatCurrency(parsed, prefix);
                return;
            }

            input.value = parsed.toFixed(2);
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-currency-input]').forEach(bindCurrencyInput);
        document.querySelectorAll('form').forEach((form) => {
            form.addEventListener('submit', function () {
                normalizeFormCurrencyFields(form);
            });
        });
    });

    window.currencyFields = {
        parse: parseCurrency,
        format: formatCurrency,
        setValue: setNumericValue,
        normalizeForm: normalizeFormCurrencyFields
    };
})();
