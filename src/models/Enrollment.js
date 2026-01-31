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
  certificateJson: {
    type: DataTypes.JSON,
    allowNull: true
  }
});

module.exports = Enrollment;
