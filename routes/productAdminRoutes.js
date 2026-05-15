const express = require('express');
const { getAllProducts, createProduct, updateProduct, deleteProduct } = require('../controllers/productAdminController');
const auth = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const router = express.Router();

router.get('/', auth, getAllProducts);
router.post('/', auth, upload.single('image'), createProduct);
router.put('/:id', auth, upload.single('image'), updateProduct);
router.delete('/:id', auth, deleteProduct);

module.exports = router;