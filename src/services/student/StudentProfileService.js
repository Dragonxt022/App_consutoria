const fs = require('fs');
const { User, Enrollment, Course } = require('../../models');
const { resolveUploadUrlToPath } = require('../../utils/UploadPaths');
const { resolveCourseStatus } = require('../../utils/CourseStatus');

class StudentProfileService {
  removeAvatarIfNeeded(avatarUrl) {
    if (!avatarUrl || !avatarUrl.startsWith('/uploads/avatars/')) {
      return;
    }

    const avatarPath = resolveUploadUrlToPath(avatarUrl);
    if (!avatarPath || !fs.existsSync(avatarPath)) {
      return;
    }

    try {
      fs.unlinkSync(avatarPath);
    } catch (error) {
      console.warn('Não foi possível remover avatar antigo:', error.message || error);
    }
  }

  async getStudentUser(userId) {
    return User.findByPk(userId);
  }

  async getStudentEnrollments(userId) {
    const enrollments = await Enrollment.findAll({
      where: { userId },
      include: [{ model: Course }],
      order: [['createdAt', 'DESC']]
    });

    const now = new Date();

    return enrollments.map((enrollment) => {
      if (enrollment.Course) {
        const status = resolveCourseStatus(enrollment.Course.toJSON(), now);
        enrollment.Course.setDataValue('statusCode', status.code);
        enrollment.Course.setDataValue('statusLabel', status.label);
        enrollment.Course.setDataValue('isExpired', status.isExpired);
      }

      return enrollment;
    });
  }

  getStudentStats(enrollments) {
    return {
      totalCourses: enrollments.length,
      totalCertificates: enrollments.filter((enrollment) => enrollment.status === 'completo').length,
      totalInProgress: enrollments.filter((enrollment) => ['pendente', 'confirmado'].includes(enrollment.status)).length
    };
  }

  async getProfileData(userId) {
    const user = await this.getStudentUser(userId);
    if (!user) {
      return null;
    }

    const enrollments = await this.getStudentEnrollments(user.id);

    return {
      user,
      enrollments,
      stats: this.getStudentStats(enrollments)
    };
  }

  async updateAvatar(userId, file) {
    const user = await this.getStudentUser(userId);

    if (!user) {
      return null;
    }

    const oldAvatar = user.avatar;

    if (file) {
      user.avatar = `/uploads/avatars/${file.filename}`;
    }

    await user.save();

    if (file && oldAvatar && oldAvatar !== user.avatar) {
      this.removeAvatarIfNeeded(oldAvatar);
    }

    return user;
  }

  async changePassword(userId, body) {
    const user = await this.getStudentUser(userId);

    if (!user) {
      return { notFound: true };
    }

    const isPasswordCorrect = await user.checkPassword(body.currentPassword);
    if (!isPasswordCorrect) {
      return { error: 'Senha atual incorreta' };
    }

    if (body.newPassword !== body.confirmPassword) {
      return { error: 'As senhas não coincidem' };
    }

    if (!body.newPassword || body.newPassword.length < 6) {
      return { error: 'A nova senha deve ter no mínimo 6 caracteres' };
    }

    user.password = body.newPassword;
    await user.save();

    return { notFound: false, user };
  }
}

module.exports = new StudentProfileService();
