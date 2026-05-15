const Product = require('../models/Product');

exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { name, price, category, description, imageUrl } = req.body;
    let image = imageUrl || '';
    if (req.file) {
      image = `/uploads/${req.file.filename}`;
    }
    const product = new Product({
      name,
      price: Number(price),
      category,
      description: description || '',
      imageUrl: image,
      isAvailable: req.body.isAvailable === 'true' || req.body.isAvailable === true
    });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const updates = { ...req.body };
    if (req.file) {
      updates.imageUrl = `/uploads/${req.file.filename}`;
    }
    if (updates.price) updates.price = Number(updates.price);
    if (updates.isAvailable) updates.isAvailable = updates.isAvailable === 'true' || updates.isAvailable === true;
    const product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};