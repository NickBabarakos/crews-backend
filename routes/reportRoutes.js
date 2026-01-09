const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const {validateReport } = require('../middlewares/validators');

router.post('/submit', validateReport, reportController.submitReport);

module.exports = router;