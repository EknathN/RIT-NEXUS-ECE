import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Shield, Users, FileText, Briefcase, Award, Megaphone, CheckCircle, XCircle, Trash2, Plus, AlertCircle } from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stats'); // 'stats' | 'users' | 'announcements'

  // Announcement state
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [announceData, setAnnounceData] = useState({
    title: '',
    content: '',
    category: 'general',
    priority: 'normal',
    targetAudience: 'all'
  });

  useEffect(() => {
    loadAdminData();
  }, [activeTab]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'stats') {
        const res = await adminAPI.getStats();
        setStats(res.stats || res.data?.stats || res);
      } else if (activeTab === 'users') {
        const res = await adminAPI.getUsers();
        setUsersList(Array.isArray(res) ? res : (res.users || res.data?.users || []));
      } else if (activeTab === 'announcements') {
        const res = await adminAPI.getAnnouncements();
        setAnnouncements(Array.isArray(res) ? res : (res.announcements || res.data?.announcements || []));
      }
    } catch (err) {
      console.error(err);
      toast.show('Failed to load admin data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyUser = async (userId) => {
    try {
      await adminAPI.verifyUser(userId, 'verified');
      toast.show('User verified successfully!', 'success');
      setUsersList(prev => prev.map(u => (u._id === userId || u.id === userId) ? { ...u, isVerified: true, verification_status: 'verified' } : u));
    } catch (err) {
      toast.show('Failed to verify user', 'error');
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createAnnouncement(announceData);
      toast.show('Announcement published to RIT ECE platform!', 'success');
      setShowAnnounceModal(false);
      setAnnounceData({ title: '', content: '', category: 'general', priority: 'normal', targetAudience: 'all' });
      loadAdminData();
    } catch (err) {
      toast.show(err.message || 'Failed to create announcement', 'error');
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await adminAPI.deleteAnnouncement(id);
      toast.show('Announcement removed', 'info');
      setAnnouncements(prev => prev.filter(a => a._id !== id && a.id !== id));
    } catch (err) {
      toast.show('Failed to delete', 'error');
    }
  };

  if (user?.role !== 'admin' && user?.role !== 'faculty') {
    return (
      <div className="container" style={{ padding: 'var(--space-12) var(--space-4)', textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: 'var(--danger-500)', margin: '0 auto var(--space-4)' }} />
        <h2>Access Restricted</h2>
        <p style={{ color: 'var(--text-secondary)' }}>You do not have administrative privileges for the RIT ECE command center.</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: 'var(--space-6) var(--space-4)' }}>
      {/* Top Header */}
      <div className="card" style={{ marginBottom: 'var(--space-6)', background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.25), rgba(168, 85, 247, 0.2))', border: '1px solid var(--accent-500-20)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Shield size={24} className="text-accent" /> RIT ECE Admin Command Center
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Departmental management, verified identity rosters, broadcast notices, and moderation.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAnnounceModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Megaphone size={18} /> Broadcast Announcement
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-2)' }}>
        <button className={`btn ${activeTab === 'stats' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('stats')}>
          Overview & Stats
        </button>
        <button className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('users')}>
          User Directory & Verification
        </button>
        <button className={`btn ${activeTab === 'announcements' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('announcements')}>
          Manage Announcements
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <div className="loading-spinner" style={{ margin: '0 auto var(--space-4)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading administrative console...</p>
        </div>
      ) : activeTab === 'stats' ? (
        <div>
          {/* Key Metric Cards */}
          <div className="grid grid-4" style={{ gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-5)' }}>
              <Users size={32} className="text-accent" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stats?.totalUsers || 0}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Registered Members</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-5)' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--cyan-500)' }}>{stats?.totalStudents || 0}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Current Students</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-5)' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981' }}>{stats?.totalAlumni || 0}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Alumni In Core & Tech</div>
            </div>
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-5)' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--purple-500)' }}>{stats?.totalFaculty || 0}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Faculty Mentors</div>
            </div>
          </div>

          <div className="grid grid-3" style={{ gap: 'var(--space-4)' }}>
            <div className="card">
              <FileText size={24} className="text-accent" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats?.totalPosts || 0}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Feed Posts & Updates</div>
            </div>
            <div className="card">
              <Briefcase size={24} className="text-cyan" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats?.totalJobs || 0}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Jobs & Core Internships</div>
            </div>
            <div className="card">
              <Award size={24} className="text-purple" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats?.totalCommunities || 0}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Active ECE Communities</div>
            </div>
          </div>
        </div>
      ) : activeTab === 'users' ? (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <th style={{ padding: 'var(--space-3) var(--space-4)' }}>User</th>
                <th style={{ padding: 'var(--space-3)' }}>Role</th>
                <th style={{ padding: 'var(--space-3)' }}>Roll / Reg No</th>
                <th style={{ padding: 'var(--space-3)' }}>Batch</th>
                <th style={{ padding: 'var(--space-3)' }}>Status</th>
                <th style={{ padding: 'var(--space-3)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map(u => (
                <tr key={u._id || u.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                  <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{u.fullName || u.full_name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email}</div>
                  </td>
                  <td style={{ padding: 'var(--space-3)' }}>
                    <span className={`badge badge-${u.role === 'alumni' ? 'cyan' : u.role === 'faculty' ? 'purple' : 'accent'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)' }}>
                    {u.registerNumber || u.rollNumber || u.register_number || u.roll_number || 'N/A'}
                  </td>
                  <td style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)' }}>
                    {u.batchYear || u.batch_year || 'N/A'}
                  </td>
                  <td style={{ padding: 'var(--space-3)' }}>
                    {(u.isVerified || u.verification_status === 'verified') ? (
                      <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                        <CheckCircle size={15} /> Verified
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Pending</span>
                    )}
                  </td>
                  <td style={{ padding: 'var(--space-3)' }}>
                    {!(u.isVerified || u.verification_status === 'verified') && (
                      <button className="btn btn-sm btn-outline" onClick={() => handleVerifyUser(u._id || u.id)} style={{ fontSize: '0.75rem' }}>
                        Approve / Verify
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Announcements list */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {announcements.map(ann => (
            <div key={ann._id || ann.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{ann.title}</h3>
                  <span className={`badge badge-${ann.priority === 'urgent' ? 'rose' : 'accent'}`}>{ann.priority}</span>
                  <span className="badge badge-purple">{ann.category}</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: 'var(--space-2)' }}>{ann.content}</p>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Target: {ann.targetAudience || ann.target_audience || 'All'} • Posted: {new Date(ann.createdAt || ann.created_at || Date.now()).toLocaleDateString()}
                </div>
              </div>
              <button className="btn btn-sm" onClick={() => handleDeleteAnnouncement(ann._id || ann.id)} style={{ color: 'var(--danger-500)', background: 'transparent' }}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Broadcast Announcement Modal */}
      {showAnnounceModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Broadcast Notice to RIT ECE</h2>
            <form onSubmit={handleCreateAnnouncement}>
              <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                <label className="form-label">Notice Title *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Core Placement Drive: Texas Instruments Internship 2026"
                  value={announceData.title}
                  onChange={(e) => setAnnounceData({ ...announceData, title: e.target.value })}
                />
              </div>

              <div className="grid grid-3" style={{ gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={announceData.category} onChange={(e) => setAnnounceData({ ...announceData, category: e.target.value })}>
                    <option value="placement">Placement</option>
                    <option value="academic">Academic</option>
                    <option value="event">Event</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-select" value={announceData.priority} onChange={(e) => setAnnounceData({ ...announceData, priority: e.target.value })}>
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent / Pinned</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Audience</label>
                  <select className="form-select" value={announceData.targetAudience} onChange={(e) => setAnnounceData({ ...announceData, targetAudience: e.target.value })}>
                    <option value="all">Everyone</option>
                    <option value="students">Students Only</option>
                    <option value="alumni">Alumni Only</option>
                    <option value="faculty">Faculty Only</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                <label className="form-label">Notice Content *</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  required
                  placeholder="Write the full announcement details, instructions, and dates..."
                  value={announceData.content}
                  onChange={(e) => setAnnounceData({ ...announceData, content: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAnnounceModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Publish Broadcast</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
