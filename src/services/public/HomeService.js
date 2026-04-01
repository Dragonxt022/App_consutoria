const { Op } = require('sequelize');
const { Course, User, Enrollment, Product, Setting, BlogPost, BlogCategory } = require('../../models');
const { formatCurrency } = require('../../utils/CurrencyFormatter');
const { parseMoneyValue } = require('../../utils/Money');
const { resolveCourseStatus } = require('../../utils/CourseStatus');
const { ProductFormatter } = require('../shared');
const StudentAttachmentService = require('../student/StudentAttachmentService');
const { formatProduct } = ProductFormatter;

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseHomeBanners(rawValue) {
  if (!rawValue) return [];

  try {
    const parsed = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((banner) => banner && banner.imageUrl)
      .map((banner, index) => ({
        id: banner.id || `banner-${index + 1}`,
        name: banner.name || `Banner ${index + 1}`,
        imageUrl: banner.imageUrl,
        link: banner.link || '',
        newTab: banner.newTab === true || banner.newTab === 'true'
      }))
      .slice(0, 6);
  } catch (error) {
    console.error('Erro ao carregar banners da home:', error);
    return [];
  }
}

function serializeCourse(course, now = new Date()) {
  const data = course.toJSON();
  const priceValue = parseMoneyValue(data.price);
  const status = resolveCourseStatus(data, now);

  return {
    ...data,
    price: priceValue,
    priceValue,
    priceDisplay: formatCurrency(priceValue),
    priceInputValue: priceValue.toFixed(2),
    descriptionPlain: stripHtml(data.description),
    isExpired: status.isExpired,
    statusCode: status.code,
    statusLabel: status.label
  };
}

class HomeService {
  async getHomePageData() {
    const [courses, featuredProducts, homeBannersSetting, latestBlogPosts] = await Promise.all([
      Course.findAll({
        where: { active: true },
        order: [['startDate', 'ASC']]
      }),
      Product.findAll({
        where: { active: true, featured: true },
        order: [['createdAt', 'DESC']],
        limit: 3
      }),
      Setting.findOne({ where: { key: 'home_banners' } }),
      BlogPost.findAll({
        where: { status: 'publicado' },
        include: [{ model: BlogCategory, as: 'category' }],
        order: [['publishedAt', 'DESC'], ['createdAt', 'DESC']],
        limit: 3
      })
    ]);

    const now = new Date();

    return {
      courses: courses.map((course) => serializeCourse(course, now)),
      featuredProducts: featuredProducts.map((product) => formatProduct(product)),
      latestBlogPosts,
      homeBanners: parseHomeBanners(homeBannersSetting ? homeBannersSetting.value : '[]')
    };
  }

  async getAdminDashboardData(query = {}) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const { month, year } = query;
    const normalizedMonth = typeof month === 'string' ? month.trim() : '';
    const selectedYear = parseInt(year, 10) || currentYear;
    const selectedMonth = normalizedMonth ? parseInt(normalizedMonth, 10) : '';
    const revenueWhere = {
      status: ['confirmado', 'completo']
    };

    if (selectedMonth) {
      revenueWhere.createdAt = {
        [Op.gte]: new Date(selectedYear, selectedMonth - 1, 1),
        [Op.lt]: new Date(selectedYear, selectedMonth, 1)
      };
    } else {
      revenueWhere.createdAt = {
        [Op.gte]: new Date(selectedYear, 0, 1),
        [Op.lt]: new Date(selectedYear + 1, 0, 1)
      };
    }

    const years = [];
    for (let y = 2024; y <= currentYear + 1; y += 1) {
      years.push(y);
    }

    const [
      courseCount,
      activeCourseCount,
      studentCount,
      pendingEnrollmentCount,
      confirmedSalesCount,
      activeProductCount,
      featuredProductCount,
      monthlyRevenue,
      recentEnrollments
    ] = await Promise.all([
      Course.count(),
      Course.count({ where: { active: true } }),
      User.count({ where: { role: 'aluno' } }),
      Enrollment.count({ where: { status: 'pendente' } }),
      Enrollment.count({ where: { status: ['confirmado', 'completo'] } }),
      Product.count({ where: { active: true } }),
      Product.count({ where: { active: true, featured: true } }),
      Enrollment.sum('finalPrice', {
        where: revenueWhere
      }),
      Enrollment.findAll({
        include: [{ model: Course, attributes: ['title'] }],
        order: [['createdAt', 'DESC']],
        limit: 5
      })
    ]);

    return {
      stats: {
        courses: courseCount,
        activeCourses: activeCourseCount,
        students: studentCount,
        enrollments: pendingEnrollmentCount,
        confirmedSales: confirmedSalesCount,
        products: activeProductCount,
        featuredProducts: featuredProductCount,
        monthlyRevenue: monthlyRevenue || 0
      },
      recentEnrollments,
      filters: {
        month: selectedMonth,
        year: selectedYear,
        years
      }
    };
  }

  async getStudentDashboardData(userId) {
    const [enrollments, attachmentData] = await Promise.all([
      Enrollment.findAll({
        where: { userId },
        include: [{ model: Course }],
        order: [['createdAt', 'DESC']]
      }),
      StudentAttachmentService.getVisibleAttachments(userId)
    ]);

    const now = new Date();
    const normalizedEnrollments = enrollments.map((enrollment) => {
      if (enrollment.Course) {
        const status = resolveCourseStatus(enrollment.Course.toJSON(), now);
        enrollment.Course.setDataValue('statusCode', status.code);
        enrollment.Course.setDataValue('statusLabel', status.label);
        enrollment.Course.setDataValue('isExpired', status.isExpired);
      }

      enrollment.setDataValue('hasEnrollmentAttachment', Boolean(enrollment.enrollmentAttachmentPath));

      return enrollment;
    });

    const totalCourses = normalizedEnrollments.length;
    const certificateCount = normalizedEnrollments.filter((item) => item.status === 'completo').length;
    const inProgressCount = normalizedEnrollments.filter((item) => ['pendente', 'confirmado'].includes(item.status)).length;
    const confirmedCount = normalizedEnrollments.filter((item) => item.Course?.statusCode === 'confirmado').length;
    const recentAttachmentWindow = 14 * 24 * 60 * 60 * 1000;
    const recentAttachments = (attachmentData?.attachments || []).filter((attachment) => {
      const createdAt = new Date(attachment.createdAt).getTime();
      return Number.isFinite(createdAt) && (Date.now() - createdAt) <= recentAttachmentWindow;
    });
    const latestAttachment = recentAttachments[0] || null;

    return {
      enrollments: normalizedEnrollments,
      certificateCount,
      attachmentNotice: latestAttachment ? {
        latestId: latestAttachment.id,
        count: recentAttachments.length,
        latestTitle: latestAttachment.title,
        latestUrl: `/meus-arquivos/${latestAttachment.id}`
      } : null,
      stats: {
        totalCourses,
        certificateCount,
        inProgressCount,
        confirmedCount
      }
    };
  }
}

module.exports = new HomeService();
