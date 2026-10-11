import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAdmin } from '../middleware/auth.js';
import { findAll, findById, findOne, findWhere, insert, update, remove, count } from '../db/schema.js';

const router = express.Router();

// Admin dashboard analytics
router.get('/analytics', requireAdmin, (req, res) => {
  try {
    const users = findAll('users').filter(u => u.role !== 'admin');
    const students = users.filter(u => u.account_type === 'student');
    const alumni = users.filter(u => u.account_type === 'alumni');
    const activeUsers = users.filter(u => u.is_active && !u.is_suspended);
    const posts = findAll('posts');
    const connections = findAll('connections', { status: 'accepted' });
    const messages = findAll('messages');
    const jobs = findAll('jobs');
    const hackathons = findAll('hackathons');
    const incubation = findAll('incubation_programs');
    const communities = findAll('communities');
    const reports = findAll('reports', { status: 'pending' });
    const pendingVerification = users.filter(u => u.verification_status === 'pending');
    
    // Recent registrations (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const newRegistrations = users.filter(u => u.created_at > thirtyDaysAgo).length;
    
    // Registration trend (last 7 days)
    const registrationTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const count = users.filter(u => u.created_at && u.created_at.startsWith(dateStr)).length;
      registrationTrend.push({ date: dateStr, count });
    }
    
    // Most active users (by post count)
    const userPostCounts = {};
    posts.forEach(p => {
      userPostCounts[p.user_id] = (userPostCounts[p.user_id] || 0) + 1;
    });
    const mostActiveUsers = Object.entries(userPostCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId, postCount]) => {
        const user = findById('users', userId);
        return user ? { id: user.id, full_name: user.full_name, profile_photo: user.profile_photo, postCount } : null;
      })
      .filter(Boolean);
    
    const statsData = {
      totalUsers: users.length,
      totalStudents: students.length,
      totalAlumni: alumni.length,
      activeUsers: activeUsers.length,
      newRegistrations,
      totalPosts: posts.length,
      totalConnections: connections.length,
      totalMessages: messages.length,
      totalJobs: jobs.length,
      totalHackathons: hackathons.length,
      totalIncubation: incubation.length,
      totalCommunities: communities.length,
      pendingReports: reports.length,
      pendingVerification: pendingVerification.length,
      registrationTrend,
      mostActiveUsers,
    };

    res.json({
      ...statsData,
      stats: statsData
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users (admin)
router.get('/users', requireAdmin, (req, res) => {
  try {
    const { type, batch, year, section, status, search: q, page = 1, limit = 50 } = req.query;
    let users = findAll('users').filter(u => u.role !== 'admin');
    
    if (type) users = users.filter(u => u.account_type === type);
    if (batch) users = users.filter(u => u.batch === batch);
    if (year) users = users.filter(u => u.year === year);
    if (section) users = users.filter(u => u.section === section);
    if (status === 'verified') users = users.filter(u => u.verification_status === 'verified');
    if (status === 'pending') users = users.filter(u => u.verification_status === 'pending');
    if (status === 'suspended') users = users.filter(u => u.is_suspended);
    if (q) {
      const lower = q.toLowerCase();
      users = users.filter(u =>
        (u.full_name || '').toLowerCase().includes(lower) ||
        (u.email || '').toLowerCase().includes(lower)
      );
    }
    
    users.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const total = users.length;
    const start = (parseInt(page) - 1) * parseInt(limit);
    users = users.slice(start, start + parseInt(limit));
    
    const safeUsers = users.map(({ password: _, ...u }) => ({
      ...u,
      _id: u.id,
      fullName: u.full_name,
      avatar: u.profile_photo,
      isVerified: u.verification_status === 'verified'
    }));
    res.json({ users: safeUsers, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify user
router.put('/users/:id/verify', requireAdmin, (req, res) => {
  try {
    const status = req.body?.status || 'verified';
    update('users', req.params.id, { verification_status: status });
    res.json({ success: true, message: `User ${status}` });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Suspend user
router.put('/users/:id/suspend', requireAdmin, (req, res) => {
  try {
    const user = findById('users', req.params.id);
    update('users', req.params.id, { is_suspended: user.is_suspended ? 0 : 1 });
    res.json({ message: user.is_suspended ? 'User restored' : 'User suspended' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user
router.delete('/users/:id', requireAdmin, (req, res) => {
  try {
    remove('users', req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get reports
router.get('/reports', requireAdmin, (req, res) => {
  try {
    const reports = findAll('reports')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(r => {
        const reporter = findById('users', r.reporter_id);
        return {
          ...r,
          reporter: reporter ? { id: reporter.id, full_name: reporter.full_name, profile_photo: reporter.profile_photo } : null,
        };
      });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Handle report
router.put('/reports/:id', requireAdmin, (req, res) => {
  try {
    const { status, admin_action } = req.body;
    update('reports', req.params.id, { status, admin_action });
    res.json({ message: 'Report updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create announcement
router.post('/announcements', requireAdmin, (req, res) => {
  try {
    const announcement = {
      id: uuidv4(),
      posted_by: req.user.id,
      ...req.body,
      is_active: 1,
      created_at: new Date().toISOString(),
    };
    insert('announcements', announcement);
    res.status(201).json(announcement);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get announcements
router.get('/announcements', (req, res) => {
  try {
    const announcements = findAll('announcements')
      .filter(a => a.is_active)
      .sort((a, b) => {
        if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
        if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
        if (a.priority === 'high' && b.priority !== 'high') return -1;
        if (b.priority === 'high' && a.priority !== 'high') return 1;
        return new Date(b.created_at) - new Date(a.created_at);
      });
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete announcement
router.delete('/announcements/:id', requireAdmin, (req, res) => {
  try {
    remove('announcements', req.params.id);
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Pin/unpin post
router.put('/posts/:id/pin', requireAdmin, (req, res) => {
  try {
    const post = findById('posts', req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    update('posts', req.params.id, { is_pinned: post.is_pinned ? 0 : 1 });
    res.json({ message: post.is_pinned ? 'Post unpinned' : 'Post pinned' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Community management
router.put('/communities/:id/approve', requireAdmin, (req, res) => {
  try {
    update('communities', req.params.id, { is_approved: 1 });
    res.json({ message: 'Community approved' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

import { performAcademicRollover } from '../utils/academicTransition.js';

// Academic progression & time-lapse rollover (preview & execute)
router.get('/academic-rollover/preview', requireAdmin, (req, res) => {
  try {
    const preview = performAcademicRollover({ dryRun: true });
    res.json(preview);
  } catch (err) {
    console.error('Academic rollover preview error:', err);
    res.status(500).json({ error: 'Failed to generate academic rollover preview' });
  }
});

router.post('/academic-rollover', requireAdmin, (req, res) => {
  try {
    const isDryRun = req.query.dryRun === 'true' || req.body.dryRun === true;
    const result = performAcademicRollover({ dryRun: isDryRun });
    res.json({
      message: isDryRun ? 'Academic rollover preview generated' : 'Academic rollover executed successfully',
      result,
    });
  } catch (err) {
    console.error('Academic rollover error:', err);
    res.status(500).json({ error: 'Failed to execute academic rollover' });
  }
});

export default router;
