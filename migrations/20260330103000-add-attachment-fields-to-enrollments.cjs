'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Enrollments', 'enrollmentAttachmentPath', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('Enrollments', 'enrollmentAttachmentOriginalName', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('Enrollments', 'enrollmentAttachmentMimeType', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('Enrollments', 'enrollmentAttachmentSize', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await queryInterface.addColumn('Enrollments', 'enrollmentAttachmentUploadedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Enrollments', 'enrollmentAttachmentUploadedAt');
    await queryInterface.removeColumn('Enrollments', 'enrollmentAttachmentSize');
    await queryInterface.removeColumn('Enrollments', 'enrollmentAttachmentMimeType');
    await queryInterface.removeColumn('Enrollments', 'enrollmentAttachmentOriginalName');
    await queryInterface.removeColumn('Enrollments', 'enrollmentAttachmentPath');
  }
};
