const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');

dotenv.config();

const app = express();

// Allowed origins: from environment variable FRONTEND_URL (comma separated) + localhost for dev
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(express.json());
app.use('/uploads', express.static('uploads'));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/tables', require('./routes/tableRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));
app.use('/api/admin/products', require('./routes/productAdminRoutes'));
app.use('/api/admin/discounts', require('./routes/discountRoutes'));
app.use('/api/admin/combos', require('./routes/comboRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});
app.set('io', io);

require('./sockets/kitchenSocket')(io);

server.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});