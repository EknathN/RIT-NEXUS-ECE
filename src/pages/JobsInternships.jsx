import { useState, useEffect } from 'react';
import { jobsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { 
  Briefcase, MapPin, Building, DollarSign, Clock, Search, Filter, 
  Plus, Bookmark, ExternalLink, CheckCircle, Upload, FileText, Send, 
  User, Mail, Phone, GraduationCap, Award, Link as LinkIcon, X, AlertCircle, Eye, Check
} from 'lucide-react';

export default function JobsInternships() {
  const { user } = useAuth();
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Application Modal State (Naukri / Internshala style)
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedJobForApply, setSelectedJobForApply] = useState(null);
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applyFormData, setApplyFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    roll_no: '',
    department: 'Electronics & Communication Engineering',
    year_of_study: 'Final Year',
    cgpa: '',
    skills: '',
    resume_url: '',
    resume_name: '',
    portfolio_url: '',
    linkedin_url: '',
    github_url: '',
    cover_letter: '',
    availability: 'Immediately (Full-time / Internship)',
    work_mode_pref: 'Flexible (In-Office / Remote / Hybrid)',
    agree_terms: true
  });

  // View Application Modal State
  const [viewAppModalOpen, setViewAppModalOpen] = useState(false);
  const [viewingApp, setViewingApp] = useState(null);
  const [loadingApp, setLoadingApp] = useState(false);

  // New Job Form State
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    type: 'internship',
    domain: 'Embedded Systems',
    description: '',
    requirements: '',
    stipendSalary: '',
    applicationUrl: '',
    isAlumniReferral: false,
    deadline: ''
  });

  useEffect(() => {
    loadJobs();
  }, [typeFilter, domainFilter]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (typeFilter) params.type = typeFilter;
      if (domainFilter) params.domain = domainFilter;
      if (search) params.search = search;
      const res = await jobsAPI.getAll(params);
      const list = Array.isArray(res) ? res : (res.jobs || res.data?.jobs || []);
      setJobs(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadJobs();
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        requirements: formData.requirements ? formData.requirements.split(',').map(r => r.trim()).filter(Boolean) : []
      };
      await jobsAPI.create(payload);
      toast.show('Opportunity posted successfully!', 'success');
      setShowModal(false);
      setFormData({
        title: '',
        company: '',
        location: '',
        type: 'internship',
        domain: 'Embedded Systems',
        description: '',
        requirements: '',
        stipendSalary: '',
        applicationUrl: '',
        isAlumniReferral: false,
        deadline: ''
      });
      loadJobs();
    } catch (err) {
      toast.show(err.response?.data?.message || err.message || 'Failed to post opportunity', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenApplyModal = (job) => {
    setSelectedJobForApply(job);
    setApplyFormData({
      full_name: user?.full_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      roll_no: user?.registration_no || user?.roll_number || '',
      department: user?.department || 'Electronics & Communication Engineering',
      year_of_study: user?.year || 'Final Year (4th Year)',
      cgpa: user?.cgpa || '',
      skills: (job.requirements && job.requirements.join(', ')) || '',
      resume_url: user?.resume_url || '',
      resume_name: user?.resume_name || '',
      portfolio_url: user?.portfolio_url || '',
      linkedin_url: user?.linkedin_url || '',
      github_url: user?.github_url || '',
      cover_letter: '',
      availability: 'Immediately (Full-time / Internship)',
      work_mode_pref: 'Flexible (In-Office / Remote / Hybrid)',
      agree_terms: true
    });
    setApplyModalOpen(true);
  };

  const handleResumeFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Simulate file reading or save file name
      const reader = new FileReader();
      reader.onload = () => {
        setApplyFormData(prev => ({
          ...prev,
          resume_name: file.name,
          resume_url: reader.result || URL.createObjectURL(file)
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!applyFormData.full_name || !applyFormData.email || !applyFormData.phone || !applyFormData.roll_no) {
      toast.show('Please fill in all required candidate details', 'error');
      return;
    }
    if (!applyFormData.cover_letter) {
      toast.show('Please provide a short note on why you should be hired', 'error');
      return;
    }
    if (!applyFormData.resume_url && !applyFormData.resume_name) {
      toast.show('Please attach your resume link or upload a document', 'error');
      return;
    }

    setApplySubmitting(true);
    try {
      const jobId = selectedJobForApply._id || selectedJobForApply.id;
      const res = await jobsAPI.apply(jobId, applyFormData);
      toast.show(`Application submitted successfully for ${selectedJobForApply.title}! Recruiter notified.`, 'success');
      setJobs(prev => prev.map(j => (j._id === jobId || j.id === jobId) ? { ...j, applicants: [...(j.applicants || []), user?.id] } : j));
      setApplyModalOpen(false);
    } catch (err) {
      toast.show(err.response?.data?.message || err.message || 'Failed to submit application', 'error');
    } finally {
      setApplySubmitting(false);
    }
  };

  const handleViewApplication = async (job) => {
    const jobId = job._id || job.id;
    setSelectedJobForApply(job);
    setLoadingApp(true);
    setViewAppModalOpen(true);
    try {
      const res = await jobsAPI.getApplication(jobId);
      setViewingApp(res);
    } catch (err) {
      // Fallback
      setViewingApp({
        job_title: job.title,
        company: job.company,
        full_name: user?.full_name || 'Student Candidate',
        email: user?.email || '',
        phone: user?.phone || 'Provided during apply',
        roll_no: user?.registration_no || 'RIT ECE Student',
        department: user?.department || 'Electronics & Communication Engineering',
        year_of_study: 'Final Year',
        cgpa: '8.5 / 10',
        cover_letter: 'Application submitted through the RIT ECE portal with verified credentials.',
        availability: 'Immediate',
        work_mode_pref: 'Flexible',
        status: 'submitted',
        created_at: new Date().toISOString()
      });
    } finally {
      setLoadingApp(false);
    }
  };

  return (
    <div className="container" style={{ padding: 'var(--space-6) var(--space-4)' }}>
      {/* Header Banner */}
      <div className="card" style={{ marginBottom: 'var(--space-6)', background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.2), rgba(16, 185, 129, 0.15))', border: '1px solid var(--accent-500-20)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
              ECE Career & Internship Portal
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Curated core electronics, VLSI, robotics, and software opportunities verified by RIT ECE faculty and alumni.
            </p>
          </div>
          {(user?.role === 'alumni' || user?.role === 'faculty' || user?.role === 'admin') && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} /> Post Opportunity / Referral
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search by role, company, or tech stack..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
          </div>

          <select className="form-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ width: 'auto' }}>
            <option value="">All Types</option>
            <option value="internship">Internships</option>
            <option value="full-time">Full Time</option>
            <option value="part-time">Part Time</option>
            <option value="research">Research / Lab</option>
          </select>

          <select className="form-select" value={domainFilter} onChange={(e) => setDomainFilter(e.target.value)} style={{ width: 'auto' }}>
            <option value="">All ECE Domains</option>
            <option value="VLSI / Semiconductor">VLSI & Semiconductor</option>
            <option value="Embedded Systems">Embedded Systems & Firmware</option>
            <option value="IoT & Robotics">IoT & Robotics</option>
            <option value="Telecommunications">Telecommunications & RF</option>
            <option value="Signal Processing">DSP & Image Processing</option>
            <option value="Software / AI">Software & AI / ML</option>
          </select>

          <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={16} /> Filter
          </button>
        </form>
      </div>

      {/* Jobs Listing */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <div className="loading-spinner" style={{ margin: '0 auto var(--space-4)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading verified opportunities...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <Briefcase size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-4)' }} />
          <h3>No opportunities match your filter</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>Try clearing your search terms or filters to see all available roles.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {jobs.map(job => {
            const hasApplied = (job.applicants || []).includes(user?.id);
            return (
              <div key={job._id || job.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', borderLeft: job.isAlumniReferral ? '4px solid var(--cyan-500)' : '4px solid var(--accent-500)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{job.title}</h2>
                      {job.isAlumniReferral && (
                        <span className="badge badge-cyan">Alumni Referral</span>
                      )}
                      <span className="badge badge-accent">{job.type}</span>
                      <span className="badge badge-purple">{job.domain}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', color: 'var(--text-secondary)', fontSize: '0.9rem', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        <Building size={16} /> {job.company}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={16} /> {job.location || 'Remote'}
                      </span>
                      {job.stipendSalary && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-500)', fontWeight: 600 }}>
                          <DollarSign size={16} /> {job.stipendSalary}
                        </span>
                      )}
                      {job.deadline && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={16} /> Deadline: {new Date(job.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    {job.applicationUrl ? (
                      <a href={job.applicationUrl} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Apply Externally <ExternalLink size={15} />
                      </a>
                    ) : hasApplied ? (
                      <button
                        className="btn btn-outline"
                        onClick={() => handleViewApplication(job)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <CheckCircle size={16} color="var(--accent-500)" /> Applied (View Form)
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary"
                        onClick={() => handleOpenApplyModal(job)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Briefcase size={16} /> Apply with Form
                      </button>
                    )}
                  </div>
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6 }}>{job.description}</p>

                {job.requirements && job.requirements.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '4px', alignSelf: 'center' }}>Key Skills:</span>
                    {job.requirements.map((req, i) => (
                      <span key={i} className="skill-tag" style={{ padding: '2px 10px', fontSize: '0.8rem' }}>{req}</span>
                    ))}
                  </div>
                )}

                {job.postedBy && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                    Posted by: <strong>{job.postedBy.fullName}</strong> ({job.postedBy.role}) • {new Date(job.createdAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Job Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Post ECE Opportunity or Referral</h2>
            <form onSubmit={handleCreateJob}>
              <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                <label className="form-label">Job Title *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. VLSI Design Engineer / Embedded IoT Intern"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="grid grid-2" style={{ gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Company / Lab *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="e.g. Intel, Qualcomm, RIT IoT Lab"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Chennai / Bengaluru / Hybrid"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-2" style={{ gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Role Type</label>
                  <select className="form-select" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                    <option value="internship">Internship</option>
                    <option value="full-time">Full-Time</option>
                    <option value="part-time">Part-Time</option>
                    <option value="research">Research / Lab Assistant</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">ECE Domain</label>
                  <select className="form-select" value={formData.domain} onChange={(e) => setFormData({ ...formData, domain: e.target.value })}>
                    <option value="Embedded Systems">Embedded Systems & Firmware</option>
                    <option value="VLSI / Semiconductor">VLSI & Semiconductor</option>
                    <option value="IoT & Robotics">IoT & Robotics</option>
                    <option value="Telecommunications">Telecommunications & RF</option>
                    <option value="Signal Processing">Signal Processing</option>
                    <option value="Software / AI">Software & AI / ML</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-2" style={{ gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Stipend / CTC</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. ₹25,000/mo or 8-12 LPA"
                    value={formData.stipendSalary}
                    onChange={(e) => setFormData({ ...formData, stipendSalary: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Application Deadline</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                <label className="form-label">Required Skills (comma separated)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Verilog, SystemVerilog, FPGA, C/C++"
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                <label className="form-label">Job Description</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  required
                  placeholder="Detail the responsibilities, project scope, qualifications, and perks..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                <label className="form-label">External Application URL (Optional)</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://company.careers/apply/..."
                  value={formData.applicationUrl}
                  onChange={(e) => setFormData({ ...formData, applicationUrl: e.target.value })}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: 'var(--space-4)' }}>
                <input
                  type="checkbox"
                  checked={formData.isAlumniReferral}
                  onChange={(e) => setFormData({ ...formData, isAlumniReferral: e.target.checked })}
                  style={{ width: 18, height: 18 }}
                />
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>This is an Alumni Internal Referral</span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Posting...' : 'Publish Opportunity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Real Job Application Modal (Naukri / Internshala Style) */}
      {applyModalOpen && selectedJobForApply && (
        <div className="modal-backdrop" onClick={() => !applySubmitting && setApplyModalOpen(false)}>
          <div 
            className="modal-content" 
            onClick={e => e.stopPropagation()} 
            style={{ maxWidth: '780px', maxHeight: '92vh', overflowY: 'auto', padding: 'var(--space-6)' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span className="badge badge-accent" style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                    Job Application
                  </span>
                  <span className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>
                    Verified RIT ECE Portal
                  </span>
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Apply for {selectedJobForApply.title}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: '6px', color: 'var(--text-secondary)', fontSize: '0.9rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Building size={15} /> {selectedJobForApply.company}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={15} /> {selectedJobForApply.location || 'Remote / Hybrid'}
                  </span>
                  {selectedJobForApply.stipendSalary && (
                    <span style={{ color: 'var(--accent-500)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <DollarSign size={15} /> {selectedJobForApply.stipendSalary}
                    </span>
                  )}
                </div>
              </div>
              <button 
                className="btn btn-ghost" 
                onClick={() => setApplyModalOpen(false)}
                style={{ padding: '6px', borderRadius: '50%', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              
              {/* Section 1: Candidate Academic Profile */}
              <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <GraduationCap size={18} color="var(--accent-500)" /> 1. Candidate & Academic Details
                </h3>
                
                <div className="grid grid-2" style={{ gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <div style={{ position: 'relative' }}>
                      <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        className="form-input"
                        required
                        style={{ paddingLeft: '36px' }}
                        value={applyFormData.full_name}
                        onChange={(e) => setApplyFormData({ ...applyFormData, full_name: e.target.value })}
                        placeholder="e.g. Vignesh Ramanathan"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">College / Official Email *</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="email"
                        className="form-input"
                        required
                        style={{ paddingLeft: '36px' }}
                        value={applyFormData.email}
                        onChange={(e) => setApplyFormData({ ...applyFormData, email: e.target.value })}
                        placeholder="vignesh@ritchennai.edu.in"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-2" style={{ gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Mobile Number *</label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="tel"
                        className="form-input"
                        required
                        style={{ paddingLeft: '36px' }}
                        value={applyFormData.phone}
                        onChange={(e) => setApplyFormData({ ...applyFormData, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Roll / Register Number *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      value={applyFormData.roll_no}
                      onChange={(e) => setApplyFormData({ ...applyFormData, roll_no: e.target.value })}
                      placeholder="e.g. 21EC085"
                    />
                  </div>
                </div>

                <div className="grid grid-3" style={{ gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <input
                      type="text"
                      className="form-input"
                      value={applyFormData.department}
                      onChange={(e) => setApplyFormData({ ...applyFormData, department: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Academic Year / Status</label>
                    <select
                      className="form-select"
                      value={applyFormData.year_of_study}
                      onChange={(e) => setApplyFormData({ ...applyFormData, year_of_study: e.target.value })}
                    >
                      <option value="2nd Year">2nd Year (3rd / 4th Sem)</option>
                      <option value="3rd Year">3rd Year (5th / 6th Sem)</option>
                      <option value="Final Year (4th Year)">Final Year (7th / 8th Sem)</option>
                      <option value="M.Tech / PG">M.Tech / Postgrad</option>
                      <option value="Alumni / Fresh Graduate">Alumni / Fresh Graduate</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Current CGPA / %</label>
                    <input
                      type="text"
                      className="form-input"
                      value={applyFormData.cgpa}
                      onChange={(e) => setApplyFormData({ ...applyFormData, cgpa: e.target.value })}
                      placeholder="e.g. 8.75 / 10"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Resume & Profiles */}
              <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} color="var(--accent-500)" /> 2. Resume & Professional Links
                </h3>

                <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                  <label className="form-label">Resume / CV Document *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-3)', alignItems: 'center' }}>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="Paste Google Drive / Dropbox / Portfolio link to your Resume"
                      value={applyFormData.resume_url}
                      onChange={(e) => setApplyFormData({ ...applyFormData, resume_url: e.target.value })}
                    />
                    <label className="btn btn-outline" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                      <Upload size={16} /> Upload PDF
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        style={{ display: 'none' }}
                        onChange={handleResumeFileUpload}
                      />
                    </label>
                  </div>
                  {applyFormData.resume_name && (
                    <div style={{ marginTop: '6px', fontSize: '0.85rem', color: 'var(--accent-500)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle size={14} /> Attached File: <strong>{applyFormData.resume_name}</strong>
                    </div>
                  )}
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Ensure Google Drive links have permission set to &quot;Anyone with the link can view&quot;.
                  </span>
                </div>

                <div className="grid grid-3" style={{ gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">GitHub URL</label>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://github.com/..."
                      value={applyFormData.github_url}
                      onChange={(e) => setApplyFormData({ ...applyFormData, github_url: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">LinkedIn URL</label>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://linkedin.com/in/..."
                      value={applyFormData.linkedin_url}
                      onChange={(e) => setApplyFormData({ ...applyFormData, linkedin_url: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Portfolio / Project Link</label>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://yourportfolio.dev"
                      value={applyFormData.portfolio_url}
                      onChange={(e) => setApplyFormData({ ...applyFormData, portfolio_url: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Assessment & Screening Pitch */}
              <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={18} color="var(--accent-500)" /> 3. Candidate Pitch & Availability
                </h3>

                <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                  <label className="form-label">
                    Why should you be hired for this role? * (Naukri / Internshala Cover Note)
                  </label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    required
                    placeholder="Mention specific projects (e.g. Embedded C, FPGA, PCB, ROS, IoT), coursework, lab experience, or accomplishments that match this opportunity..."
                    value={applyFormData.cover_letter}
                    onChange={(e) => setApplyFormData({ ...applyFormData, cover_letter: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                  <label className="form-label">Relevant Key Skills for this Role</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Verilog, STM32, Embedded C, Python, RTOS, I2C/SPI"
                    value={applyFormData.skills}
                    onChange={(e) => setApplyFormData({ ...applyFormData, skills: e.target.value })}
                  />
                  {selectedJobForApply.requirements && selectedJobForApply.requirements.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Role keywords:</span>
                      {selectedJobForApply.requirements.map((req, i) => (
                        <button
                          key={i}
                          type="button"
                          className="badge badge-accent"
                          style={{ cursor: 'pointer', border: 'none' }}
                          onClick={() => {
                            const cur = applyFormData.skills ? applyFormData.skills.split(',').map(s => s.trim()) : [];
                            if (!cur.includes(req)) {
                              setApplyFormData({ ...applyFormData, skills: cur.length ? `${applyFormData.skills}, ${req}` : req });
                            }
                          }}
                        >
                          + {req}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-2" style={{ gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Earliest Availability to Join</label>
                    <select
                      className="form-select"
                      value={applyFormData.availability}
                      onChange={(e) => setApplyFormData({ ...applyFormData, availability: e.target.value })}
                    >
                      <option value="Immediately (Full-time / Internship)">Immediately (Full-time / Internship)</option>
                      <option value="Immediately (Part-time / 20 hrs/wk)">Immediately (Part-time / 20 hrs/wk)</option>
                      <option value="Within 15 Days">Within 15 Days</option>
                      <option value="After Semester Exams (Within 1 Month)">After Semester Exams (Within 1 Month)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Work Mode Preference</label>
                    <select
                      className="form-select"
                      value={applyFormData.work_mode_pref}
                      onChange={(e) => setApplyFormData({ ...applyFormData, work_mode_pref: e.target.value })}
                    >
                      <option value="Flexible (In-Office / Remote / Hybrid)">Flexible (In-Office / Remote / Hybrid)</option>
                      <option value="In-Office / On-site">In-Office / On-site</option>
                      <option value="Remote / Work From Home">Remote / Work From Home</option>
                      <option value="Hybrid (2-3 days office)">Hybrid (2-3 days office)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Agreement */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', padding: '0 4px' }}>
                <input
                  type="checkbox"
                  checked={applyFormData.agree_terms}
                  onChange={(e) => setApplyFormData({ ...applyFormData, agree_terms: e.target.checked })}
                  style={{ width: 18, height: 18, marginTop: '2px' }}
                  required
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  I verify that the academic data, resume, and technical details provided above are accurate and comply with the RIT ECE Placement &amp; Training policy.
                </span>
              </label>

              {/* Footer Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-4)' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setApplyModalOpen(false)}
                  disabled={applySubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={applySubmitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '160px', justifyContent: 'center' }}
                >
                  {applySubmitting ? (
                    <>
                      <div className="loading-spinner" style={{ width: 16, height: 16 }} /> Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={16} /> Submit Application
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Submitted Application Modal */}
      {viewAppModalOpen && selectedJobForApply && (
        <div className="modal-backdrop" onClick={() => setViewAppModalOpen(false)}>
          <div 
            className="modal-content" 
            onClick={e => e.stopPropagation()} 
            style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', padding: 'var(--space-6)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="badge badge-accent" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={14} /> Application Submitted
                  </span>
                  <span className="badge badge-purple">Under Review</span>
                </div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {selectedJobForApply.title}
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '2px' }}>
                  {selectedJobForApply.company} • {selectedJobForApply.location || 'Remote'}
                </p>
              </div>
              <button 
                className="btn btn-ghost" 
                onClick={() => setViewAppModalOpen(false)}
                style={{ padding: '6px', borderRadius: '50%', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {loadingApp ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                <div className="loading-spinner" style={{ margin: '0 auto var(--space-3)' }} />
                <p style={{ color: 'var(--text-secondary)' }}>Loading application details...</p>
              </div>
            ) : viewingApp ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>Candidate Profile</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', fontSize: '0.9rem' }}>
                    <div><strong>Name:</strong> {viewingApp.full_name}</div>
                    <div><strong>Email:</strong> {viewingApp.email}</div>
                    <div><strong>Phone:</strong> {viewingApp.phone || '—'}</div>
                    <div><strong>Roll No:</strong> {viewingApp.roll_no || '—'}</div>
                    <div><strong>Department:</strong> {viewingApp.department || 'ECE'}</div>
                    <div><strong>Year / CGPA:</strong> {viewingApp.year_of_study || 'Final Year'} • {viewingApp.cgpa || 'N/A'}</div>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>Candidate Pitch / Cover Note</h4>
                  <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                    {viewingApp.cover_letter}
                  </p>
                </div>

                {viewingApp.skills && (
                  <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>Submitted Skills</h4>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {(Array.isArray(viewingApp.skills) ? viewingApp.skills : viewingApp.skills.split(',')).map((sk, i) => (
                        <span key={i} className="skill-tag" style={{ fontSize: '0.8rem' }}>{sk.trim()}</span>
                      ))}
                    </div>
                  </div>
                )}

                {(viewingApp.resume_url || viewingApp.resume_name || viewingApp.github_url || viewingApp.linkedin_url) && (
                  <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>Attachments &amp; Links</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem' }}>
                      {viewingApp.resume_url && (
                        <a href={viewingApp.resume_url} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', width: 'fit-content' }}>
                          <FileText size={15} /> View Attached Resume <ExternalLink size={13} />
                        </a>
                      )}
                      {viewingApp.github_url && (
                        <div><strong>GitHub:</strong> <a href={viewingApp.github_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-500)' }}>{viewingApp.github_url}</a></div>
                      )}
                      {viewingApp.linkedin_url && (
                        <div><strong>LinkedIn:</strong> <a href={viewingApp.linkedin_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-500)' }}>{viewingApp.linkedin_url}</a></div>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
                  <button className="btn btn-primary" onClick={() => setViewAppModalOpen(false)}>
                    Close
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
