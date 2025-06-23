const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const admin = require('../config/firebaseAdmin'); // Import Firebase Admin

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const {
    email,
    password,
    user_type, // 'individual' or 'company'
    full_name, // For individual
    company_name, // For company
    industry, // For company
    company_size // For company
  } = req.body;

  // Basic Input Validation
  if (!email || !password || !user_type) {
    return res.status(400).json({ message: 'Email, password, and user type are required.' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email format.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
  }
  if (!['individual', 'company'].includes(user_type)) {
    return res.status(400).json({ message: 'Invalid user type. Must be "individual" or "company".' });
  }
  if (user_type === 'individual' && !full_name) {
    return res.status(400).json({ message: 'Full name is required for individual users.' });
  }
  if (user_type === 'company' && !company_name) {
    return res.status(400).json({ message: 'Company name is required for company users.' });
  }

  try {
    // Check if user already exists
    const existingUserCheck = await db.query('SELECT * FROM public.users WHERE LOWER(email) = LOWER($1)', [email]);
    if (existingUserCheck.rows.length > 0) {
      return res.status(409).json({ message: 'User with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert user into database
    let insertQuery;
    let queryParams;
    if (user_type === 'individual') {
      insertQuery = `
        INSERT INTO public.users (email, password_hash, user_type, full_name)
        VALUES ($1, $2, $3, $4)
        RETURNING id, email, user_type, full_name, created_at;
      `;
      queryParams = [email, password_hash, user_type, full_name];
    } else { // company
      insertQuery = `
        INSERT INTO public.users (email, password_hash, user_type, company_name, industry, company_size)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email, user_type, company_name, created_at;
      `;
      queryParams = [email, password_hash, user_type, company_name, industry, company_size];
    }

    const newUserResult = await db.query(insertQuery, queryParams);
    const newUser = newUserResult.rows[0];

    res.status(201).json({
      message: 'User registered successfully!',
      user: newUser
    });

  } catch (error) {
    console.error('Detailed error during registration:', error); // Log the full error object

    if (error.code) { // Check if it's a pg error with a code
      console.error(`Database Error Code: ${error.code}, Routine: ${error.routine}`); // Log more pg details
      if (error.code === '23505') {
         return res.status(409).json({ message: 'User with this email already exists (database constraint).' });
      }
      // Example pg connection error codes:
      // '08001' - sqlclient_unable_to_establish_sqlconnection
      // '08006' - connection_failure
      // '28P01' - invalid_password (for DB user)
      // Add more specific checks if certain pg error codes are common for connection issues
      if (['08001', '08006', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEOUT'].includes(error.code) ||
          (error.message && (error.message.toLowerCase().includes('connect econrefused') || // Note: ECONNREFUSED is typically error.syscall or error.code for network errors, not error.message directly for pg
                             error.message.toLowerCase().includes('timeout') ||
                             error.message.toLowerCase().includes('database system is starting up')))) {
        return res.status(503).json({ message: 'Database connection error or database unavailable. Please try again later.' });
      }
      return res.status(500).json({ message: 'A database error occurred during registration. Please check server logs.'});
    }

    // Default server error if not a recognizable DB error
    res.status(500).json({ message: 'Server error during registration. Please check server logs for more details.' });
  }
});

// POST /api/auth/firebase-login
router.post('/firebase-login', async (req, res) => {
  const { token: firebaseToken } = req.body;

  if (!firebaseToken) {
    return res.status(400).json({ message: 'Firebase ID token is required.' });
  }

  try {
    // Verify the ID token using Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
    const firebaseUid = decodedToken.uid;
    const email = decodedToken.email;
    const fullNameFromFirebase = decodedToken.name || email.split('@')[0]; // Fallback for name

    if (!email) {
      // This case should be rare if Firebase project requires email for Google Sign-In
      return res.status(400).json({ message: 'Email not available from Firebase token.' });
    }

    // Check if user exists in your database
    let userResult = await db.query('SELECT * FROM public.users WHERE LOWER(email) = LOWER($1)', [email]);
    let user = userResult.rows[0];

    if (!user) {
      // User does not exist, create a new one
      // For Firebase-created users, password_hash is not directly used for login.
      // Store a placeholder or a strong random hash if your schema requires NOT NULL.
      // Or, even better, make password_hash nullable in your DB schema if social-only users are possible.
      // For now, let's assume password_hash can be null or we use a placeholder.
      // We'll default user_type to 'individual'.
      const placeholderPassword = `firebase_user_${Date.now()}`; // Not for login, just to satisfy NOT NULL if any
      const salt = await bcrypt.genSalt(10);
      const password_hash_placeholder = await bcrypt.hash(placeholderPassword, salt);

      const newUserQuery = `
        INSERT INTO public.users (email, password_hash, user_type, full_name, firebase_uid, is_email_verified)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email, user_type, full_name, firebase_uid, is_email_verified, created_at;
      `;
      // Assuming firebase_uid column exists or you add it.
      // Also setting is_email_verified to true since Firebase verifies it.
      const newUserParams = [email, password_hash_placeholder, 'individual', fullNameFromFirebase, firebaseUid, true];
      const newDbUser = await db.query(newUserQuery, newUserParams);
      user = newDbUser.rows[0];
    } else {
      // User exists, potentially link Firebase UID if not already linked
      if (!user.firebase_uid) {
        await db.query('UPDATE public.users SET firebase_uid = $1, is_email_verified = TRUE WHERE id = $2', [firebaseUid, user.id]);
        user.firebase_uid = firebaseUid; // Update in-memory user object
        user.is_email_verified = true;
      }
    }

    // User record (either existing or newly created) is now in `user`
    // Create JWT for your application
    const appPayload = {
      userId: user.id,
      userType: user.user_type,
      email: user.email,
      firebaseUid: user.firebase_uid // Include Firebase UID in your app token if useful
    };

    const appToken = jwt.sign(
      appPayload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    res.json({
      message: 'Logged in successfully with Firebase!',
      token: appToken,
      user: {
        id: user.id,
        email: user.email,
        user_type: user.user_type,
        full_name: user.full_name || fullNameFromFirebase, // Use DB full_name if available
        company_name: user.company_name, // Will be null for new individual users
        is_email_verified: user.is_email_verified,
        firebase_uid: user.firebase_uid
      }
    });

  } catch (error) {
    console.error('Error during Firebase login:', error);
    if (error.code === 'auth/id-token-expired' || error.code === 'auth/id-token-revoked' || error.code === 'auth/invalid-id-token') {
      return res.status(401).json({ message: 'Invalid or expired Firebase token.', code: error.code });
    }
    res.status(500).json({ message: 'Server error during Firebase login.' });
  }
});

// POST /api/auth/mark-as-verified - Mark user's contact (phone) as verified
// Protected route: Requires authentication
router.post('/mark-as-verified', authMiddleware, async (req, res, next) => {
  const userId = req.user.userId;

  // Potentially, the request body could indicate what was verified, e.g., { method: 'phone' }
  // For now, we assume it's phone verification as per the plan.

  try {
    const updateQuery = `
      UPDATE public.users
      SET is_phone_verified = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, is_phone_verified, user_type, full_name, company_name;
    `; // Added more fields to RETURNING for context if needed by frontend
    const { rows } = await db.query(updateQuery, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found to mark as verified.' });
    }

    res.status(200).json({
      message: 'User contact method marked as verified successfully.',
      user: rows[0] // Contains id, email, is_phone_verified, and other returned fields
    });
  } catch (error) {
    console.error('Error marking user as verified:', error);
    const err = new Error('Server error while marking user as verified.');
    // err.statusCode = 500; // Global error handler might set this.
    next(err); // Pass to global error handler
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Basic input validation
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    // Retrieve user by email
    const userResult = await db.query('SELECT * FROM public.users WHERE LOWER(email) = LOWER($1)', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials. User not found.' });
    }

    const user = userResult.rows[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials. Password incorrect.' });
    }

    // User matched, create JWT
    const payload = {
      userId: user.id,
      userType: user.user_type,
      email: user.email
      // Add other relevant non-sensitive info if needed
    };

    // Sign token
    // Ensure JWT_SECRET and JWT_EXPIRES_IN are in your .env file
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' } // Default to 1 hour if not set
    );

    res.json({
      message: 'Logged in successfully!',
      token,
      user: {
        id: user.id,
        email: user.email,
        user_type: user.user_type,
        full_name: user.full_name,
        company_name: user.company_name
      }
    });

  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

module.exports = router;