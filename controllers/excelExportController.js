const ExcelJS = require('exceljs');
const Order = require('../models/Order');
const startOfDay = require('date-fns/startOfDay');
const subDays = require('date-fns/subDays');
const subWeeks = require('date-fns/subWeeks');
const subMonths = require('date-fns/subMonths');
const format = require('date-fns/format');

const getDateRange = (period) => {
  const now = new Date();
  let startDate;
  if (period === 'daily') startDate = startOfDay(now);
  else if (period === 'weekly') startDate = subWeeks(now, 1);
  else if (period === 'monthly') startDate = subMonths(now, 1);
  else startDate = subDays(now, 7);
  return { startDate, endDate: now };
};

const getTopSellingProducts = async (period) => {
  const { startDate, endDate } = getDateRange(period);
  const orders = await Order.find({ status: 'Paid', paidAt: { $gte: startDate, $lte: endDate } });
  const productMap = new Map();
  orders.forEach(order => {
    order.items.forEach(item => {
      productMap.set(item.name, (productMap.get(item.name) || 0) + item.quantity);
    });
  });
  const top = Array.from(productMap.entries())
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);
  return top;
};

const getRevenueBreakdown = async (period) => {
  const { startDate, endDate } = getDateRange(period);
  const orders = await Order.find({ status: 'Paid', paidAt: { $gte: startDate, $lte: endDate } });
  const breakdown = new Map();
  orders.forEach(order => {
    const dateKey = format(order.paidAt, 'yyyy-MM-dd');
    breakdown.set(dateKey, (breakdown.get(dateKey) || 0) + order.totalAmount);
  });
  return Array.from(breakdown.entries()).map(([date, revenue]) => ({ date, revenue }));
};

exports.exportMostSoldProducts = async (req, res) => {
  try {
    const { period } = req.query;
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period' });
    }
    const topProducts = await getTopSellingProducts(period);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Most Sold (${period})`);
    worksheet.columns = [
      { header: 'Product Name', key: 'name', width: 30 },
      { header: 'Quantity Sold', key: 'qty', width: 15 }
    ];
    topProducts.forEach(p => worksheet.addRow(p));
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5722' } };
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=most_sold_${period}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.exportRevenueBreakdown = async (req, res) => {
  try {
    const { period } = req.query;
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period' });
    }
    const revenueData = await getRevenueBreakdown(period);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Revenue (${period})`);
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Revenue (₹)', key: 'revenue', width: 20 }
    ];
    revenueData.forEach(r => worksheet.addRow(r));
    const total = revenueData.reduce((s, r) => s + r.revenue, 0);
    worksheet.addRow({ date: 'TOTAL', revenue: total });
    worksheet.getRow(worksheet.rowCount).font = { bold: true };
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5722' } };
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=revenue_${period}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.exportFullReport = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const periods = ['daily', 'weekly', 'monthly'];
    for (const period of periods) {
      const topProducts = await getTopSellingProducts(period);
      const productSheet = workbook.addWorksheet(`Most Sold (${period})`);
      productSheet.columns = [
        { header: 'Product Name', key: 'name', width: 30 },
        { header: 'Quantity Sold', key: 'qty', width: 15 }
      ];
      topProducts.forEach(p => productSheet.addRow(p));
      productSheet.getRow(1).font = { bold: true };
      productSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5722' } };

      const revenueData = await getRevenueBreakdown(period);
      const revenueSheet = workbook.addWorksheet(`Revenue (${period})`);
      revenueSheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Revenue (₹)', key: 'revenue', width: 20 }
      ];
      revenueData.forEach(r => revenueSheet.addRow(r));
      const total = revenueData.reduce((s, r) => s + r.revenue, 0);
      revenueSheet.addRow({ date: 'TOTAL', revenue: total });
      revenueSheet.getRow(1).font = { bold: true };
      revenueSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5722' } };
    }
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=full_report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};