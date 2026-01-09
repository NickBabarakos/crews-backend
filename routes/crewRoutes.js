const express = require('express');
const router = express.Router();
const crewController = require('../controllers/crewController');
const {validateCrew} = require('../middlewares/validators');

router.get('/:id/context', crewController.getCrewContext);
router.post('/submit', validateCrew, crewController.submitCrew);

module.exports = router;