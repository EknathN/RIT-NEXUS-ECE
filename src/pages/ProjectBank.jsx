import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  Cpu, Users, Plus, Star, Github, ExternalLink, Filter, Search,
  Share2, Heart, Award, CheckCircle, ArrowRight, X, Sparkles, Terminal
} from 'lucide-react';

const ECE_DOMAINS = [
  'All Domains',
  'Embedded Systems & IoT',
  'VLSI & Chip Design',
  'Robotics & Automation',
  'AI & Edge Computing',
  'Telecom & Core ECE',
];

export default function ProjectBank() {
  const { user } = useAuth();
  const toast = useToast();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDomain, setSelectedDomain] = useState('All Domains');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTeammatesOnly, setFilterTeammatesOnly] = useState(false);
  const [filterContinuationOnly, setFilterContinuationOnly] = useState(false);

  // Modals
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [selectedProjectForJoin, setSelectedProjectForJoin] = useState(null);
  const [joinMessage, setJoinMessage] = useState('');

  // Submit Project Form State
  const [formData, setFormData] = useState({
    title: '',
    domain: 'Embedded Systems & IoT',
    description: '',
    hardware_specs: '',
    github_url: '',
    demo_url: '',
    required_skills: '',
    looking_for_teammates: true,
    pass_it_forward: false,
    continuation_notes: '',
  });

  useEffect(() => {
    loadProjects();
  }, [selectedDomain, filterTeammatesOnly, filterContinuationOnly]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedDomain !== 'All Domains') params.domain = selectedDomain;
      if (filterTeammatesOnly) params.looking_for_teammates = 'true';
      if (filterContinuationOnly) params.pass_it_forward = 'true';
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await projectsAPI.getAll(params);
      const list = Array.isArray(res) ? res : (res.projects || res.data || []);
      setProjects(list);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStar = async (projectId) => {
    try {
      const res = await projectsAPI.star(projectId);
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, stars: res.stars || p.stars + 1 } : p));
      toast.show('Project upvoted!', 'success');
    } catch (err) {
      toast.show('Failed to upvote', 'error');
    }
  };

  const handleOpenJoinModal = (project) => {
    setSelectedProjectForJoin(project);
    setJoinMessage(`Hi! I am an ECE student with skills in ${project.required_skills?.slice(0, 2).join(', ') || 'ECE'}. I would love to collaborate on "${project.title}".`);
    setJoinModalOpen(true);
  };

  const handleSubmitJoin = async (e) => {
    e.preventDefault();
    if (!selectedProjectForJoin) return;
    try {
      await projectsAPI.joinTeam(selectedProjectForJoin.id, { message: joinMessage });
      toast.show('Application sent to project lead!', 'success');
      setJoinModalOpen(false);
      setSelectedProjectForJoin(null);
    } catch (err) {
      toast.show(err.message || 'Failed to submit application', 'error');
    }
  };

  const handleSubmitNewProject = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      toast.show('Please fill out all required fields', 'error');
      return;
    }
    try {
      await projectsAPI.create(formData);
      toast.show('Project published to ECE Project Bank!', 'success');
      setSubmitModalOpen(false);
      setFormData({
        title: '',
        domain: 'Embedded Systems & IoT',
        description: '',
        hardware_specs: '',
        github_url: '',
        demo_url: '',
        required_skills: '',
        looking_for_teammates: true,
        pass_it_forward: false,
        continuation_notes: '',
      });
      loadProjects();
    } catch (err) {
      toast.show(err.message || 'Failed to create project', 'error');
    }
  };

  // Filter projects by search query
  const filteredProjects = projects.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.title || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.hardware_specs || '').toLowerCase().includes(q) ||
      (p.required_skills || []).some(s => s.toLowerCase().includes(q))
    );
  });

  return (
    <div className="container" style={{ padding: 'var(--space-6) var(--space-4)' }}>
      {/* Header Banner */}
      <div
        className="card"
        style={{
          marginBottom: 'var(--space-6)',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(0, 229, 255, 0.18))',
          border: '1px solid rgba(16, 185, 129, 0.3)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Cpu size={14} /> Official ECE Repository
              </span>
              <span className="badge badge-cyan">RIT Innovation Hub</span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
              ECE Project Bank & Team Finder
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '780px', lineHeight: 1.5 }}>
              Showcase your hardware & software creations, recruit team members for hackathons, and continue breakthrough projects handed down by previous senior batches under the <strong>Pass It Forward</strong> program.
            </p>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => setSubmitModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: 700 }}
          >
            <Plus size={18} /> Submit Your Project
          </button>
        </div>
      </div>

      {/* Domain Filter Pills */}
      <div style={{ marginBottom: 'var(--space-4)', display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        {ECE_DOMAINS.map(domain => (
          <button
            key={domain}
            onClick={() => setSelectedDomain(domain)}
            className={`btn btn-sm ${selectedDomain === domain ? 'btn-primary' : 'btn-outline'}`}
            style={{ borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap', fontSize: '0.82rem' }}
          >
            {domain}
          </button>
        ))}
      </div>

      {/* Search and Checkbox Filters */}
      <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search projects by title, hardware (STM32, FPGA, LoRa, ESP32), or skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={filterTeammatesOnly}
                onChange={(e) => setFilterTeammatesOnly(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <Users size={16} color="var(--accent-500)" /> Looking for Teammates
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={filterContinuationOnly}
                onChange={(e) => setFilterContinuationOnly(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <Heart size={16} color="#10B981" /> Pass It Forward Continuation Projects
            </label>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <div className="loading-spinner" style={{ margin: '0 auto var(--space-4)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading ECE Projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <Cpu size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-4)' }} />
          <h3>No projects found</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
            Be the first to submit a project in this domain, or adjust your filter search!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {filteredProjects.map(proj => (
            <div
              key={proj.id}
              className="card"
              style={{
                padding: 'var(--space-5)',
                borderLeft: `4px solid ${
                  proj.domain?.includes('VLSI')
                    ? '#00E5FF'
                    : proj.domain?.includes('Embedded')
                    ? '#10B981'
                    : proj.domain?.includes('Robotics')
                    ? '#F59E0B'
                    : 'var(--accent-500)'
                }`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
                    <span className="badge badge-cyan">{proj.domain}</span>
                    {proj.looking_for_teammates && (
                      <span className="badge badge-accent" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={12} /> Recruiting Teammates
                      </span>
                    )}
                    {proj.pass_it_forward && (
                      <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Heart size={12} fill="#10B981" /> Pass It Forward Continuation
                      </span>
                    )}
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {proj.title}
                  </h3>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => handleStar(proj.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Star size={15} fill="var(--warning-500)" color="var(--warning-500)" />
                    {proj.stars || 0}
                  </button>
                  {proj.github_url && (
                    <a
                      href={proj.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-ghost"
                      title="GitHub Repository"
                    >
                      <Github size={16} />
                    </a>
                  )}
                </div>
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: 'var(--space-3)' }}>
                {proj.description}
              </p>

              {/* Hardware & Tools Specs */}
              {proj.hardware_specs && (
                <div style={{ background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-3)', fontSize: '0.85rem' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Hardware & Toolchain: </strong>
                  <span style={{ color: 'var(--accent-400)' }}>{proj.hardware_specs}</span>
                </div>
              )}

              {/* Continuation Notes */}
              {proj.continuation_notes && (
                <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '8px 12px', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-3)', fontSize: '0.85rem', color: '#10B981' }}>
                  <strong>Continuation Note for Juniors: </strong> {proj.continuation_notes}
                </div>
              )}

              {/* Required Skills & Actions Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Skills needed:</span>
                  {(proj.required_skills || []).map((sk, idx) => (
                    <span key={idx} style={{ fontSize: '0.75rem', background: 'var(--bg-secondary)', padding: '3px 8px', borderRadius: '4px', color: 'var(--text-primary)' }}>
                      {sk}
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {proj.looking_for_teammates && (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleOpenJoinModal(proj)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Users size={14} /> Apply to Join Team
                    </button>
                  )}
                  {proj.pass_it_forward && (
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => handleOpenJoinModal(proj)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <ArrowRight size={14} /> Request Project Code & Files
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUBMIT PROJECT MODAL */}
      {submitModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 'var(--space-4)' }}>
          <div className="card" style={{ maxWidth: '620px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 'var(--space-6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Submit ECE Project</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setSubmitModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitNewProject} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Project Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. FPGA Accelerators for Real-Time Edge Processing"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">ECE Domain *</label>
                <select
                  className="form-input"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  required
                >
                  <option value="Embedded Systems & IoT">Embedded Systems & IoT</option>
                  <option value="VLSI & Chip Design">VLSI & Chip Design</option>
                  <option value="Robotics & Automation">Robotics & Automation</option>
                  <option value="AI & Edge Computing">AI & Edge Computing</option>
                  <option value="Telecom & Core ECE">Telecom & Core ECE</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Abstract / Description *</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Describe your project, methodology, and outcome..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Hardware & Toolchain Components</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. STM32F4, Xilinx Artix-7, Cadence Genus, FreeRTOS"
                  value={formData.hardware_specs}
                  onChange={(e) => setFormData({ ...formData, hardware_specs: e.target.value })}
                />
              </div>

              <div className="grid grid-2" style={{ gap: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">GitHub Repository URL</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://github.com/..."
                    value={formData.github_url}
                    onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Required Teammate Skills (comma separated)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Verilog, PCB Design, Python"
                    value={formData.required_skills}
                    onChange={(e) => setFormData({ ...formData, required_skills: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-secondary)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.looking_for_teammates}
                    onChange={(e) => setFormData({ ...formData, looking_for_teammates: e.target.checked })}
                  />
                  <strong>Recruiting Teammates</strong> (Show open spot in Project Bank)
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.pass_it_forward}
                    onChange={(e) => setFormData({ ...formData, pass_it_forward: e.target.checked })}
                  />
                  <strong>Pass It Forward Project</strong> (Allows juniors to continue this capstone next year)
                </label>
              </div>

              {formData.pass_it_forward && (
                <div className="form-group">
                  <label className="form-label">Continuation Note for Juniors</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="Explain what next batch juniors should develop next..."
                    value={formData.continuation_notes}
                    onChange={(e) => setFormData({ ...formData, continuation_notes: e.target.value })}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSubmitModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Publish to Project Bank
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOIN TEAM MODAL */}
      {joinModalOpen && selectedProjectForJoin && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 'var(--space-4)' }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: 'var(--space-6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                Collaborate on {selectedProjectForJoin.title}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setJoinModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitJoin}>
              <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                <label className="form-label">Message to Project Lead *</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  value={joinMessage}
                  onChange={(e) => setJoinMessage(e.target.value)}
                  placeholder="Introduce yourself, your batch, and how your skills fit the project..."
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setJoinModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
