import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { usersAPI, connectionsAPI, messagesAPI } from '../services/api';
import { MapPin, Briefcase, GraduationCap, Calendar, ExternalLink, Github, Linkedin, Globe, CheckCircle, UserPlus, MessageCircle, UserCheck, Clock, Award, BookOpen, FolderOpen, Star, Languages as LangIcon, Heart, Camera } from 'lucide-react';
import './Profile.css';

function getInitials(name) { return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'; }

export default function Profile() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const isOwnProfile = (currentUser?.id && (currentUser?.id === id || currentUser?.id === profile?.id || currentUser?.id === profile?._id)) ||
                       (currentUser?._id && (currentUser?._id === id || currentUser?._id === profile?.id || currentUser?._id === profile?._id));

  useEffect(() => {
    loadProfile();
  }, [id]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await usersAPI.getUser(id);
      setProfile(data?.user || data);
    } catch (err) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      await connectionsAPI.sendRequest(id);
      setProfile(prev => ({ ...prev, connectionStatus: 'pending' }));
      toast.success('Connection request sent!');
    } catch (err) { toast.error(err.message || 'Failed to send request'); }
  };

  const handleMessage = async () => {
    try {
      const conv = await messagesAPI.createConversation(id);
      const convId = conv?.id || conv?._id || (conv?.conversation && (conv.conversation.id || conv.conversation._id));
      navigate(`/messages/${convId || id}`);
    } catch (err) {
      // If conversation already exists or creation failed, still direct to messages with user id
      navigate(`/messages/${id}`);
    }
  };

  if (loading) return (
    <div className="container" style={{ padding: '100px 0' }}>
      <div className="card" style={{ height: 300 }}><div className="skeleton" style={{ height: '100%' }} /></div>
    </div>
  );

  if (!profile) return (
    <div className="container"><div className="card empty-state" style={{ marginTop: 100 }}><h3>Profile not found</h3></div></div>
  );

  const displayName = profile.full_name || profile.fullName || 'RIT ECE Member';
  const displayPhoto = profile.profile_photo || profile.avatar;
  const displayRole = profile.account_type || profile.role || 'student';
  const isVerified = profile.verification_status === 'verified' || profile.isVerified;

  return (
    <div className="container profile-page">
      {/* Header Card */}
      <div className="card profile-header-card">
        <div className="profile-cover" />
        <div className="profile-header-content">
          <div className="profile-avatar-section">
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <div className="avatar avatar-2xl profile-main-avatar">
                {displayPhoto ? <img src={displayPhoto} alt="" /> : getInitials(displayName)}
              </div>
              {isOwnProfile && (
                <Link
                  to="/edit-profile"
                  title="Upload or change profile picture"
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    right: 4,
                    zIndex: 10,
                    background: 'var(--accent-500)',
                    color: '#ffffff',
                    borderRadius: '50%',
                    width: 36,
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                    border: '3px solid var(--bg-card, #1e293b)',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease, background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Camera size={17} />
                </Link>
              )}
            </div>
          </div>
          <div className="profile-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h1>{displayName}</h1>
              {isVerified && <span className="verified-badge" style={{ width: 24, height: 24 }}><CheckCircle size={14} /></span>}
              <span className="badge badge-primary">{displayRole === 'alumni' ? 'Alumni' : displayRole === 'faculty' ? 'Faculty' : 'Student'}</span>
            </div>
            <p className="profile-headline">{profile.headline || `ECE ${displayRole === 'alumni' ? 'Graduate' : displayRole === 'faculty' ? 'Faculty' : 'Student'} at RIT`}</p>
            <div className="profile-meta">
              {profile.location && <span><MapPin size={14} /> {profile.location}</span>}
              {profile.current_company && <span><Briefcase size={14} /> {profile.current_company}</span>}
              {profile.department && <span><GraduationCap size={14} /> {profile.department} {profile.batch && `'${profile.batch.slice(-2)}`}</span>}
              <span><UserCheck size={14} /> {profile.connectionCount || profile.connections_count || 0} connections</span>
            </div>
            <div className="profile-actions">
              {isOwnProfile ? (
                <Link to="/edit-profile" className="btn btn-primary">Edit Profile</Link>
              ) : (
                <>
                  {(profile.connectionStatus === 'accepted' || profile.connection_status === 'accepted') ? (
                    <button className="btn btn-secondary"><UserCheck size={16} /> Connected</button>
                  ) : (profile.connectionStatus === 'pending' || profile.connection_status === 'pending') ? (
                    <button className="btn btn-ghost" disabled><Clock size={16} /> Pending</button>
                  ) : (
                    <button className="btn btn-primary" onClick={handleConnect}><UserPlus size={16} /> Connect</button>
                  )}
                  <button className="btn btn-secondary" onClick={handleMessage}><MessageCircle size={16} /> Message</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="profile-grid">
        <div className="profile-main">
          {/* About */}
          {profile.bio && (
            <div className="card"><div className="card-header">About</div>
              <div className="card-body"><p style={{ lineHeight: 'var(--leading-relaxed)', whiteSpace: 'pre-wrap' }}>{profile.bio}</p></div>
            </div>
          )}

          {/* Education */}
          {profile.education?.length > 0 && (
            <div className="card"><div className="card-header"><span><GraduationCap size={18} /> Education</span></div>
              <div className="card-body">
                {profile.education.map(e => (
                  <div key={e.id} className="profile-section-item">
                    <div className="section-item-icon"><GraduationCap size={20} /></div>
                    <div><h4>{e.institution}</h4><p className="text-sm text-secondary">{e.degree} — {e.department}</p>
                      <p className="text-xs text-tertiary">{e.start_year} - {e.end_year || 'Present'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Experience */}
          {profile.experience?.length > 0 && (
            <div className="card"><div className="card-header"><span><Briefcase size={18} /> Experience</span></div>
              <div className="card-body">
                {profile.experience.map(e => (
                  <div key={e.id} className="profile-section-item">
                    <div className="section-item-icon"><Briefcase size={20} /></div>
                    <div><h4>{e.position}</h4><p className="text-sm text-secondary">{e.company} · {e.employment_type}</p>
                      <p className="text-xs text-tertiary">{e.start_date} - {e.is_current ? 'Present' : e.end_date} · {e.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {profile.skills?.length > 0 && (
            <div className="card"><div className="card-header"><span><Star size={18} /> Skills</span></div>
              <div className="card-body"><div className="skills-grid">
                {profile.skills.map(s => (
                  <span key={s.id} className="tag">{s.name} {s.endorsement_count > 0 && <small style={{ color: 'var(--accent-600)' }}>· {s.endorsement_count}</small>}</span>
                ))}
              </div></div>
            </div>
          )}

          {/* Projects */}
          {profile.projects?.length > 0 && (
            <div className="card"><div className="card-header"><span><FolderOpen size={18} /> Projects</span></div>
              <div className="card-body">
                {profile.projects.map(p => (
                  <div key={p.id} className="profile-section-item">
                    <div className="section-item-icon"><FolderOpen size={20} /></div>
                    <div><h4>{p.name}</h4><p className="text-sm text-secondary">{p.description?.slice(0, 120)}</p>
                      {p.technologies && <div className="skills-grid" style={{ marginTop: 8 }}>{p.technologies.split(',').map((t,i) => <span key={i} className="tag">{t.trim()}</span>)}</div>}
                      {p.project_link && <a href={p.project_link} target="_blank" className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}><ExternalLink size={12} /> View Project</a>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {profile.certifications?.length > 0 && (
            <div className="card"><div className="card-header"><span><Award size={18} /> Certifications</span></div>
              <div className="card-body">
                {profile.certifications.map(c => (
                  <div key={c.id} className="profile-section-item">
                    <div className="section-item-icon"><Award size={20} /></div>
                    <div><h4>{c.name}</h4><p className="text-sm text-secondary">{c.organization}</p>
                      <p className="text-xs text-tertiary">Issued {c.issue_date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile Sidebar */}
        <aside className="profile-sidebar">
          {/* Social Links */}
          {(profile.github || profile.linkedin || profile.portfolio) && (
            <div className="card"><div className="card-header">Links</div>
              <div className="card-body" style={{ padding: 0 }}>
                {profile.github && <a href={profile.github} target="_blank" className="sidebar-link"><Github size={16} /> GitHub</a>}
                {profile.linkedin && <a href={profile.linkedin} target="_blank" className="sidebar-link"><Linkedin size={16} /> LinkedIn</a>}
                {profile.portfolio && <a href={profile.portfolio} target="_blank" className="sidebar-link"><Globe size={16} /> Portfolio</a>}
              </div>
            </div>
          )}

          {/* Profile Completion (own profile) */}
          {isOwnProfile && (
            <div className="card"><div className="card-header">Profile Completion</div>
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'var(--accent-600)' }}>{profile.profile_completion}%</div>
                  <div className="progress-bar" style={{ flex: 1 }}><div className="progress-bar-fill" style={{ width: `${profile.profile_completion}%` }} /></div>
                </div>
                {profile.profile_completion < 100 && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    <p>Complete your profile to stand out!</p>
                    {!profile.bio && <p style={{ marginTop: 4 }}>• Add About section</p>}
                    {(!profile.skills || profile.skills.length === 0) && <p>• Add Skills</p>}
                    {!profile.resume && <p>• Upload Resume</p>}
                    {!profile.profile_photo && <p>• Add Profile Photo</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mentoring (Alumni) */}
          {profile.account_type === 'alumni' && profile.mentoring_available === 1 && (
            <div className="card">
              <div className="card-header"><span><Heart size={16} /> Mentoring</span></div>
              <div className="card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 'var(--text-sm)' }}>
                  {profile.mentoring_career === 1 && <span className="badge badge-success">Career Guidance</span>}
                  {profile.mentoring_referrals === 1 && <span className="badge badge-primary">Referrals</span>}
                  {profile.mentoring_projects === 1 && <span className="badge badge-violet">Project Guidance</span>}
                  {profile.mentoring_lectures === 1 && <span className="badge badge-warning">Guest Lectures</span>}
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
