const express = require('express');
const { 
  createOrder, 
  getOrdersByTable, 
  getPendingOrders, 
  updateOrderStatus,
  searchOrders,
  addItemsToOrder
} = require('../controllers/orderController');
const auth = require('../middleware/authMiddleware');
const router = express.Router();

// Create a new order
router.post('/', auth, createOrder);

// Get pending orders for a specific table (by table number)
router.get('/table/:tableNumber', auth, getOrdersByTable);

// Get all orders with status Pending, Preparing, Ready (for kitchen)
// Optional query param: ?type=takeaway-online
router.get('/pending', auth, getPendingOrders);

// Update order status (e.g., from Pending to Preparing)
router.put('/status', auth, updateOrderStatus);

// Search orders by ID or customer phone (for Takeaway/Online payments)
router.get('/search', auth, searchOrders);

// Add extra items to an existing order (Dine-in/Takeaway only)
router.put('/:orderId/add-items', auth, addItemsToOrder);

module.exports = router;