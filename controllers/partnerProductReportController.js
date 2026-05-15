const Order = require('../models/Order');
const ExcelJS = require('exceljs');
const startOfDay = require('date-fns/startOfDay');
const subDays = require('date-fns/subDays');
const subWeeks = require('date-fns/subWeeks');
const subMonths = require('date-fns/subMonths');
const format = require('date-fns/format');

const getDateRange = (period) => {
  const now = new Date();
  if (period === 'daily') return { startDate: startOfDay(now), endDate: now };
  if (period === 'weekly') return { startDate: subWeeks(now, 1), endDate: now };
  if (period === 'monthly') return { startDate: subMonths(now, 1), endDate: now };
  return { startDate: subDays(now, 7), endDate: now };
};

exports.exportTopProductsByPartner = async (req, res) => {
  try {
    const { period, partner } = req.query; // period: daily/weekly/monthly, partner: Swiggy/Zomato
    if (!['daily', 'weekly', 'monthly'].includes(period) || !['Swiggy', 'Zomato'].includes(partner)) {
      return res.status(400).json({ error: 'Invalid period or partner' });
    }

    const { startDate, endDate } = getDateRange(period);
    const orders = await Order.find({
      status: 'Paid',
      deliveryPartner: partner,
      paidAt: { $gte: startDate, $lte: endDate }
    });

    const productMap = new Map();
    orders.forEach(order => {
      order.items.forEach(item => {
        const name = item.name;
        productMap.set(name, (productMap.get(name) || 0) + item.quantity);
      });
    });

    const topProducts = Array.from(productMap.entries())
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 20); // top 20

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${partner} Top Products (${period})`);
    worksheet.columns = [
      { header: 'Product Name', key: 'name', width: 30 },
      { header: 'Quantity Sold', key: 'qty', width: 15 }
    ];
    topProducts.forEach(p => worksheet.addRow(p));
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5722' } };

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${partner}_top_products_${period}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};