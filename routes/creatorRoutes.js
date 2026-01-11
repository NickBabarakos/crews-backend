const express = require('express');
const router = express.Router();
const creatorController = require('../controllers/creatorController');

router.get('/leaderboard', creatorController.getLeaderboard);
router.post('/verify-handle', creatorController.verifyHandle);
router.post('/verify-key', creatorController.verifyKey);
router.get('/check-name/:name', creatorController.checkName);

module.exports = router;