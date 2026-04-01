const { Op } = require('sequelize');
const { Enrollment, Course, sequelize } = require('../../models');

class SalesAdminService {
  async getDashboardData(query) {
    const coursePerformanceLimit = 10;
    const { month, year } = query;
    const dateFilter = {};
    const currentYear = new Date().getFullYear();
    const selectedYear = parseInt(year, 10) || currentYear;
    const normalizedMonth = typeof month === 'string' ? month.trim() : '';
    const selectedMonth = normalizedMonth ? parseInt(normalizedMonth, 10) : '';

    let startDate;
    let endDate;

    if (normalizedMonth && year) {
      startDate = new Date(selectedYear, selectedMonth - 1, 1);
      endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);
      dateFilter.createdAt = { [Op.between]: [startDate, endDate] };
    } else if (year && !normalizedMonth) {
      startDate = new Date(selectedYear, 0, 1);
      endDate = new Date(selectedYear, 11, 31, 23, 59, 59);
      dateFilter.createdAt = { [Op.between]: [startDate, endDate] };
    } else {
      startDate = new Date(selectedYear, 0, 1);
      endDate = new Date(selectedYear, 11, 31, 23, 59, 59);
      dateFilter.createdAt = { [Op.between]: [startDate, endDate] };
    }

    const paidStatuses = ['confirmado', 'completo'];
    const whereClause = {
      status: { [Op.in]: paidStatuses },
      ...dateFilter
    };

    const totalRevenue = (await Enrollment.sum('finalPrice', { where: whereClause })) || 0;
    const totalSales = await Enrollment.count({ where: whereClause });

    const salesByCourse = await Enrollment.findAll({
      attributes: [
        'courseId',
        [sequelize.fn('COUNT', sequelize.col('Enrollment.id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('finalPrice')), 'revenue']
      ],
      where: whereClause,
      include: [{ model: Course, attributes: ['title'] }],
      group: ['courseId', 'Course.id', 'Course.title'],
      order: [[sequelize.literal('revenue'), 'DESC']],
      limit: coursePerformanceLimit
    });

    const recentSales = await Enrollment.findAll({
      where: whereClause,
      include: [{ model: Course, attributes: ['title'] }],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    const salesTrendRaw = await Enrollment.findAll({
      attributes: ['createdAt', 'finalPrice'],
      where: whereClause,
      order: [['createdAt', 'ASC']]
    });

    const trendMap = new Map();
    salesTrendRaw.forEach((sale) => {
      const date = new Date(sale.createdAt);
      const label = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      trendMap.set(label, (trendMap.get(label) || 0) + Number(sale.finalPrice || 0));
    });

    const salesTrend = Array.from(trendMap.entries()).map(([label, value]) => ({ label, value }));

    const years = [];
    for (let y = 2024; y <= currentYear + 1; y += 1) {
      years.push(y);
    }

    return {
      stats: {
        totalRevenue,
        totalSales,
        averageTicket: totalSales > 0 ? totalRevenue / totalSales : 0
      },
      salesByCourse: salesByCourse.map((item) => {
        const json = item.toJSON();
        return {
          title: json.Course ? json.Course.title : 'Curso Removido',
          count: item.getDataValue('count'),
          revenue: item.getDataValue('revenue')
        };
      }),
      salesTrend,
      recentSales,
      filters: {
        month: selectedMonth,
        year: selectedYear,
        years
      }
    };
  }
}

module.exports = new SalesAdminService();
