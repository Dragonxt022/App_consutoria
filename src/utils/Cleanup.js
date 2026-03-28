const { User, Enrollment, Course } = require('../models');
const { Op } = require('sequelize');
const { NotificationService } = require('../services');

async function cleanupUnconfirmed() {
  try {
    const now = new Date();
    
    // Find users whose confirmation expired and are still inactive
    const expiredUsers = await User.findAll({
      where: {
        active: false,
        confirmationExpires: { [Op.lt]: now }
      }
    });

    if (expiredUsers.length > 0) {
      const userIds = expiredUsers.map(u => u.id);
      const removedEnrollments = await Enrollment.count({
        where: { userId: userIds }
      });
      
      // Delete enrollments for these users
      await Enrollment.destroy({
        where: { userId: userIds },
        force: true
      });

      // Delete the users
      await User.destroy({
        where: { id: userIds }
      });

      try {
        await NotificationService.createAutoClosedNotification({
          removedUsers: expiredUsers.length,
          removedEnrollments
        });
      } catch (error) {
        console.error('CLEANUP NOTIFICATION ERROR:', error);
      }

      console.log(`CLEANUP: Removed ${expiredUsers.length} unconfirmed users and their enrollments.`);
    }
  } catch (error) {
    console.error('CLEANUP ERROR:', error);
  }
}

module.exports = cleanupUnconfirmed;
