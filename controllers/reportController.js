const Order = require('../models/Order');
const ExcelJS = require('exceljs');
const startOfDay = require('date-fns/startOfDay');
const subDays = require('date-fns/subDays');
const subWeeks = require('date-fns/subWeeks');
const subMonths = require('date-fns/subMonths');
const format = require('date-fns/format');

// Helper: date range
const getDateRange = (period) => {
  const now = new Date();
  let startDate;
  if (period === 'daily') startDate = startOfDay(now);
  else if (period === 'weekly') startDate = subWeeks(now, 1);
  else if (period === 'monthly') startDate = subMonths(now, 1);
  else startDate = subDays(now, 7);
  return { startDate, endDate: now };
};

// Generate report data
const getReportData = async (period) => {
  const { startDate, endDate } = getDateRange(period);
  const orders = await Order.find({
    status: 'Paid',
    paidAt: { $gte: startDate, $lte: endDate }
  });

  let cashTotal = 0;
  let onlineTotal = 0;
  let swiggyTotal = 0;
  let zomatoTotal = 0;
  let swiggyOrders = [];
  let zomatoOrders = [];

  orders.forEach(order => {
    if (order.paymentMethod === 'Cash') {
      cashTotal += order.totalAmount;
    } else if (order.paymentMethod === 'Online') {
      onlineTotal += order.totalAmount;
    }

    if (order.deliveryPartner === 'Swiggy') {
      swiggyTotal += order.totalAmount;
      swiggyOrders.push(order);
    } else if (order.deliveryPartner === 'Zomato') {
      zomatoTotal += order.totalAmount;
      zomatoOrders.push(order);
    }
  });

  return {
    period,
    startDate,
    endDate,
    cashTotal,
    onlineTotal,
    swiggyTotal,
    zomatoTotal,
    swiggyOrders,
    zomatoOrders,
    allOrders: orders
  };
};

// Export main report (Cash vs Online)
exports.exportPaymentReport = async (req, res) => {
  try {
    const { period } = req.query; // daily, weekly, monthly
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period' });
    }
    const data = await getReportData(period);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Payment Report (${period})`);

    worksheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Amount (₹)', key: 'amount', width: 20 }
    ];
    worksheet.addRow({ metric: 'Cash Total', amount: data.cashTotal });
    worksheet.addRow({ metric: 'Online Total', amount: data.onlineTotal });
    worksheet.addRow({ metric: 'Total Revenue', amount: data.cashTotal + data.onlineTotal });
    worksheet.addRow({ metric: 'Period Start', amount: format(data.startDate, 'yyyy-MM-dd HH:mm') });
    worksheet.addRow({ metric: 'Period End', amount: format(data.endDate, 'yyyy-MM-dd HH:mm') });

    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=payment_report_${period}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Export Swiggy/Zomato report
exports.exportPartnerReport = async (req, res) => {
  try {
    const { period } = req.query;
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period' });
    }
    const data = await getReportData(period);
    const workbook = new ExcelJS.Workbook();

    // Swiggy sheet
    const swiggySheet = workbook.addWorksheet('Swiggy Orders');
    swiggySheet.columns = [
      { header: 'Order ID', key: 'id', width: 30 },
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Customer', key: 'customer', width: 25 },
      { header: 'Items', key: 'items', width: 40 },
      { header: 'Total (₹)', key: 'total', width: 15 }
    ];
    data.swiggyOrders.forEach(order => {
      swiggySheet.addRow({
        id: order._id,
        date: format(order.paidAt, 'yyyy-MM-dd HH:mm'),
        customer: `${order.customer.name} (${order.customer.phone})`,
        items: order.items.map(i => `${i.name} x${i.quantity}`).join(', '),
        total: order.totalAmount
      });
    });
    swiggySheet.addRow({ id: 'TOTAL', total: data.swiggyTotal });

    // Zomato sheet
    const zomatoSheet = workbook.addWorksheet('Zomato Orders');
    zomatoSheet.columns = [
      { header: 'Order ID', key: 'id', width: 30 },
      { header: 'Date', key: 'date', width: 20 },
      { header: 'Customer', key: 'customer', width: 25 },
      { header: 'Items', key: 'items', width: 40 },
      { header: 'Total (₹)', key: 'total', width: 15 }
    ];
    data.zomatoOrders.forEach(order => {
      zomatoSheet.addRow({
        id: order._id,
        date: format(order.paidAt, 'yyyy-MM-dd HH:mm'),
        customer: `${order.customer.name} (${order.customer.phone})`,
        items: order.items.map(i => `${i.name} x${i.quantity}`).join(', '),
        total: order.totalAmount
      });
    });
    zomatoSheet.addRow({ id: 'TOTAL', total: data.zomatoTotal });

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=partner_report_${period}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};