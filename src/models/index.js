const sequelize = require('../config/database');
const User = require('./User');

const models = {
  User,
  sequelize
};

Object.keys(models).forEach(key => {
  if (models[key].associate) {
    models[key].associate(models);
  }
});

module.exports = models;