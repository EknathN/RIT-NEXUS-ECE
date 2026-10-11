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
    
    // Get related data with fallbacks
    let rawEdu = findAll('education', { user_id: user.id });
    if (rawEdu.length === 0 && Array.isArray(user.education)) rawEdu = user.education;
    const education = rawEdu.map(e => ({
      ...e,
      institution: e.institution || e.school || '',
      school: e.institution || e.school || '',
      start_year: e.start_year || e.startDate || '',
      startDate: e.start_year || e.startDate || '',
      end_year: e.end_year || e.endDate || '',
      endDate: e.end_year || e.endDate || '',
    }));

    let rawExp = findAll('experience', { user_id: user.id });
    if (rawExp.length === 0 && (Array.isArray(user.experience) || Array.isArray(user.experiences))) {
      rawExp = user.experience || user.experiences;
    }
    const experience = rawExp.map(e => ({
      ...e,
      position: e.position || e.title || '',
      title: e.title || e.position || '',
      start_date: e.start_date || e.startDate || '',
      startDate: e.startDate || e.start_date || '',
      end_date: e.end_date || e.endDate || '',
      endDate: e.endDate || e.end_date || '',
      is_current: !!(e.is_current ?? e.current),
      current: !!(e.current ?? e.is_current),
    }));

    let rawSkills = findAll('skills', { user_id: user.id });
    if (rawSkills.length === 0 && Array.isArray(user.skills)) {
      rawSkills = user.skills.map(s => typeof s === 'string' ? { id: s, name: s, endorsement_count: 0 } : s);
    }
    const skills = rawSkills;

    let rawProj = findAll('projects', { user_id: user.id });
    if (rawProj.length === 0 && Array.isArray(user.projects)) rawProj = user.projects;
    const projects = rawProj.map(p => ({
      ...p,
      name: p.name || p.title || '',
      title: p.title || p.name || '',
      project_link: p.project_link || p.link || '',
      link: p.link || p.project_link || '',
      technologies: Array.isArray(p.technologies) ? p.technologies.join(', ') : (p.technologies || ''),
    }));

    let rawCerts = findAll('certifications', { user_id: user.id });
    if (rawCerts.length === 0 && Array.isArray(user.certifications)) rawCerts = user.certifications;
    const certifications = rawCerts.map(c => ({
      ...c,
      name: c.name || c.title || '',
      title: c.title || c.name || '',
      organization: c.organization || c.issuer || '',
      issue_date: c.issue_date || c.issueDate || '',
      issueDate: c.issue_date || c.issueDate || '',
    }));

    const achievements = findAll('achievements', { user_id: user.id });
    const languages = findAll('languages', { user_id: user.id });
    const interests = findAll('interests', { user_id: user.id });
    
    // Get connection count
    const connections = findWhere('connections', c => 
      (c.sender_id === user.id || c.receiver_id === user.id) && c.status === 'accepted'
    ).length;

    // Check connection status with current user
    let connectionStatus = 'none';
    let connectionId = null;
    let isConnectionSender = false;
    let canWithdraw = false;
    let canAccept = false;

    const conn = findOne('connections', { sender_id: req.user.id, receiver_id: user.id }) ||
                 findOne('connections', { sender_id: user.id, receiver_id: req.user.id });
    if (conn) {
      connectionId = conn.id;
      if (conn.status === 'accepted') {
        connectionStatus = 'accepted';
      } else if (conn.status === 'pending') {
        if (conn.sender_id === req.user.id) {
          connectionStatus = 'pending_sent';
          isConnectionSender = true;
          canWithdraw = true;
        } else {
          connectionStatus = 'pending_received';
          isConnectionSender = false;
          canAccept = true;
        }
      } else {
        connectionStatus = conn.status;
      }
    }
    
    // Check follow status
    const isFollowing = !!findOne('followers', { follower_id: req.user.id, following_id: user.id });
    
    res.json({
      ...safeUser,
      education,
      experience,
      experiences: experience,
      skills,
      projects,
      certifications,
      achievements,
      languages,
      interests,
      connectionCount: connections,
      connectionStatus,
      connectionId,
      isConnectionSender,
      canWithdraw,
      canAccept,
      rawConnectionStatus: conn ? conn.status : 'none',
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

    if (updates.socialLinks) {
      if (updates.socialLinks.github !== undefined) updates.github = updates.socialLinks.github;
      if (updates.socialLinks.linkedin !== undefined) updates.linkedin = updates.socialLinks.linkedin;
      if (updates.socialLinks.portfolio !== undefined) updates.portfolio = updates.socialLinks.portfolio;
    }
    
    // Sync Experiences
    let savedExperience = [];
    if (Array.isArray(updates.experiences) || Array.isArray(updates.experience)) {
      const expList = updates.experiences || updates.experience;
      const existing = findAll('experience', { user_id: req.user.id });
      existing.forEach(e => remove('experience', e.id));

      savedExperience = expList.filter(e => e && (e.title || e.position || e.company)).map(e => {
        const item = {
          id: e.id || uuidv4(),
          user_id: req.user.id,
          position: e.position || e.title || '',
          title: e.title || e.position || '',
          company: e.company || '',
          location: e.location || '',
          start_date: e.start_date || e.startDate || '',
          startDate: e.startDate || e.start_date || '',
          end_date: e.end_date || e.endDate || '',
          endDate: e.endDate || e.end_date || '',
          is_current: !!(e.is_current ?? e.current),
          current: !!(e.current ?? e.is_current),
          employment_type: e.employment_type || 'Full-time',
          description: e.description || '',
          created_at: e.created_at || new Date().toISOString()
        };
        insert('experience', item);
        return item;
      });
      updates.experiences = savedExperience;
      updates.experience = savedExperience;
    }

    // Sync Projects
    let savedProjects = [];
    if (Array.isArray(updates.projects)) {
      const existing = findAll('projects', { user_id: req.user.id });
      existing.forEach(p => remove('projects', p.id));

      savedProjects = updates.projects.filter(p => p && (p.name || p.title)).map(p => {
        const techs = Array.isArray(p.technologies)
          ? p.technologies.join(', ')
          : (p.technologies || '');
        const item = {
          id: p.id || uuidv4(),
          user_id: req.user.id,
          name: p.name || p.title || '',
          title: p.title || p.name || '',
          description: p.description || '',
          technologies: techs,
          project_link: p.project_link || p.link || '',
          link: p.link || p.project_link || '',
          created_at: p.created_at || new Date().toISOString()
        };
        insert('projects', item);
        return item;
      });
      updates.projects = savedProjects;
    }

    // Sync Education
    let savedEducation = [];
    if (Array.isArray(updates.education)) {
      const existing = findAll('education', { user_id: req.user.id });
      existing.forEach(e => remove('education', e.id));

      savedEducation = updates.education.filter(e => e && (e.institution || e.degree)).map(e => {
        const item = {
          id: e.id || uuidv4(),
          user_id: req.user.id,
          institution: e.institution || e.school || '',
          degree: e.degree || '',
          department: e.department || e.fieldOfStudy || '',
          start_year: e.start_year || e.startDate || '',
          end_year: e.end_year || e.endDate || '',
          grade: e.grade || '',
          created_at: e.created_at || new Date().toISOString()
        };
        insert('education', item);
        return item;
      });
      updates.education = savedEducation;
    }

    // Sync Certifications
    let savedCertifications = [];
    if (Array.isArray(updates.certifications)) {
      const existing = findAll('certifications', { user_id: req.user.id });
      existing.forEach(c => remove('certifications', c.id));

      savedCertifications = updates.certifications.filter(c => c && (c.name || c.title)).map(c => {
        const item = {
          id: c.id || uuidv4(),
          user_id: req.user.id,
          name: c.name || c.title || '',
          organization: c.organization || c.issuer || '',
          issue_date: c.issue_date || c.issueDate || '',
          credential_url: c.credential_url || c.credentialUrl || '',
          created_at: c.created_at || new Date().toISOString()
        };
        insert('certifications', item);
        return item;
      });
      updates.certifications = savedCertifications;
    }

    // Sync Skills
    if (updates.skills) {
      const skillNames = Array.isArray(updates.skills)
        ? updates.skills
        : typeof updates.skills === 'string'
          ? updates.skills.split(',').map(s => s.trim()).filter(Boolean)
          : [];
      if (skillNames.length > 0) {
        const existing = findAll('skills', { user_id: req.user.id });
        existing.forEach(s => remove('skills', s.id));
        skillNames.forEach(name => {
          insert('skills', {
            id: uuidv4(),
            user_id: req.user.id,
            name: typeof name === 'object' ? name.name : name,
            endorsement_count: 0,
            created_at: new Date().toISOString()
          });
        });
      }
    }

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
    res.json({
      ...safeUser,
      education: findAll('education', { user_id: req.user.id }),
      experience: findAll('experience', { user_id: req.user.id }),
      experiences: findAll('experience', { user_id: req.user.id }),
      projects: findAll('projects', { user_id: req.user.id }),
      certifications: findAll('certifications', { user_id: req.user.id }),
      skills: findAll('skills', { user_id: req.user.id }),
    });
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
