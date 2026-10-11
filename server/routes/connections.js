import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { findAll, findById, findOne, findWhere, insert, update, remove } from '../db/schema.js';

const router = express.Router();

// Helper to determine ECE Mentor Circle from profile metadata
function determineECECircle(user, skills = []) {
  const text = `${user.headline || ''} ${user.bio || ''} ${user.job_title || ''} ${user.current_company || ''} ${skills.join(' ')}`.toLowerCase();
  if (text.includes('vlsi') || text.includes('asic') || text.includes('fpga') || text.includes('verilog') || text.includes('rtl') || text.includes('cadence') || text.includes('semiconductor')) {
    return 'VLSI & Chip Design';
  }
  if (text.includes('embedded') || text.includes('arm') || text.includes('stm32') || text.includes('rtos') || text.includes('pcb') || text.includes('microcontroller') || text.includes('arduino') || text.includes('esp32') || text.includes('iot')) {
    return 'Embedded Systems & IoT';
  }
  if (text.includes('robot') || text.includes('ros') || text.includes('automation') || text.includes('sensor') || text.includes('drone')) {
    return 'Robotics & Automation';
  }
  if (text.includes('ai') || text.includes('machine learning') || text.includes('deep learning') || text.includes('tinyml') || text.includes('dsp') || text.includes('signal') || text.includes('vision')) {
    return 'AI & Edge Computing';
  }
  if (text.includes('gate') || text.includes('higher studies') || text.includes('iisc') || text.includes('iit') || text.includes('ms') || text.includes('gre') || text.includes('phd')) {
    return 'GATE & Higher Studies';
  }
  return 'Telecom & Core ECE';
}

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
      message: `${sender?.full_name || 'An ECE member'} wants to connect with you`,
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

// Accept connection request (by connection ID or sender's user ID)
const handleAccept = (req, res) => {
  try {
    let connection = findById('connections', req.params.id);
    if (!connection) {
      connection = findOne('connections', { sender_id: req.params.id, receiver_id: req.user.id, status: 'pending' });
    }
    if (!connection) return res.status(404).json({ error: 'Connection request not found' });
    if (connection.receiver_id !== req.user.id) return res.status(403).json({ error: 'Not authorized to accept this request' });
    
    update('connections', connection.id, { status: 'accepted', updated_at: new Date().toISOString() });
    
    // Create notification for sender
    const accepter = findById('users', req.user.id);
    insert('notifications', {
      id: uuidv4(),
      user_id: connection.sender_id,
      from_user_id: req.user.id,
      type: 'connection_accepted',
      title: 'Connection Accepted',
      message: `${accepter?.full_name || 'Member'} accepted your connection request`,
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
    
    res.json({ message: 'Connection accepted', connection: { ...connection, status: 'accepted' }, success: true });
  } catch (err) {
    console.error('Accept error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
router.put('/:id/accept', handleAccept);
router.post('/:id/accept', handleAccept);

// Reject / Ignore connection request (by connection ID or sender's user ID)
const handleReject = (req, res) => {
  try {
    let connection = findById('connections', req.params.id);
    if (!connection) {
      connection = findOne('connections', { sender_id: req.params.id, receiver_id: req.user.id, status: 'pending' });
    }
    if (!connection) return res.status(404).json({ error: 'Connection not found' });
    if (connection.receiver_id !== req.user.id && connection.sender_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    remove('connections', connection.id);

    // Remove notification sent to receiver
    const notifs = findWhere('notifications', n => 
      n.from_user_id === connection.sender_id && 
      n.user_id === connection.receiver_id && 
      n.type === 'connection_request'
    );
    notifs.forEach(n => remove('notifications', n.id));

    res.json({ message: 'Connection rejected', success: true });
  } catch (err) {
    console.error('Reject error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
router.put('/:id/reject', handleReject);
router.post('/:id/reject', handleReject);

// Withdraw sent invitation (by connection ID or receiver's user ID)
const handleWithdraw = (req, res) => {
  try {
    const targetId = req.params.id || req.body?.receiver_id || req.body?.connection_id || req.body?.id;
    if (!targetId) return res.status(400).json({ error: 'Target ID required' });

    let connection = findById('connections', targetId);
    if (!connection) {
      connection = findOne('connections', { sender_id: req.user.id, receiver_id: targetId, status: 'pending' });
    }

    if (!connection) {
      return res.status(404).json({ error: 'Pending invitation not found' });
    }

    if (connection.sender_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the sender can withdraw this invitation' });
    }

    remove('connections', connection.id);

    // Remove notification sent to the receiver
    const notifs = findWhere('notifications', n => 
      n.from_user_id === req.user.id && 
      n.user_id === connection.receiver_id && 
      n.type === 'connection_request'
    );
    notifs.forEach(n => remove('notifications', n.id));

    res.json({ message: 'Invitation withdrawn successfully', success: true });
  } catch (err) {
    console.error('Withdraw error:', err);
    res.status(500).json({ error: 'Server error withdrawing invitation' });
  }
};
router.delete('/:id/withdraw', handleWithdraw);
router.post('/:id/withdraw', handleWithdraw);
router.post('/withdraw', handleWithdraw);

// Remove existing connection
router.delete('/:id', (req, res) => {
  try {
    let connection = findById('connections', req.params.id);
    if (!connection) {
      connection = findOne('connections', { sender_id: req.user.id, receiver_id: req.params.id }) ||
                   findOne('connections', { sender_id: req.params.id, receiver_id: req.user.id });
    }
    if (connection) {
      remove('connections', connection.id);
    }
    res.json({ message: 'Connection removed', success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get sent invitations (invitations sent by current user that are still pending)
router.get('/sent', (req, res) => {
  try {
    const sent = findAll('connections', { sender_id: req.user.id, status: 'pending' })
      .filter(conn => conn.receiver_id !== req.user.id)
      .map(conn => {
        const receiver = findById('users', conn.receiver_id);
        return {
          ...conn,
          receiver: receiver ? {
            id: receiver.id,
            full_name: receiver.full_name,
            profile_photo: receiver.profile_photo || receiver.avatar || '',
            avatar: receiver.profile_photo || receiver.avatar || '',
            headline: receiver.headline,
            verification_status: receiver.verification_status,
            account_type: receiver.account_type,
            role: receiver.account_type || receiver.role,
            batch: receiver.batch,
            batchYear: receiver.batch,
            current_company: receiver.current_company,
          } : null,
        };
      });
    res.json({ requests: sent, sent, data: sent, success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get pending requests (returns both array and object format for 100% client compatibility)
router.get('/pending', (req, res) => {
  try {
    const pending = findAll('connections', { receiver_id: req.user.id, status: 'pending' })
      .filter(conn => conn.sender_id !== req.user.id)
      .map(conn => {
        const sender = findById('users', conn.sender_id);
        return {
          ...conn,
          sender: sender ? {
            id: sender.id,
            full_name: sender.full_name,
            profile_photo: sender.profile_photo || sender.avatar || '',
            avatar: sender.profile_photo || sender.avatar || '',
            headline: sender.headline,
            verification_status: sender.verification_status,
            account_type: sender.account_type,
            role: sender.account_type || sender.role,
            batch: sender.batch,
            batchYear: sender.batch,
            current_company: sender.current_company,
          } : null,
        };
      });
    res.json({ requests: pending, pending, data: pending, success: true });
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
      const userSkills = findAll('skills', { user_id: otherId }).map(s => s.name);
      return {
        connectionId: conn.id,
        ...user ? {
          id: user.id,
          full_name: user.full_name,
          profile_photo: user.profile_photo || user.avatar || '',
          avatar: user.profile_photo || user.avatar || '',
          headline: user.headline,
          verification_status: user.verification_status,
          account_type: user.account_type,
          role: user.account_type || user.role,
          batch: user.batch,
          batchYear: user.batch,
          current_company: user.current_company,
          job_title: user.job_title,
          location: user.location,
          isAvailableForMentoring: user.mentoring_available === 1,
          pass_it_forward: user.pass_it_forward === 1 || user.mentoring_available === 1,
          circle: determineECECircle(user, userSkills),
          skills: userSkills.length > 0 ? userSkills : ['Embedded Systems', 'Verilog', 'IoT'],
        } : {},
      };
    });
    res.json({ connections, data: connections, success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get suggestions (people you may know) with rich ECE skill & mentor circle details
router.get('/suggestions', (req, res) => {
  try {
    const me = findById('users', req.user.id) || {};
    const myConnections = findWhere('connections', c =>
      (c.sender_id === req.user.id || c.receiver_id === req.user.id)
    );
    const connectedIds = new Set(myConnections.map(c => c.sender_id === req.user.id ? c.receiver_id : c.sender_id));
    connectedIds.add(req.user.id);
    
    const mySkills = findAll('skills', { user_id: req.user.id }).map(s => s.name.toLowerCase());

    let suggestions = findAll('users')
      .filter(u => !connectedIds.has(u.id) && u.role !== 'admin' && (u.is_active === 1 || u.is_active === true || u.is_active === undefined))
      .map(u => {
        let score = 0;
        if (me.batch && u.batch === me.batch) score += 3;
        if (me.section && u.section === me.section) score += 2;
        if (me.department && u.department === me.department) score += 1;
        if (me.year && u.year === me.year) score += 1;
        
        // Skill overlap
        let theirSkills = findAll('skills', { user_id: u.id }).map(s => s.name);
        if (theirSkills.length === 0) {
          // Provide realistic ECE skills from headline/role if user hasn't added to skills table
          const hl = (u.headline || '').toLowerCase();
          if (hl.includes('vlsi') || hl.includes('analog') || hl.includes('ic')) {
            theirSkills = ['VLSI', 'Verilog', 'Cadence Virtuoso', 'FPGA'];
          } else if (hl.includes('embedded') || hl.includes('iot')) {
            theirSkills = ['Embedded C', 'ARM Cortex', 'RTOS', 'IoT', 'PCB Design'];
          } else if (hl.includes('robot')) {
            theirSkills = ['ROS', 'Robotics', 'Arduino', 'Python', 'Sensors'];
          } else if (hl.includes('ai') || hl.includes('dsp')) {
            theirSkills = ['TinyML', 'Python', 'MATLAB', 'DSP', 'Edge AI'];
          } else {
            theirSkills = ['Digital Electronics', 'Microcontrollers', 'C/C++', 'MATLAB'];
          }
        }

        const overlap = mySkills.filter(s => theirSkills.map(t => t.toLowerCase()).includes(s)).length;
        score += overlap * 2;

        const circle = determineECECircle(u, theirSkills);
        const isSenior = u.account_type === 'alumni' || parseInt(u.year || 0) >= 3 || parseInt(u.batch || 0) <= 2025;
        const isAvailableForMentoring = u.mentoring_available === 1 || isSenior;
        const passItForward = u.pass_it_forward === 1 || u.mentoring_available === 1 || u.account_type === 'alumni';

        return {
          id: u.id,
          full_name: u.full_name,
          email: u.email,
          profile_photo: u.profile_photo || u.avatar || '',
          avatar: u.profile_photo || u.avatar || '',
          headline: u.headline || `${u.account_type === 'alumni' ? 'Alumni' : 'Student'} • Department of ECE`,
          bio: u.bio,
          verification_status: u.verification_status || 'verified',
          account_type: u.account_type,
          role: u.account_type || u.role || 'student',
          batch: u.batch,
          batchYear: u.batch,
          year: u.year,
          section: u.section,
          graduation_year: u.graduation_year,
          current_company: u.current_company,
          job_title: u.job_title,
          industry: u.industry,
          location: u.location,
          skills: theirSkills,
          circle,
          isSenior,
          isAvailableForMentoring,
          pass_it_forward: passItForward ? 1 : 0,
          mentoring_career: u.mentoring_career ?? 1,
          mentoring_referrals: u.mentoring_referrals ?? 1,
          mentoring_projects: u.mentoring_projects ?? 1,
          mentoring_lectures: u.mentoring_lectures ?? 0,
          score,
          mutualConnections: Math.floor(Math.random() * 6) + 1,
        };
      })
      .sort((a, b) => b.score - a.score);
    
    res.json({ suggestions, data: suggestions, success: true });
  } catch (err) {
    console.error('Suggestions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get dedicated Mentors & Seniors (HOD Mentor Circles & Alumni)
router.get('/mentors', (req, res) => {
  try {
    const { circle, role, company } = req.query;
    const users = findAll('users').filter(u => u.id !== req.user.id && u.role !== 'admin' && (u.is_active === 1 || u.is_active === true || u.is_active === undefined));
    
    let mentors = users.map(u => {
      let skills = findAll('skills', { user_id: u.id }).map(s => s.name);
      if (skills.length === 0) {
        const hl = (u.headline || '').toLowerCase();
        if (hl.includes('vlsi') || hl.includes('analog')) skills = ['VLSI', 'Verilog', 'Cadence', 'FPGA'];
        else if (hl.includes('embedded') || hl.includes('iot')) skills = ['Embedded C', 'ARM', 'RTOS', 'IoT'];
        else if (hl.includes('robot')) skills = ['ROS', 'Robotics', 'Python', 'Sensors'];
        else skills = ['C/C++', 'MATLAB', 'Microcontrollers', 'DSP'];
      }

      const mentorCircle = determineECECircle(u, skills);
      const isAlumni = u.account_type === 'alumni';
      const isSenior = isAlumni || parseInt(u.year || 0) >= 3 || parseInt(u.batch || 0) <= 2025;
      const passItForward = u.pass_it_forward === 1 || u.mentoring_available === 1 || isAlumni;

      return {
        id: u.id,
        full_name: u.full_name,
        profile_photo: u.profile_photo || u.avatar || '',
        avatar: u.profile_photo || u.avatar || '',
        headline: u.headline || (isAlumni ? `Alumni at ${u.current_company || 'Industry'}` : 'ECE Senior Mentor'),
        bio: u.bio,
        account_type: u.account_type,
        role: u.account_type || u.role,
        batch: u.batch,
        batchYear: u.batch,
        year: u.year,
        graduation_year: u.graduation_year,
        current_company: u.current_company,
        job_title: u.job_title,
        industry: u.industry,
        location: u.location,
        skills,
        circle: mentorCircle,
        isSenior,
        isAvailableForMentoring: true,
        pass_it_forward: passItForward ? 1 : 0,
        mentoring_career: u.mentoring_career ?? 1,
        mentoring_referrals: u.mentoring_referrals ?? 1,
        mentoring_projects: u.mentoring_projects ?? 1,
        mentoring_lectures: u.mentoring_lectures ?? 0,
      };
    }).filter(m => m.isSenior || m.pass_it_forward === 1);

    if (circle && circle !== 'all') {
      mentors = mentors.filter(m => m.circle.toLowerCase() === circle.toLowerCase());
    }
    if (role && role !== 'all') {
      mentors = mentors.filter(m => m.account_type === role);
    }
    if (company && company !== 'all') {
      mentors = mentors.filter(m => (m.current_company || '').toLowerCase().includes(company.toLowerCase()));
    }

    res.json({ mentors, data: mentors, success: true });
  } catch (err) {
    console.error('Mentors error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// "Ask a Senior" - Connect students with relevant seniors/alumni for guidance
router.post('/ask-senior', (req, res) => {
  try {
    const { senior_id, topic, message, domain } = req.body;
    if (!senior_id) return res.status(400).json({ error: 'Senior ID is required' });
    if (!topic || !message) return res.status(400).json({ error: 'Topic and question are required' });

    const student = findById('users', req.user.id);
    const senior = findById('users', senior_id);
    if (!senior) return res.status(404).json({ error: 'Senior mentor not found' });

    // 1. Record mentorship request
    const requestId = uuidv4();
    const mentorshipRecord = {
      id: requestId,
      student_id: req.user.id,
      senior_id,
      topic,
      domain: domain || 'General ECE Guidance',
      message,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    insert('mentorship_requests', mentorshipRecord);

    // 2. Automatically create or locate conversation between them
    let conversation = findOne('conversations', {
      user1_id: req.user.id,
      user2_id: senior_id,
    }) || findOne('conversations', {
      user1_id: senior_id,
      user2_id: req.user.id,
    });

    if (!conversation) {
      conversation = {
        id: uuidv4(),
        user1_id: req.user.id,
        user2_id: senior_id,
        last_message: `[Ask a Senior • ${topic}] ${message}`,
        last_message_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      insert('conversations', conversation);
    } else {
      update('conversations', conversation.id, {
        last_message: `[Ask a Senior • ${topic}] ${message}`,
        last_message_at: new Date().toISOString(),
      });
    }

    // 3. Insert direct message into conversation
    const directMessage = {
      id: uuidv4(),
      conversation_id: conversation.id,
      sender_id: req.user.id,
      content: `🎓 **[Ask a Senior Guidance Request]**\n**Topic:** ${topic}\n**Domain:** ${domain || 'ECE'}\n\n${message}`,
      is_read: 0,
      created_at: new Date().toISOString(),
    };
    insert('messages', directMessage);

    // 4. Send high-priority notification to senior
    insert('notifications', {
      id: uuidv4(),
      user_id: senior_id,
      from_user_id: req.user.id,
      type: 'mentorship_request',
      title: `Ask a Senior: Guidance in ${topic}`,
      message: `${student?.full_name || 'An ECE student'} asked for your mentorship guidance on: "${topic}"`,
      link: `/messages/${req.user.id}`,
      is_read: 0,
      created_at: new Date().toISOString(),
    });

    // 5. Ensure connection request exists so they are linked
    const existingConn = findOne('connections', { sender_id: req.user.id, receiver_id: senior_id }) ||
                         findOne('connections', { sender_id: senior_id, receiver_id: req.user.id });
    if (!existingConn) {
      insert('connections', {
        id: uuidv4(),
        sender_id: req.user.id,
        receiver_id: senior_id,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    res.status(201).json({
      success: true,
      message: `Guidance request sent to ${senior.full_name}! They can respond directly via Messages.`,
      requestId,
      conversationId: conversation.id,
    });
  } catch (err) {
    console.error('Ask Senior error:', err);
    res.status(500).json({ error: 'Server error sending guidance request' });
  }
});

// "Pass It Forward" - Senior/Alumni pledge to guide juniors
router.post('/pass-it-forward', (req, res) => {
  try {
    const user = findById('users', req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newStatus = user.pass_it_forward === 1 ? 0 : 1;
    update('users', req.user.id, {
      pass_it_forward: newStatus,
      mentoring_available: 1,
      mentoring_career: 1,
      mentoring_projects: 1,
      mentoring_referrals: 1,
    });

    res.json({
      success: true,
      pass_it_forward: newStatus,
      message: newStatus === 1
        ? 'Thank you for pledging to Pass It Forward! Your profile now has the Mentor badge.'
        : 'Pass It Forward pledge updated.',
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error updating Pass It Forward' });
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
