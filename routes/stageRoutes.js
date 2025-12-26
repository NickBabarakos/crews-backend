const express = require('express');
const router = express.Router();
const stageController = require('../controllers/stageController');

router.get('/event-names', stageController.getEventNames);
router.get('/list', stageController.getList);
router.post('/search', stageController.searchStages);
router.get('/info', stageController.getInfo);

module.exports = router;