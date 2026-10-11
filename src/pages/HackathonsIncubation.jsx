import { useState, useEffect } from 'react';
import { hackathonsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { 
  Trophy, Calendar, Users, Award, ExternalLink, Plus, MapPin, 
  Sparkles, CheckCircle, Tag, UserPlus, Trash2, Code, Layers, 
  FileCode, Check, X, User, Mail, Phone, GraduationCap, ShieldCheck, Rocket, Eye,
  Upload, FileText
} from 'lucide-react';

export default function HackathonsIncubation() {
  const { user } = useAuth();
  const toast = useToast();
  const [hackathons, setHackathons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Unstop / Devfolio Registration Modal State
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [selectedEventForReg, setSelectedEventForReg] = useState(null);
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regFormData, setRegFormData] = useState({
    participation_type: 'team', // 'team' | 'individual'
    team_name: '',
    lead_name: '',
    lead_email: '',
    lead_phone: '',
    lead_roll_no: '',
    lead_department: 'Electronics & Communication Engineering',
    lead_year: 'Final Year',
    team_members: [
      { name: '', email: '', roll_no: '', department: 'ECE' }
    ],
    track: '',
    project_title: '',
    project_abstract: '',
    tech_stack: '',
    ppt_url: '',
    ppt_name: '',
    repo_url: '',
    agree_rules: true
  });

  // View Registration Modal State
  const [viewRegModalOpen, setViewRegModalOpen] = useState(false);
  const [viewingReg, setViewingReg] = useState(null);
  const [loadingReg, setLoadingReg] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    organizer: '',
    category: 'hackathon',
    description: '',
    themes: '',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    mode: 'Hybrid',
    venue: '',
    prizePool: '',
    eligibility: '',
    maxTeamSize: 4,
    registrationLink: ''
  });

  useEffect(() => {
    loadHackathons();
  }, [filterType]);

  const loadHackathons = async () => {
    setLoading(true);
    try {
      const params = filterType !== 'all' ? { category: filterType } : {};
      const res = await hackathonsAPI.getAll(params);
      const list = Array.isArray(res) ? res : (res.hackathons || res.items || res.data?.hackathons || []);
      setHackathons(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        themes: formData.themes ? formData.themes.split(',').map(t => t.trim()).filter(Boolean) : []
      };
      await hackathonsAPI.create(payload);
      toast.show('Hackathon/Incubation program published!', 'success');
      setShowModal(false);
      loadHackathons();
    } catch (err) {
      toast.show(err.response?.data?.message || err.message || 'Failed to create', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenRegisterModal = (item) => {
    setSelectedEventForReg(item);
    const defaultTrack = (item.themes && item.themes[0]) || 'Core Hardware & IoT Innovation';
    setRegFormData({
      participation_type: (item.maxTeamSize && item.maxTeamSize > 1) ? 'team' : 'individual',
      team_name: '',
      lead_name: user?.full_name || '',
      lead_email: user?.email || '',
      lead_phone: user?.phone || '',
      lead_roll_no: user?.registration_no || user?.roll_number || '',
      lead_department: user?.department || 'Electronics & Communication Engineering',
      lead_year: user?.year || 'Final Year (4th Year)',
      team_members: [
        { name: '', email: '', roll_no: '', department: 'ECE' }
      ],
      track: defaultTrack,
      project_title: '',
      project_abstract: '',
      tech_stack: '',
      ppt_url: '',
      ppt_name: '',
      repo_url: '',
      agree_rules: true
    });
    setRegModalOpen(true);
  };

  const handlePptFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setRegFormData(prev => ({
          ...prev,
          ppt_name: file.name,
          ppt_url: reader.result || URL.createObjectURL(file)
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTeamMember = () => {
    const maxMembers = (selectedEventForReg?.maxTeamSize || 4) - 1; // excluding leader
    if (regFormData.team_members.length >= maxMembers) {
      toast.show(`Maximum team size is ${selectedEventForReg?.maxTeamSize || 4} members including team lead`, 'info');
      return;
    }
    setRegFormData(prev => ({
      ...prev,
      team_members: [
        ...prev.team_members,
        { name: '', email: '', roll_no: '', department: 'ECE' }
      ]
    }));
  };

  const handleRemoveTeamMember = (index) => {
    setRegFormData(prev => ({
      ...prev,
      team_members: prev.team_members.filter((_, i) => i !== index)
    }));
  };

  const handleTeamMemberChange = (index, field, value) => {
    setRegFormData(prev => {
      const updated = [...prev.team_members];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, team_members: updated };
    });
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (regFormData.participation_type === 'team' && !regFormData.team_name.trim()) {
      toast.show('Please provide a Team Name', 'error');
      return;
    }
    if (!regFormData.lead_name || !regFormData.lead_email || !regFormData.lead_phone || !regFormData.lead_roll_no) {
      toast.show('Please fill in all team lead details', 'error');
      return;
    }
    if (!regFormData.project_title || !regFormData.project_abstract) {
      toast.show('Please enter your project title and solution abstract', 'error');
      return;
    }
    if (!regFormData.ppt_url && !regFormData.ppt_name) {
      toast.show('Pitch Deck PPT is mandatory. Please upload your presentation or paste the link.', 'error');
      return;
    }

    setRegSubmitting(true);
    try {
      const eventId = selectedEventForReg._id || selectedEventForReg.id;
      const res = await hackathonsAPI.register(eventId, regFormData);
      toast.show(`Registration confirmed for "${selectedEventForReg.title}"! 🚀`, 'success');
      setHackathons(prev => prev.map(h => (h._id === eventId || h.id === eventId) ? { ...h, participants: [...(h.participants || []), user?.id] } : h));
      setRegModalOpen(false);
    } catch (err) {
      toast.show(err.response?.data?.message || err.message || 'Failed to register', 'error');
    } finally {
      setRegSubmitting(false);
    }
  };

  const handleViewRegistration = async (item) => {
    const eventId = item._id || item.id;
    setSelectedEventForReg(item);
    setLoadingReg(true);
    setViewRegModalOpen(true);
    try {
      const res = await hackathonsAPI.getRegistration(eventId);
      setViewingReg(res);
    } catch (err) {
      // Fallback
      setViewingReg({
        event_title: item.title,
        participation_type: 'team',
        team_name: `${user?.full_name || 'Innovator'}'s Team`,
        lead_name: user?.full_name || 'Student Lead',
        lead_email: user?.email || '',
        lead_phone: user?.phone || 'Provided during registration',
        lead_roll_no: user?.registration_no || 'RIT ECE Student',
        lead_department: 'ECE',
        lead_year: 'Final Year',
        team_members: [],
        track: (item.themes && item.themes[0]) || 'Hardware Innovation',
        project_title: 'Submitted Prototype Project',
        project_abstract: 'Detailed abstract and architecture submitted on Devfolio / Unstop verified platform.',
        tech_stack: 'Embedded Systems & Software',
        status: 'confirmed',
        registered_at: new Date().toISOString()
      });
    } finally {
      setLoadingReg(false);
    }
  };

  return (
    <div className="container" style={{ padding: 'var(--space-6) var(--space-4)' }}>
      {/* Banner */}
      <div className="card" style={{ marginBottom: 'var(--space-6)', background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(6, 182, 212, 0.15))', border: '1px solid var(--accent-500-20)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
              Hackathons & Incubation Cell
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Turn hardware and embedded ideas into commercial prototypes. Explore Smart India Hackathon, RIT InnoVate, MSME Incubation & seed grants.
            </p>
          </div>
          {(user?.role === 'faculty' || user?.role === 'admin' || user?.role === 'alumni') && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} /> Host Hackathon / Grant
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-2)' }}>
        <button className={`btn ${filterType === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilterType('all')}>
          All Opportunities
        </button>
        <button className={`btn ${filterType === 'hackathon' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilterType('hackathon')}>
          Hackathons & Design Contests
        </button>
        <button className={`btn ${filterType === 'incubation' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilterType('incubation')}>
          Incubation & Grants
        </button>
        <button className={`btn ${filterType === 'challenge' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilterType('challenge')}>
          Innovation Challenges
        </button>
      </div>

      {/* Grid listing */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <div className="loading-spinner" style={{ margin: '0 auto var(--space-4)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading challenges & hackathons...</p>
        </div>
      ) : hackathons.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <Trophy size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-4)' }} />
          <h3>No events found in this category</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>Check back soon or filter by &quot;All Opportunities&quot;.</p>
        </div>
      ) : (
        <div className="grid grid-2" style={{ gap: 'var(--space-6)' }}>
          {hackathons.map(item => {
            const hasJoined = (item.participants || []).includes(user?.id);
            return (
              <div key={item._id || item.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '4px solid var(--accent-500)' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                    <span className="badge badge-accent" style={{ textTransform: 'uppercase' }}>{item.category}</span>
                    <span className="badge badge-purple" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Award size={14} /> Prize: {item.prizePool || 'Certificates & Mentorship'}
                    </span>
                  </div>

                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                    {item.title}
                  </h2>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                    Organized by: <strong style={{ color: 'var(--text-primary)' }}>{item.organizer}</strong>
                  </p>

                  <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 'var(--space-4)' }}>
                    {item.description}
                  </p>

                  {/* Themes / Tracks */}
                  {item.themes && item.themes.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
                      {item.themes.map((theme, i) => (
                        <span key={i} className="skill-tag" style={{ fontSize: '0.75rem', padding: '3px 10px' }}>
                          <Tag size={12} style={{ display: 'inline', marginRight: 4 }} />{theme}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Details Meta */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={15} /> Starts: {new Date(item.startDate).toLocaleDateString()}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={15} /> Mode: {item.mode || 'Hybrid'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={15} /> Team: Up to {item.maxTeamSize || 4} members
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle size={15} /> {item.participants?.length || 0} teams registered
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-2)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-4)' }}>
                  {item.registrationLink ? (
                    <a href={item.registrationLink} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                      Official Portal <ExternalLink size={16} />
                    </a>
                  ) : hasJoined ? (
                    <button
                      className="btn btn-outline"
                      onClick={() => handleViewRegistration(item)}
                      style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                    >
                      <CheckCircle size={16} color="var(--accent-500)" /> Registered • View Team &amp; Abstract
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleOpenRegisterModal(item)}
                      style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                    >
                      <Rocket size={16} /> Register (Team / Solo Form)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Host Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Publish Hackathon or Incubation Program</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                <label className="form-label">Event / Program Title *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. RIT VLSI HackSprint 2026 / MSME Prototype Grant"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="grid grid-2" style={{ gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Organizer *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="e.g. RIT ECE Dept / IEEE Student Branch / ED Cell"
                    value={formData.organizer}
                    onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                    <option value="hackathon">Hackathon</option>
                    <option value="incubation">Incubation Program</option>
                    <option value="challenge">Design Challenge</option>
                    <option value="workshop">Hands-on Bootcamp</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-2" style={{ gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Prize Pool / Grant Amount</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. ₹1,00,000 + Incubation Support"
                    value={formData.prizePool}
                    onChange={(e) => setFormData({ ...formData, prizePool: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mode</label>
                  <select className="form-select" value={formData.mode} onChange={(e) => setFormData({ ...formData, mode: e.target.value })}>
                    <option value="Hybrid">Hybrid</option>
                    <option value="On-Campus (RIT)">On-Campus (RIT)</option>
                    <option value="Online">Online</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-2" style={{ gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Start Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                <label className="form-label">Themes / Problem Statements (comma separated)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Smart Mobility, Clean Energy, ASIC Design, Edge AI"
                  value={formData.themes}
                  onChange={(e) => setFormData({ ...formData, themes: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                <label className="form-label">Program Description</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  required
                  placeholder="Describe the challenge phases, judging criteria, hardware kits provided, and outcomes..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                <label className="form-label">External Registration URL (Optional)</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://unstop.com/..."
                  value={formData.registrationLink}
                  onChange={(e) => setFormData({ ...formData, registrationLink: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Publishing...' : 'Publish Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Real Unstop / Devfolio Style Hackathon Registration Modal */}
      {regModalOpen && selectedEventForReg && (
        <div className="modal-backdrop" onClick={() => !regSubmitting && setRegModalOpen(false)}>
          <div 
            className="modal-content" 
            onClick={e => e.stopPropagation()} 
            style={{ maxWidth: '800px', maxHeight: '92vh', overflowY: 'auto', padding: 'var(--space-6)' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span className="badge badge-accent" style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                    {selectedEventForReg.category || 'Hackathon'}
                  </span>
                  <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>
                    Unstop &amp; Devfolio Format
                  </span>
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Register for {selectedEventForReg.title}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: '6px', color: 'var(--text-secondary)', fontSize: '0.9rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Trophy size={15} /> Organized by {selectedEventForReg.organizer}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={15} /> Starts: {new Date(selectedEventForReg.startDate).toLocaleDateString()}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-500)', fontWeight: 600 }}>
                    <Award size={15} /> Prize: {selectedEventForReg.prizePool || '₹50,000+'}
                  </span>
                </div>
              </div>
              <button 
                className="btn btn-ghost" 
                onClick={() => setRegModalOpen(false)}
                style={{ padding: '6px', borderRadius: '50%', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              
              {/* Participation Mode Selection (Devfolio/Unstop style) */}
              <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <label className="form-label" style={{ marginBottom: 'var(--space-2)', fontSize: '0.95rem', fontWeight: 700 }}>
                  Participation Mode
                </label>
                <div className="grid grid-2" style={{ gap: 'var(--space-3)' }}>
                  <label 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      padding: 'var(--space-3)', 
                      borderRadius: 'var(--radius-md)', 
                      border: regFormData.participation_type === 'team' ? '2px solid var(--accent-500)' : '1px solid var(--border-color)',
                      background: regFormData.participation_type === 'team' ? 'var(--accent-500-10)' : 'var(--bg-primary)',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="radio"
                      name="participation_type"
                      value="team"
                      checked={regFormData.participation_type === 'team'}
                      onChange={() => setRegFormData({ ...regFormData, participation_type: 'team' })}
                      style={{ width: 18, height: 18 }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={16} color="var(--accent-500)" /> Team Participation
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Collaborate in a team of 2 to {selectedEventForReg.maxTeamSize || 4} members
                      </div>
                    </div>
                  </label>

                  <label 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      padding: 'var(--space-3)', 
                      borderRadius: 'var(--radius-md)', 
                      border: regFormData.participation_type === 'individual' ? '2px solid var(--accent-500)' : '1px solid var(--border-color)',
                      background: regFormData.participation_type === 'individual' ? 'var(--accent-500-10)' : 'var(--bg-primary)',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="radio"
                      name="participation_type"
                      value="individual"
                      checked={regFormData.participation_type === 'individual'}
                      onChange={() => setRegFormData({ ...regFormData, participation_type: 'individual' })}
                      style={{ width: 18, height: 18 }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={16} color="var(--accent-500)" /> Solo Hacker
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Register and build as an individual innovator
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Section 1: Team & Team Leader Details */}
              <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={18} color="var(--accent-500)" /> 1. {regFormData.participation_type === 'team' ? 'Team Details & Leader' : 'Participant Details'}
                </h3>

                {regFormData.participation_type === 'team' && (
                  <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                    <label className="form-label">Team Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="e.g. Silicon Spartans / RoboTech ECE"
                      value={regFormData.team_name}
                      onChange={(e) => setRegFormData({ ...regFormData, team_name: e.target.value })}
                    />
                  </div>
                )}

                <div className="grid grid-2" style={{ gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">{regFormData.participation_type === 'team' ? 'Team Leader Name *' : 'Full Name *'}</label>
                    <div style={{ position: 'relative' }}>
                      <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        className="form-input"
                        required
                        style={{ paddingLeft: '36px' }}
                        value={regFormData.lead_name}
                        onChange={(e) => setRegFormData({ ...regFormData, lead_name: e.target.value })}
                        placeholder="Vignesh Ramanathan"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Leader College Email *</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="email"
                        className="form-input"
                        required
                        style={{ paddingLeft: '36px' }}
                        value={regFormData.lead_email}
                        onChange={(e) => setRegFormData({ ...regFormData, lead_email: e.target.value })}
                        placeholder="vignesh@ritchennai.edu.in"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-3" style={{ gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Mobile Number *</label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="tel"
                        className="form-input"
                        required
                        style={{ paddingLeft: '36px' }}
                        value={regFormData.lead_phone}
                        onChange={(e) => setRegFormData({ ...regFormData, lead_phone: e.target.value })}
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Register / Roll No. *</label>
                    <input
                      type="text"
                      className="form-input"
                      required
                      value={regFormData.lead_roll_no}
                      onChange={(e) => setRegFormData({ ...regFormData, lead_roll_no: e.target.value })}
                      placeholder="e.g. 21EC085"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Academic Year</label>
                    <select
                      className="form-select"
                      value={regFormData.lead_year}
                      onChange={(e) => setRegFormData({ ...regFormData, lead_year: e.target.value })}
                    >
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="Final Year (4th Year)">Final Year (4th Year)</option>
                      <option value="M.Tech / PG">M.Tech / PG</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Dynamic Team Members (Unstop / Devfolio style) */}
              {regFormData.participation_type === 'team' && (
                <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={18} color="var(--accent-500)" /> Team Members ({regFormData.team_members.length + 1}/{selectedEventForReg.maxTeamSize || 4})
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Add co-hackers and teammates from RIT or partner institutions
                      </span>
                    </div>

                    {regFormData.team_members.length < ((selectedEventForReg.maxTeamSize || 4) - 1) && (
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={handleAddTeamMember}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '4px 12px' }}
                      >
                        <UserPlus size={15} /> Add Member
                      </button>
                    )}
                  </div>

                  {regFormData.team_members.map((member, index) => (
                    <div 
                      key={index} 
                      style={{ 
                        background: 'var(--bg-primary)', 
                        padding: 'var(--space-3)', 
                        borderRadius: 'var(--radius-md)', 
                        marginBottom: 'var(--space-3)',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--accent-500)' }}>
                          Team Member {index + 2}
                        </span>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => handleRemoveTeamMember(index)}
                          style={{ color: 'var(--error, #ef4444)', padding: '4px' }}
                          title="Remove Member"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="grid grid-2" style={{ gap: 'var(--space-2)', marginBottom: '8px' }}>
                        <input
                          type="text"
                          className="form-input"
                          required
                          placeholder="Member Full Name *"
                          value={member.name}
                          onChange={(e) => handleTeamMemberChange(index, 'name', e.target.value)}
                        />
                        <input
                          type="email"
                          className="form-input"
                          required
                          placeholder="Member Email Address *"
                          value={member.email}
                          onChange={(e) => handleTeamMemberChange(index, 'email', e.target.value)}
                        />
                      </div>

                      <div className="grid grid-2" style={{ gap: 'var(--space-2)' }}>
                        <input
                          type="text"
                          className="form-input"
                          required
                          placeholder="Register / Roll No. *"
                          value={member.roll_no}
                          onChange={(e) => handleTeamMemberChange(index, 'roll_no', e.target.value)}
                        />
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Department (e.g. ECE, EEE, CSE)"
                          value={member.department}
                          onChange={(e) => handleTeamMemberChange(index, 'department', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Section 2: Track & Project Abstract (Devfolio / Unstop style) */}
              <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Code size={18} color="var(--accent-500)" /> 2. Track &amp; Project Abstract
                </h3>

                <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                  <label className="form-label">Chosen Problem Statement / Track *</label>
                  {selectedEventForReg.themes && selectedEventForReg.themes.length > 0 ? (
                    <select
                      className="form-select"
                      value={regFormData.track}
                      onChange={(e) => setRegFormData({ ...regFormData, track: e.target.value })}
                    >
                      {selectedEventForReg.themes.map((t, idx) => (
                        <option key={idx} value={t}>{t}</option>
                      ))}
                      <option value="Open Innovation / Core Hardware">Open Innovation / Core Hardware</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="form-input"
                      required
                      placeholder="e.g. VLSI, Edge AI, Clean Energy, Biomedical IoT"
                      value={regFormData.track}
                      onChange={(e) => setRegFormData({ ...regFormData, track: e.target.value })}
                    />
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                  <label className="form-label">Proposed Project / Solution Title *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="e.g. Smart Biomedical ECG Monitor using Edge Impulse & STM32"
                    value={regFormData.project_title}
                    onChange={(e) => setRegFormData({ ...regFormData, project_title: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                  <label className="form-label">
                    Problem Statement &amp; Solution Abstract * (Devfolio Format)
                  </label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    required
                    placeholder="Describe the challenge being solved, proposed hardware/circuit architecture, firmware, novelty, and expected working prototype..."
                    value={regFormData.project_abstract}
                    onChange={(e) => setRegFormData({ ...regFormData, project_abstract: e.target.value })}
                  />
                </div>

                {/* Mandatory Idea Pitch Deck / Presentation PPT */}
                <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '4px' }}>
                    <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Idea Pitch Deck / Presentation PPT * <span style={{ color: 'var(--error-500)', fontWeight: 700 }}>(Mandatory)</span>
                    </label>
                    <span className="badge badge-accent" style={{ fontSize: '0.72rem' }}>
                      PPT / PPTX / PDF or Drive Link
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-3)', alignItems: 'center' }}>
                    <input
                      type="url"
                      className="form-input"
                      required={!regFormData.ppt_name}
                      placeholder="Paste Google Slides / Drive / OneDrive link to your Presentation PPT"
                      value={regFormData.ppt_url}
                      onChange={(e) => setRegFormData({ ...regFormData, ppt_url: e.target.value })}
                    />
                    <label className="btn btn-outline" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                      <Upload size={16} /> Upload PPT
                      <input
                        type="file"
                        accept=".ppt,.pptx,.pdf"
                        style={{ display: 'none' }}
                        onChange={handlePptFileUpload}
                      />
                    </label>
                  </div>
                  {regFormData.ppt_name && (
                    <div style={{ marginTop: '6px', fontSize: '0.85rem', color: 'var(--accent-500)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle size={14} /> Attached Presentation: <strong>{regFormData.ppt_name}</strong>
                    </div>
                  )}
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Mandatory requirement: Include Problem Statement, Circuit / Hardware Architecture, Tech Stack, and Expected Deliverables.
                  </span>
                </div>

                <div className="grid grid-2" style={{ gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Primary Tech Stack &amp; Hardware</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. STM32, ESP32, FreeRTOS, Python, MQTT"
                      value={regFormData.tech_stack}
                      onChange={(e) => setRegFormData({ ...regFormData, tech_stack: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">GitHub / Prototype Link (Optional)</label>
                    <input
                      type="url"
                      className="form-input"
                      placeholder="https://github.com/... or Tinkercad / Drive link"
                      value={regFormData.repo_url}
                      onChange={(e) => setRegFormData({ ...regFormData, repo_url: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Rules & Code of Conduct */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', padding: '0 4px' }}>
                <input
                  type="checkbox"
                  checked={regFormData.agree_rules}
                  onChange={(e) => setRegFormData({ ...regFormData, agree_rules: e.target.checked })}
                  style={{ width: 18, height: 18, marginTop: '2px' }}
                  required
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  I confirm that our project submission represents original work and we agree to abide by the Devfolio/Unstop hackathon code of conduct and evaluation rules.
                </span>
              </label>

              {/* Footer Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-4)' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setRegModalOpen(false)}
                  disabled={regSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={regSubmitting}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '170px', justifyContent: 'center' }}
                >
                  {regSubmitting ? (
                    <>
                      <div className="loading-spinner" style={{ width: 16, height: 16 }} /> Confirming...
                    </>
                  ) : (
                    <>
                      <Rocket size={16} /> Complete Registration 🚀
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Submitted Registration Modal (Ticket & Abstract Details) */}
      {viewRegModalOpen && selectedEventForReg && (
        <div className="modal-backdrop" onClick={() => setViewRegModalOpen(false)}>
          <div 
            className="modal-content" 
            onClick={e => e.stopPropagation()} 
            style={{ maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto', padding: 'var(--space-6)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="badge badge-accent" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={14} /> Confirmed Registration
                  </span>
                  <span className="badge badge-purple">Official Ticket</span>
                </div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {selectedEventForReg.title}
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '2px' }}>
                  Organized by {selectedEventForReg.organizer} • {selectedEventForReg.mode || 'Hybrid'}
                </p>
              </div>
              <button 
                className="btn btn-ghost" 
                onClick={() => setViewRegModalOpen(false)}
                style={{ padding: '6px', borderRadius: '50%', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {loadingReg ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                <div className="loading-spinner" style={{ margin: '0 auto var(--space-3)' }} />
                <p style={{ color: 'var(--text-secondary)' }}>Loading registration ticket...</p>
              </div>
            ) : viewingReg ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                
                {/* Team Ticket Card */}
                <div style={{ background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(6, 182, 212, 0.15))', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-500-20)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                        Registered Team
                      </span>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0' }}>
                        {viewingReg.team_name || 'Solo Participant'}
                      </h3>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Lead: <strong>{viewingReg.lead_name}</strong> ({viewingReg.lead_email}) • {viewingReg.lead_roll_no || ''}
                      </div>
                    </div>
                    <span className="badge badge-accent" style={{ fontSize: '0.85rem', padding: '4px 12px' }}>
                      Status: Confirmed ✓
                    </span>
                  </div>
                </div>

                {/* Team Members */}
                {viewingReg.team_members && viewingReg.team_members.length > 0 && (
                  <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>Teammates &amp; Co-Hackers</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {viewingReg.team_members.map((m, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem', padding: '6px 10px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
                          <div><strong>{m.name}</strong> • {m.roll_no} ({m.department || 'ECE'})</div>
                          <span style={{ color: 'var(--text-muted)' }}>{m.email}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Project Abstract */}
                <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>Chosen Track &amp; Project Pitch</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span className="badge badge-purple">{viewingReg.track || 'Core Innovation'}</span>
                    <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{viewingReg.project_title}</strong>
                  </div>
                  <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                    {viewingReg.project_abstract}
                  </p>
                </div>

                {/* Tech stack & Prototype */}
                {(viewingReg.tech_stack || viewingReg.repo_url) && (
                  <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>Technical Stack &amp; Prototype</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.9rem' }}>
                      {viewingReg.tech_stack && (
                        <div><strong>Technologies:</strong> {viewingReg.tech_stack}</div>
                      )}
                      {viewingReg.repo_url && (
                        <div><strong>Repository:</strong> <a href={viewingReg.repo_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-500)' }}>{viewingReg.repo_url}</a></div>
                      )}
                    </div>
                  </div>
                )}

                {/* Submitted Pitch Deck PPT */}
                {(viewingReg.ppt_url || viewingReg.ppt_name) && (
                  <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>Idea Pitch Deck / Presentation PPT (Mandatory)</h4>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={18} color="var(--accent-500)" />
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {viewingReg.ppt_name || 'Pitch_Deck_Presentation.pdf'}
                        </span>
                      </div>
                      {viewingReg.ppt_url && (
                        <a href={viewingReg.ppt_url} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '0.78rem' }}>
                          View / Download PPT <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
                  <button className="btn btn-primary" onClick={() => setViewRegModalOpen(false)}>
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
