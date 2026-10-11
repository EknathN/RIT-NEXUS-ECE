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

// Get unified badge counts for all navigation tabs (Phone & Web)
router.get('/badge-counts', (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Unread notifications
    const notifications = findWhere('notifications', n => n.user_id === userId && !n.is_read).length;

    // 2. Unread direct messages
    const myConversations = findWhere('conversations', c =>
      c.participant1_id === userId || c.participant2_id === userId
    );
    let messages = 0;
    myConversations.forEach(conv => {
      messages += findWhere('messages', m =>
        m.conversation_id === conv.id && m.sender_id !== userId && !m.is_read
      ).length;
    });

    // 3. Pending connection requests received
    const network = findWhere('connections', c =>
      c.receiver_id === userId && c.status === 'pending'
    ).length;

    // 4. Communities / Circles (recent activity in user's circles)
    const myCommunities = findWhere('communities', c =>
      Array.isArray(c.members) && c.members.includes(userId)
    );
    let communities = 0;
    if (myCommunities.length > 0) {
      const commIds = new Set(myCommunities.map(c => c.id));
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const recentMsgs = findWhere('community_messages', m =>
        commIds.has(m.community_id) && m.user_id !== userId && m.created_at > oneDayAgo
      );
      communities = Math.min(recentMsgs.length, 9);
    }

    // 5. Jobs & Internships (new opportunities in last 72 hours)
    const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    const jobs = findWhere('jobs', j => j.created_at > threeDaysAgo).length;

    // 6. Projects (new project bank entries in last 72 hours)
    const projects = findWhere('projects', p => p.created_at > threeDaysAgo).length;

    res.json({
      notifications,
      messages,
      network,
      communities,
      jobs,
      projects,
      success: true,
    });
  } catch (err) {
    console.error('Badge counts error:', err);
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
