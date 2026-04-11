// Mock OTP service for MVP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTP = async (phone, otp) => {
    console.log(`[MOCK] Sending OTP ${otp} to ${phone}`);
    // Integration with SMS provider (e.g., Twilio, Msg91) would go here
    return true;
};

module.exports = { generateOTP, sendOTP };
