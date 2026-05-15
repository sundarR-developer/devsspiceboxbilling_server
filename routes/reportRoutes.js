const express = require('express');
const { exportPaymentReport, exportPartnerReport } = require('../controllers/reportController');
const { exportTopProductsByPartner } = require('../controllers/partnerProductReportController');
const { exportComboUsageReport } = require('../controllers/comboReportController');
const { exportCustomerReport } = require('../controllers/customerReportController');
const auth = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/payment', auth, exportPaymentReport);
router.get('/partner', auth, exportPartnerReport);
router.get('/top-products-partner', auth, exportTopProductsByPartner);
router.get('/combo-usage', auth, exportComboUsageReport);
router.get('/customers', auth, exportCustomerReport);   // new

module.exports = router;