const { Sequelize } = require('sequelize');
require('dotenv').config();

function parseBoolean(value, fallback = false) {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

const nodeEnv = process.env.NODE_ENV || 'development';
const defaultDialect = process.env.DB_HOST ? 'mysql' : 'sqlite';
const dialect = (process.env.DB_DIALECT || defaultDialect).toLowerCase();
const isSqlite = dialect === 'sqlite';
const databaseName = isSqlite ? 'database' : process.env.DB_NAME;
const databaseUser = isSqlite ? '' : process.env.DB_USER;
const databasePassword = isSqlite ? '' : process.env.DB_PASSWORD;
const storage = process.env.DB_STORAGE || './database.sqlite';
const logging = parseBoolean(process.env.DB_LOGGING, nodeEnv === 'development') ? console.log : false;

const sequelize = new Sequelize(
  databaseName,
  databaseUser,
  databasePassword,
  {
    host: isSqlite ? undefined : process.env.DB_HOST,
    port: isSqlite ? undefined : Number(process.env.DB_PORT || 3306),
    dialect,
    storage: isSqlite ? storage : undefined,
    logging,
  }
);

module.exports = sequelize;
