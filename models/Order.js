const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderType: { type: String, enum: ['Dine-in', 'Takeaway', 'Online'], required: true },
  tableNumber: { type: Number, default: null },
  deliveryPartner: { type: String, enum: ['Swiggy', 'Zomato', null], default: null },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    quantity: Number,
    unitPrice: Number,
    total: Number,
    isNew: { type: Boolean, default: false }   // Flag for newly added items
  }],
  comboApplied: { type: mongoose.Schema.Types.ObjectId, ref: 'ComboOffer', default: null },
  discountApplied: { type: mongoose.Schema.Types.ObjectId, ref: 'Discount', default: null },
  subtotal: Number,
  tax: { type: Number, default: 0 },
  totalAmount: Number,
  status: { type: String, enum: ['Pending', 'Preparing', 'Ready', 'Paid'], default: 'Pending' },
  paymentMethod: { type: String, enum: ['Cash', 'UPI', 'Online', null], default: null },
  customer: {
    name: String,
    phone: String
  },
  loyaltyApplied: { type: Boolean, default: false },
  razorpayOrderId: { type: String, default: null },
  razorpayPaymentId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  paidAt: Date
});

module.exports = mongoose.model('Order', orderSchema);