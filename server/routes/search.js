import express from 'express';
import { findAll, findWhere, search } from '../db/schema.js';

const router = express.Router();

// Global search
router.get('/', (req, res) => {
  try {
    const { q, category = 'all' } = req.query;
    if (!q) return res.json({ results: [] });
    
    const lower = q.toLowerCase();
    const results = {};
    
    if (category === 'all' || category === 'people' || category === 'users') {
      const matchedUsers = findAll('users')
        .filter(u => u.is_active && u.role !== 'admin' && (
          (u.full_name || '').toLowerCase().includes(lower) ||
          (u.headline || '').toLowerCase().includes(lower) ||
          (u.bio || '').toLowerCase().includes(lower) ||
          (u.current_company || '').toLowerCase().includes(lower) ||
          (u.skills || '').toLowerCase().includes(lower)
        ))
        .slice(0, 15)
        .map(({ password: _, ...u }) => ({
          ...u,
          _id: u.id,
          fullName: u.full_name,
          avatar: u.profile_photo,
          role: u.role || u.account_type || 'student'
        }));
      results.people = matchedUsers;
      results.users = matchedUsers;
    }
    
    if (category === 'all' || category === 'alumni') {
      results.alumni = findAll('users')
        .filter(u => u.is_active && u.account_type === 'alumni' && (
          (u.full_name || '').toLowerCase().includes(lower) ||
          (u.current_company || '').toLowerCase().includes(lower) ||
          (u.job_title || '').toLowerCase().includes(lower)
        ))
        .slice(0, 10)
        .map(({ password: _, ...u }) => ({
          ...u,
          _id: u.id,
          fullName: u.full_name,
          avatar: u.profile_photo
        }));
    }
    
    if (category === 'all' || category === 'jobs') {
      results.jobs = findAll('jobs')
        .filter(j => j.is_active && (
          (j.title || '').toLowerCase().includes(lower) ||
          (j.company || '').toLowerCase().includes(lower) ||
          (j.skills || '').toLowerCase().includes(lower)
        ))
        .slice(0, 10)
        .map(j => ({ ...j, _id: j.id }));
    }
    
    if (category === 'all' || category === 'hackathons') {
      results.hackathons = findAll('hackathons')
        .filter(h => h.is_active && (
          (h.name || h.title || '').toLowerCase().includes(lower) ||
          (h.organization || h.organizer || '').toLowerCase().includes(lower) ||
          (h.themes || '').toLowerCase().includes(lower)
        ))
        .slice(0, 10)
        .map(h => ({ ...h, _id: h.id, title: h.title || h.name }));
    }
    
    if (category === 'all' || category === 'communities') {
      results.communities = findAll('communities')
        .filter(c => c.is_approved !== 0 && (
          (c.name || '').toLowerCase().includes(lower) ||
          (c.description || '').toLowerCase().includes(lower) ||
          (c.category || '').toLowerCase().includes(lower)
        ))
        .slice(0, 10)
        .map(c => ({ ...c, _id: c.id }));
    }
    
    if (category === 'all' || category === 'posts') {
      results.posts = findAll('posts')
        .filter(p => (p.content || '').toLowerCase().includes(lower))
        .slice(0, 10)
        .map(p => ({ ...p, _id: p.id }));
    }
    
    if (category === 'all' || category === 'events') {
      results.events = findAll('events')
        .filter(e => e.is_active && (
          (e.title || '').toLowerCase().includes(lower) ||
          (e.description || '').toLowerCase().includes(lower)
        ))
        .slice(0, 10)
        .map(e => ({ ...e, _id: e.id }));
    }
    
    res.json({ results, ...results });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
