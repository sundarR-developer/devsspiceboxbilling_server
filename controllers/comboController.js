const ComboOffer = require('../models/ComboOffer');

// Get all combos that are still valid (active, not expired, uses left)
exports.getAllCombos = async (req, res) => {
  try {
    const now = new Date();
    const combos = await ComboOffer.find({
      isActive: true,
      $or: [
        { validUntilDate: { $gt: now } },
        { validUntilDate: null }
      ]
    }).populate('products.productId', 'name price');

    // Filter by usage limit after fetching (because MongoDB $expr is tricky)
    const validCombos = combos.filter(combo => {
      if (combo.maxUses && combo.usedCount >= combo.maxUses) return false;
      return true;
    });
    res.json(validCombos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a new combo
exports.createCombo = async (req, res) => {
  try {
    const combo = new ComboOffer(req.body);
    await combo.save();
    res.status(201).json(combo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a combo
exports.updateCombo = async (req, res) => {
  try {
    const combo = await ComboOffer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!combo) return res.status(404).json({ error: 'Combo not found' });
    res.json(combo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a combo
exports.deleteCombo = async (req, res) => {
  try {
    await ComboOffer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Combo deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Increment usage count (called when combo is used in an order)
exports.incrementComboUsage = async (comboId) => {
  await ComboOffer.findByIdAndUpdate(comboId, { $inc: { usedCount: 1 } });
};