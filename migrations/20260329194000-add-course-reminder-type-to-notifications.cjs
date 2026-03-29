'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();

    if (dialect === 'sqlite') {
      await queryInterface.changeColumn('Notifications', 'type', {
        type: Sequelize.ENUM('new_enrollment', 'expired_certificate', 'auto_closed', 'blog_published', 'smtp_failure', 'course_reminder_24h'),
        allowNull: false
      });
      return;
    }

    await queryInterface.sequelize.query(`
      ALTER TABLE Notifications
      MODIFY COLUMN type ENUM('new_enrollment', 'expired_certificate', 'auto_closed', 'blog_published', 'smtp_failure', 'course_reminder_24h')
      NOT NULL
    `);
  },

  async down(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();

    if (dialect === 'sqlite') {
      await queryInterface.changeColumn('Notifications', 'type', {
        type: Sequelize.ENUM('new_enrollment', 'expired_certificate', 'auto_closed', 'blog_published', 'smtp_failure'),
        allowNull: false
      });
      return;
    }

    await queryInterface.sequelize.query(`
      ALTER TABLE Notifications
      MODIFY COLUMN type ENUM('new_enrollment', 'expired_certificate', 'auto_closed', 'blog_published', 'smtp_failure')
      NOT NULL
    `);
  }
};
