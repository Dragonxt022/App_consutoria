const { Enrollment, Course, sequelize } = require('../models');
const { Op } = require('sequelize');

class SalesController {
  async index(req, res) {
    try {
      // Date filtering
      const { month, year } = req.query;
      const dateFilter = {};
      const currentYear = new Date().getFullYear();
      const selectedYear = parseInt(year) || currentYear;
      const currentMonth = new Date().getMonth() + 1;
      const selectedMonth = parseInt(month) || currentMonth; // Default to current month if not specified? Or maybe showing all is better? User asked for filter, so let's default to current month for dashboard view initially? Or let's just make it clear.
      
      // Let's implement logic: If month/year provided use them. If not, maybe show all time? 
      // User asked: "Coloque filtro de data, exemplo < Fevereiro > < 2026 > Tela de vendas precisamos ter esse controle"
      // This implies defaults might be useful. Let's default to current month/year if nothing is selected, or handle "all time" if needed.
      // For a dashboard, "Current Month" is a good default.
      
      let startDate, endDate;
      
      if (month && year) {
          startDate = new Date(selectedYear, selectedMonth - 1, 1);
          endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59); // End of month
          dateFilter.createdAt = { [Op.between]: [startDate, endDate] };
      } else if (year && !month) {
          startDate = new Date(selectedYear, 0, 1);
          endDate = new Date(selectedYear, 11, 31, 23, 59, 59);
          dateFilter.createdAt = { [Op.between]: [startDate, endDate] };
      } else {
           // Default: Current Month of Current Year
           startDate = new Date(selectedYear, selectedMonth - 1, 1);
           endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);
           dateFilter.createdAt = { [Op.between]: [startDate, endDate] };
      }

      const paidStatuses = ['confirmado', 'completo'];
      const whereClause = {
          status: { [Op.in]: paidStatuses },
          ...dateFilter
      };

      // Total Revenue
      const revenueResult = await Enrollment.sum('finalPrice', {
        where: whereClause
      });
      const totalRevenue = revenueResult || 0;

      // Count Sales
      const totalSales = await Enrollment.count({
        where: whereClause
      });

      // Sales by Course
      const salesByCourse = await Enrollment.findAll({
        attributes: [
          'courseId',
          [sequelize.fn('COUNT', sequelize.col('Enrollment.id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('finalPrice')), 'revenue']
        ],
        where: whereClause,
        include: [{ model: Course, attributes: ['title'] }],
        group: ['courseId', 'Course.id', 'Course.title'],
        order: [[sequelize.literal('revenue'), 'DESC']]
      });

      // Recent Sales (in the selected period)
      const recentSales = await Enrollment.findAll({
        where: whereClause,
        include: [{ model: Course, attributes: ['title'] }],
        order: [['createdAt', 'DESC']],
        limit: 10
      });

      // Prepare years list for filter
      const years = [];
      for(let y = 2024; y <= currentYear + 1; y++) years.push(y);

      res.render('admin/sales/dashboard', {
        title: 'Dashboard de Vendas',
        user: req.user,
        stats: {
          totalRevenue,
          totalSales,
          averageTicket: totalSales > 0 ? totalRevenue / totalSales : 0
        },
        salesByCourse: salesByCourse.map(s => {
            const json = s.toJSON();
            return {
                title: json.Course ? json.Course.title : 'Curso Removido',
                count: s.getDataValue('count'),
                revenue: s.getDataValue('revenue')
            };
        }),
        recentSales,
        filters: {
            month: selectedMonth,
            year: selectedYear,
            years
        },
        layout: 'admin/layout'
      });

    } catch (error) {
      console.error(error);
      res.redirect('/admin/dashboard?error=Erro ao carregar vendas');
    }
  }
}

module.exports = new SalesController();
