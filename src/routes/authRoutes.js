const express = require('express');
const router = express.Router();
const {
    register,
    login,
    getProfile,
    staffSetup,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/mock-staff-login', require('../controllers/authController').mockStaffLogin);
router.get('/me', protect, getProfile);
router.post('/staff-setup', staffSetup);

module.exports = router;
