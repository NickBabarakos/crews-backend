const express = require('express');
const router = express.Router();
const characterControl = require('../controllers/characterController');

router.get('/', characterControl.getCharacters);
router.get('/all-ids', characterControl.getAllIds);

module.exports = router;