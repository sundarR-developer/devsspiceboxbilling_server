const Order = require('../models/Order');
const Customer = require('../models/Customer');
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

exports.exportCustomerReport = async (req, res) => {
  try {
    const { period } = req.query; // daily, weekly, monthly
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period' });
    }

    const { start, end } = getDateRange(period);

    // Find all orders in the period, group by customer phone
    const ordersInPeriod = await Order.find({
      status: 'Paid',
      paidAt: { $gte: start, $lte: end },
      'customer.phone': { $ne: '' }
    }).select('customer.phone customer.name totalAmount');

    // Aggregate customer data
    const customerMap = new Map();
    for (const order of ordersInPeriod) {
      const phone = order.customer.phone;
      if (!customerMap.has(phone)) {
        customerMap.set(phone, {
          phone,
          name: order.customer.name,
          ordersCount: 0,
          totalSpent: 0
        });
      }
      const entry = customerMap.get(phone);
      entry.ordersCount += 1;
      entry.totalSpent += order.totalAmount;
    }

    // Convert to array and sort by total spent descending
    const customers = Array.from(customerMap.values()).sort((a, b) => b.totalSpent - a.totalSpent);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Customer Report (${period})`);

    worksheet.columns = [
      { header: 'Phone', key: 'phone', width: 25 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Orders Count', key: 'ordersCount', width: 15 },
      { header: 'Total Spent (₹)', key: 'totalSpent', width: 20 }
    ];

    customers.forEach(c => worksheet.addRow(c));
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5722' } };

    // Summary row
    const totalCustomers = customers.length;
    const totalOrders = customers.reduce((sum, c) => sum + c.ordersCount, 0);
    const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
    worksheet.addRow({ phone: 'TOTAL', ordersCount: totalOrders, totalSpent: totalRevenue });
    worksheet.getRow(worksheet.rowCount).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=customer_report_${period}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};