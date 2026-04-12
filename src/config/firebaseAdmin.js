const admin = require('firebase-admin');

let serviceAccount;

const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

if (rawServiceAccount) {
    console.log(`DEBUG: Service Account found, length is ${rawServiceAccount.length}`);
    try {
        // Try parsing as plain JSON first
        serviceAccount = JSON.parse(rawServiceAccount);
    } catch (jsonErr) {
        // If it fails, try parsing as Base64
        try {
            const decodedValue = Buffer.from(rawServiceAccount, 'base64').toString('utf8');
            serviceAccount = JSON.parse(decodedValue);
        } catch (base64Err) {
            console.error('Firebase config parse error: Could not parse as JSON or Base64.');
        }
    }

    if (serviceAccount && serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
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
