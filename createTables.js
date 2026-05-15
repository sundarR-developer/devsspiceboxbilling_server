const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Table = require('./models/Table');

const createTables = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    // Clear existing tables (optional)
    await Table.deleteMany();
    // Insert 10 tables
    for (let i = 1; i <= 10; i++) {
      await Table.create({ tableNumber: i, status: 'Free' });
    }
    console.log('✅ 10 tables created successfully');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

createTables();