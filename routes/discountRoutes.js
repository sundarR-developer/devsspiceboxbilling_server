const express = require('express');
const { getAllDiscounts, createDiscount, updateDiscount, deleteDiscount } = require('../controllers/discountController');
const auth = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', auth, getAllDiscounts);
router.post('/', auth, createDiscount);
router.put('/:id', auth, updateDiscount);
router.delete('/:id', auth, deleteDiscount);

module.exports = router;