const express = require('express');
const router = express.Router();
const { completeOnboarding, setupFirm } = require('../controllers/onboardingController');
const { protect } = require('../middleware/authMiddleware');

router.post('/setup', protect, setupFirm);
router.post('/complete', protect, completeOnboarding);

module.exports = router;
