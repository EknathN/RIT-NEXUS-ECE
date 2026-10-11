import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { findAll, findById, findOne, findWhere, insert, update, remove } from '../db/schema.js';

const router = express.Router();

// Get all events
router.get('/', (req, res) => {
  try {
    const { type, search: q } = req.query;
    let events = findAll('events').filter(e => e.is_active);
    
    if (type) events = events.filter(e => e.event_type === type);
    if (q) {
      const lower = q.toLowerCase();
      events = events.filter(e =>
        e.title.toLowerCase().includes(lower) ||
        (e.description || '').toLowerCase().includes(lower)
      );
    }
    
    events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    const enriched = events.map(e => {
      const isRegistered = !!findOne('event_registrations', { event_id: e.id, user_id: req.user.id });
      const attendeeCount = findAll('event_registrations', { event_id: e.id }).length;
      return { ...e, isRegistered, attendeeCount };
    });
    
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get event by ID
router.get('/:id', (req, res) => {
  try {
    const event = findById('events', req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    
    const isRegistered = !!findOne('event_registrations', { event_id: req.params.id, user_id: req.user.id });
    const attendees = findAll('event_registrations', { event_id: req.params.id }).map(r => {
      const user = findById('users', r.user_id);
      return user ? { id: user.id, full_name: user.full_name, profile_photo: user.profile_photo } : null;
    }).filter(Boolean);
    
    res.json({ ...event, isRegistered, attendees, attendeeCount: attendees.length });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create event
router.post('/', (req, res) => {
  try {
    const event = {
      id: uuidv4(),
      posted_by: req.user.id,
      ...req.body,
      is_active: 1,
      created_at: new Date().toISOString(),
    };
    insert('events', event);
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Register for event
router.post('/:id/register', (req, res) => {
  try {
    const existing = findOne('event_registrations', { event_id: req.params.id, user_id: req.user.id });
    if (existing) {
      remove('event_registrations', existing.id);
      return res.json({ registered: false });
    }
    insert('event_registrations', {
      id: uuidv4(),
      event_id: req.params.id,
      user_id: req.user.id,
      created_at: new Date().toISOString(),
    });
    res.json({ registered: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete event
router.delete('/:id', (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
    remove('events', req.params.id);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
