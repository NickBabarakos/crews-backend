const express = require('express');
const router = express.Router();
const crewController = require('../controllers/crewController');

router.get('/:id/context', crewController.getCrewContext);
router.post('/submit', crewController.submitCrew);

module.exports = router;