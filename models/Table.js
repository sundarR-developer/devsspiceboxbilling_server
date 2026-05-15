const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  tableNumber: { type: Number, unique: true, required: true },
  status: { type: String, enum: ['Free', 'Occupied'], default: 'Free' },
  currentOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null }
});

module.exports = mongoose.model('Table', tableSchema);