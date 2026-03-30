require('dotenv').config();

const sequelize = require('../src/config/Database');

const LEGACY_INITIAL_MIGRATION_NAME = '20260329170000-initial-schema.cjs';
const INITIAL_MIGRATION_NAMES = [
  '20260329170000-create-users.cjs',
  '20260329170100-create-settings.cjs',
  '20260329170200-create-courses.cjs',
  '20260329170300-create-company-certificates.cjs',
  '20260329170400-create-products.cjs',
  '20260329170500-create-blog-categories.cjs',
  '20260329170600-create-notifications.cjs',
  '20260329170700-create-enrollments.cjs',
  '20260329170800-create-blog-posts.cjs'
];
const OPTIONAL_INITIAL_MIGRATION_NAMES = [
  {
    migration: '20260329170900-create-user-sessions.cjs',
    table: 'user_sessions'
  }
];
const REQUIRED_TABLES = [
  'Users',
  'Settings',
  'Courses',
  'CompanyCertificates',
  'Products',
  'BlogCategories',
  'Notifications',
  'Enrollments',
  'BlogPosts'
];

async function ensureMetaTable(queryInterface, tables) {
  if (tables.includes('SequelizeMeta')) {
    return;
  }

  await queryInterface.createTable('SequelizeMeta', {
    name: {
      type: sequelize.Sequelize.STRING,
      allowNull: false,
      primaryKey: true
    }
  });
}

async function main() {
  const queryInterface = sequelize.getQueryInterface();
  const tables = await queryInterface.showAllTables();
  const normalizedTables = tables.map((table) => {
    if (typeof table === 'string') return table;
    return table.tableName || table.name || Object.values(table)[0];
  });

  const missingTables = REQUIRED_TABLES.filter((table) => !normalizedTables.includes(table));

  if (missingTables.length) {
    console.error('Nao foi possivel criar baseline da migration inicial.');
    console.error(`Tabelas ausentes: ${missingTables.join(', ')}`);
    console.error('Use `npm run db:migrate` em um banco vazio ou conclua o schema antes de marcar a baseline.');
    process.exit(1);
  }

  await ensureMetaTable(queryInterface, normalizedTables);

  const [existingRows] = await sequelize.query('SELECT name FROM `SequelizeMeta`');
  const existingNames = new Set((existingRows || []).map((row) => row.name));
  const baselineNames = [...INITIAL_MIGRATION_NAMES];

  OPTIONAL_INITIAL_MIGRATION_NAMES.forEach(({ migration, table }) => {
    if (normalizedTables.includes(table)) {
      baselineNames.push(migration);
    }
  });

  if (existingNames.has(LEGACY_INITIAL_MIGRATION_NAME)) {
    await sequelize.query(
      'DELETE FROM `SequelizeMeta` WHERE name = :name',
      { replacements: { name: LEGACY_INITIAL_MIGRATION_NAME } }
    );
    existingNames.delete(LEGACY_INITIAL_MIGRATION_NAME);
  }

  const missingMigrationNames = baselineNames.filter((name) => !existingNames.has(name));

  if (!missingMigrationNames.length) {
    console.log('Baseline ja aplicada para a serie inicial de migrations.');
    return;
  }

  await queryInterface.bulkInsert(
    'SequelizeMeta',
    missingMigrationNames.map((name) => ({ name }))
  );

  console.log(`Baseline aplicada com sucesso para ${missingMigrationNames.length} migration(s).`);
}

main()
  .then(() => sequelize.close())
  .catch(async (error) => {
    console.error('Erro ao aplicar baseline da migration inicial:', error);
    try {
      await sequelize.close();
    } catch (closeError) {
      console.error('Erro ao encerrar conexao com o banco:', closeError);
    }
    process.exit(1);
  });
