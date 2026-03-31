'use strict';

const TABLES = [
  'Users',
  'Courses',
  'Products',
  'Notifications',
  'BlogCategories',
  'CompanyCertificates',
  'Attachments'
];

async function hasColumn(queryInterface, tableName, columnName) {
  const table = await queryInterface.describeTable(tableName);
  return Object.prototype.hasOwnProperty.call(table, columnName);
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    for (const tableName of TABLES) {
      if (!(await hasColumn(queryInterface, tableName, 'deletedAt'))) {
        await queryInterface.addColumn(tableName, 'deletedAt', {
          type: Sequelize.DATE,
          allowNull: true
        });
      }
    }
  },

  async down(queryInterface) {
    for (const tableName of TABLES) {
      if (await hasColumn(queryInterface, tableName, 'deletedAt')) {
        await queryInterface.removeColumn(tableName, 'deletedAt');
      }
    }
  }
};
