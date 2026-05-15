const express = require('express');
const { getAllTables, updateTableStatus } = require('../controllers/tableController');
const auth = require('../middleware/authMiddleware');
const router = express.Router();
router.get('/', auth, getAllTables);
router.put('/', auth, updateTableStatus);
module.exports = router;