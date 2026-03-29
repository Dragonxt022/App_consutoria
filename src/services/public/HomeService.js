const { Op } = require('sequelize');
const { Course, User, Enrollment, Product, Setting, BlogPost, BlogCategory } = require('../../models');
const { formatCurrency } = require('../../utils/CurrencyFormatter');
const { parseMoneyValue } = require('../../utils/Money');
const { resolveCourseStatus } = require('../../utils/CourseStatus');
const { ProductFormatter } = require('../shared');
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
        limit: 4
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

  async getAdminDashboardData() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

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
        where: {
          status: ['confirmado', 'completo'],
          createdAt: {
            [Op.gte]: monthStart,
            [Op.lt]: nextMonthStart
          }
        }
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
      recentEnrollments
    };
  }

  async getStudentDashboardData(userId) {
    const enrollments = await Enrollment.findAll({
      where: { userId },
      include: [{ model: Course }],
      order: [['createdAt', 'DESC']]
    });

    const now = new Date();
    const normalizedEnrollments = enrollments.map((enrollment) => {
      if (enrollment.Course) {
        const status = resolveCourseStatus(enrollment.Course.toJSON(), now);
        enrollment.Course.setDataValue('statusCode', status.code);
        enrollment.Course.setDataValue('statusLabel', status.label);
        enrollment.Course.setDataValue('isExpired', status.isExpired);
      }

      return enrollment;
    });

    const totalCourses = normalizedEnrollments.length;
    const certificateCount = normalizedEnrollments.filter((item) => item.status === 'completo').length;
    const inProgressCount = normalizedEnrollments.filter((item) => ['pendente', 'confirmado'].includes(item.status)).length;
    const confirmedCount = normalizedEnrollments.filter((item) => item.Course?.statusCode === 'confirmado').length;

    return {
      enrollments: normalizedEnrollments,
      certificateCount,
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
