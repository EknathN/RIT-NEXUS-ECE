import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { findAll, findById, findWhere, insert, update, remove } from '../db/schema.js';

const router = express.Router();

// Get all jobs
router.get('/', (req, res) => {
  try {
    const { type, domain, location, work_mode, skills, search: q, page = 1, limit = 50 } = req.query;
    let jobs = findAll('jobs').filter(j => j.is_active);
    
    if (type) jobs = jobs.filter(j => (j.employment_type === type || j.type === type));
    if (domain) jobs = jobs.filter(j => (j.domain === domain || j.industry === domain || (j.domain && j.domain.toLowerCase().includes(domain.toLowerCase()))));
    if (location) jobs = jobs.filter(j => j.location && j.location.toLowerCase().includes(location.toLowerCase()));
    if (work_mode) jobs = jobs.filter(j => j.work_mode === work_mode);
    if (skills) {
      const skillList = skills.toLowerCase().split(',');
      jobs = jobs.filter(j => {
        const jobSkills = (j.skills || (Array.isArray(j.requirements) ? j.requirements.join(' ') : '')).toLowerCase();
        return skillList.some(s => jobSkills.includes(s.trim()));
      });
    }
    if (q) {
      const lower = q.toLowerCase();
      jobs = jobs.filter(j =>
        (j.title || '').toLowerCase().includes(lower) ||
        (j.company || '').toLowerCase().includes(lower) ||
        (j.description || '').toLowerCase().includes(lower) ||
        (j.domain || '').toLowerCase().includes(lower)
      );
    }
    
    jobs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    const total = jobs.length;
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginatedJobs = jobs.slice(start, start + parseInt(limit));
    
    // Check saved status & enrich
    const enriched = paginatedJobs.map(job => {
      const isSaved = !!findWhere('saved_jobs', sj => sj.job_id === job.id && sj.user_id === req.user.id).length;
      const poster = findById('users', job.posted_by);
      const reqList = Array.isArray(job.requirements) 
        ? job.requirements 
        : (job.skills ? job.skills.split(',').map(s => s.trim()).filter(Boolean) : []);
      
      return {
        ...job,
        _id: job.id,
        isSaved,
        type: job.type || job.employment_type || 'full-time',
        domain: job.domain || job.industry || 'Embedded Systems',
        stipendSalary: job.stipendSalary || job.salary_range || '',
        requirements: reqList,
        applicants: job.applicants || [],
        poster: poster ? { full_name: poster.full_name, profile_photo: poster.profile_photo } : null
      };
    });
    
    res.json({ jobs: enriched, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error('Get jobs error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Apply to job with full application form data
router.post('/:id/apply', (req, res) => {
  try {
    const job = findById('jobs', req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    
    const applicants = job.applicants || [];
    if (!applicants.includes(req.user.id)) {
      applicants.push(req.user.id);
      update('jobs', req.params.id, { applicants });
    }

    const applicantUser = findById('users', req.user.id);
    const existingApps = findWhere('job_applications', app => app.job_id === req.params.id && app.user_id === req.user.id);

    const appData = {
      job_id: req.params.id,
      user_id: req.user.id,
      job_title: job.title,
      company: job.company,
      full_name: req.body.full_name || applicantUser?.full_name || 'Student Candidate',
      email: req.body.email || applicantUser?.email || '',
      phone: req.body.phone || applicantUser?.phone || '',
      roll_no: req.body.roll_no || applicantUser?.registration_no || '',
      department: req.body.department || applicantUser?.department || 'ECE',
      year_of_study: req.body.year_of_study || applicantUser?.year || 'Final Year',
      cgpa: req.body.cgpa || '',
      skills: Array.isArray(req.body.skills) ? req.body.skills : (req.body.skills ? req.body.skills.split(',').map(s => s.trim()) : []),
      resume_url: req.body.resume_url || '',
      resume_name: req.body.resume_name || '',
      portfolio_url: req.body.portfolio_url || '',
      linkedin_url: req.body.linkedin_url || '',
      github_url: req.body.github_url || '',
      cover_letter: req.body.cover_letter || req.body.why_hire || '',
      availability: req.body.availability || 'Immediate (Full-time / Internship)',
      work_mode_pref: req.body.work_mode_pref || 'Flexible',
      status: 'submitted',
      updated_at: new Date().toISOString()
    };

    let savedApp;
    if (existingApps.length > 0) {
      update('job_applications', existingApps[0].id, appData);
      savedApp = { ...existingApps[0], ...appData };
    } else {
      savedApp = {
        id: uuidv4(),
        ...appData,
        created_at: new Date().toISOString()
      };
      insert('job_applications', savedApp);
    }

    // Create notification for job poster
    if (job.posted_by && job.posted_by !== req.user.id) {
      insert('notifications', {
        id: uuidv4(),
        user_id: job.posted_by,
        from_user_id: req.user.id,
        type: 'job_alert',
        title: 'New Job Application Received',
        message: `${appData.full_name} submitted an application for ${job.title} at ${job.company}.`,
        link: `/jobs`,
        is_read: 0,
        created_at: new Date().toISOString(),
      });
    }

    res.json({ success: true, message: 'Application submitted successfully!', application: savedApp, applicants });
  } catch (err) {
    console.error('Apply job error:', err);
    res.status(500).json({ error: 'Server error applying to job' });
  }
});

// Get user's application for a specific job
router.get('/:id/application', (req, res) => {
  try {
    const apps = findWhere('job_applications', app => app.job_id === req.params.id && app.user_id === req.user.id);
    if (!apps.length) return res.status(404).json({ error: 'No application found' });
    res.json(apps[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching application' });
  }
});

// Get job by ID
router.get('/:id', (req, res) => {
  try {
    const job = findById('jobs', req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const isSaved = !!findWhere('saved_jobs', sj => sj.job_id === job.id && sj.user_id === req.user.id).length;
    const hasApplied = (job.applicants || []).includes(req.user.id);
    res.json({ ...job, _id: job.id, isSaved, hasApplied, applicants: job.applicants || [] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create job (admin or verified users)
router.post('/', (req, res) => {
  try {
    const job = {
      id: uuidv4(),
      posted_by: req.user.id,
      ...req.body,
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    insert('jobs', job);
    res.status(201).json(job);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Save/unsave job
router.post('/:id/save', (req, res) => {
  try {
    const existing = findWhere('saved_jobs', sj => sj.job_id === req.params.id && sj.user_id === req.user.id);
    if (existing.length) {
      remove('saved_jobs', existing[0].id);
      return res.json({ saved: false });
    }
    insert('saved_jobs', {
      id: uuidv4(),
      user_id: req.user.id,
      job_id: req.params.id,
      created_at: new Date().toISOString(),
    });
    res.json({ saved: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete job
router.delete('/:id', (req, res) => {
  try {
    const job = findById('jobs', req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.posted_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    remove('jobs', req.params.id);
    res.json({ message: 'Job deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
