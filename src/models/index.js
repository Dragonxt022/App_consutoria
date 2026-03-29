const sequelize = require('../config/Database');

const User = require('./User');
const Course = require('./Course');
const Setting = require('./Setting');
const Enrollment = require('./Enrollment');
const CompanyCertificate = require('./CompanyCertificate');
const Product = require('./Product');
const BlogCategory = require('./BlogCategory');
const BlogPost = require('./BlogPost');
const Notification = require('./Notification');
const Attachment = require('./Attachment');

function parseBoolean(value, fallback = false) {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function shouldSyncOnStart() {
  const isProduction = process.env.NODE_ENV === 'production';
  return parseBoolean(process.env.DB_SYNC_ON_START, !isProduction);
}

const models = {
  User,
  Course,
  Setting,
  Enrollment,
  CompanyCertificate,
  Product,
  BlogCategory,
  BlogPost,
  Notification,
  Attachment,
  sequelize
};

// Associations
Enrollment.belongsTo(Course, { foreignKey: 'courseId' });
Course.hasMany(Enrollment, { foreignKey: 'courseId' });

Enrollment.belongsTo(User, { foreignKey: 'userId', as: 'student' });
User.hasMany(Enrollment, { foreignKey: 'userId' });

Attachment.belongsTo(Course, { foreignKey: 'courseId' });
Course.hasMany(Attachment, { foreignKey: 'courseId' });

Attachment.belongsTo(User, { foreignKey: 'userId', as: 'recipient' });
User.hasMany(Attachment, { foreignKey: 'userId', as: 'receivedAttachments' });

Attachment.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
User.hasMany(Attachment, { foreignKey: 'createdBy', as: 'createdAttachments' });

BlogPost.belongsTo(BlogCategory, { foreignKey: 'categoryId', as: 'category' });
BlogCategory.hasMany(BlogPost, { foreignKey: 'categoryId', as: 'posts' });

BlogPost.belongsTo(User, { foreignKey: 'authorId', as: 'author' });
User.hasMany(BlogPost, { foreignKey: 'authorId', as: 'blogPosts' });

// Associations dinâmicas (caso algum model use associate)
Object.keys(models).forEach(key => {
  if (models[key].associate) {
    models[key].associate(models);
  }
});

// 🔹 Sync centralizado
const syncDatabase = async () => {
  if (!shouldSyncOnStart()) {
    console.log('Sincronizacao automatica desativada (DB_SYNC_ON_START=0). Use migrations para evolucao do schema.');
    return;
  }

  try {
    // Antes de tentar alterar tabelas no SQLite, removemos quaisquer
    // tables de backup residuais criadas por tentativas anteriores do
    // processo de alteração de esquema do Sequelize. Se não removidas,
    // tentativas subsequentes podem falhar com UNIQUE constraint (id).
    try {
      const queryInterface = sequelize.getQueryInterface();
      if (sequelize.getDialect && sequelize.getDialect() === 'sqlite') {
        const [rows] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%\\_backup' ESCAPE '\\';");
        for (const r of rows) {
          const tableName = r.name || r.NAME || Object.values(r)[0];
          try {
            await queryInterface.dropTable(tableName);
            console.log(`Removed leftover backup table: ${tableName}`);
          } catch (err) {
            console.warn(`Could not drop ${tableName}:`, err.message || err);
          }
        }
      }
    } catch (err) {
      console.warn('Erro ao limpar tabelas de backup antes do sync:', err.message || err);
    }

    // Desabilita verificações de foreign key temporariamente no SQLite
    // para permitir que o processo de alteração (que cria/dropa tabelas)
    // funcione sem falhar em restrições externas. Reativa após sync.
    const isProduction = process.env.NODE_ENV === 'production';
    const defaultAlter = sequelize.getDialect() === 'sqlite' && !isProduction;
    const syncAlter = parseBoolean(process.env.DB_SYNC_ALTER, defaultAlter);
    const syncForce = parseBoolean(process.env.DB_SYNC_FORCE, false);
    let fkDisabled = false;
    try {
      if (sequelize.getDialect && sequelize.getDialect() === 'sqlite') {
        await sequelize.query('PRAGMA foreign_keys = OFF;');
        fkDisabled = true;
      }
      await sequelize.sync({ alter: syncAlter, force: syncForce });
    } finally {
      if (fkDisabled) {
        try {
          await sequelize.query('PRAGMA foreign_keys = ON;');
        } catch (err) {
          console.warn('Não foi possível reativar foreign_keys:', err.message || err);
        }
      }
    }
    console.log(`Banco de dados sincronizado (alter=${syncAlter}, force=${syncForce})`);
  } catch (error) {
    console.error('Erro na sincronização:', error);
    throw error;
  }
};

module.exports = {
  ...models,
  syncDatabase,
  shouldSyncOnStart
};
