import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { connectionsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  Users, UserPlus, UserCheck, Clock, Check, X, Search, Filter,
  Briefcase, GraduationCap, Award, Heart, MessageSquare, Send,
  HelpCircle, Compass, Sparkles, Building, CheckCircle2, ChevronRight
} from 'lucide-react';

function getInitials(name) {
  return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
}

// Safe extraction helper to handle both raw arrays and nested response objects
const extractList = (res, key) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (key && Array.isArray(res[key])) return res[key];
  if (key && Array.isArray(res.data?.[key])) return res.data[key];
  return [];
};

const ECE_CIRCLES = [
  'All Circles',
  'VLSI & Chip Design',
  'Embedded Systems & IoT',
  'Robotics & Automation',
  'AI & Edge Computing',
  'GATE & Higher Studies',
  'Telecom & Core ECE',
];

export default function MyNetwork() {
  const { user } = useAuth();
  const toast = useToast();
  // 'mentors' | 'suggestions' | 'alumni' | 'pass_forward' | 'requests' | 'connections'
  const [activeTab, setActiveTab] = useState('mentors');
  const [requests, setRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [invitationSubTab, setInvitationSubTab] = useState('received'); // 'received' | 'sent'
  const [sentMap, setSentMap] = useState({}); // userId -> connectionId
  const [connections, setConnections] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCircle, setSelectedCircle] = useState('All Circles');
  const [filterRole, setFilterRole] = useState('all');
  const [filterBatch, setFilterBatch] = useState('all');
  const [filterCompany, setFilterCompany] = useState('all');

  // "Ask a Senior" Modal State
  const [askSeniorModalOpen, setAskSeniorModalOpen] = useState(false);
  const [selectedSenior, setSelectedSenior] = useState(null);
  const [askTopic, setAskTopic] = useState('Core ECE Placement Prep');
  const [askMessage, setAskMessage] = useState('');
  const [sendingGuidance, setSendingGuidance] = useState(false);

  // Pass it forward user pledge state
  const [pledged, setPledged] = useState(user?.pass_it_forward === 1 || user?.mentoring_available === 1);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Always load received and sent requests in parallel so counts stay synced
      const [reqRes, sentRes] = await Promise.all([
        connectionsAPI.getRequests().catch(() => ({ requests: [] })),
        connectionsAPI.getSentRequests().catch(() => ({ requests: [] })),
      ]);
      const reqList = extractList(reqRes, 'requests');
      const sentList = extractList(sentRes, 'requests');
      setRequests(reqList);
      setSentRequests(sentList);

      const map = {};
      sentList.forEach(r => {
        if (r.receiver_id) map[r.receiver_id] = r.id;
      });
      setSentMap(map);

      if (activeTab === 'connections') {
        const res = await connectionsAPI.getConnections();
        setConnections(extractList(res, 'connections'));
      } else if (activeTab === 'mentors') {
        const mentorRes = await connectionsAPI.getMentors();
        setMentors(extractList(mentorRes, 'mentors'));
      } else if (activeTab === 'suggestions' || activeTab === 'alumni') {
        const sugRes = await connectionsAPI.getSuggestions();
        setSuggestions(extractList(sugRes, 'suggestions'));
      }
    } catch (err) {
      console.error('Network load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (userId) => {
    try {
      const res = await connectionsAPI.sendRequest(userId);
      const connId = res?.id || res?.data?.id || true;
      setSentMap(prev => ({ ...prev, [userId]: connId }));
      toast.show('Connection request sent!', 'success');
      
      const sentRes = await connectionsAPI.getSentRequests().catch(() => null);
      if (sentRes) {
        setSentRequests(extractList(sentRes, 'requests'));
      }
    } catch (err) {
      toast.show(err.response?.data?.message || err.message || 'Failed to send request', 'error');
    }
  };

  const handleWithdraw = async (targetId) => {
    try {
      const connectionId = sentMap[targetId] || targetId;
      await connectionsAPI.withdrawRequest(connectionId);
      toast.show('Invitation withdrawn', 'info');
      setSentMap(prev => {
        const next = { ...prev };
        delete next[targetId];
        Object.keys(next).forEach(k => {
          if (next[k] === targetId) delete next[k];
        });
        return next;
      });
      setSentRequests(prev => prev.filter(r => (r.id !== targetId && r._id !== targetId && r.receiver_id !== targetId)));
    } catch (err) {
      toast.show(err.message || 'Failed to withdraw invitation', 'error');
    }
  };

  const handleAccept = async (requestId) => {
    try {
      await connectionsAPI.acceptRequest(requestId);
      toast.show('Connection accepted! Added to your network.', 'success');
      setRequests(prev => prev.filter(r => (r._id !== requestId && r.id !== requestId)));
      const connRes = await connectionsAPI.getConnections().catch(() => null);
      if (connRes) setConnections(extractList(connRes, 'connections'));
    } catch (err) {
      toast.show('Failed to accept request', 'error');
    }
  };

  const handleReject = async (requestId) => {
    try {
      await connectionsAPI.rejectRequest(requestId);
      toast.show('Request declined', 'info');
      setRequests(prev => prev.filter(r => (r._id !== requestId && r.id !== requestId)));
    } catch (err) {
      toast.show('Failed to decline request', 'error');
    }
  };

  // Open "Ask a Senior" guidance modal
  const openAskSeniorModal = (senior) => {
    setSelectedSenior(senior);
    setAskTopic(
      senior.account_type === 'alumni'
        ? `Core Placement Prep at ${senior.current_company || 'Core Companies'}`
        : 'Project Guidance & ECE Course Prep'
    );
    setAskMessage(
      `Hello ${senior.full_name}, I am an ECE student at RIT. I saw your expertise in ${senior.circle || 'ECE'} and would love your advice and mentorship guidance.`
    );
    setAskSeniorModalOpen(true);
  };

  const submitAskSenior = async (e) => {
    e.preventDefault();
    if (!selectedSenior || !askMessage.trim()) return;
    setSendingGuidance(true);
    try {
      const res = await connectionsAPI.askSenior({
        senior_id: selectedSenior.id,
        topic: askTopic,
        domain: selectedSenior.circle || 'ECE',
        message: askMessage.trim(),
      });
      toast.show(res.message || 'Guidance request sent! Check your Messages.', 'success');
      setAskSeniorModalOpen(false);
      setSelectedSenior(null);
    } catch (err) {
      toast.show(err.message || 'Failed to send guidance request', 'error');
    } finally {
      setSendingGuidance(false);
    }
  };

  // Handle Pass It Forward pledge toggle
  const handlePledgePassItForward = async () => {
    try {
      const res = await connectionsAPI.pledgePassItForward();
      setPledged(res.pass_it_forward === 1);
      toast.show(res.message || 'Pass It Forward pledge updated!', 'success');
      loadData();
    } catch (err) {
      toast.show('Failed to update pledge', 'error');
    }
  };

  // Filter users
  const filterList = (list) => {
    if (!Array.isArray(list)) return [];
    const myId = user?.id || user?._id;
    return list.filter(u => {
      // Never show logged-in user in mentors, discover peers, or suggestions
      if (myId && (u.id === myId || u._id === myId)) return false;

      const name = u.full_name || u.fullName || '';
      const headline = u.headline || '';
      const company = u.current_company || '';
      const skills = Array.isArray(u.skills) ? u.skills : [];
      const matchSearch =
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        headline.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        skills.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));

      const userRole = u.account_type || u.role || 'student';
      const matchRole = filterRole === 'all' || userRole === filterRole;

      const userBatch = String(u.batch || u.batchYear || u.graduation_year || '');
      const matchBatch = filterBatch === 'all' || userBatch.includes(filterBatch);

      const matchCircle =
        selectedCircle === 'All Circles' ||
        (u.circle || '').toLowerCase() === selectedCircle.toLowerCase();

      const matchCompany =
        filterCompany === 'all' ||
        company.toLowerCase().includes(filterCompany.toLowerCase());

      return matchSearch && matchRole && matchBatch && matchCircle && matchCompany;
    });
  };

  return (
    <div className="container" style={{ padding: 'var(--space-6) var(--space-4)' }}>
      {/* Top Banner (HOD Vision) */}
      <div
        className="card"
        style={{
          marginBottom: 'var(--space-6)',
          background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.22), rgba(6, 182, 212, 0.18))',
          border: '1px solid rgba(0, 229, 255, 0.25)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div style={{ maxWidth: '780px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="badge badge-cyan" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Sparkles size={13} /> ECE Department Mentorship Initiative
              </span>
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
              Ask a Senior & ECE Mentor Circles
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
              Direct access to final-year seniors, GATE toppers, and distinguished alumni at <strong>Texas Instruments, Qualcomm, Intel, Cisco, and AMD</strong>. Get 1-on-1 guidance for core placements, capstone projects, and higher studies.
            </p>
          </div>
        </div>
      </div>

      {/* Main Feature Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-6)',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: 'var(--space-2)',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
        }}
      >
        <button
          className={`btn ${activeTab === 'mentors' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('mentors')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <GraduationCap size={18} /> Ask a Senior & Mentor Circles
        </button>

        <button
          className={`btn ${activeTab === 'suggestions' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('suggestions')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Compass size={18} /> Discover ECE Peers
        </button>

        <button
          className={`btn ${activeTab === 'alumni' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('alumni')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Building size={18} /> Alumni Connect
        </button>

        <button
          className={`btn ${activeTab === 'requests' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('requests')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Clock size={18} /> Invitations ({requests.length})
        </button>

        <button
          className={`btn ${activeTab === 'connections' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('connections')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <UserCheck size={18} /> My Connections
        </button>
      </div>

      {/* Search and Filter Row with Circle Dropdown */}
      <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY-50%', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search by name, core skills (Verilog, RTOS, PCB, ARM), or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
          </div>

          {/* ECE Domain Circle Dropdown */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <select
              className="form-select"
              value={selectedCircle}
              onChange={(e) => setSelectedCircle(e.target.value)}
              style={{ width: 'auto', minWidth: '170px' }}
              title="Filter by ECE Domain Circle"
            >
              {ECE_CIRCLES.map(circle => (
                <option key={circle} value={circle}>
                  {circle === 'All Circles' ? 'All ECE Circles' : circle}
                </option>
              ))}
            </select>
          </div>

          {activeTab !== 'alumni' && (
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <Filter size={16} style={{ color: 'var(--text-muted)' }} />
              <select className="form-select" value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={{ width: 'auto' }}>
                <option value="all">All Roles</option>
                <option value="student">Current Students</option>
                <option value="alumni">Alumni Mentors</option>
                <option value="faculty">Faculty</option>
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <select className="form-select" value={filterBatch} onChange={(e) => setFilterBatch(e.target.value)} style={{ width: 'auto' }}>
              <option value="all">All Batches (2026)</option>
              <option value="2028">Batch 2028 (2nd Year • Sec A-E)</option>
              <option value="2027">Batch 2027 (3rd Year • Sec A-C)</option>
              <option value="2026">Batch 2026 (4th Year • Sec A-B)</option>
              <option value="2025">Class of 2025 (Alumni)</option>
              <option value="2024">Class of 2024 (Alumni)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Loading State */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <div className="loading-spinner" style={{ margin: '0 auto var(--space-4)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading RIT ECE Nexus Directory & Mentor Circles...</p>
        </div>
      ) : activeTab === 'mentors' ? (
        /* TAB 1: ASK A SENIOR & MENTOR CIRCLES */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {selectedCircle === 'All Circles' ? 'Available ECE Mentors & Final Year Seniors' : `${selectedCircle} Mentors`}
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Showing {filterList(mentors).length} verified seniors & alumni ready to assist you
              </p>
            </div>
          </div>

          {filterList(mentors).length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
              <Users size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-4)' }} />
              <h3>No mentors found in this circle</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                Try switching the circle filter to &quot;All Circles&quot; or clearing your search query.
              </p>
            </div>
          ) : (
            <div className="grid grid-3" style={{ gap: 'var(--space-4)' }}>
              {filterList(mentors).map(m => {
                const isAlumni = m.account_type === 'alumni';
                return (
                  <div
                    key={m.id}
                    className="card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      padding: 'var(--space-5)',
                      borderTop: `3px solid ${
                        m.circle?.includes('VLSI')
                          ? '#00E5FF'
                          : m.circle?.includes('Embedded')
                          ? '#10B981'
                          : m.circle?.includes('AI')
                          ? '#8B5CF6'
                          : m.circle?.includes('GATE')
                          ? '#F59E0B'
                          : 'var(--accent-500)'
                      }`,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                        <Link to={`/profile/${m.id}`}>
                          {m.profile_photo || m.avatar ? (
                            <img src={m.profile_photo || m.avatar} alt={m.full_name} className="avatar avatar-xl" />
                          ) : (
                            <div className="avatar-placeholder avatar-xl">{getInitials(m.full_name)}</div>
                          )}
                        </Link>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          <span className={`badge badge-${isAlumni ? 'cyan' : 'accent'}`}>
                            {isAlumni ? 'Alumni Mentor' : `Senior '25`}
                          </span>
                          {m.pass_it_forward === 1 && (
                            <span className="badge badge-emerald" title="Pledged to mentor juniors">
                              Pass It Forward
                            </span>
                          )}
                        </div>
                      </div>

                      <Link to={`/profile/${m.id}`} style={{ textDecoration: 'none' }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                          {m.full_name}
                        </h3>
                      </Link>

                      <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '2px' }}>
                        {m.current_company ? `${m.job_title || 'Engineer'} @ ${m.current_company}` : m.headline}
                      </p>

                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', height: '36px', overflow: 'hidden', marginBottom: 'var(--space-3)' }}>
                        {m.bio || m.headline}
                      </p>

                      <div style={{ marginBottom: 'var(--space-3)' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-400)', display: 'block', marginBottom: '4px' }}>
                          Mentor Circle:
                        </span>
                        <span style={{ fontSize: '0.78rem', padding: '3px 8px', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontWeight: 600 }}>
                          {m.circle || 'Core ECE'}
                        </span>
                      </div>

                      {/* Skills */}
                      {m.skills && m.skills.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
                          {m.skills.slice(0, 3).map((skill, i) => (
                            <span key={i} style={{ fontSize: '0.72rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-color)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <Link to={`/profile/${m.id}`} className="btn btn-sm btn-ghost" style={{ flex: 1 }}>
                        Profile
                      </Link>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => openAskSeniorModal(m)}
                        style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <HelpCircle size={15} /> Ask Senior
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === 'suggestions' ? (
        /* TAB 2: DISCOVER ECE PEERS */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Discover RIT ECE Nexus Members
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Showing {filterList(suggestions).length} students, seniors, and alumni across all batches
              </p>
            </div>
          </div>

          {filterList(suggestions).length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
              <Users size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-4)' }} />
              <h3>No members match your criteria</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                Try changing your role or batch filter, or search for different ECE skills.
              </p>
            </div>
          ) : (
            <div className="grid grid-3" style={{ gap: 'var(--space-4)' }}>
              {filterList(suggestions).map(sugUser => {
                const sRole = sugUser.account_type || sugUser.role || 'student';
                const sBatch = sugUser.batch || sugUser.batchYear;

                return (
                  <div key={sugUser.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 'var(--space-5)' }}>
                    <div style={{ textAlign: 'center' }}>
                      <Link to={`/profile/${sugUser.id}`} style={{ textDecoration: 'none' }}>
                        {sugUser.profile_photo || sugUser.avatar ? (
                          <img src={sugUser.profile_photo || sugUser.avatar} alt={sugUser.full_name} className="avatar avatar-xl" style={{ margin: '0 auto var(--space-3)' }} />
                        ) : (
                          <div className="avatar-placeholder avatar-xl" style={{ margin: '0 auto var(--space-3)' }}>{getInitials(sugUser.full_name)}</div>
                        )}
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{sugUser.full_name}</h3>
                      </Link>

                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', height: '38px', overflow: 'hidden', marginBottom: 'var(--space-3)' }}>
                        {sugUser.headline || `${sRole} • Department of ECE`}
                      </p>

                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
                        <span className={`badge badge-${sRole === 'alumni' ? 'cyan' : sRole === 'faculty' ? 'purple' : 'accent'}`}>
                          {sRole} {sBatch ? `'${String(sBatch).slice(-2)}` : ''}
                        </span>
                        {sugUser.isAvailableForMentoring && (
                          <span className="badge badge-emerald">Mentor</span>
                        )}
                        {sugUser.circle && (
                          <span className="badge badge-violet">{sugUser.circle}</span>
                        )}
                      </div>

                      {sugUser.skills && sugUser.skills.length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
                          {sugUser.skills.slice(0, 3).map((skill, i) => (
                            <span key={i} style={{ fontSize: '0.75rem', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <Link to={`/profile/${sugUser.id}`} className="btn btn-sm btn-ghost" style={{ flex: 1 }}>
                        Profile
                      </Link>
                      {sentMap[sugUser.id] ? (
                        <div style={{ flex: 1, display: 'flex', gap: '4px' }}>
                          <button className="btn btn-sm btn-ghost" disabled style={{ flex: 1, padding: '4px 6px', fontSize: '0.78rem', opacity: 0.9 }}>
                            <Clock size={13} /> Pending
                          </button>
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => handleWithdraw(sugUser.id)}
                            title="Withdraw Invitation"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          >
                            Withdraw
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleSendRequest(sugUser.id)}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                        >
                          <UserPlus size={15} /> Connect
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === 'alumni' ? (
        /* TAB 3: ALUMNI CONNECT */
        <div>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              RIT ECE Alumni Network
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Graduates of Rajalakshmi Institute of Technology working across top core semiconductor & IT enterprises
            </p>
          </div>

          <div className="grid grid-3" style={{ gap: 'var(--space-4)' }}>
            {filterList(mentors.filter(m => m.account_type === 'alumni')).map(alumni => (
              <div key={alumni.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 'var(--space-5)' }}>
                <div>
                  <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                    <Link to={`/profile/${alumni.id}`}>
                      {alumni.profile_photo || alumni.avatar ? (
                        <img src={alumni.profile_photo || alumni.avatar} alt={alumni.full_name} className="avatar avatar-lg" />
                      ) : (
                        <div className="avatar-placeholder avatar-lg">{getInitials(alumni.full_name)}</div>
                      )}
                    </Link>
                    <div>
                      <Link to={`/profile/${alumni.id}`} style={{ textDecoration: 'none' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{alumni.full_name}</h3>
                      </Link>
                      <div style={{ fontSize: '0.8rem', color: 'var(--accent-400)', fontWeight: 600 }}>
                        {alumni.current_company || 'Core Industry'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Class of {alumni.graduation_year || alumni.batch || 'Alumni'}
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)', height: '36px', overflow: 'hidden' }}>
                    {alumni.headline || alumni.bio || 'ECE Graduate'}
                  </p>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
                    <span className="badge badge-cyan">{alumni.circle || 'VLSI & Embedded'}</span>
                    <span className="badge badge-emerald">Referrals & Mentoring</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Link to={`/profile/${alumni.id}`} className="btn btn-sm btn-ghost" style={{ flex: 1 }}>
                    Profile
                  </Link>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => openAskSeniorModal(alumni)}
                    style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  >
                    <MessageSquare size={14} /> Request Guidance
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'requests' ? (
        /* TAB 5: INVITATIONS (LINKEDIN STYLE RECEIVED & SENT) */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Manage Invitations
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {invitationSubTab === 'received'
                  ? `You have ${requests.length} incoming invitation${requests.length === 1 ? '' : 's'}`
                  : `You have ${sentRequests.length} pending sent invitation${sentRequests.length === 1 ? '' : 's'}`}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <button
                className={`btn btn-sm ${invitationSubTab === 'received' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setInvitationSubTab('received')}
                style={{ borderRadius: 'var(--radius-sm)', fontWeight: 600 }}
              >
                Received ({requests.length})
              </button>
              <button
                className={`btn btn-sm ${invitationSubTab === 'sent' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setInvitationSubTab('sent')}
                style={{ borderRadius: 'var(--radius-sm)', fontWeight: 600 }}
              >
                Sent ({sentRequests.length})
              </button>
            </div>
          </div>

          {invitationSubTab === 'received' ? (
            requests.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                <Users size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-4)' }} />
                <h3>No Pending Invitations Received</h3>
                <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                  You don&apos;t have any pending connection requests waiting for your response.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {requests.map(req => {
                  const sender = req.sender;
                  if (!sender) return null;
                  const reqId = req.id || req._id;
                  const senderId = sender.id || sender._id;
                  const senderName = sender.full_name || sender.fullName;

                  return (
                    <div key={reqId} className="card" style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', padding: 'var(--space-4)' }}>
                      <Link to={`/profile/${senderId}`}>
                        {sender.profile_photo || sender.avatar ? (
                          <img src={sender.profile_photo || sender.avatar} alt={senderName} className="avatar avatar-lg" />
                        ) : (
                          <div className="avatar-placeholder avatar-lg">{getInitials(senderName)}</div>
                        )}
                      </Link>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link to={`/profile/${senderId}`} style={{ fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'none', fontSize: '1rem' }}>
                          {senderName}
                        </Link>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {sender.headline || `${sender.account_type || 'student'} • Department of ECE`}
                        </p>
                        {req.created_at && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Sent {new Date(req.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button className="btn btn-sm btn-primary" onClick={() => handleAccept(reqId)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Check size={16} /> Accept
                        </button>
                        <button className="btn btn-sm btn-outline" onClick={() => handleReject(reqId)} title="Decline request" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <X size={16} /> Ignore
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            sentRequests.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                <Clock size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-4)' }} />
                <h3>No Pending Sent Invitations</h3>
                <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                  You haven&apos;t sent any connection requests that are pending acceptance.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {sentRequests.map(req => {
                  const receiver = req.receiver;
                  const reqId = req.id || req._id;
                  const receiverId = receiver?.id || receiver?._id || req.receiver_id;
                  const receiverName = receiver?.full_name || receiver?.fullName || 'ECE Member';

                  return (
                    <div key={reqId} className="card" style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', padding: 'var(--space-4)' }}>
                      <Link to={`/profile/${receiverId}`}>
                        {receiver?.profile_photo || receiver?.avatar ? (
                          <img src={receiver.profile_photo || receiver.avatar} alt={receiverName} className="avatar avatar-lg" />
                        ) : (
                          <div className="avatar-placeholder avatar-lg">{getInitials(receiverName)}</div>
                        )}
                      </Link>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link to={`/profile/${receiverId}`} style={{ fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'none', fontSize: '1rem' }}>
                          {receiverName}
                        </Link>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {receiver?.headline || `${receiver?.account_type || 'student'} • Department of ECE`}
                        </p>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Invited {req.created_at ? new Date(req.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'recently'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => handleWithdraw(reqId || receiverId)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <X size={15} /> Withdraw
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      ) : (
        /* TAB 6: MY CONNECTIONS */
        <div>
          {filterList(connections).length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
              <Users size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-4)' }} />
              <h3>No Connections Found</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                Start expanding your network by connecting with seniors and alumni in the Mentors tab!
              </p>
            </div>
          ) : (
            <div className="grid grid-3" style={{ gap: 'var(--space-4)' }}>
              {filterList(connections).map(c => (
                <div key={c.id} className="card" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                  <Link to={`/profile/${c.id}`} style={{ textDecoration: 'none' }}>
                    {c.profile_photo || c.avatar ? (
                      <img src={c.profile_photo || c.avatar} alt={c.full_name} className="avatar avatar-xl" style={{ margin: '0 auto var(--space-3)' }} />
                    ) : (
                      <div className="avatar-placeholder avatar-xl" style={{ margin: '0 auto var(--space-3)' }}>{getInitials(c.full_name)}</div>
                    )}
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>{c.full_name}</h3>
                  </Link>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', height: '40px', overflow: 'hidden', margin: '4px 0 var(--space-3)' }}>
                    {c.headline || `${c.account_type || 'Student'} • RIT ECE`}
                  </p>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}>
                    <Link to={`/profile/${c.id}`} className="btn btn-sm btn-outline" style={{ flex: 1 }}>Profile</Link>
                    <Link to={`/messages/${c.id}`} className="btn btn-sm btn-primary" style={{ flex: 1 }}>Message</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* "ASK A SENIOR" MODAL */}
      {askSeniorModalOpen && selectedSenior && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--space-4)',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '540px',
              width: '100%',
              padding: 'var(--space-6)',
              border: '1px solid rgba(0, 229, 255, 0.3)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HelpCircle size={22} color="var(--accent-500)" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                  Ask a Senior for Guidance
                </h3>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setAskSeniorModalOpen(false)}
                style={{ padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', background: 'var(--bg-secondary)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
              {selectedSenior.profile_photo || selectedSenior.avatar ? (
                <img src={selectedSenior.profile_photo || selectedSenior.avatar} alt={selectedSenior.full_name} className="avatar avatar-md" />
              ) : (
                <div className="avatar-placeholder avatar-md">{getInitials(selectedSenior.full_name)}</div>
              )}
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{selectedSenior.full_name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {selectedSenior.current_company ? `${selectedSenior.job_title || 'Engineer'} @ ${selectedSenior.current_company}` : selectedSenior.headline}
                </div>
                <span className="badge badge-cyan" style={{ fontSize: '0.72rem', marginTop: '2px' }}>
                  {selectedSenior.circle || 'Core ECE'}
                </span>
              </div>
            </div>

            <form onSubmit={submitAskSenior}>
              <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Guidance Topic <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  className="form-input"
                  value={askTopic}
                  onChange={(e) => setAskTopic(e.target.value)}
                  required
                >
                  <option value="Core ECE Placement Prep">Core ECE Placement Prep (TI, Qualcomm, Cisco, Intel)</option>
                  <option value="VLSI & Chip Design Project Help">VLSI & Chip Design Project Help</option>
                  <option value="Embedded Systems & IoT Guidance">Embedded Systems & IoT Guidance</option>
                  <option value="GATE ECE Strategy & Resources">GATE ECE Strategy & Roadmap</option>
                  <option value="Higher Studies (MS abroad / IIT M.Tech)">Higher Studies (MS abroad / IIT M.Tech)</option>
                  <option value="Resume & Portfolio Review">Resume & Project Portfolio Review</option>
                  <option value="Pass It Forward Career Mentoring">General Career Mentoring & Advice</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Your Question / Request <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  value={askMessage}
                  onChange={(e) => setAskMessage(e.target.value)}
                  placeholder="Explain what you need guidance with (specific tools, topics, interview rounds, or advice)..."
                  required
                />
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  This will initiate a dedicated mentorship inquiry thread in your Messages and notify the senior.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setAskSeniorModalOpen(false)}
                  disabled={sendingGuidance}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={sendingGuidance}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Send size={15} />
                  {sendingGuidance ? 'Sending Request...' : 'Send Guidance Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
