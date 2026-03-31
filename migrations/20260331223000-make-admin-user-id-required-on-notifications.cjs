'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (queryInterface.sequelize.getDialect() === 'sqlite') {
      await queryInterface.changeColumn('Notifications', 'adminUserId', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });
      return;
    }

    await queryInterface.sequelize.query(`
      ALTER TABLE Notifications
      MODIFY COLUMN adminUserId INT NOT NULL
    `);
  },

  async down(queryInterface, Sequelize) {
    if (queryInterface.sequelize.getDialect() === 'sqlite') {
      await queryInterface.changeColumn('Notifications', 'adminUserId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      });
      return;
    }

    await queryInterface.sequelize.query(`
      ALTER TABLE Notifications
      MODIFY COLUMN adminUserId INT NULL
    `);
  }
};
