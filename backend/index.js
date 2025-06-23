require('dotenv').config();
require('./config/firebaseAdmin'); // Initialize Firebase Admin SDK

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes'); // Import auth routes
const userRoutes = require('./routes/userRoutes'); // Import user routes

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Mount auth routes
app.use('/api/auth', authRoutes);
// Mount user routes
app.use('/api/users', userRoutes);

// Simple test route (can be kept or removed)
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend server is running!' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack); // Log the full error stack for debugging

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined, // Add if NODE_ENV is reliably set
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
