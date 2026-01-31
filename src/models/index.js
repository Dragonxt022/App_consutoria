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

Object.keys(models).forEach(key => {
  if (models[key].associate) {
    models[key].associate(models);
  }
});

module.exports = models;