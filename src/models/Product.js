const { DataTypes } = require('sequelize');
const sequelize = require('../config/Database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  shortDescription: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  galleryImages: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  price: {
    type: DataTypes.STRING,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Geral'
  },
  affiliateUrl: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  platform: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Hotmart'
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  clickCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  paranoid: true
});

module.exports = Product;
