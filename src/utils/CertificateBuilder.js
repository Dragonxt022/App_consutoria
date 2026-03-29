const fs = require('fs');
const path = require('path');

const TEMPLATE_PUBLIC_PREFIX = '/uploads/templete-certificados/';
const TEMPLATE_DIR = path.join(__dirname, '..', 'public', 'uploads', 'templete-certificados');

const ELEMENT_PRESETS = [
  {
    id: 'companyLogo',
    type: 'image',
    label: 'Logo da empresa',
    settingKey: 'logo',
    x: 7,
    y: 8,
    width: 16
  },
  {
    id: 'title',
    type: 'text',
    label: 'Titulo',
    text: 'CERTIFICADO',
    x: 20,
    y: 12,
    width: 60,
    fontSize: 20,
    fontWeight: 700,
    fontFamily: 'Georgia, serif',
    align: 'center',
    color: '#111827'
  },
  {
    id: 'studentName',
    type: 'text',
    label: 'Nome do aluno',
    text: '{{studentName}}',
    x: 15,
    y: 26,
    width: 70,
    fontSize: 28,
    fontWeight: 700,
    fontFamily: 'Georgia, serif',
    align: 'center',
    color: '#111827'
  },
  {
    id: 'bodyText',
    type: 'text',
    label: 'Frase padrao',
    text: 'Certificamos que {{studentName}} concluiu com exito o curso "{{courseTitle}}", realizado em {{courseLocation}}, concluido em {{completionDate}}, com carga horaria total de {{workload}} horas e aproveitamento satisfatorio.',
    x: 13,
    y: 42,
    width: 74,
    fontSize: 10,
    fontWeight: 500,
    fontFamily: 'Arial, sans-serif',
    align: 'center',
    color: '#1f2937'
  },
  {
    id: 'signatureBlock',
    type: 'signature-block',
    label: 'Bloco de assinatura',
    text: 'Professor Responsavel',
    x: 14,
    y: 69,
    width: 25,
    fontSize: 8,
    fontWeight: 600,
    fontFamily: 'Arial, sans-serif',
    align: 'center',
    color: '#111827'
  },
  {
    id: 'issueDate',
    type: 'text',
    label: 'Data de emissao',
    text: 'Emitido em {{issueDate}}',
    x: 63,
    y: 76,
    width: 24,
    fontSize: 8,
    fontWeight: 600,
    fontFamily: 'Arial, sans-serif',
    align: 'center',
    color: '#1f2937'
  },
  {
    id: 'validationCode',
    type: 'text',
    label: 'Codigo de validacao',
    text: 'Cod. Validacao: {{validationCode}}',
    x: 61,
    y: 82,
    width: 28,
    fontSize: 8,
    fontWeight: 600,
    fontFamily: 'Arial, sans-serif',
    align: 'center',
    color: '#1f2937'
  },
  {
    id: 'validationUrl',
    type: 'text',
    label: 'URL de validacao',
    text: '{{validationUrl}}',
    x: 57,
    y: 87,
    width: 36,
    fontSize: 6,
    fontWeight: 500,
    fontFamily: 'Arial, sans-serif',
    align: 'center',
    color: '#475569'
  }
];

const SAMPLE_VALUES = {
  studentName: 'Nome do Aluno',
  courseTitle: 'Curso de Exemplo',
  courseLocation: 'Manaus - AM',
  completionDate: '11/03/2026',
  workload: '40',
  issueDate: '11/03/2026',
  validationCode: 'ABCD-1234',
  validationUrl: 'https://exemplo.com/validar-certificado'
};

function listCertificateBackgrounds() {
  if (!fs.existsSync(TEMPLATE_DIR)) {
    return [];
  }

  return fs.readdirSync(TEMPLATE_DIR)
    .filter((file) => /\.(png|jpe?g|webp)$/i.test(file))
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }))
    .map((file) => `${TEMPLATE_PUBLIC_PREFIX}${file}`);
}

function getDefaultCertificateBuilderConfig(backgroundUrl = '') {
  return {
    backgroundUrl,
    elements: ELEMENT_PRESETS.map((element) => ({ ...element }))
  };
}

function normalizeNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeCertificateBuilderConfig(rawConfig, availableBackgrounds = []) {
  const fallbackBackground = availableBackgrounds[0] || '';
  const config = rawConfig && typeof rawConfig === 'object' ? rawConfig : {};
  const elementsById = new Map(Array.isArray(config.elements) ? config.elements.map((item) => [item.id, item]) : []);

  const backgroundUrl = typeof config.backgroundUrl === 'string' && availableBackgrounds.includes(config.backgroundUrl)
    ? config.backgroundUrl
    : fallbackBackground;

  return {
    backgroundUrl,
    elements: ELEMENT_PRESETS.map((preset) => {
      const current = elementsById.get(preset.id) || {};
      const normalized = {
        ...preset,
        x: normalizeNumber(current.x, preset.x, 0, 100),
        y: normalizeNumber(current.y, preset.y, 0, 100),
        width: normalizeNumber(current.width, preset.width || 20, 5, 100)
      };

      if (preset.type === 'text') {
        normalized.text = typeof current.text === 'string' ? current.text : preset.text;
        normalized.fontSize = normalizeNumber(current.fontSize, preset.fontSize || 12, 6, 72);
        normalized.fontWeight = normalizeNumber(current.fontWeight, preset.fontWeight || 500, 300, 900);
        normalized.fontFamily = typeof current.fontFamily === 'string' && current.fontFamily.trim()
          ? current.fontFamily
          : preset.fontFamily;
        normalized.color = typeof current.color === 'string' && current.color.trim()
          ? current.color
          : preset.color;
        normalized.align = typeof current.align === 'string' && ['left', 'center', 'right'].includes(current.align)
          ? current.align
          : preset.align;
      }

      if (preset.type === 'signature-block') {
        normalized.text = typeof current.text === 'string' ? current.text : preset.text;
        normalized.fontSize = normalizeNumber(current.fontSize, preset.fontSize || 12, 6, 72);
        normalized.fontWeight = normalizeNumber(current.fontWeight, preset.fontWeight || 500, 300, 900);
        normalized.fontFamily = typeof current.fontFamily === 'string' && current.fontFamily.trim()
          ? current.fontFamily
          : preset.fontFamily;
        normalized.color = typeof current.color === 'string' && current.color.trim()
          ? current.color
          : preset.color;
        normalized.align = typeof current.align === 'string' && ['left', 'center', 'right'].includes(current.align)
          ? current.align
          : preset.align;
      }

      return normalized;
    })
  };
}

function replacePlaceholders(text, values) {
  return String(text || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => values[key] ?? '');
}

function buildCertificateRenderValues({ enrollment, course, code, validationUrl }) {
  return {
    studentName: enrollment.studentName,
    courseTitle: course.title,
    courseLocation: course.location || 'online',
    completionDate: new Date(enrollment.updatedAt).toLocaleDateString('pt-BR'),
    workload: course.workload,
    issueDate: new Date().toLocaleDateString('pt-BR'),
    validationCode: code,
    validationUrl
  };
}

function buildCertificateRenderElements(config, values, assets = {}) {
  return config.elements.map((element) => {
    if (element.type === 'signature-block') {
      return {
        ...element,
        src: assets.signatureUrl || '',
        signatureName: replacePlaceholders(element.text, values),
        visible: true
      };
    }

    if (element.type === 'image') {
      const src = element.settingKey === 'logo' ? (assets.logoUrl || '') : '';
      return {
        ...element,
        src,
        visible: Boolean(src)
      };
    }

    return {
      ...element,
      content: replacePlaceholders(element.text, values),
      visible: true
    };
  });
}

module.exports = {
  SAMPLE_VALUES,
  ELEMENT_PRESETS,
  listCertificateBackgrounds,
  getDefaultCertificateBuilderConfig,
  normalizeCertificateBuilderConfig,
  replacePlaceholders,
  buildCertificateRenderValues,
  buildCertificateRenderElements
};
