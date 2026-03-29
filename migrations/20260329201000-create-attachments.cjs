'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Attachments', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      fileUrl: {
        type: Sequelize.STRING,
        allowNull: false
      },
      originalName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      mimeType: {
        type: Sequelize.STRING,
        allowNull: true
      },
      fileSize: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      visibilityType: {
        type: Sequelize.ENUM('course', 'user'),
        allowNull: false
      },
      requiredEnrollmentStatus: {
        type: Sequelize.ENUM('pendente', 'confirmado', 'completo', 'cancelado'),
        allowNull: true
      },
      courseId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Courses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    await queryInterface.addIndex('Attachments', ['visibilityType']);
    await queryInterface.addIndex('Attachments', ['courseId']);
    await queryInterface.addIndex('Attachments', ['userId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Attachments');
  }
};
