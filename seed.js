const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Table = require('./models/Table');
const Product = require('./models/Product');

dotenv.config();

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await User.deleteMany();
  await Table.deleteMany();
  await Product.deleteMany();
  
  await User.create({ email: 'admin@restaurant.com', password: 'admin123' });
  
  for (let i = 1; i <= 10; i++) {
    await Table.create({ tableNumber: i, status: 'Free' });
  }
  
  const products = [
    { name: 'Butter Chicken', price: 320, category: 'Main Course' },
    { name: 'Naan', price: 40, category: 'Bread' },
    { name: 'Veg Biryani', price: 220, category: 'Rice' },
    { name: 'Masala Dosa', price: 90, category: 'South Indian' },
    { name: 'Gulab Jamun', price: 60, category: 'Dessert' },
    { name: 'Cold Drink', price: 30, category: 'Beverage' }
  ];
  await Product.insertMany(products);
  
  console.log('Database seeded!');
  process.exit();
};

seed();