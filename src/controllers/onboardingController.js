const { User, Firm } = require('../models');

const setupFirm = async (req, res) => {
  try {
    console.log("📥 RECEIVED AT BACKEND:", req.body);

    // Bypass all DB saves and validations for this test
    // Just return success to force the frontend to Step 2

    return res.status(200).json({ 
      success: true, 
      message: "Backend bypassed successfully. Proceed to Step 2." 
    });
  } catch (error) {
    console.error("Backend Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const completeOnboarding = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.isOnboardingComplete = true;
        await user.save();

        console.log("Onboarding complete for user:", user.id);

        res.status(200).json({ success: true, message: 'Onboarding marked as complete' });
    } catch (error) {
        console.error('Error completing onboarding:', error);
        res.status(500).json({ message: 'Server error parsing completion' });
    }
};

module.exports = {
    setupFirm,
    completeOnboarding
};
