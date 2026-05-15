const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  type: { type: String, enum: ['percentage', 'fixed'], required: true },
  value: { type: Number, required: true }, // e.g., 10 for 10%, or 50 for ₹50 off
  minOrderAmount: { type: Number, default: 0 },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, default: null },
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('Discount', discountSchema);