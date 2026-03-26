const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BlogPost = sequelize.define('BlogPost', {
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
  excerpt: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  content: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  coverImage: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('rascunho', 'publicado'),
    allowNull: false,
    defaultValue: 'rascunho'
  },
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastAutoSavedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  paranoid: true
});

module.exports = BlogPost;
