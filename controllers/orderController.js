const Order = require('../models/Order');
const Table = require('../models/Table');
const Customer = require('../models/Customer');
const Discount = require('../models/Discount');
const ComboOffer = require('../models/ComboOffer');
const Product = require('../models/Product');
const { checkLoyaltyEligibility } = require('../utils/loyaltyHelper');
const { incrementComboUsage } = require('./comboController');

// Helper: apply discount
const applyDiscount = async (discountCode, totalAmount) => {
  if (!discountCode) return { discountApplied: false, newTotal: totalAmount, discountObj: null };
  const discount = await Discount.findOne({ name: discountCode, isActive: true });
  if (!discount) return { discountApplied: false, newTotal: totalAmount, discountObj: null };
  if (discount.minOrderAmount > 0 && totalAmount < discount.minOrderAmount) {
    return { discountApplied: false, newTotal: totalAmount, discountObj: null };
  }
  let newTotal = totalAmount;
  if (discount.type === 'percentage') {
    newTotal = totalAmount - (totalAmount * discount.value / 100);
  } else {
    newTotal = Math.max(0, totalAmount - discount.value);
  }
  return { discountApplied: true, newTotal, discountObj: discount };
};

// Create a new order (supports combos, discounts, loyalty)
exports.createOrder = async (req, res) => {
  try {
    let { orderType, tableNumber, deliveryPartner, items, customer, discountCode, comboId } = req.body;
    let comboApplied = null;
    let discountApplied = null;
    let subtotal = 0;
    let totalAmount = 0;

    if (comboId) {
      const combo = await ComboOffer.findById(comboId);
      if (!combo || !combo.isActive) {
        return res.status(400).json({ error: 'Combo not found or inactive' });
      }
      const now = new Date();
      if (combo.validUntilDate && now > combo.validUntilDate) {
        return res.status(400).json({ error: 'Combo expired' });
      }
      if (combo.maxUses && combo.usedCount >= combo.maxUses) {
        return res.status(400).json({ error: 'Combo usage limit reached' });
      }
      comboApplied = combo._id;
      // Build items from combo products (original prices for display)
      const comboItems = [];
      for (let item of combo.products) {
        const product = await Product.findById(item.productId);
        if (product) {
          comboItems.push({
            productId: product._id,
            name: product.name,
            quantity: item.quantity,
            unitPrice: product.price,
            total: product.price * item.quantity
          });
        }
      }
      items = comboItems;
      subtotal = combo.discountedPrice;   // discounted price for combo alone
      totalAmount = subtotal;
    } else {
      subtotal = items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
      totalAmount = subtotal;
    }

    if (discountCode) {
      const { discountApplied: applied, newTotal, discountObj: disc } = await applyDiscount(discountCode, totalAmount);
      if (applied) {
        discountApplied = disc._id;
        totalAmount = newTotal;
      }
    }

    let existingCustomer = null;
    let loyaltyApplied = false;
    if (customer && customer.phone) {
      existingCustomer = await Customer.findOne({ phone: customer.phone });
      if (existingCustomer) {
        const isEligible = await checkLoyaltyEligibility(existingCustomer._id);
        if (isEligible) {
          loyaltyApplied = true;
          totalAmount = totalAmount * 0.9;
        }
      }
    }

    const order = new Order({
      orderType,
      tableNumber: orderType === 'Dine-in' ? tableNumber : null,
      deliveryPartner: orderType === 'Online' ? deliveryPartner : null,
      items,
      comboApplied,
      discountApplied,
      subtotal,
      tax: 0,
      totalAmount,
      customer: customer || { name: '', phone: '' },
      loyaltyApplied,
      status: 'Pending'
    });
    await order.save();

    if (comboId) {
      try { await incrementComboUsage(comboId); } catch(e) { console.warn(e); }
    }

    if (orderType === 'Dine-in' && tableNumber) {
      await Table.findOneAndUpdate(
        { tableNumber },
        { status: 'Occupied', currentOrderId: order._id },
        { upsert: true }
      );
    }

    if (existingCustomer) {
      existingCustomer.totalOrders += 1;
      existingCustomer.totalSpent += totalAmount;
      existingCustomer.lastOrderDate = new Date();
      await existingCustomer.save();
    } else if (customer && customer.phone && customer.name) {
      await Customer.create({
        phone: customer.phone,
        name: customer.name,
        totalOrders: 1,
        totalSpent: totalAmount,
        lastOrderDate: new Date()
      });
    }

    const io = req.app.get('io');
    io.to('kitchen').emit('new-order', order);
    res.status(201).json(order);
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getOrdersByTable = async (req, res) => {
  try {
    const { tableNumber } = req.params;
    const orders = await Order.find({
      tableNumber: parseInt(tableNumber),
      status: { $ne: 'Paid' }
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPendingOrders = async (req, res) => {
  try {
    const { type } = req.query;
    let query = { status: { $in: ['Pending', 'Preparing', 'Ready'] } };
    if (type === 'takeaway-online') {
      query.orderType = { $in: ['Takeaway', 'Online'] };
    }
    const orders = await Order.find(query).sort({ createdAt: 1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    const order = await Order.findByIdAndUpdate(orderId, { status }, { new: true });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (status === 'Paid' && order.orderType === 'Dine-in' && order.tableNumber) {
      await Table.findOneAndUpdate(
        { tableNumber: order.tableNumber },
        { status: 'Free', currentOrderId: null }
      );
    }
    const io = req.app.get('io');
    io.to('kitchen').emit('order-status-updated', { orderId, status });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.searchOrders = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Search query required' });
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(q);
    let query = { status: { $ne: 'Paid' } };
    if (isObjectId) {
      query._id = q;
    } else {
      query['customer.phone'] = { $regex: q, $options: 'i' };
    }
    const orders = await Order.find(query).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ** CORRECTED ** Add extra items to an order
// - Computes base price from the order's state BEFORE adding new items
// - Adds new items at full price, then recalculates total correctly
exports.addItemsToOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array required' });
    }
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'Paid') return res.status(400).json({ error: 'Order already paid' });

    // Mark new items for kitchen highlighting
    const newItems = items.map(item => ({ ...item, isNew: true }));

    // ----- Calculate base price from the order BEFORE adding new items -----
    let basePrice = 0;
    if (order.comboApplied) {
      const combo = await ComboOffer.findById(order.comboApplied);
      if (combo) {
        basePrice = combo.discountedPrice;
        console.log(`[AddItems] Combo base price = ₹${basePrice}`);
      } else {
        // Fallback: use the order's current totalAmount (should be combo discounted price)
        basePrice = order.totalAmount;
        console.warn(`[AddItems] Combo not found, using existing total = ₹${basePrice}`);
      }
    } else {
      // Non‑combo order: sum existing items at their original prices
      basePrice = order.items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
      console.log(`[AddItems] Non‑combo base price = ₹${basePrice}`);
    }

    // Sum of new items at full price
    const extraTotal = newItems.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
    console.log(`[AddItems] Extra items total = ₹${extraTotal}`);

    let totalAmount = basePrice + extraTotal;

    // Re‑apply loyalty discount if the order originally had it
    if (order.loyaltyApplied) {
      totalAmount = totalAmount * 0.9;
      console.log(`[AddItems] Loyalty applied → new total = ₹${totalAmount}`);
    }

    // Now add the new items to the order's items array (for display and kitchen)
    order.items.push(...newItems);
    order.subtotal = order.items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
    order.totalAmount = totalAmount;
    order.status = 'Pending'; // Reset to alert kitchen

    await order.save();
    console.log(`[AddItems] Order ${orderId} updated. Final total = ₹${order.totalAmount}`);

    const io = req.app.get('io');
    io.to('kitchen').emit('order-updated', { orderId, order });

    res.json({ success: true, order });
  } catch (err) {
    console.error('Add items error:', err);
    res.status(500).json({ error: err.message });
  }
};