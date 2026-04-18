const { User } = require('../models');

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
    completeOnboarding
};
