import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { findOne, insert, update, getDb } from '../db/schema.js';
import { generateToken } from '../middleware/auth.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateCollegeEmail, normalizeEmail, APPROVED_EMAIL_DOMAIN } from '../utils/domainValidator.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, account_type, personal_email, phone,
      register_number, batch, year, section, graduation_year, headline, bio,
      location, current_company, job_title, industry, github, linkedin, portfolio } = req.body;

    if (!email || !password || !full_name || !account_type) {
      return res.status(400).json({ error: 'Email, password, full name, and account type are required' });
    }

    // Strict Domain Validation: Must be @ece.ritchennai.edu.in
    const domainCheck = validateCollegeEmail(email);
    if (!domainCheck.isValid) {
      return res.status(400).json({ error: domainCheck.error });
    }
    const normalizedEmail = domainCheck.normalizedEmail;

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists with normalized email
    const existing = findOne('users', { email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = uuidv4();

    // Calculate initial profile completion
    let completion = 15;
    if (bio) completion += 10;
    if (headline) completion += 5;
    if (location) completion += 5;
    if (phone) completion += 5;

    const user = {
      id: userId,
      email: normalizedEmail,
      personal_email: personal_email || '',
      password: hashedPassword,
      full_name,
      phone: phone || '',
      role: 'user',
      account_type,
      register_number: register_number || '',
      batch: batch || '',
      year: year || '',
      section: section || '',
      department: 'ECE',
      graduation_year: graduation_year || '',
      profile_photo: '',
      cover_photo: '',
      headline: headline || '',
      bio: bio || '',
      date_of_birth: '',
      gender: '',
      location: location || '',
      current_company: current_company || '',
      job_title: job_title || '',
      industry: industry || '',
      github: github || '',
      linkedin: linkedin || '',
      portfolio: portfolio || '',
      twitter: '',
      resume: '',
      verification_status: 'pending',
      is_active: 1,
      is_suspended: 0,
      profile_completion: completion,
      privacy_profile: 'everyone',
      privacy_email: 'connections',
      privacy_phone: 'only_me',
      privacy_message: 'everyone',
      privacy_connection: 'everyone',
      mentoring_available: 0,
      mentoring_career: 0,
      mentoring_referrals: 0,
      mentoring_projects: 0,
      mentoring_lectures: 0,
      theme: 'system',
      last_active: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    insert('users', user);

    const token = generateToken(user);
    const { password: _, ...safeUser } = user;

    res.status(201).json({ user: safeUser, token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = findOne('users', { email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.is_suspended) {
      return res.status(403).json({ error: 'Account suspended. Contact admin.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last active
    update('users', user.id, { last_active: new Date().toISOString() });

    const token = generateToken(user);
    const { password: _, ...safeUser } = user;

    res.json({ user: safeUser, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = findOne('users', { id: req.user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Forgot password (simplified - generates a reset token)
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const user = findOne('users', { email: normalizedEmail });
  if (!user) {
    return res.json({ message: 'If an account exists, a reset link has been sent.' });
  }
  res.json({ message: 'If an account exists, a reset link has been sent.' });
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, new_password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const user = findOne('users', { email: normalizedEmail });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 12);
    update('users', user.id, { password: hashedPassword });
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error resetting password' });
  }
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword, current_password, new_password } = req.body;
    const curr = currentPassword || current_password;
    const next = newPassword || new_password;

    if (!curr || !next) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    const user = findOne('users', { id: req.user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(curr, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    if (next.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const hashedPassword = await bcrypt.hash(next, 12);
    update('users', user.id, { password: hashedPassword });
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Server error changing password' });
  }
});

export default router;
