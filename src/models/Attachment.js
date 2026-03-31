const { DataTypes } = require('sequelize');
const sequelize = require('../config/Database');

const Attachment = sequelize.define('Attachment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: false
  },
  originalName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  mimeType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  filesJson: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  visibilityType: {
    type: DataTypes.ENUM('course', 'user'),
    allowNull: false
  },
  requiredEnrollmentStatus: {
    type: DataTypes.ENUM('pendente', 'confirmado', 'completo', 'cancelado'),
    allowNull: true
  }
}, {
  paranoid: true
});

module.exports = Attachment;
