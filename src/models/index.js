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
    await sequelize.sync();
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
