'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const values = [
      'new_enrollment',
      'expired_certificate',
      'auto_closed',
      'blog_published',
      'smtp_failure',
      'course_reminder_24h',
      'enrollment_attachment_received'
    ];

    if (queryInterface.sequelize.getDialect() === 'sqlite') {
      await queryInterface.changeColumn('Notifications', 'type', {
        type: Sequelize.ENUM(...values),
        allowNull: false
      });
      return;
    }

    await queryInterface.sequelize.query(`
      ALTER TABLE Notifications
      MODIFY COLUMN type ENUM('${values.join("','")}')
      NOT NULL
    `);
  },

  async down(queryInterface, Sequelize) {
    const values = [
      'new_enrollment',
      'expired_certificate',
      'auto_closed',
      'blog_published',
      'smtp_failure',
      'course_reminder_24h'
    ];

    if (queryInterface.sequelize.getDialect() === 'sqlite') {
      await queryInterface.changeColumn('Notifications', 'type', {
        type: Sequelize.ENUM(...values),
        allowNull: false
      });
      return;
    }

    await queryInterface.sequelize.query(`
      ALTER TABLE Notifications
      MODIFY COLUMN type ENUM('${values.join("','")}')
      NOT NULL
    `);
  }
};
