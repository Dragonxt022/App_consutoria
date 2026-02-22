const sequelize = require('../config/database');

const User = require('./User');
const Course = require('./Course');
const Setting = require('./Setting');
const Enrollment = require('./Enrollment');

const models = {
  User,
  Course,
  Setting,
  Enrollment,
  sequelize
};

// Associations
Enrollment.belongsTo(Course, { foreignKey: 'courseId' });
Course.hasMany(Enrollment, { foreignKey: 'courseId' });

Enrollment.belongsTo(User, { foreignKey: 'userId', as: 'student' });
User.hasMany(Enrollment, { foreignKey: 'userId' });

// Associations dinâmicas (caso algum model use associate)
Object.keys(models).forEach(key => {
  if (models[key].associate) {
    models[key].associate(models);
  }
});

// 🔹 Sync centralizado
const syncDatabase = async () => {
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
    let fkDisabled = false;
    try {
      if (sequelize.getDialect && sequelize.getDialect() === 'sqlite') {
        await sequelize.query('PRAGMA foreign_keys = OFF;');
        fkDisabled = true;
      }
      await sequelize.sync({ alter: true });
    } finally {
      if (fkDisabled) {
        try {
          await sequelize.query('PRAGMA foreign_keys = ON;');
        } catch (err) {
          console.warn('Não foi possível reativar foreign_keys:', err.message || err);
        }
      }
    }
    console.log('Banco de dados sincronizado');
  } catch (error) {
    console.error('Erro na sincronização:', error);
    throw error;
  }
};

module.exports = {
  ...models,
  syncDatabase
};
