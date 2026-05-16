const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const uri = process.env.MONGO_URI; // use your Atlas connection string
mongoose.connect(uri).then(async () => {
  const User = mongoose.model('User', new mongoose.Schema({ email: String, password: String, role: String }));
  const Table = mongoose.model('Table', new mongoose.Schema({ tableNumber: Number, status: String }));

  // Delete existing (optional)
  await User.deleteMany();
  await Table.deleteMany();

  // Create admin
  const hashed = await bcrypt.hash('admin123', 10);
  await User.create({ email: 'admin@restaurant.com', password: hashed, role: 'admin' });

  // Create 10 tables
  for (let i = 1; i <= 10; i++) {
    await Table.create({ tableNumber: i, status: 'Free' });
  }

  console.log('Seeding complete');
  process.exit();
});