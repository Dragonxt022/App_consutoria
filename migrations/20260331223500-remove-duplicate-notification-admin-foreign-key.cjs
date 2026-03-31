'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    if (queryInterface.sequelize.getDialect() !== 'mysql') {
      return;
    }

    await queryInterface.removeConstraint('Notifications', 'Notifications_ibfk_1');
  },

  async down(queryInterface, Sequelize) {
    if (queryInterface.sequelize.getDialect() !== 'mysql') {
      return;
    }

    await queryInterface.addConstraint('Notifications', {
      fields: ['adminUserId'],
      type: 'foreign key',
      name: 'Notifications_ibfk_1',
      references: {
        table: 'Users',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  }
};
