'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Courses', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      image: {
        type: Sequelize.STRING,
        allowNull: true
      },
      proposalDoc: {
        type: Sequelize.STRING,
        allowNull: true
      },
      spots: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      location: {
        type: Sequelize.STRING,
        allowNull: false
      },
      workload: {
        type: Sequelize.STRING,
        allowNull: false
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      itemsIncluded: {
        type: Sequelize.JSON,
        allowNull: true
      },
      certificateTopics: {
        type: Sequelize.JSON,
        allowNull: true
      },
      active: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Courses');
  }
};
