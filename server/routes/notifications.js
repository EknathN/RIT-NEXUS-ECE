import express from 'express';
import { findAll, findWhere, update, updateWhere } from '../db/schema.js';

const router = express.Router();

// Get notifications
router.get('/', (req, res) => {
  try {
    const { category } = req.query;
    let notifications = findAll('notifications', { user_id: req.user.id });
    
    if (category && category !== 'all') {
      const typeMap = {
        connections: ['connection_request', 'connection_accepted'],
        messages: ['message'],
        opportunities: ['job_alert', 'internship_alert', 'hackathon_alert'],
        mentions: ['mention'],
        events: ['event_reminder'],
      };
      const types = typeMap[category] || [];
      if (types.length) {
        notifications = notifications.filter(n => types.includes(n.type));
      }
    }
    
    notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const enriched = notifications.map(n => ({
      ...n,
      _id: n.id,
      content: n.message,
      read: !!n.is_read,
      createdAt: n.created_at,
    }));
    res.json({ notifications: enriched, list: enriched });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get unread count
router.get('/unread-count', (req, res) => {
  try {
    const count = findWhere('notifications', n => n.user_id === req.user.id && !n.is_read).length;
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark as read
router.put('/:id/read', (req, res) => {
  try {
    update('notifications', req.params.id, { is_read: 1 });
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark all as read
router.put('/read-all', (req, res) => {
  try {
    const notifications = findAll('notifications', { user_id: req.user.id });
    notifications.forEach(n => update('notifications', n.id, { is_read: 1 }));
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
