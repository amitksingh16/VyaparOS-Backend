const { User, ActivityLog } = require('../models');
const admin = require("../config/firebaseAdmin");
// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
    try {
        const { email, name, role, phone } = req.body;
        const token = req.headers.authorization?.split(" ")[1];
        let decoded;

        try {
            decoded = await admin.auth().verifyIdToken(token);
            console.log("✅ Token Verified:", decoded.uid);
        } catch (err) {
            console.error("❌ Token Verification Failed:", err.message);
            return res.status(401).json({ message: "Invalid Firebase token" });
        }

        if (!token) {
            console.log('[REGISTER] No token. Header:', req.headers.authorization);
            return res.status(401).json({ message: 'No token provided' });
        }

        console.log('[REGISTER] AUTH HEADER:', req.headers.authorization);
        console.log('[REGISTER] TOKEN:', token?.substring(0, 30) + '...');

        if (!email || !phone) {
            return res.status(400).json({ message: 'Email and Phone Number are required' });
        }

        const userExists = await User.findOne({ where: { email } });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        // Create user (verified)
        const user = await User.create({
            phone,
            email,
            name,
            role: role || 'owner',
            is_verified: true,
            setup_completed: false,
        });

        res.status(201).json({
            message: 'User registered successfully.',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                is_verified: user.is_verified,
                setup_completed: user.setup_completed,
            }
        });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            console.log('[LOGIN] No token. Header:', req.headers.authorization);
            return res.status(401).json({ message: 'No token provided' });
        }

        console.log('[LOGIN] AUTH HEADER:', req.headers.authorization);
        console.log('[LOGIN] TOKEN:', token?.substring(0, 30) + '...');

        return res.status(401).json({ message: 'Login disabled during reset' });

        // Log the successful authentication event
        try {
            await ActivityLog.create({
                event_type: 'USER_LOGIN',
                description: `${user.name || 'User'} logged in successfully.`,
                performed_by: user.id
            });
        } catch (err) {
            console.error('Failed to log login activity:', err);
        }

        res.status(200).json({
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                is_verified: user.is_verified,
                setup_completed: user.setup_completed,
            },
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] }, // No password field in DB anyway, but good practice
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Setup staff account from invite token
// @route   POST /api/auth/staff-setup
// @access  Public
const staffSetup = async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ message: 'Token and password are required' });
        }

        const user = await User.findOne({ where: { invite_token: token } });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired invitation token' });
        }

        // Ideally hash the password, but keeping it simple for dev since original user creation doesn't use passwords
        // We will just store it plain-text for this prototype, or mock a hash
        user.password = password;
        user.invite_status = 'active';
        user.setup_completed = true;
        user.is_verified = true;
        user.invite_token = null; // Consume token

        await user.save();

        res.status(200).json({
            message: 'Staff account setup successfully',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                is_verified: user.is_verified,
                setup_completed: user.setup_completed,
            },
        });
    } catch (error) {
        console.error('Staff setup error:', error);
        res.status(500).json({ message: 'Server error during staff setup' });
    }
};

// @desc    Mock login to verify Staff View (Testing Only)
// @route   POST /api/auth/mock-staff-login
// @access  Public
const mockStaffLogin = async (req, res) => {
    try {
        const { name, role } = req.query;
        let whereClause = { role: role || 'ca_staff' };
        if (name) {
            whereClause.name = name;
        }

        // Find the specific (or first available) staff member or CA
        const staff = await User.findOne({ where: whereClause });

        if (!staff) {
            return res.status(404).json({ message: `No user found for query. Please seed first.` });
        }

        // Generate token and fake successful setup
        const token = generateToken(staff.id, staff.role);

        res.status(200).json({
            message: 'Mock staff login successful',
            token,
            user: {
                id: staff.id,
                name: staff.name,
                email: staff.email,
                role: staff.role,
                is_verified: true,
                setup_completed: true,
            },
        });
    } catch (error) {
        console.error('Mock staff login error:', error);
        res.status(500).json({ message: 'Server error generating mock login' });
    }
};

module.exports = {
    register,
    login,
    getProfile,
    staffSetup,
    mockStaffLogin
};
