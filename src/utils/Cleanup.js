const { User, Enrollment, Course, Notification } = require('../models');
const { Op } = require('sequelize');
const { NotificationService, EmailService, SiteSettingsService } = require('../services');

function getAppBaseUrl() {
  const configuredBaseUrl = process.env.APP_URL;
  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/+$/, '');
  }

  return `http://127.0.0.1:${process.env.PORT || 3000}`;
}

async function sendUpcomingCourseReminders24h() {
  try {
    const settings = await SiteSettingsService.getSettings();

    if (String(settings.email_notify_student_course_reminder_24h || 'false') !== 'true') {
      return;
    }

    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const courses = await Course.findAll({
      where: {
        active: true,
        startDate: {
          [Op.gt]: now,
          [Op.lte]: next24h
        }
      }
    });

    for (const course of courses) {
      const dedupeKey = `course-reminder-24h:${course.id}:${new Date(course.startDate).toISOString()}`;
      const existingNotification = await Notification.findOne({
        where: { dedupeKey }
      });

      if (existingNotification) {
        continue;
      }

      const enrollments = await Enrollment.findAll({
        where: {
          courseId: course.id,
          status: {
            [Op.ne]: 'cancelado'
          }
        },
        attributes: ['studentEmail']
      });

      const recipients = enrollments.map((enrollment) => enrollment.studentEmail).filter(Boolean);
      if (!recipients.length) {
        continue;
      }

      const result = await EmailService.sendCourseReminder24hToStudents({
        recipients,
        course,
        dashboardUrl: `${getAppBaseUrl()}/aluno/dashboard`
      });

      if (result.sent > 0) {
        await NotificationService.createCourseReminder24hNotification({
          course,
          attemptedRecipients: result.attempted,
          sentRecipients: result.sent
        });
      }
    }
  } catch (error) {
    console.error('COURSE REMINDER 24H ERROR:', error);
  }
}

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

  await sendUpcomingCourseReminders24h();
}

module.exports = cleanupUnconfirmed;
