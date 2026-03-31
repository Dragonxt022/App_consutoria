'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Notifications', 'adminUserId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    await queryInterface.addIndex('Notifications', ['adminUserId', 'isRead', 'createdAt'], {
      name: 'notifications_admin_read_created_idx'
    });

    const [admins] = await queryInterface.sequelize.query(`
      SELECT id
      FROM Users
      WHERE role = 'admin' AND active = 1
    `);

    const [notifications] = await queryInterface.sequelize.query(`
      SELECT id, type, title, message, link, dedupeKey, metadata, isRead, readAt, createdAt, updatedAt
      FROM Notifications
      WHERE adminUserId IS NULL
    `);

    if (admins.length && notifications.length) {
      const duplicatedRows = [];

      for (const notification of notifications) {
        for (const admin of admins) {
          duplicatedRows.push({
            type: notification.type,
            title: notification.title,
            message: notification.message,
            link: notification.link,
            dedupeKey: notification.dedupeKey,
            metadata: notification.metadata,
            adminUserId: admin.id,
            isRead: notification.isRead,
            readAt: notification.readAt,
            createdAt: notification.createdAt,
            updatedAt: notification.updatedAt
          });
        }
      }

      if (duplicatedRows.length) {
        await queryInterface.bulkInsert('Notifications', duplicatedRows);
      }
    }

    await queryInterface.sequelize.query(`
      DELETE FROM Notifications
      WHERE adminUserId IS NULL
    `);

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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('Notifications', 'notifications_admin_read_created_idx');
    await queryInterface.removeColumn('Notifications', 'adminUserId');
  }
};
