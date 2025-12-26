const express = require('express');
const router = express.Router();
const userBoxController = require('../controllers/userBoxController');

router.post('/create', userBoxController.createBox);
router.post('/update', userBoxController.updateBox);
router.post('/restore', userBoxController.restoreBox);
router.get('/view/:publicKey', userBoxController.viewBox);

module.exports = router;