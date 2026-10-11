import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { findAll, findById, findOne, findWhere, insert, update, remove } from '../db/schema.js';

const router = express.Router();

// Send connection request
router.post('/request', (req, res) => {
  try {
    const { receiver_id } = req.body;
    if (receiver_id === req.user.id) return res.status(400).json({ error: 'Cannot connect with yourself' });
    
    const existing = findOne('connections', { sender_id: req.user.id, receiver_id }) ||
                     findOne('connections', { sender_id: receiver_id, receiver_id: req.user.id });
    if (existing) return res.status(400).json({ error: 'Connection request already exists' });
    
    const connection = {
      id: uuidv4(),
      sender_id: req.user.id,
      receiver_id,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    insert('connections', connection);
    
    // Create notification
    const sender = findById('users', req.user.id);
    insert('notifications', {
      id: uuidv4(),
      user_id: receiver_id,
      from_user_id: req.user.id,
      type: 'connection_request',
      title: 'Connection Request',
      message: `${sender.full_name} wants to connect with you`,
      link: `/profile/${req.user.id}`,
      is_read: 0,
      created_at: new Date().toISOString(),
    });
    
    res.status(201).json(connection);
  } catch (err) {
    console.error('Connection request error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Accept connection request
router.put('/:id/accept', (req, res) => {
  try {
    const connection = findById('connections', req.params.id);
    if (!connection) return res.status(404).json({ error: 'Connection not found' });
    if (connection.receiver_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    
    update('connections', req.params.id, { status: 'accepted' });
    
    // Create notification for sender
    const accepter = findById('users', req.user.id);
    insert('notifications', {
      id: uuidv4(),
      user_id: connection.sender_id,
      from_user_id: req.user.id,
      type: 'connection_accepted',
      title: 'Connection Accepted',
      message: `${accepter.full_name} accepted your connection request`,
      link: `/profile/${req.user.id}`,
      is_read: 0,
      created_at: new Date().toISOString(),
    });
    
    // Auto-follow each other
    if (!findOne('followers', { follower_id: req.user.id, following_id: connection.sender_id })) {
      insert('followers', { id: uuidv4(), follower_id: req.user.id, following_id: connection.sender_id, created_at: new Date().toISOString() });
    }
    if (!findOne('followers', { follower_id: connection.sender_id, following_id: req.user.id })) {
      insert('followers', { id: uuidv4(), follower_id: connection.sender_id, following_id: req.user.id, created_at: new Date().toISOString() });
    }
    
    res.json({ message: 'Connection accepted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Reject connection request
router.put('/:id/reject', (req, res) => {
  try {
    const connection = findById('connections', req.params.id);
    if (!connection) return res.status(404).json({ error: 'Connection not found' });
    
    remove('connections', req.params.id);
    res.json({ message: 'Connection rejected' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove connection
router.delete('/:id', (req, res) => {
  try {
    remove('connections', req.params.id);
    res.json({ message: 'Connection removed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get pending requests
router.get('/pending', (req, res) => {
  try {
    const pending = findAll('connections', { receiver_id: req.user.id, status: 'pending' })
      .map(conn => {
        const sender = findById('users', conn.sender_id);
        return {
          ...conn,
          sender: sender ? {
            id: sender.id,
            full_name: sender.full_name,
            profile_photo: sender.profile_photo,
            headline: sender.headline,
            verification_status: sender.verification_status,
            account_type: sender.account_type,
          } : null,
        };
      });
    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get my connections
router.get('/my', (req, res) => {
  try {
    const connections = findWhere('connections', c =>
      (c.sender_id === req.user.id || c.receiver_id === req.user.id) && c.status === 'accepted'
    ).map(conn => {
      const otherId = conn.sender_id === req.user.id ? conn.receiver_id : conn.sender_id;
      const user = findById('users', otherId);
      return {
        connectionId: conn.id,
        ...user ? {
          id: user.id,
          full_name: user.full_name,
          profile_photo: user.profile_photo,
          headline: user.headline,
          verification_status: user.verification_status,
          account_type: user.account_type,
          current_company: user.current_company,
          location: user.location,
        } : {},
      };
    });
    res.json(connections);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get suggestions (people you may know)
router.get('/suggestions', (req, res) => {
  try {
    const me = findById('users', req.user.id);
    const myConnections = findWhere('connections', c =>
      (c.sender_id === req.user.id || c.receiver_id === req.user.id)
    );
    const connectedIds = new Set(myConnections.map(c => c.sender_id === req.user.id ? c.receiver_id : c.sender_id));
    connectedIds.add(req.user.id);
    
    let suggestions = findAll('users')
      .filter(u => !connectedIds.has(u.id) && u.role !== 'admin' && u.is_active)
      .map(u => {
        let score = 0;
        if (me.batch && u.batch === me.batch) score += 3;
        if (me.section && u.section === me.section) score += 2;
        if (me.department && u.department === me.department) score += 1;
        if (me.year && u.year === me.year) score += 1;
        
        // Skill overlap
        const mySkills = findAll('skills', { user_id: req.user.id }).map(s => s.name.toLowerCase());
        const theirSkills = findAll('skills', { user_id: u.id }).map(s => s.name.toLowerCase());
        const overlap = mySkills.filter(s => theirSkills.includes(s)).length;
        score += overlap;
        
        return {
          id: u.id,
          full_name: u.full_name,
          profile_photo: u.profile_photo,
          headline: u.headline,
          verification_status: u.verification_status,
          account_type: u.account_type,
          batch: u.batch,
          current_company: u.current_company,
          location: u.location,
          score,
          mutualConnections: 0,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
    
    res.json(suggestions);
  } catch (err) {
    console.error('Suggestions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Follow user
router.post('/follow/:id', (req, res) => {
  try {
    const existing = findOne('followers', { follower_id: req.user.id, following_id: req.params.id });
    if (existing) {
      remove('followers', existing.id);
      return res.json({ following: false });
    }
    insert('followers', {
      id: uuidv4(),
      follower_id: req.user.id,
      following_id: req.params.id,
      created_at: new Date().toISOString(),
    });
    res.json({ following: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
