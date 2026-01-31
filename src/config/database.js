const { Sequelize } = require('sequelize');
require('dotenv').config();

const isDevelopment = process.env.NODE_ENV === 'development';

const sequelize = new Sequelize(
  isDevelopment ? 'database' : process.env.DB_NAME,
  isDevelopment ? '' : process.env.DB_USER,
  isDevelopment ? '' : process.env.DB_PASSWORD,
  {
    host: isDevelopment ? 'localhost' : process.env.DB_HOST,
    dialect: isDevelopment ? 'sqlite' : 'mysql',
    storage: isDevelopment ? './database.sqlite' : null,
    logging: isDevelopment ? console.log : false,
  }
);

module.exports = sequelize;