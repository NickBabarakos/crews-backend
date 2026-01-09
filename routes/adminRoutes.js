const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { adminAuth } = require('../middlewares/adminMiddleware');
const {validateBanner} = require('../middlewares/validators');

//---Δημοσιο Route (πριν το κλειδωμα)---
router.post('/login', adminController.login);

//--Απο εδω και κατω ολα κλειδωμενα----
router.use(adminAuth);

//Characters & Creators
router.post('/character', adminController.addCharacter);
router.post('/check-creator',adminController.checkCreator);
router.post('/create-creator', adminController.createCreator);

//crews
router.post('/create-crew', adminController.createCrew);
router.delete('/crews/:id', adminController.deleteCrew);

//Pending Crews
router.get('/pending-crews', adminController.getPendingCrews);
router.delete('/pending-crews/:id', adminController.deletePendingCrew);

//Reports 
router.get('/reports', adminController.getReports);
router.delete('/reports/:id', adminController.deleteReport);

//Banners & Content
router.post('/banner', validateBanner, adminController.createBanner);
router.post('/update-event-content', adminController.updateEventContent);

module.exports = router;