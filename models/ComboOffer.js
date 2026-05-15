const mongoose = require('mongoose');

const comboSchema = new mongoose.Schema({
  offerCode: { type: String, required: true, unique: true, uppercase: true },
  name: { type: String, required: true },
  description: String,
  originalPrice: { type: Number, default: 0 },
  discountedPrice: { type: Number, required: true },
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, default: 1 }
  }],
  validUntilDate: { type: Date, default: null },
  maxUses: { type: Number, default: null },
  usedCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Pre‑save: auto‑calculate original price if not manually set
comboSchema.pre('save', async function(next) {
  if (this.originalPrice === 0 && this.products.length) {
    const Product = mongoose.model('Product');
    let total = 0;
    for (let item of this.products) {
      const product = await Product.findById(item.productId);
      if (product) total += product.price * item.quantity;
    }
    this.originalPrice = total;
  }
  next();
});

module.exports = mongoose.model('ComboOffer', comboSchema);