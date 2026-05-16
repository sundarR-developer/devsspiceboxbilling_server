const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const uri = "mongodb+srv://sundardeveloper:root123@cluster0.xxxxx.mongodb.net/restaurant_billing?retryWrites=true&w=majority";

async function seed() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('restaurant_billing');

  // Clear existing (optional)
  await db.collection('tables').deleteMany({});
  await db.collection('users').deleteMany({});

  // Insert 10 tables
  for (let i = 1; i <= 10; i++) {
    await db.collection('tables').insertOne({ tableNumber: i, status: 'Free' });
  }

  // Insert admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await db.collection('users').insertOne({
    email: 'admin@restaurant.com',
    password: hashedPassword,
    role: 'admin'
  });

  console.log('✅ Seeded successfully');
  await client.close();
}

seed().catch(console.error);