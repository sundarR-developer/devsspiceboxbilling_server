const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  phone: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  totalOrders: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  lastOrderDate: Date
});

module.exports = mongoose.model('Customer', customerSchema);