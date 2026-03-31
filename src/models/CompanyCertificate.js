const { DataTypes } = require('sequelize');
const sequelize = require('../config/Database');

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
}, {
  paranoid: true
});

module.exports = CompanyCertificate;
