import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { findAll, findById, findWhere, insert, update, remove } from '../db/schema.js';

const router = express.Router();

// Get all hackathons
router.get('/', (req, res) => {
  try {
    const { tab, category, search: q } = req.query;
    let hackathons = findAll('hackathons').filter(h => h.is_active);
    let incubation = findAll('incubation_programs').filter(i => i.is_active);
    let workshops = findAll('workshops').filter(w => w.is_active);

    let allItems = [
      ...hackathons.map(h => ({ ...h, category: h.category || 'hackathon' })),
      ...incubation.map(i => ({ ...i, category: 'incubation' })),
      ...workshops.map(w => ({ ...w, category: 'workshop' }))
    ];

    if (tab === 'incubation' || category === 'incubation') {
      allItems = allItems.filter(i => i.category === 'incubation');
    } else if (tab === 'workshops' || category === 'workshop') {
      allItems = allItems.filter(i => i.category === 'workshop');
    } else if (category === 'challenge') {
      allItems = allItems.filter(i => i.category === 'challenge');
    } else if (tab === 'hackathons' || category === 'hackathon') {
      allItems = allItems.filter(i => i.category === 'hackathon');
    }

    if (q) {
      const lower = q.toLowerCase();
      allItems = allItems.filter(i =>
        (i.title || i.name || '').toLowerCase().includes(lower) ||
        (i.organization || i.organizer || i.speaker || '').toLowerCase().includes(lower) ||
        (i.description || '').toLowerCase().includes(lower)
      );
    }

    allItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const enriched = allItems.map(item => ({
      ...item,
      _id: item.id,
      title: item.title || item.name,
      organizer: item.organizer || item.organization || item.speaker || 'RIT ECE Department',
      participants: item.participants || [],
      themes: Array.isArray(item.themes) ? item.themes : (item.theme ? [item.theme] : ['Core ECE', 'Embedded & VLSI', 'Innovation']),
      prizePool: item.prizePool || item.prize_pool || '₹50,000 + Incubation Support'
    }));

    res.json({ hackathons: enriched, items: enriched });
  } catch (err) {
    console.error('Get hackathons error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Register for hackathon / incubation / workshop with Devfolio/Unstop style registration form
router.post('/:id/register', (req, res) => {
  try {
    let table = 'hackathons';
    let item = findById('hackathons', req.params.id);
    if (!item) {
      item = findById('incubation_programs', req.params.id);
      table = 'incubation_programs';
    }
    if (!item) {
      item = findById('workshops', req.params.id);
      table = 'workshops';
    }
    if (!item) return res.status(404).json({ error: 'Opportunity not found' });

    const participants = item.participants || [];
    if (!participants.includes(req.user.id)) {
      participants.push(req.user.id);
      update(table, req.params.id, { participants });
    }

    const regUser = findById('users', req.user.id);
    const existingRegs = findWhere('event_registrations', reg => reg.event_id === req.params.id && reg.user_id === req.user.id);

    const regRecord = {
      event_id: req.params.id,
      event_type: table,
      event_title: item.title || item.name || 'Hackathon / Incubation Event',
      user_id: req.user.id,
      participation_type: req.body.participation_type || 'individual',
      team_name: req.body.team_name || (req.body.participation_type === 'team' ? `${regUser?.full_name || 'Innovator'}'s Team` : 'Solo Participant'),
      lead_name: req.body.lead_name || regUser?.full_name || '',
      lead_email: req.body.lead_email || regUser?.email || '',
      lead_phone: req.body.lead_phone || regUser?.phone || '',
      lead_roll_no: req.body.lead_roll_no || regUser?.registration_no || '',
      lead_department: req.body.lead_department || regUser?.department || 'ECE',
      lead_year: req.body.lead_year || regUser?.year || 'Final Year',
      team_members: Array.isArray(req.body.team_members) ? req.body.team_members : [],
      track: req.body.track || (item.themes && item.themes[0]) || 'General Innovation',
      project_title: req.body.project_title || '',
      project_abstract: req.body.project_abstract || '',
      tech_stack: req.body.tech_stack || '',
      ppt_url: req.body.ppt_url || '',
      ppt_name: req.body.ppt_name || '',
      repo_url: req.body.repo_url || '',
      status: 'confirmed',
      registered_at: new Date().toISOString(),
    };

    let savedReg;
    if (existingRegs.length > 0) {
      update('event_registrations', existingRegs[0].id, regRecord);
      savedReg = { ...existingRegs[0], ...regRecord };
    } else {
      savedReg = {
        id: uuidv4(),
        ...regRecord,
        created_at: new Date().toISOString()
      };
      insert('event_registrations', savedReg);
    }

    // Create notification
    insert('notifications', {
      id: uuidv4(),
      user_id: req.user.id,
      from_user_id: req.user.id,
      type: 'hackathon_alert',
      title: 'Registration Confirmed 🚀',
      message: `Your registration for "${item.title || item.name}" (${savedReg.team_name}) is confirmed!`,
      link: `/hackathons`,
      is_read: 0,
      created_at: new Date().toISOString(),
    });

    res.json({ success: true, registered: true, registration: savedReg, participants });
  } catch (err) {
    console.error('Register hackathon error:', err);
    res.status(500).json({ error: 'Server error registering' });
  }
});

// Get registration for specific event
router.get('/:id/registration', (req, res) => {
  try {
    const regs = findWhere('event_registrations', r => r.event_id === req.params.id && r.user_id === req.user.id);
    if (!regs.length) return res.status(404).json({ error: 'No registration found' });
    res.json(regs[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching registration' });
  }
});

// Create generic
router.post('/', (req, res) => {
  try {
    const hackathon = {
      id: uuidv4(),
      posted_by: req.user.id,
      ...req.body,
      is_active: 1,
      created_at: new Date().toISOString(),
    };
    insert('hackathons', hackathon);
    res.status(201).json({ ...hackathon, _id: hackathon.id });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create hackathon
router.post('/hackathon', (req, res) => {
  try {
    const hackathon = {
      id: uuidv4(),
      posted_by: req.user.id,
      ...req.body,
      is_active: 1,
      created_at: new Date().toISOString(),
    };
    insert('hackathons', hackathon);
    res.status(201).json({ ...hackathon, _id: hackathon.id });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create incubation program
router.post('/incubation', (req, res) => {
  try {
    const program = {
      id: uuidv4(),
      posted_by: req.user.id,
      ...req.body,
      is_active: 1,
      created_at: new Date().toISOString(),
    };
    insert('incubation_programs', program);
    res.status(201).json(program);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create workshop
router.post('/workshop', (req, res) => {
  try {
    const workshop = {
      id: uuidv4(),
      posted_by: req.user.id,
      ...req.body,
      is_active: 1,
      created_at: new Date().toISOString(),
    };
    insert('workshops', workshop);
    res.status(201).json(workshop);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete
router.delete('/:id', (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
    remove('hackathons', req.params.id);
    remove('incubation_programs', req.params.id);
    remove('workshops', req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
