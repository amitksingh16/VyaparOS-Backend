const { User } = require('../models');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        console.log('[AUTH] No token provided. Header:', req.headers.authorization);
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        console.log('[AUTH] AUTH HEADER:', req.headers.authorization);
        console.log('[AUTH] TOKEN:', token?.substring(0, 30) + '...');

        // Firebase authentication temporarily removed for reset

        return res.status(401).json({ message: 'Authentication disabled during reset' });
    } catch (err) {
        console.error("VERIFY ERROR FULL:", err);
        return res.status(401).json({ message: 'Invalid token' });
    }
};

const adminRole = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
};

module.exports = { protect, adminRole };
