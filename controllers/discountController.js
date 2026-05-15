const Discount = require('../models/Discount');

// Get all discounts
exports.getAllDiscounts = async (req, res) => {
  try {
    const discounts = await Discount.find().sort({ createdAt: -1 });
    res.json(discounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a new discount
exports.createDiscount = async (req, res) => {
  try {
    const { name, type, value, minOrderAmount, startDate, endDate, isActive } = req.body;
    const discount = new Discount({ name, type, value, minOrderAmount, startDate, endDate, isActive });
    await discount.save();
    res.status(201).json(discount);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a discount
exports.updateDiscount = async (req, res) => {
  try {
    const discount = await Discount.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!discount) return res.status(404).json({ error: 'Discount not found' });
    res.json(discount);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a discount
exports.deleteDiscount = async (req, res) => {
  try {
    const discount = await Discount.findByIdAndDelete(req.params.id);
    if (!discount) return res.status(404).json({ error: 'Discount not found' });
    res.json({ message: 'Discount deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Apply discount to a total amount (used in order creation)
exports.applyDiscount = async (discountCode, totalAmount) => {
  const discount = await Discount.findOne({ name: discountCode, isActive: true });
  if (!discount) return { discountApplied: false, newTotal: totalAmount, discountObj: null };
  if (discount.minOrderAmount > 0 && totalAmount < discount.minOrderAmount) {
    return { discountApplied: false, newTotal: totalAmount, discountObj: null };
  }
  let newTotal = totalAmount;
  if (discount.type === 'percentage') {
    newTotal = totalAmount - (totalAmount * discount.value / 100);
  } else {
    newTotal = Math.max(0, totalAmount - discount.value);
  }
  return { discountApplied: true, newTotal, discountObj: discount };
};