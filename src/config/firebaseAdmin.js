const admin = require('firebase-admin');

let serviceAccount;

try {
    const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (rawServiceAccount) {
        // Support either raw JSON or a base64-encoded JSON blob.
        const decodedValue = rawServiceAccount.trim().startsWith('{')
            ? rawServiceAccount
            : Buffer.from(rawServiceAccount, 'base64').toString('utf8');

        serviceAccount = JSON.parse(decodedValue);

        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
    }
} catch (err) {
    console.error('Firebase config parse error:', err.message);
}

if (!admin.apps.length && serviceAccount) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });

    console.log('Firebase Admin initialized successfully.');
} else {
    console.warn('Firebase Admin not initialized. FIREBASE_SERVICE_ACCOUNT is missing or invalid.');
}

module.exports = admin;
