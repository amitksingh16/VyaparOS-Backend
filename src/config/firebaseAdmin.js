const admin = require('firebase-admin');

let serviceAccount;

const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

if (rawServiceAccount) {
    try {
        const trimmedAccount = rawServiceAccount.trim();
        let decodedValue;

        if (trimmedAccount.startsWith('{')) {
            // It's plain JSON
            decodedValue = trimmedAccount;
        } else {
            // It's Base64
            decodedValue = Buffer.from(trimmedAccount, 'base64').toString('utf-8');
        }

        serviceAccount = JSON.parse(decodedValue);

        if (serviceAccount && serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
    } catch (err) {
        console.error('Firebase config parse error:', err.message);
    }
}

if (!admin.apps.length && serviceAccount) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log('Firebase Admin initialized successfully.');
    } catch (err) {
        console.error('Firebase Admin initialization error:', err.message);
    }
} else {
    // Added conditions to only warn if serviceAccount is null (as apps.length might just be > 0)
    if (!serviceAccount) {
        console.warn('Firebase Admin not initialized. FIREBASE_SERVICE_ACCOUNT is missing or invalid.');
    }
}

module.exports = admin;
