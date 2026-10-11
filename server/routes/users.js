import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { findOne, findAll, findById, update, insert, remove, findWhere, search, count } from '../db/schema.js';

const router = express.Router();

// Get user profile by ID
router.get('/:id', (req, res) => {
  try {
    const user = findById('users', req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const { password: _, ...safeUser } = user;
    
    // Get related data
    const education = findAll('education', { user_id: user.id });
    const experience = findAll('experience', { user_id: user.id });
    const skills = findAll('skills', { user_id: user.id });
    const projects = findAll('projects', { user_id: user.id });
    const certifications = findAll('certifications', { user_id: user.id });
    const achievements = findAll('achievements', { user_id: user.id });
    const languages = findAll('languages', { user_id: user.id });
    const interests = findAll('interests', { user_id: user.id });
    
    // Get connection count
    const connections = findWhere('connections', c => 
      (c.sender_id === user.id || c.receiver_id === user.id) && c.status === 'accepted'
    ).length;

    // Check connection status with current user
    let connectionStatus = 'none';
    const conn = findOne('connections', { sender_id: req.user.id, receiver_id: user.id }) ||
                 findOne('connections', { sender_id: user.id, receiver_id: req.user.id });
    if (conn) connectionStatus = conn.status;
    
    // Check follow status
    const isFollowing = !!findOne('followers', { follower_id: req.user.id, following_id: user.id });
    
    res.json({
      ...safeUser,
      education,
      experience,
      skills,
      projects,
      certifications,
      achievements,
      languages,
      interests,
      connectionCount: connections,
      connectionStatus,
      isFollowing,
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update profile
router.put('/profile', (req, res) => {
  try {
    const updates = req.body;
    delete updates.password;
    delete updates.role;
    delete updates.id;
    delete updates.email;
    
    // Recalculate profile completion
    const user = findById('users', req.user.id);
    let completion = 15;
    const u = { ...user, ...updates };
    if (u.bio) completion += 10;
    if (u.headline) completion += 5;
    if (u.location) completion += 5;
    if (u.phone) completion += 5;
    if (u.profile_photo) completion += 10;
    if (u.github || u.linkedin || u.portfolio) completion += 5;
    if (u.resume) completion += 5;
    
    const edu = findAll('education', { user_id: req.user.id });
    if (edu.length > 0) completion += 10;
    const exp = findAll('experience', { user_id: req.user.id });
    if (exp.length > 0) completion += 10;
    const sk = findAll('skills', { user_id: req.user.id });
    if (sk.length > 0) completion += 10;
    const proj = findAll('projects', { user_id: req.user.id });
    if (proj.length > 0) completion += 10;
    
    completion = Math.min(completion, 100);
    updates.profile_completion = completion;
    
    const updated = update('users', req.user.id, updates);
    if (!updated) return res.status(404).json({ error: 'User not found' });
    
    const { password: _, ...safeUser } = updated;
    res.json(safeUser);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add education
router.post('/education', (req, res) => {
  try {
    const edu = { id: uuidv4(), user_id: req.user.id, ...req.body, created_at: new Date().toISOString() };
    insert('education', edu);
    res.status(201).json(edu);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Delete education
router.delete('/education/:id', (req, res) => {
  try {
    remove('education', req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Add experience
router.post('/experience', (req, res) => {
  try {
    const exp = { id: uuidv4(), user_id: req.user.id, ...req.body, created_at: new Date().toISOString() };
    insert('experience', exp);
    res.status(201).json(exp);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Delete experience
router.delete('/experience/:id', (req, res) => {
  try {
    remove('experience', req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Add/update skills
router.post('/skills', (req, res) => {
  try {
    const { skills } = req.body;
    // Remove existing skills
    const existing = findAll('skills', { user_id: req.user.id });
    existing.forEach(s => remove('skills', s.id));
    
    // Add new skills
    const newSkills = skills.map(name => {
      const skill = { id: uuidv4(), user_id: req.user.id, name, endorsement_count: 0, created_at: new Date().toISOString() };
      insert('skills', skill);
      return skill;
    });
    res.json(newSkills);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Add project
router.post('/projects', (req, res) => {
  try {
    const project = { id: uuidv4(), user_id: req.user.id, ...req.body, created_at: new Date().toISOString() };
    insert('projects', project);
    res.status(201).json(project);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Delete project
router.delete('/projects/:id', (req, res) => {
  try {
    remove('projects', req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Add certification
router.post('/certifications', (req, res) => {
  try {
    const cert = { id: uuidv4(), user_id: req.user.id, ...req.body, created_at: new Date().toISOString() };
    insert('certifications', cert);
    res.status(201).json(cert);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Delete certification
router.delete('/certifications/:id', (req, res) => {
  try {
    remove('certifications', req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Add achievement
router.post('/achievements', (req, res) => {
  try {
    const ach = { id: uuidv4(), user_id: req.user.id, ...req.body, created_at: new Date().toISOString() };
    insert('achievements', ach);
    res.status(201).json(ach);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Delete achievement
router.delete('/achievements/:id', (req, res) => {
  try {
    remove('achievements', req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Update interests
router.post('/interests', (req, res) => {
  try {
    const { interests } = req.body;
    const existing = findAll('interests', { user_id: req.user.id });
    existing.forEach(i => remove('interests', i.id));
    const newInterests = interests.map(interest => {
      const item = { id: uuidv4(), user_id: req.user.id, interest, created_at: new Date().toISOString() };
      insert('interests', item);
      return item;
    });
    res.json(newInterests);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Update languages
router.post('/languages', (req, res) => {
  try {
    const { languages } = req.body;
    const existing = findAll('languages', { user_id: req.user.id });
    existing.forEach(l => remove('languages', l.id));
    const newLangs = languages.map(lang => {
      const item = { id: uuidv4(), user_id: req.user.id, ...lang, created_at: new Date().toISOString() };
      insert('languages', item);
      return item;
    });
    res.json(newLangs);
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Get all users (with filters)
router.get('/', (req, res) => {
  try {
    const { type, batch, year, section, search: q, page = 1, limit = 20 } = req.query;
    let users = findAll('users');
    
    if (type) users = users.filter(u => u.account_type === type);
    if (batch) users = users.filter(u => u.batch === batch);
    if (year) users = users.filter(u => u.year === year);
    if (section) users = users.filter(u => u.section === section);
    if (q) {
      const lower = q.toLowerCase();
      users = users.filter(u => 
        u.full_name.toLowerCase().includes(lower) ||
        (u.headline && u.headline.toLowerCase().includes(lower)) ||
        (u.bio && u.bio.toLowerCase().includes(lower))
      );
    }
    
    users = users.filter(u => u.role !== 'admin' || u.id === req.user.id);
    
    const total = users.length;
    const start = (page - 1) * limit;
    users = users.slice(start, start + parseInt(limit));
    
    const safeUsers = users.map(({ password: _, ...u }) => u);
    res.json({ users: safeUsers, total, page: parseInt(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
