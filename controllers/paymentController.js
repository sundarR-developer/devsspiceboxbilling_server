const Order = require('../models/Order');
const Table = require('../models/Table');

exports.processPayment = async (req, res) => {
  try {
    const { orderId, paymentMethod, customerName, customerPhone } = req.body;
    
    // Validate allowed payment methods based on order type – frontend already restricts, but double-check
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    const allowedMethods = order.orderType === 'Online' ? ['Online'] : ['Cash', 'UPI'];
    if (!allowedMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: `Invalid payment method for ${order.orderType}` });
    }
    
    order.status = 'Paid';
    order.paidAt = new Date();
    order.paymentMethod = paymentMethod;
    if (customerName) order.customer.name = customerName;
    if (customerPhone) order.customer.phone = customerPhone;
    await order.save();
    
    if (order.orderType === 'Dine-in' && order.tableNumber) {
      await Table.findOneAndUpdate(
        { tableNumber: order.tableNumber },
        { status: 'Free', currentOrderId: null }
      );
    }
    
    res.json({ message: 'Payment successful', order });
  } catch (err) {
    console.error('Payment error:', err);
    res.status(500).json({ error: err.message });
  }
};