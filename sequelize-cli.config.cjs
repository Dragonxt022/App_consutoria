require('dotenv').config();

function parseBoolean(value, fallback = false) {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function buildConfig() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const defaultDialect = process.env.DB_HOST ? 'mysql' : 'sqlite';
  const dialect = (process.env.DB_DIALECT || defaultDialect).toLowerCase();
  const isSqlite = dialect === 'sqlite';

  return {
    dialect,
    host: isSqlite ? undefined : process.env.DB_HOST,
    port: isSqlite ? undefined : Number(process.env.DB_PORT || 3306),
    database: isSqlite ? 'database' : process.env.DB_NAME,
    username: isSqlite ? '' : process.env.DB_USER,
    password: isSqlite ? '' : process.env.DB_PASSWORD,
    storage: isSqlite ? (process.env.DB_STORAGE || './database.sqlite') : undefined,
    logging: parseBoolean(process.env.DB_LOGGING, nodeEnv === 'development') ? console.log : false,
    dialectOptions: isSqlite ? undefined : {
      decimalNumbers: true
    }
  };
}

const config = buildConfig();

module.exports = {
  development: config,
  test: config,
  production: config
};
