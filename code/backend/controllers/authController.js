import pool from '../utils/database.js';
import { hashPassword, comparePassword } from '../utils/passwordUtils.js';
import { 
  validateUniversityEmail, 
  extractUserIdFromEmail,
  extractFacultyAndBatch 
} from '../utils/userUtils.js';
import { generateToken } from '../utils/jwtUtils.js';
// import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';

const ALLOWED_ROLES = [
  'student',
  'games-captain',
  'admin',
  'counter-staff',
  'psu',
  'faculty-coordinator',
  'coach',
  'private-coach',
  'academic-staff'
];

const normalizeRole = (role = '') => String(role).trim().toLowerCase();

const buildUserPayload = (userData) => {
  const { faculty, batch } = extractFacultyAndBatch(userData.user_id);

  return {
    userId: userData.user_id,
    email: userData.university_email,
    name: userData.name,
    role: userData.role,
    profilePicture: userData.profile_picture,
    tel: userData.tel,
    personalEmail: userData.personal_email,
    district: userData.district,
    faculty,
    batch,
    authProvider: userData.auth_provider,
    needsPasswordSetup: !userData.password_set || !userData.password
  };
};

export const registerUser = async (req, res) => {
  try {
    const { userId, name, email, password, role } = req.body;

    // Validate required fields
    if (!userId || !name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Convert userId to lowercase
    const userIdLower = userId.toLowerCase();

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT * FROM "user" WHERE user_id = $1 OR university_email = $2',
      [userIdLower, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'User ID or email already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Insert new user
    const newUser = await pool.query(
      `INSERT INTO "user" 
        (user_id, university_email, name, password, password_set, auth_provider, role) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        userIdLower,
        email,
        name,
        hashedPassword,
        true,
        'password',
        role || 'student'
      ]
    );

    const userData = newUser.rows[0];
    const token = generateToken(userData.user_id, userData.role);

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: buildUserPayload(userData)
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      return res.status(400).json({ message: 'User ID and password are required' });
    }

    // Convert userId to lowercase for case-insensitive login
    const userIdLower = userId.toLowerCase();

    // Find user by ID
    const user = await pool.query('SELECT * FROM "user" WHERE user_id = $1', [userIdLower]);
    
    if (user.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user.rows[0].password_set || !user.rows[0].password) {
      return res.status(403).json({
        message: 'Password has not been set for this account. Please complete Google sign-in onboarding in your profile.'
      });
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.rows[0].password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(userIdLower, user.rows[0].role);

    res.json({
      message: 'Login successful',
      token,
      user: buildUserPayload(user.rows[0])
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await pool.query('SELECT * FROM "user" WHERE user_id = $1', [userId]);
    
    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = user.rows[0];

    res.json({
      user: buildUserPayload(userData)
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Failed to fetch profile', error: error.message });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, profilePicture, tel, personalEmail, district } = req.body;

    const updatedUser = await pool.query(
      'UPDATE "user" SET name = $1, profile_picture = $2, tel = $3, personal_email = $4, district = $5 WHERE user_id = $6 RETURNING *',
      [name, profilePicture, tel, personalEmail, district, userId]
    );

    if (updatedUser.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = updatedUser.rows[0];

    res.json({
      message: 'Profile updated successfully',
      user: buildUserPayload(userData)
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
};

export const verifyFirebaseToken = async (req, res) => {
  try {
    const { firebaseToken } = req.body;
    
    if (!firebaseToken) {
      return res.status(400).json({ message: 'Firebase token is required' });
    }

    // Verify Firebase token
    // const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
    const decodedToken = await getAuth().verifyIdToken(firebaseToken);
    const email = decodedToken.email;

    if (!email) {
      return res.status(400).json({ message: 'Firebase account does not expose an email address' });
    }

    // Validate email format
    if (!validateUniversityEmail(email)) {
      return res.status(400).json({ message: 'Please use your university email (.pdn.ac.lk)' });
    }

    // Extract user ID from email
    const userId = extractUserIdFromEmail(email);
    const firebaseUid = decodedToken.uid;

    const userExists = await pool.query(
      'SELECT * FROM "user" WHERE user_id = $1 OR university_email = $2',
      [userId, email]
    );

    let userData;

    if (userExists.rows.length === 0) {
      const newUser = await pool.query(
        'INSERT INTO "user" (user_id, university_email, name, password, password_set, auth_provider, firebase_uid, role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [userId, email, decodedToken.name || decodedToken.email || userId, null, false, 'firebase', firebaseUid, 'student']
      );
      userData = newUser.rows[0];
    } else {
      const linkedUser = await pool.query(
        `UPDATE "user"
         SET firebase_uid = COALESCE(firebase_uid, $1),
             auth_provider = CASE
               WHEN password_set = true OR password IS NOT NULL THEN 'hybrid'
               WHEN auth_provider IS NULL THEN 'firebase'
               ELSE auth_provider
             END
         WHERE user_id = $2
         RETURNING *`,
        [firebaseUid, userExists.rows[0].user_id]
      );
      userData = linkedUser.rows[0];
    }

    // Generate JWT token
    const token = generateToken(userData.user_id, userData.role);

    res.json({
      message: 'Firebase authentication successful',
      token,
      user: buildUserPayload(userData)
    });
  } catch (error) {
    console.error('Firebase verification error:', error);

    // Firebase Admin SDK errors are auth/* or have auth-prefixed error codes.
    if (error?.code?.startsWith('auth/')) {
      return res.status(401).json({ message: 'Invalid Firebase token' });
    }

    // Common PostgreSQL schema drift errors after auth flow changes.
    if (error?.code === '42703' || error?.code === '23502' || error?.code === '23514') {
      return res.status(500).json({
        message: 'Database schema is out of date for Firebase onboarding. Please run latest database migration/init.sql.',
        error: error.message
      });
    }

    return res.status(500).json({ message: 'Firebase sign-in failed', error: error.message });
  }
};

export const setUserPassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      return res.status(400).json({ message: 'Password and confirmation are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const userResult = await pool.query('SELECT * FROM "user" WHERE user_id = $1', [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existingUser = userResult.rows[0];

    if (currentPassword && existingUser.password_set && existingUser.password) {
      const currentPasswordValid = await comparePassword(currentPassword, existingUser.password);
      if (!currentPasswordValid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
    }

    const hashedPassword = await hashPassword(password);
    const updatedUser = await pool.query(
      `UPDATE "user"
       SET password = $1,
           password_set = true,
           auth_provider = CASE
             WHEN firebase_uid IS NOT NULL THEN 'hybrid'
             ELSE 'password'
           END
       WHERE user_id = $2
       RETURNING *`,
      [hashedPassword, userId]
    );

    res.json({
      message: existingUser.password_set ? 'Password updated successfully' : 'Password set successfully',
      user: buildUserPayload(updatedUser.rows[0])
    });
  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({ message: 'Failed to update password', error: error.message });
  }
};

export const getAvailableRoles = async (req, res) => {
  res.json({ roles: ALLOWED_ROLES });
};

export const createRoleChangeRequest = async (req, res) => {
  try {
    const userId = req.user.userId;
    const requestedRole = normalizeRole(req.body?.requestedRole);

    if (!requestedRole || !ALLOWED_ROLES.includes(requestedRole)) {
      return res.status(400).json({ message: 'Please select a valid role' });
    }

    const userResult = await pool.query('SELECT role FROM "user" WHERE user_id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentRole = userResult.rows[0].role;
    if (currentRole === requestedRole) {
      return res.status(400).json({ message: 'You already have this role' });
    }

    const pendingRequest = await pool.query(
      `SELECT id
       FROM role_request
       WHERE user_id = $1 AND status = 'pending'
       LIMIT 1`,
      [userId]
    );

    if (pendingRequest.rows.length > 0) {
      return res.status(409).json({ message: 'You already have a pending role change request' });
    }

    const createdRequest = await pool.query(
      `INSERT INTO role_request (user_id, requested_role, status)
       VALUES ($1, $2, 'pending')
       RETURNING *`,
      [userId, requestedRole]
    );

    return res.status(201).json({
      message: 'Role change request sent to admins',
      request: createdRequest.rows[0]
    });
  } catch (error) {
    console.error('Create role request error:', error);
    return res.status(500).json({ message: 'Failed to create role request', error: error.message });
  }
};

export const getMyRoleRequests = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT rr.*,
              u.role AS current_role,
              reviewer.name AS reviewed_by_name
       FROM role_request rr
       JOIN "user" u ON rr.user_id = u.user_id
       LEFT JOIN "user" reviewer ON rr.reviewed_by = reviewer.user_id
       WHERE rr.user_id = $1
       ORDER BY rr.created_at DESC`,
      [userId]
    );

    const activeRequest = result.rows.find((item) => item.status === 'pending') || null;

    return res.json({
      activeRequest,
      requests: result.rows
    });
  } catch (error) {
    console.error('Get my role requests error:', error);
    return res.status(500).json({ message: 'Failed to fetch role requests', error: error.message });
  }
};

export const cancelRoleChangeRequest = async (req, res) => {
  try {
    const userId = req.user.userId;
    const requestId = Number(req.params.id);

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({ message: 'Invalid request id' });
    }

    const result = await pool.query(
      `DELETE FROM role_request
       WHERE id = $1 AND user_id = $2 AND status = 'pending'
       RETURNING id`,
      [requestId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Pending request not found' });
    }

    return res.json({ message: 'Role change request cancelled' });
  } catch (error) {
    console.error('Cancel role request error:', error);
    return res.status(500).json({ message: 'Failed to cancel role request', error: error.message });
  }
};

export const getRoleChangeRequests = async (req, res) => {
  try {
    const requestedStatus = normalizeRole(req.query.status || '');
    const statusFilter = ['pending', 'approved', 'rejected'].includes(requestedStatus) ? requestedStatus : null;

    const result = await pool.query(
      `SELECT rr.id,
              rr.user_id,
              rr.requested_role,
              rr.status,
              rr.created_at,
              rr.reviewed_at,
              rr.reviewed_by,
              requester.name AS user_name,
              requester.role AS current_role,
              reviewer.name AS reviewed_by_name
       FROM role_request rr
       JOIN "user" requester ON rr.user_id = requester.user_id
       LEFT JOIN "user" reviewer ON rr.reviewed_by = reviewer.user_id
       WHERE ($1::text IS NULL OR rr.status = $1)
       ORDER BY
         CASE rr.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
         rr.created_at DESC`,
      [statusFilter]
    );

    return res.json({ requests: result.rows });
  } catch (error) {
    console.error('Get role requests (admin) error:', error);
    return res.status(500).json({ message: 'Failed to fetch role requests', error: error.message });
  }
};

export const reviewRoleChangeRequest = async (req, res) => {
  const client = await pool.connect();
  try {
    const requestId = Number(req.params.id);
    const action = normalizeRole(req.body?.action);
    const reviewerId = req.user.userId;

    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({ message: 'Invalid request id' });
    }

    if (!['approve', 'decline'].includes(action)) {
      return res.status(400).json({ message: 'Action must be approve or decline' });
    }

    await client.query('BEGIN');

    const requestResult = await client.query(
      `SELECT id, user_id, requested_role, status
       FROM role_request
       WHERE id = $1
       FOR UPDATE`,
      [requestId]
    );

    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Role request not found' });
    }

    const request = requestResult.rows[0];
    if (request.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'This request has already been reviewed' });
    }

    const finalStatus = action === 'approve' ? 'approved' : 'rejected';

    if (action === 'approve') {
      await client.query(
        'UPDATE "user" SET role = $1 WHERE user_id = $2',
        [request.requested_role, request.user_id]
      );
    }

    const reviewed = await client.query(
      `UPDATE role_request
       SET status = $2,
           reviewed_at = CURRENT_TIMESTAMP,
           reviewed_by = $3
       WHERE id = $1
       RETURNING *`,
      [requestId, finalStatus, reviewerId]
    );

    await client.query('COMMIT');

    return res.json({
      message: action === 'approve' ? 'Role request approved' : 'Role request declined',
      request: reviewed.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Review role request error:', error);
    return res.status(500).json({ message: 'Failed to review role request', error: error.message });
  } finally {
    client.release();
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT user_id, name, university_email, role, created_at
       FROM "user"
       ORDER BY created_at DESC, user_id ASC`
    );

    return res.json({ users: result.rows });
  } catch (error) {
    console.error('Get all users error:', error);
    return res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
};

export const updateUserRoleByAdmin = async (req, res) => {
  const client = await pool.connect();
  try {
    const targetUserId = String(req.params.userId || '').trim().toLowerCase();
    const requestedRole = normalizeRole(req.body?.role);
    const reviewerId = req.user.userId;

    if (!targetUserId) {
      return res.status(400).json({ message: 'Target user is required' });
    }

    if (!requestedRole || !ALLOWED_ROLES.includes(requestedRole)) {
      return res.status(400).json({ message: 'Please select a valid role' });
    }

    await client.query('BEGIN');

    const userResult = await client.query(
      'SELECT user_id, role FROM "user" WHERE user_id = $1 FOR UPDATE',
      [targetUserId]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'User not found' });
    }

    const currentRole = userResult.rows[0].role;
    if (currentRole === requestedRole) {
      await client.query('ROLLBACK');
      return res.json({ message: 'User already has this role', user: userResult.rows[0] });
    }

    const updated = await client.query(
      `UPDATE "user"
       SET role = $1
       WHERE user_id = $2
       RETURNING user_id, role`,
      [requestedRole, targetUserId]
    );

    await client.query(
      `UPDATE role_request
       SET status = 'rejected',
           reviewed_at = CURRENT_TIMESTAMP,
           reviewed_by = $2
       WHERE user_id = $1 AND status = 'pending'`,
      [targetUserId, reviewerId]
    );

    await client.query('COMMIT');

    return res.json({
      message: 'User role updated successfully',
      user: updated.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Admin update user role error:', error);
    return res.status(500).json({ message: 'Failed to update user role', error: error.message });
  } finally {
    client.release();
  }
};