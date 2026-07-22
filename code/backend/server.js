import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import admin from 'firebase-admin';

// Import routes
import authRoutes from './routes/auth.js';
import equipmentRoutes from './routes/equipment.js';
import manageRoutes from './routes/manage.js';
import adminRoutes from './routes/admin.js';
import partnerFinderRoutes from './routes/partnerFinder.js';
import courtRoutes from './routes/courtRoutes.js';
import pool from './utils/database.js';

dotenv.config();

// Initialize Firebase Admin SDK
try {
  // admin.initializeApp({
  //   credential: admin.credential.cert({
  //     type: "service_account",
  //     private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  //     project_id: process.env.FIREBASE_PROJECT_ID,
  //     private_key_id: "1606055fd2e935989fe75e21729f0fc31d257b4e",
  //     client_email: process.env.FIREBASE_CLIENT_EMAIL,
  //     client_id: "101686913551948027000",
  //     auth_uri: "https://accounts.google.com/o/oauth2/auth",
  //     token_uri: "https://oauth2.googleapis.com/token",
  //     auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  //     client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40gympappa-final.iam.gserviceaccount.com"
  //   })
      admin.initializeApp({
      credential: admin.credential.cert({
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,      // env එකට දාන්න
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,                 // env එකට දාන්න
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL // env එකට දාන්න
      })
    
  });
  console.log('✓ Firebase initialized');
} catch (error) {
  console.warn('⚠ Firebase not initialized - Firebase login disabled');
  console.error(error.message);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/manage', manageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/partner-finder', partnerFinderRoutes);
app.use('/api/courts', courtRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

/*
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
*/


app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});


/*
app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);

  try {
    const result = await pool.query("SELECT NOW()");
    console.log("✓ Database connected:", result.rows[0]);
  } catch (error) {
    console.error("✗ Database connection failed:", error.message);
  }
});
*/