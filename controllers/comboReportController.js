const Order = require('../models/Order');
const ComboOffer = require('../models/ComboOffer');
const ExcelJS = require('exceljs');
const startOfDay = require('date-fns/startOfDay');
const subDays = require('date-fns/subDays');
const subWeeks = require('date-fns/subWeeks');
const subMonths = require('date-fns/subMonths');
const format = require('date-fns/format');

const getDateRange = (period) => {
  const now = new Date();
  if (period === 'daily') return { start: startOfDay(now), end: now };
  if (period === 'weekly') return { start: subWeeks(now, 1), end: now };
  if (period === 'monthly') return { start: subMonths(now, 1), end: now };
  return { start: subDays(now, 7), end: now };
};

exports.exportComboUsageReport = async (req, res) => {
  try {
    const { period } = req.query; // daily, weekly, monthly
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period' });
    }

    const { start, end } = getDateRange(period);
    const orders = await Order.find({
      status: 'Paid',
      paidAt: { $gte: start, $lte: end },
      comboApplied: { $ne: null }
    }).populate('comboApplied', 'name offerCode originalPrice totalAmount');

    // Group by combo
    const comboMap = new Map();
    for (const order of orders) {
      const comboId = order.comboApplied._id.toString();
      if (!comboMap.has(comboId)) {
        comboMap.set(comboId, {
          comboId,
          name: order.comboApplied.name,
          offerCode: order.comboApplied.offerCode,
          timesUsed: 0,
          totalRevenue: 0,
          totalOriginal: 0
        });
      }
      const entry = comboMap.get(comboId);
      entry.timesUsed += 1;
      entry.totalRevenue += order.totalAmount;
      entry.totalOriginal += order.subtotal; // original subtotal before combo discount
    }

    // Calculate average discount per combo
    const reportData = Array.from(comboMap.values()).map(combo => ({
      name: combo.name,
      offerCode: combo.offerCode,
      timesUsed: combo.timesUsed,
      totalRevenue: combo.totalRevenue,
      totalOriginal: combo.totalOriginal,
      avgDiscount: combo.totalOriginal - combo.totalRevenue,
      avgDiscountPercent: combo.totalOriginal > 0 ? ((combo.totalOriginal - combo.totalRevenue) / combo.totalOriginal * 100).toFixed(2) : 0
    }));

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Combo Usage (${period})`);

    worksheet.columns = [
      { header: 'Combo Name', key: 'name', width: 30 },
      { header: 'Offer Code', key: 'offerCode', width: 15 },
      { header: 'Times Used', key: 'timesUsed', width: 15 },
      { header: 'Total Revenue (₹)', key: 'totalRevenue', width: 20 },
      { header: 'Total Original (₹)', key: 'totalOriginal', width: 20 },
      { header: 'Avg Discount (₹)', key: 'avgDiscount', width: 18 },
      { header: 'Avg Discount (%)', key: 'avgDiscountPercent', width: 18 }
    ];

    reportData.forEach(row => worksheet.addRow(row));
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5722' } };

    // Add summary row
    const totalTimes = reportData.reduce((sum, r) => sum + r.timesUsed, 0);
    const totalRevenueAll = reportData.reduce((sum, r) => sum + r.totalRevenue, 0);
    worksheet.addRow({ name: 'TOTAL', timesUsed: totalTimes, totalRevenue: totalRevenueAll });
    worksheet.getRow(worksheet.rowCount).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=combo_usage_${period}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

