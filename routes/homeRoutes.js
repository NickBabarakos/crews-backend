const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

router.get('/stats', homeController.getStats);
router.get('/events', homeController.getEvents);
router.get('/changelog', homeController.getChangelog);
router.get('/latest-unit', homeController.getLatestUnit);

module.exports = router;