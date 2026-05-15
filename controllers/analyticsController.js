const Order = require('../models/Order');
const startOfDay = require('date-fns/startOfDay');
const subDays = require('date-fns/subDays');
const subWeeks = require('date-fns/subWeeks');
const subMonths = require('date-fns/subMonths');

exports.getRevenueBreakdown = async (req, res) => {
  const { period } = req.query;
  let startDate;
  const now = new Date();
  if (period === 'daily') startDate = startOfDay(now);
  else if (period === 'weekly') startDate = subWeeks(now, 1);
  else if (period === 'monthly') startDate = subMonths(now, 1);
  else startDate = subDays(now, 7);
  
  const orders = await Order.find({ status: 'Paid', paidAt: { $gte: startDate } });
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const breakdown = {};
  orders.forEach(order => {
    const key = order.paidAt.toISOString().split('T')[0];
    breakdown[key] = (breakdown[key] || 0) + order.totalAmount;
  });
  res.json({ period, totalRevenue, breakdown });
};

exports.getTopSellingItems = async (req, res) => {
  const orders = await Order.find({ status: 'Paid' });
  const itemMap = new Map();
  orders.forEach(order => {
    order.items.forEach(item => {
      itemMap.set(item.name, (itemMap.get(item.name) || 0) + item.quantity);
    });
  });
  const top = Array.from(itemMap.entries())
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);
  res.json(top);
};