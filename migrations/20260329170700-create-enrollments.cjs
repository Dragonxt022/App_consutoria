'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Enrollments', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      studentName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      studentEmail: {
        type: Sequelize.STRING,
        allowNull: false
      },
      studentPhone: {
        type: Sequelize.STRING,
        allowNull: false
      },
      company: {
        type: Sequelize.STRING,
        allowNull: true
      },
      cpfCnpj: {
        type: Sequelize.STRING,
        allowNull: true
      },
      entePublico: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      },
      pais: {
        type: Sequelize.STRING,
        allowNull: true
      },
      endereco: {
        type: Sequelize.STRING,
        allowNull: true
      },
      cidade: {
        type: Sequelize.STRING,
        allowNull: true
      },
      estado: {
        type: Sequelize.STRING,
        allowNull: true
      },
      cep: {
        type: Sequelize.STRING,
        allowNull: true
      },
      observations: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('pendente', 'confirmado', 'completo', 'cancelado'),
        allowNull: true,
        defaultValue: 'pendente'
      },
      coursePrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
      },
      discount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
      },
      finalPrice: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.00
      },
      certificateJson: {
        type: Sequelize.JSON,
        allowNull: true
      },
      certificateCode: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      deletedAt: {
        type: Sequelize.DATE,
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
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Enrollments');
  }
};
