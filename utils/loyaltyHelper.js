const Order = require('../models/Order');

async function checkLoyaltyEligibility(customerId) {
  const previousOrders = await Order.find({ 
    customer: customerId,
    status: 'Paid'
  }).sort({ createdAt: -1 }).limit(30);

  if (previousOrders.length !== 30) return false;
  return previousOrders.every(order => order.totalAmount > 300);
}

module.exports = { checkLoyaltyEligibility };