const { User, Enrollment, Course } = require('../models');
const { Op } = require('sequelize');

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
      
      // Delete enrollments for these users
      await Enrollment.destroy({
        where: { userId: userIds }
      });

      // Delete the users
      await User.destroy({
        where: { id: userIds }
      });

      console.log(`CLEANUP: Removed ${expiredUsers.length} unconfirmed users and their enrollments.`);
    }
  } catch (error) {
    console.error('CLEANUP ERROR:', error);
  }
}

module.exports = cleanupUnconfirmed;
