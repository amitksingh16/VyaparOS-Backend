const express = require('express');
const router = express.Router();
const complianceController = require('../controllers/complianceController');

router.post('/generate', complianceController.generateCalendar);
router.get('/calendar', complianceController.getCalendar);
router.put('/:id/file', complianceController.markAsFiled);
router.put('/:id/pending', complianceController.markAsPending);

module.exports = router;
