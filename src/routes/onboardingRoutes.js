const express = require('express');
const router = express.Router();
const { completeOnboarding } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/complete', protect, completeOnboarding);

module.exports = router;
