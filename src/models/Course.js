const { DataTypes } = require('sequelize');
const sequelize = require('../config/Database');
const { parseMoneyValue, toMoneyStorage } = require('../utils/Money');

const Course = sequelize.define('Course', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true
  },
  proposalDoc: {
    type: DataTypes.STRING,
    allowNull: true
  },
  spots: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false
  },
  workload: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('ativo', 'confirmado'),
    allowNull: false,
    defaultValue: 'ativo'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    get() {
      return parseMoneyValue(this.getDataValue('price'));
    },
    set(value) {
      this.setDataValue('price', toMoneyStorage(value));
    }
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  itemsIncluded: {
    type: DataTypes.JSON, // Stores array of items
    defaultValue: []
  },
  certificateTopics: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  paranoid: true
});

module.exports = Course;
