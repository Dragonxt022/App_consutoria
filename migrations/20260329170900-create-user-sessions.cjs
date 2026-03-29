'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_sessions', {
      session_id: {
        type: Sequelize.STRING(128),
        allowNull: false,
        primaryKey: true
      },
      expires: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false
      },
      data: {
        type: Sequelize.TEXT('medium'),
        allowNull: true
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_sessions');
  }
};
