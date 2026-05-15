// backend/seedCombos.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
const Product = require('./models/Product');
const ComboOffer = require('./models/ComboOffer');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Product.deleteMany();
  await ComboOffer.deleteMany();

  const products = [
    { name: 'Original Recipe Chicken (1 pc)', price: 150, category: 'Chicken' },
    { name: 'Hot & Crispy Chicken (1 pc)', price: 160, category: 'Chicken' },
    { name: 'Chicken Burger', price: 120, category: 'Burgers' },
    { name: 'French Fries', price: 80, category: 'Sides' },
    { name: 'Cold Drink', price: 50, category: 'Beverages' },
    { name: 'Popcorn Chicken', price: 90, category: 'Snacks' },
  ];
  const created = await Product.insertMany(products);
  const findProduct = (name) => created.find(p => p.name === name)._id;

  // Meal Combo: Chicken Bucket (2 pcs chicken + fries + drink)
  await ComboOffer.create({
    name: 'Chicken Bucket Meal',
    description: '2 pcs chicken, regular fries, 1 drink',
    type: 'meal',
    products: [
      { productId: findProduct('Original Recipe Chicken (1 pc)'), quantity: 2 },
      { productId: findProduct('French Fries'), quantity: 1 },
      { productId: findProduct('Cold Drink'), quantity: 1 }
    ],
    discountedPrice: 350
  });

  // BOGO: Buy 1 Burger, Get 1 Free
  await ComboOffer.create({
    name: 'Burger BOGO',
    description: 'Buy one chicken burger, get one free',
    type: 'bogo',
    buyProductId: findProduct('Chicken Burger'),
    buyQuantity: 1,
    getProductId: findProduct('Chicken Burger'),
    getQuantity: 1,
    discountPercent: 100
  });

  // BOGO: Buy 1 Popcorn, get 1 at 50% off
  await ComboOffer.create({
    name: 'Popcorn Share',
    description: 'Buy one popcorn, get second at half price',
    type: 'bogo',
    buyProductId: findProduct('Popcorn Chicken'),
    buyQuantity: 1,
    getProductId: findProduct('Popcorn Chicken'),
    getQuantity: 1,
    discountPercent: 50
  });

  console.log('Products & combos seeded!');
  process.exit();
};
seed();