const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CompanyCertificate = sequelize.define('CompanyCertificate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: false
  },
  hasExpiration: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  expirationDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  }
});

module.exports = CompanyCertificate;
