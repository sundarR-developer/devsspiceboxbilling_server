const express = require('express');
const { getAllCombos, createCombo, updateCombo, deleteCombo } = require('../controllers/comboController');
const auth = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', auth, getAllCombos);
router.post('/', auth, createCombo);
router.put('/:id', auth, updateCombo);
router.delete('/:id', auth, deleteCombo);

module.exports = router;