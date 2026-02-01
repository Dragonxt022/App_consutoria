const { sequelize } = require('../src/models');
const { Course } = require('../src/models');

// Arrays com dados para gerar cursos variados
const courseTitles = [
  'Administração', 'Contabilidade', 'Direito', 'Engenharia Civil', 'Medicina',
  'Enfermagem', 'Psicologia', 'Pedagogia', 'Letras', 'História',
  'Geografia', 'Matemática', 'Física', 'Química', 'Biologia',
  'Ciência da Computação', 'Análise de Sistemas', 'Redes de Computadores',
  'Marketing Digital', 'Gestão de Projetos', 'Recursos Humanos', 'Logística',
  'Finanças', 'Economia', 'Arquitetura', 'Design Gráfico', 'Design de Interiores',
  'Nutrição', 'Educação Física', 'Fisioterapia', 'Farmácia', 'Odontologia',
  'Veterinária', 'Engenharia Elétrica', 'Engenharia Mecânica', 'Engenharia Química',
  'Produção de Áudio', 'Cinema', 'Fotografia', 'Jornalismo', 'Publicidade',
  'Relações Públicas', 'Turismo', 'Hotelaria', 'Gastronomia', 'Moda',
  'Música', 'Teatro', 'Dança', 'Artes Plásticas', 'Filosofia',
  'Sociologia', 'Antropologia', 'Ciências Sociais', 'Serviço Social', 'Teologia'
];

const courseTypes = ['Graduação', 'Pós-Graduação', 'Técnico', 'Extensão', 'MBA', 'Mestrado', 'Doutorado'];

const locations = [
  'São Paulo - SP', 'Rio de Janeiro - RJ', 'Belo Horizonte - MG', 'Brasília - DF',
  'Salvador - BA', 'Fortaleza - CE', 'Recife - PE', 'Porto Alegre - RS',
  'Curitiba - PR', 'Campinas - SP', 'Manaus - AM', 'Belém - PA',
  'Goiânia - GO', 'Guarulhos - SP', 'Londrina - PR', 'Joinville - SC'
];

const workloads = ['40 horas', '60 horas', '80 horas', '120 horas', '180 horas', '240 horas', '360 horas', '480 horas'];

const itemsIncluded = [
  ['Material didático digital', 'Certificado de conclusão', 'Acesso à plataforma'],
  ['Material impresso', 'Certificado digital', 'Suporte online', 'Aulas gravadas'],
  ['Livros didáticos', 'Certificado físico', 'Portal do aluno', 'Fórum de discussão'],
  ['Apostilas', 'Certificado', 'Laboratórios', 'Biblioteca virtual'],
  ['Kit de materiais', 'Certificado internacional', 'Estágio supervisionado'],
  ['Software licenciado', 'Certificado', 'Workshops práticos', 'Portfolio']
];

function generateSlug(title, index) {
  return title.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    + `-${index}`;
}

function generateDescription(title, type) {
  const descriptions = {
    'Graduação': `Curso de graduação em ${title} com foco na formação profissional completa. Desenvolva competências teóricas e práticas essenciais para o mercado de trabalho.`,
    'Pós-Graduação': `Especialização em ${title} para profissionais que buscam aprofundamento técnico e científico. Conteúdo avançado com professores especialistas.`,
    'Técnico': `Curso técnico em ${title} com abordagem prática e imersão no mercado. Formação rápida para ingressar imediatamente na área.`,
    'Extensão': `Curso de extensão universitária em ${title} para atualização e reciclagem profissional. Conteúdo condensado e aplicado.`,
    'MBA': `MBA Executivo em ${title} para gestores e líderes. Foco em estratégia, gestão de negócios e inovação com metodologia prática.`,
    'Mestrado': `Programa de mestrado acadêmico em ${title}. Pesquisa científica rigorosa com orientação personalizada e produção científica.`,
    'Doutorado': `Programa de doutorado em ${title} para formação de pesquisadores independentes. Contribuição original ao conhecimento científico.`
  };
  
  return descriptions[type] || descriptions['Graduação'];
}

function generatePrice(type, workload) {
  const basePrice = {
    'Técnico': 800,
    'Extensão': 600,
    'Graduação': 3500,
    'Pós-Graduação': 4500,
    'MBA': 8000,
    'Mestrado': 12000,
    'Doutorado': 15000
  };
  
  const workloadMultiplier = parseInt(workload) / 40;
  const price = Math.round(basePrice[type] * workloadMultiplier * (0.8 + Math.random() * 0.4));
  
  return `R$ ${price.toLocaleString('pt-BR')}`;
}

function generateRandomDate() {
  const start = new Date();
  const end = new Date();
  end.setMonth(end.getMonth() + 6);
  
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function seedCourses() {
  try {
    console.log('Conectando ao banco de dados...');
    await sequelize.authenticate();
    console.log('Conexão estabelecida com sucesso!');

    console.log('Limpando cursos existentes...');
    await Course.destroy({ where: {} });

    console.log('Cadastrando 100 cursos...');
    const courses = [];

    for (let i = 1; i <= 100; i++) {
      const title = courseTitles[Math.floor(Math.random() * courseTitles.length)];
      const type = courseTypes[Math.floor(Math.random() * courseTypes.length)];
      const location = locations[Math.floor(Math.random() * locations.length)];
      const workload = workloads[Math.floor(Math.random() * workloads.length)];
      
      const course = {
        title: `${title} - ${type}`,
        slug: generateSlug(`${title}-${type}`, i),
        description: generateDescription(title, type),
        image: `/images/courses/course-${(i % 10) + 1}.jpg`,
        spots: Math.floor(Math.random() * 50) + 10,
        location,
        workload,
        price: generatePrice(type, workload),
        startDate: generateRandomDate(),
        itemsIncluded: itemsIncluded[Math.floor(Math.random() * itemsIncluded.length)],
        active: true
      };

      courses.push(course);
      
      if (i % 10 === 0) {
        console.log(`Gerados ${i} cursos...`);
      }
    }

    // Inserindo em lotes de 20 para melhor performance
    for (let i = 0; i < courses.length; i += 20) {
      const batch = courses.slice(i, i + 20);
      await Course.bulkCreate(batch);
      console.log(`Inseridos ${Math.min(i + 20, courses.length)} de ${courses.length} cursos`);
    }

    console.log('✅ 100 cursos cadastrados com sucesso!');
    
    // Verificando resultado
    const totalCourses = await Course.count();
    console.log(`📊 Total de cursos no banco: ${totalCourses}`);

  } catch (error) {
    console.error('❌ Erro ao cadastrar cursos:', error);
  } finally {
    await sequelize.close();
  }
}

// Executar o script
if (require.main === module) {
  seedCourses();
}

module.exports = seedCourses;