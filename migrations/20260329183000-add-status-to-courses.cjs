'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Courses', 'status', {
      type: Sequelize.ENUM('ativo', 'confirmado'),
      allowNull: false,
      defaultValue: 'ativo',
      after: 'workload'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Courses', 'status');
  }
};
