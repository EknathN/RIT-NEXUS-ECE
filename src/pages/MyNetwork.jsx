import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { connectionsAPI, usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Users, UserPlus, UserCheck, Clock, Check, X, Search, Filter, Briefcase, GraduationCap, Award } from 'lucide-react';

function getInitials(name) { return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'; }

export default function MyNetwork() {
  const { user } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('suggestions'); // 'suggestions' | 'connections' | 'requests'
  const [requests, setRequests] = useState([]);
  const [connections, setConnections] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterBatch, setFilterBatch] = useState('all');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'requests') {
        const res = await connectionsAPI.getRequests();
        setRequests(res.data.requests || []);
      } else if (activeTab === 'connections') {
        const res = await connectionsAPI.getConnections();
        setConnections(res.data.connections || []);
      } else {
        const [sugRes, reqRes] = await Promise.all([
          connectionsAPI.getSuggestions(),
          connectionsAPI.getRequests()
        ]);
        setSuggestions(sugRes.data.suggestions || []);
        setRequests(reqRes.data.requests || []);
      }
    } catch (err) {
      console.error('Network load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (userId) => {
    try {
      await connectionsAPI.sendRequest(userId);
      toast.show('Connection request sent!', 'success');
      setSuggestions(prev => prev.filter(u => (u._id !== userId && u.id !== userId)));
    } catch (err) {
      toast.show(err.response?.data?.message || err.message || 'Failed to send request', 'error');
    }
  };

  const handleAccept = async (requestId) => {
    try {
      await connectionsAPI.acceptRequest(requestId);
      toast.show('Connection accepted!', 'success');
      setRequests(prev => prev.filter(r => (r._id !== requestId && r.id !== requestId)));
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

  // Filter suggestions or connections
  const filterUsers = (userList) => {
    if (!Array.isArray(userList)) return [];
    return userList.filter(u => {
      const name = u.fullName || u.full_name || '';
      const headline = u.headline || '';
      const skills = Array.isArray(u.skills) ? u.skills : (typeof u.skills === 'string' ? u.skills.split(',') : []);
      const matchSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        headline.toLowerCase().includes(searchTerm.toLowerCase()) ||
        skills.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
      const userRole = u.role || u.account_type || 'student';
      const matchRole = filterRole === 'all' || userRole === filterRole;
      const userBatch = u.batchYear || u.batch || '';
      const matchBatch = filterBatch === 'all' || userBatch === filterBatch || userBatch.includes(filterBatch);
      return matchSearch && matchRole && matchBatch;
    });
  };

  return (
    <div className="container" style={{ padding: 'var(--space-6) var(--space-4)' }}>
      {/* Top Banner */}
      <div className="card" style={{ marginBottom: 'var(--space-6)', background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.15), rgba(6, 182, 212, 0.15))', border: '1px solid var(--accent-500-20)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
          RIT ECE Network Directory
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Connect with 1,200+ students, distinguished alumni in Intel, Qualcomm, Cisco, and faculty members of Rajalakshmi Institute of Technology.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-2)' }}>
        <button
          className={`btn ${activeTab === 'suggestions' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('suggestions')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <UserPlus size={18} /> Discover Peers & Mentors
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

      {/* Search and Filters */}
      <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search by name, core skills (VLSI, IoT, Embedded)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <select className="form-select" value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={{ width: 'auto' }}>
              <option value="all">All Roles</option>
              <option value="student">Students</option>
              <option value="alumni">Alumni</option>
              <option value="faculty">Faculty</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <select className="form-select" value={filterBatch} onChange={(e) => setFilterBatch(e.target.value)} style={{ width: 'auto' }}>
              <option value="all">All Batches</option>
              <option value="2021-2025">Batch 2021-2025</option>
              <option value="2022-2026">Batch 2022-2026</option>
              <option value="2023-2027">Batch 2023-2027</option>
              <option value="2024-2028">Batch 2024-2028</option>
              <option value="2020">Class of 2020</option>
              <option value="2021">Class of 2021</option>
              <option value="2022">Class of 2022</option>
              <option value="2023">Class of 2023</option>
              <option value="2024">Class of 2024</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Areas */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <div className="loading-spinner" style={{ margin: '0 auto var(--space-4)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Finding members of RIT ECE...</p>
        </div>
      ) : activeTab === 'requests' ? (
        <div>
          {requests.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
              <Users size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-4)' }} />
              <h3>No Pending Invitations</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>You don&apos;t have any pending connection requests at the moment.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {requests.map(req => {
                const sender = req.sender;
                if (!sender) return null;
                const reqId = req._id || req.id;
                const senderId = sender._id || sender.id;
                const senderName = sender.fullName || sender.full_name;
                const senderPhoto = sender.avatar || sender.profile_photo;
                const senderRole = sender.role || sender.account_type || 'student';

                return (
                  <div key={reqId} className="card" style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
                    <Link to={`/profile/${senderId}`}>
                      {senderPhoto ? (
                        <img src={senderPhoto} alt={senderName} className="avatar avatar-lg" />
                      ) : (
                        <div className="avatar-placeholder avatar-lg">{getInitials(senderName)}</div>
                      )}
                    </Link>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link to={`/profile/${senderId}`} style={{ fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'none' }}>
                        {senderName}
                      </Link>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {sender.headline || `${senderRole} • RIT ECE`}
                      </p>
                      <span className={`badge badge-${senderRole === 'alumni' ? 'cyan' : senderRole === 'faculty' ? 'purple' : 'accent'}`} style={{ marginTop: '4px' }}>
                        {senderRole}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <button className="btn btn-sm btn-primary" onClick={() => handleAccept(reqId)} title="Accept">
                        <Check size={16} /> Accept
                      </button>
                      <button className="btn btn-sm btn-outline" onClick={() => handleReject(reqId)} title="Decline">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === 'connections' ? (
        <div>
          {filterUsers(connections).length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
              <Users size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-4)' }} />
              <h3>No Connections Found</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>Grow your network by discovering peers and alumni in the suggestions tab!</p>
            </div>
          ) : (
            <div className="grid grid-3" style={{ gap: 'var(--space-4)' }}>
              {filterUsers(connections).map(connUser => {
                const uId = connUser._id || connUser.id;
                const uName = connUser.fullName || connUser.full_name;
                const uPhoto = connUser.avatar || connUser.profile_photo;
                const uRole = connUser.role || connUser.account_type || 'student';
                const uBatch = connUser.batchYear || connUser.batch;

                return (
                  <div key={uId} className="card" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                    <Link to={`/profile/${uId}`} style={{ textDecoration: 'none' }}>
                      {uPhoto ? (
                        <img src={uPhoto} alt={uName} className="avatar avatar-xl" style={{ margin: '0 auto var(--space-3)' }} />
                      ) : (
                        <div className="avatar-placeholder avatar-xl" style={{ margin: '0 auto var(--space-3)' }}>{getInitials(uName)}</div>
                      )}
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{uName}</h3>
                    </Link>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', height: '40px', overflow: 'hidden', marginBottom: 'var(--space-3)' }}>
                      {connUser.headline || `${uRole} • RIT ECE`}
                    </p>
                    <span className={`badge badge-${uRole === 'alumni' ? 'cyan' : 'accent'}`} style={{ marginBottom: 'var(--space-4)' }}>
                      {uRole} {uBatch ? `(${uBatch})` : ''}
                    </span>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}>
                      <Link to={`/profile/${uId}`} className="btn btn-sm btn-outline" style={{ width: '100%' }}>View Profile</Link>
                      <Link to={`/messages/${uId}`} className="btn btn-sm btn-primary" style={{ width: '100%' }}>Message</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Discover / Suggestions Tab */
        <div className="grid grid-3" style={{ gap: 'var(--space-4)' }}>
          {filterUsers(suggestions).map(sugUser => {
            const sId = sugUser._id || sugUser.id;
            const sName = sugUser.fullName || sugUser.full_name;
            const sPhoto = sugUser.avatar || sugUser.profile_photo;
            const sRole = sugUser.role || sugUser.account_type || 'student';
            const sBatch = sugUser.batchYear || sugUser.batch;

            return (
              <div key={sId} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 'var(--space-5)' }}>
                <div style={{ textAlign: 'center' }}>
                  <Link to={`/profile/${sId}`} style={{ textDecoration: 'none' }}>
                    {sPhoto ? (
                      <img src={sPhoto} alt={sName} className="avatar avatar-xl" style={{ margin: '0 auto var(--space-3)' }} />
                    ) : (
                      <div className="avatar-placeholder avatar-xl" style={{ margin: '0 auto var(--space-3)' }}>{getInitials(sName)}</div>
                    )}
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{sName}</h3>
                  </Link>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', height: '38px', overflow: 'hidden', marginBottom: 'var(--space-3)' }}>
                    {sugUser.headline || `${sRole} • RIT ECE`}
                  </p>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
                    <span className={`badge badge-${sRole === 'alumni' ? 'cyan' : sRole === 'faculty' ? 'purple' : 'accent'}`}>
                      {sRole} {sBatch ? `'${sBatch.slice(-2)}` : ''}
                    </span>
                    {sugUser.isAvailableForMentoring && (
                      <span className="badge badge-emerald">Mentor</span>
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
                  <Link to={`/profile/${sId}`} className="btn btn-sm btn-ghost" style={{ flex: 1 }}>Profile</Link>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleSendRequest(sId)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  >
                    <UserPlus size={15} /> Connect
                  </button>
                </div>
              </div>
            );
          })}
          {filterUsers(suggestions).length === 0 && (
            <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 'var(--space-12)' }}>
              <Users size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-4)' }} />
              <h3>No members match your criteria</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>Try changing your role or batch filter, or search for different skills.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
