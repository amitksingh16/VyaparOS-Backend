const { User } = require('../models');
const admin = require('../config/firebaseAdmin'); // 👈 Asli Firebase engine ka link

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
        // console.log('[AUTH] TOKEN:', token?.substring(0, 30) + '...');

        // 1. Firebase se token verify karwayein
        const decodedToken = await admin.auth().verifyIdToken(token);

        // 2. Token ki information (email, uid) request mein daal dein
        req.user = decodedToken;

        // 3. Sab sahi hai, aage jaane do! (Very Important)
        next();

    } catch (err) {
        console.error("[AUTH] VERIFY ERROR FULL:", err.message);
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

const adminRole = (req, res, next) => {
    // Agar future mein admin check karna ho
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
};

module.exports = { protect, adminRole };