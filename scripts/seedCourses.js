const slugify = require('slugify');

const { sequelize, Course, User, Enrollment, Product } = require('../src/models');

function addDays(baseDate, days) {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + days);
  return next;
}

function brl(value) {
  return `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildCertificateData(enrollment, course, code) {
  return {
    studentName: enrollment.studentName,
    courseTitle: course.title,
    workload: course.workload,
    completionDate: new Date().toLocaleDateString('pt-BR'),
    verificationCode: code
  };
}

function buildCourses() {
  const now = new Date();
  const definitions = [
    {
      title: 'Governanca, Transparencia e Controle Interno',
      location: 'Bauru - SP',
      workload: '24 horas',
      priceValue: 1690,
      startOffsetDays: 22,
      active: true,
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1600&q=80',
      description: 'Imersao presencial para fortalecer governanca, integridade, transparencia e mecanismos de controle interno no setor publico.',
      topics: ['Fundamentos de governanca publica', 'Matriz de risco e controles', 'Prestacao de contas e transparência', 'Auditoria aplicada', 'Plano de acao institucional']
    },
    {
      title: 'Lideranca Estratégica para Alta Gestão',
      location: 'Manaus - AM',
      workload: '16 horas',
      priceValue: 1290,
      startOffsetDays: 12,
      active: true,
      image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80',
      description: 'Treinamento intensivo para liderancas que precisam alinhar equipe, execucao, cultura de resultado e tomada de decisao.',
      topics: ['Perfil de liderança contemporanea', 'Rituais de gestão', 'Comunicação executiva', 'Delegação e acompanhamento', 'Gestão por indicadores']
    },
    {
      title: 'Planejamento de Compras Publicas sem Improviso',
      location: 'Brasilia - DF',
      workload: '20 horas',
      priceValue: 1490,
      startOffsetDays: 35,
      active: true,
      image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1600&q=80',
      description: 'Capacitacao pratica para estruturar planejamento anual, fase preparatoria e governanca das aquisicoes.',
      topics: ['Plano anual de contratacoes', 'Estudo tecnico preliminar', 'Mapa de riscos', 'Termo de referencia', 'Fluxo de governança']
    },
    {
      title: 'Licitações e Contratos com foco em resultado',
      location: 'Sao Paulo - SP',
      workload: '24 horas',
      priceValue: 1890,
      startOffsetDays: 48,
      active: true,
      image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80',
      description: 'Programa presencial para atualizar equipes sobre procedimentos, fiscalização contratual e mitigacao de riscos.',
      topics: ['Nova lei de licitações', 'Governança contratual', 'Fiscalização eficiente', 'Gestão de aditivos', 'Responsabilização']
    },
    {
      title: 'Formacao de Pregoeiros e Equipes de Apoio',
      location: 'Goiania - GO',
      workload: '16 horas',
      priceValue: 1190,
      startOffsetDays: -10,
      active: true,
      image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1600&q=80',
      description: 'Curso focado na condução segura do pregão eletrônico, habilitação, julgamento e tratamento de impugnações.',
      topics: ['Etapas do pregão', 'Sessão pública', 'Negociação', 'Recursos administrativos', 'Checklist operacional']
    },
    {
      title: 'Gestao de Indicadores para Secretarias e Diretorias',
      location: 'Curitiba - PR',
      workload: '12 horas',
      priceValue: 980,
      startOffsetDays: 18,
      active: true,
      image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1600&q=80',
      description: 'Treinamento para construir indicadores acionaveis, dashboards executivos e ritos de acompanhamento.',
      topics: ['KPI e metas', 'Painel gerencial', 'Ritmo de acompanhamento', 'Tomada de decisão', 'Ajustes de rota']
    },
    {
      title: 'Auditoria Interna orientada a Riscos',
      location: 'Recife - PE',
      workload: '20 horas',
      priceValue: 1540,
      startOffsetDays: 28,
      active: true,
      image: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=1600&q=80',
      description: 'Capacitacao para estruturação de auditorias internas mais estratégicas, baseadas em risco e geração de valor.',
      topics: ['Mapeamento de riscos', 'Plano anual de auditoria', 'Testes e evidencias', 'Relatório executivo', 'Monitoramento']
    },
    {
      title: 'Comunicação Institucional para Gestores Publicos',
      location: 'Fortaleza - CE',
      workload: '8 horas',
      priceValue: 790,
      startOffsetDays: 55,
      active: false,
      image: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1600&q=80',
      description: 'Treinamento para melhorar discurso institucional, clareza de mensagens e alinhamento da comunicacao com a estrategia.',
      topics: ['Narrativa institucional', 'Comunicação de crise', 'Posicionamento de liderança', 'Relacionamento com publico', 'Mensagens-chave']
    }
  ];

  return definitions.map((item, index) => ({
    title: item.title,
    slug: slugify(item.title, { lower: true, strict: true }),
    description: item.description,
    image: item.image,
    proposalDoc: null,
    spots: 20 + (index * 7),
    location: item.location,
    workload: item.workload,
    price: brl(item.priceValue),
    startDate: addDays(now, item.startOffsetDays),
    itemsIncluded: ['Material didatico completo', 'Coffee-break', 'Certificado de participacao'],
    certificateTopics: item.topics,
    active: item.active
  }));
}

function buildUsers() {
  const baseUsers = [
    { name: 'Administrador Master', email: 'admin@cipilimitada.com', role: 'admin', active: true, company: 'CIP Ilimitada' },
    { name: 'Bruno da Silva', email: 'bruno@cipilimitada.com', role: 'admin', active: true, company: 'CIP Ilimitada' },
    { name: 'Ana Paula Rocha', email: 'ana.rocha@prefeitura.gov.br', role: 'aluno', active: true, company: 'Prefeitura de Manaus' },
    { name: 'Carlos Mendes', email: 'carlos.mendes@camara.gov.br', role: 'aluno', active: true, company: 'Camara Municipal de Bauru' },
    { name: 'Fernanda Alves', email: 'fernanda.alves@orgao.gov.br', role: 'aluno', active: false, company: 'Controladoria Geral' },
    { name: 'Marcos Vinicius', email: 'marcos.vinicius@empresa.com', role: 'aluno', active: true, company: 'Instituto Gestão Viva' },
    { name: 'Juliana Nunes', email: 'juliana.nunes@autarquia.gov.br', role: 'aluno', active: true, company: 'Autarquia Regional' },
    { name: 'Pedro Henrique', email: 'pedro.henrique@consorcio.org', role: 'aluno', active: false, company: 'Consorcio Intermunicipal' },
    { name: 'Luiza Castro', email: 'luiza.castro@fundacao.org.br', role: 'aluno', active: true, company: 'Fundacao Saber Publico' },
    { name: 'Ricardo Sena', email: 'ricardo.sena@tribunal.gov.br', role: 'aluno', active: true, company: 'Tribunal de Contas' }
  ];

  return baseUsers.map((user, index) => ({
    ...user,
    password: '123456',
    phone: `(92) 9${String(8000 + index).padStart(4, '0')}-${String(1000 + index).padStart(4, '0')}`,
    cpfCnpj: `000.000.000-${String(10 + index).padStart(2, '0')}`,
    pais: 'Brasil',
    endereco: `Av. Exemplo, ${100 + index}`,
    cidade: ['Manaus', 'Bauru', 'Brasilia', 'Recife', 'Curitiba'][index % 5],
    estado: ['AM', 'SP', 'DF', 'PE', 'PR'][index % 5],
    cep: `6900${index}-000`,
    entePublico: index % 2 === 0,
    confirmationToken: null,
    confirmationExpires: null,
    resetPasswordToken: null,
    resetPasswordExpires: null,
    pendingEmail: null,
    emailChangeToken: null,
    emailChangeExpires: null
  }));
}

function buildProducts() {
  const imageSets = [
    [
      'https://images.unsplash.com/photo-1586953208448-b95a79798f07?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1516321310764-8d14b0b3f5f1?auto=format&fit=crop&w=1200&q=80'
    ],
    [
      'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1516321165247-4aa89a48be28?auto=format&fit=crop&w=1200&q=80'
    ],
    [
      'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80'
    ],
    [
      'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80'
    ]
  ];

  const products = [
    {
      name: 'Planilha Premium de Controle de Contratos',
      category: 'Gestao Publica',
      price: 'R$ 97,00',
      shortDescription: 'Modelo pronto para acompanhar prazos, fiscais, reajustes e entregas contratuais.',
      description: 'Ferramenta de apoio para equipes que precisam controlar contratos com mais clareza, registro historico e visao gerencial.',
      featured: true,
      platform: 'Hotmart'
    },
    {
      name: 'Manual Pratico de Governanca para Orgaos Publicos',
      category: 'Governanca',
      price: 'R$ 147,00',
      shortDescription: 'Guia aplicado para estruturar governanca, papeis e rotinas de acompanhamento.',
      description: 'Material complementar com modelos, checklists e referencias para fortalecer governanca institucional e cultura de accountability.',
      featured: true,
      platform: 'Hotmart'
    },
    {
      name: 'Kit de Modelos para Auditoria Interna',
      category: 'Auditoria',
      price: 'R$ 127,00',
      shortDescription: 'Pacote de modelos editaveis para planejamento, execucao e relatorio de auditoria.',
      description: 'Colecao de documentos e roteiros para acelerar implantacao de auditorias internas mais objetivas e baseadas em risco.',
      featured: true,
      platform: 'Hotmart'
    },
    {
      name: 'Dashboard de Indicadores em Power BI',
      category: 'Indicadores',
      price: 'R$ 197,00',
      shortDescription: 'Template visual para acompanhar metas, entregas e indicadores de desempenho.',
      description: 'Painel pronto para personalizacao, com foco em leitura executiva, acompanhamento mensal e suporte a decisao.',
      featured: false,
      platform: 'Hotmart'
    },
    {
      name: 'Treinamento Gravado sobre Compras Publicas',
      category: 'Capacitacao',
      price: 'R$ 247,00',
      shortDescription: 'Aulas gravadas para aprofundar planejamento e fase preparatoria das aquisicoes.',
      description: 'Conteudo complementar para revisao, treinamento de equipe e consolidacao do conhecimento após eventos presenciais.',
      featured: false,
      platform: 'Hotmart'
    },
    {
      name: 'Checklist de Integridade para Gestores',
      category: 'Compliance',
      price: 'R$ 67,00',
      shortDescription: 'Lista pratica para autoavaliacao de controles, riscos e integridade institucional.',
      description: 'Documento de apoio para revisao rapida de pontos criticos em processos, contratos e rotinas de governanca.',
      featured: false,
      platform: 'Hotmart'
    }
  ];

  return products.map((product, index) => {
    const galleryImages = imageSets[index % imageSets.length];
    return {
      name: product.name,
      slug: slugify(product.name, { lower: true, strict: true }),
      shortDescription: product.shortDescription,
      description: product.description,
      imageUrl: galleryImages[0],
      galleryImages,
      price: product.price,
      category: product.category,
      affiliateUrl: `https://go.hotmart.com/PRODUTO${1000 + index}?ap=demo${index}`,
      platform: product.platform,
      active: true,
      featured: product.featured,
      clickCount: 8 + (index * 5)
    };
  });
}

async function seedDemoData() {
  console.log('Conectando e garantindo tabelas...');
  await sequelize.authenticate();
  await sequelize.sync();

  console.log('Limpando dados anteriores de demonstracao...');
  await Enrollment.destroy({ where: {}, force: true });
  await Product.destroy({ where: {} });
  await Course.destroy({ where: {} });
  await User.destroy({ where: {} });

  console.log('Criando cursos...');
  const createdCourses = await Course.bulkCreate(buildCourses(), { returning: true });

  console.log('Criando usuarios...');
  const createdUsers = [];
  for (const userData of buildUsers()) {
    const user = await User.create(userData);
    createdUsers.push(user);
  }

  console.log('Criando produtos...');
  await Product.bulkCreate(buildProducts());

  console.log('Criando inscricoes...');
  const studentUsers = createdUsers.filter((user) => user.role === 'aluno');
  const enrollmentStatuses = ['pendente', 'confirmado', 'completo', 'cancelado'];
  const enrollments = [];

  studentUsers.forEach((user, userIndex) => {
    const enrollmentCount = 2 + (userIndex % 2);
    for (let i = 0; i < enrollmentCount; i += 1) {
      const course = createdCourses[(userIndex + i) % createdCourses.length];
      const status = enrollmentStatuses[(userIndex + i) % enrollmentStatuses.length];
      const coursePriceNumber = Number(String(course.price).replace(/[^\d,]/g, '').replace('.', '').replace(',', '.')) || 0;
      const discount = (userIndex + i) % 3 === 0 ? 100 : 0;
      const finalPrice = Math.max(coursePriceNumber - discount, 0);
      const certificateCode = status === 'completo' ? `CERT-${String(userIndex + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}` : null;

      const enrollment = {
        studentName: user.name,
        studentEmail: user.email,
        studentPhone: user.phone || '(92) 99999-9999',
        company: user.company,
        cpfCnpj: user.cpfCnpj,
        entePublico: !!user.entePublico,
        pais: user.pais || 'Brasil',
        endereco: user.endereco || 'Endereco demonstracao',
        cidade: user.cidade || 'Manaus',
        estado: user.estado || 'AM',
        cep: user.cep || '69000-000',
        observations: i === 0 ? 'Inscricao gerada pelo seed de demonstracao.' : 'Participante inscrito em trilha complementar.',
        status,
        coursePrice: coursePriceNumber,
        discount,
        finalPrice,
        courseId: course.id,
        userId: user.id,
        certificateCode,
        certificateJson: status === 'completo' ? buildCertificateData({ studentName: user.name }, course, certificateCode) : null,
        createdAt: addDays(new Date(), -((userIndex * 3) + i + 1)),
        updatedAt: new Date()
      };

      enrollments.push(enrollment);
    }
  });

  await Enrollment.bulkCreate(enrollments);

  const totals = {
    courses: await Course.count(),
    users: await User.count(),
    enrollments: await Enrollment.count({ paranoid: false }),
    products: await Product.count()
  };

  console.log('Seed concluido com sucesso.');
  console.table(totals);
  console.log('Credenciais admin seed:');
  console.log('  email: admin@cipilimitada.com');
  console.log('  senha: 123456');
}

async function run() {
  try {
    await seedDemoData();
  } catch (error) {
    console.error('Erro ao executar seed:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  run();
}

module.exports = seedDemoData;
