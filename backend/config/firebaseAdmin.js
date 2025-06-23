const admin = require('firebase-admin');

// Option 1: Using GOOGLE_APPLICATION_CREDENTIALS environment variable
// This is the recommended way for most environments.
// Ensure the GOOGLE_APPLICATION_CREDENTIALS environment variable is set
// to the path of your service account key JSON file.
try {
  if (!admin.apps.length) { // Check if Firebase has already been initialized
    admin.initializeApp({
      // credential: admin.credential.applicationDefault(), // This line is often sufficient if GOOGLE_APPLICATION_CREDENTIALS is set
      // projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID // Optional: Explicitly set project ID if needed, though usually inferred
    });
    console.log('Firebase Admin SDK initialized successfully using Application Default Credentials.');
  }
} catch (error) {
  console.error('Firebase Admin SDK initialization failed:', error);
  console.log('Ensure GOOGLE_APPLICATION_CREDENTIALS environment variable is set correctly if using default initialization.');
  // Option 2: Explicitly providing service account details (less common for deployed apps, use with caution)
  // This requires your service account key JSON to be available.
  // For local development, you might load it, but ensure it's not committed.
  // Example (DO NOT COMMIT ACTUAL KEYS):
  // const serviceAccount = require('/path/to/your/serviceAccountKey.json'); // Replace with actual path or load from env
  // if (!admin.apps.length) {
  //   admin.initializeApp({
  //     credential: admin.credential.cert(serviceAccount),
  //     // databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com` // If using Realtime Database
  //   });
  //   console.log('Firebase Admin SDK initialized successfully using explicit service account.');
  // }
}

module.exports = admin;
