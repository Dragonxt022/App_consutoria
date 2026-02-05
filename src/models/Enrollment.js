const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Enrollment = sequelize.define('Enrollment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  studentName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  studentEmail: {
    type: DataTypes.STRING,
    allowNull: false
  },
  studentPhone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  company: {
    type: DataTypes.STRING,
    allowNull: true
  },
  observations: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pendente', 'confirmado', 'completo', 'cancelado'),
    defaultValue: 'pendente'
  },
  coursePrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  discount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  finalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  certificateJson: {
    type: DataTypes.JSON,
    allowNull: true
  },
  certificateCode: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  }
});

module.exports = Enrollment;
