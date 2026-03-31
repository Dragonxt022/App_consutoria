'use strict';

const ACTIVE_NOTIFICATION_TYPES = [
  'new_enrollment',
  'expired_certificate',
  'blog_published',
  'smtp_failure',
  'course_reminder_24h',
  'enrollment_attachment_received'
];

const PREVIOUS_NOTIFICATION_TYPES = [
  'new_enrollment',
  'expired_certificate',
  'auto_closed',
  'blog_published',
  'smtp_failure',
  'course_reminder_24h',
  'enrollment_attachment_received'
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Notifications', { type: 'auto_closed' });

    await queryInterface.changeColumn('Notifications', 'type', {
      type: Sequelize.ENUM(...ACTIVE_NOTIFICATION_TYPES),
      allowNull: false
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Notifications', 'type', {
      type: Sequelize.ENUM(...PREVIOUS_NOTIFICATION_TYPES),
      allowNull: false
    });
  }
};
