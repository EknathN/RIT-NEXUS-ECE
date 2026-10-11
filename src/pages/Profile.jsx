import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { usersAPI, connectionsAPI, messagesAPI, postsAPI } from '../services/api';
import {
  MapPin, Briefcase, GraduationCap, Calendar, ExternalLink, Github,
  Linkedin, Globe, CheckCircle, UserPlus, MessageCircle, UserCheck,
  Clock, Award, BookOpen, FolderOpen, Star, Languages as LangIcon,
  Heart, Camera, ThumbsUp, MessageSquare, Share2, FileText, Image as ImageIcon,
  Sparkles, Plus, Video, X, Send
} from 'lucide-react';
import './Profile.css';

function getInitials(name) { return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'; }

function ensureExternalUrl(url) {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function formatPostTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export default function Profile() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userPosts, setUserPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Profile-level Create Post States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [mediaAttachment, setMediaAttachment] = useState(null);
  const [posting, setPosting] = useState(false);

  const imageInputRef = useRef(null);
  const docInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const isOwnProfile = (currentUser?.id && (currentUser?.id === id || currentUser?.id === profile?.id || currentUser?.id === profile?._id)) ||
                       (currentUser?._id && (currentUser?._id === id || currentUser?._id === profile?.id || currentUser?._id === profile?._id));

  useEffect(() => {
    loadProfile();
  }, [id]);

  const loadProfile = async () => {
    setLoading(true);
    setLoadingPosts(true);
    try {
      const data = await usersAPI.getUser(id);
      const userProfile = data?.user || data;
      setProfile(userProfile);

      const targetUserId = id || userProfile?.id || userProfile?._id || currentUser?.id || currentUser?._id;
      if (targetUserId) {
        try {
          const postsData = await postsAPI.getFeed({ user_id: targetUserId });
          const fetchedPosts = Array.isArray(postsData?.posts) ? postsData.posts : (Array.isArray(postsData) ? postsData : []);
          setUserPosts(fetchedPosts);
        } catch (pErr) {
          console.error('Failed to load user posts:', pErr);
        }
      }
    } catch (err) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
      setLoadingPosts(false);
    }
  };

  const handleLikePost = async (postId) => {
    try {
      await postsAPI.reactToPost(postId, 'like');
      setUserPosts(prev => prev.map(p => {
        const pid = p.id || p._id;
        if (pid === postId) {
          const hasLiked = p.userReaction === 'like';
          return {
            ...p,
            userReaction: hasLiked ? null : 'like',
            likes_count: hasLiked ? Math.max(0, (p.likes_count || 0) - 1) : (p.likes_count || 0) + 1,
          };
        }
        return p;
      }));
    } catch (err) {
      toast.error('Failed to react to post');
    }
  };

  const handleSharePost = async (postId, content) => {
    try {
      const url = `${window.location.origin}/home#post-${postId}`;
      if (navigator.share) {
        await navigator.share({ title: 'RIT ECE Nexus Post', text: content?.slice(0, 80), url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Post link copied to clipboard!');
      }
    } catch {
      toast.info('Share recorded');
    }
  };

  const handleFileSelect = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const sizeFormatted = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

      setMediaAttachment({
        type,
        data: reader.result,
        name: file.name,
        size: sizeFormatted,
      });
      setShowCreateModal(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCreatePost = async (e) => {
    e?.preventDefault();
    if (!newPostContent.trim() && !mediaAttachment) {
      toast.error('Please enter post text or attach a file');
      return;
    }

    setPosting(true);
    try {
      const postData = {
        content: newPostContent.trim(),
        media_type: mediaAttachment?.type || null,
        media_url: mediaAttachment?.data || null,
        media_name: mediaAttachment?.name || null,
        media_size: mediaAttachment?.size || null,
      };

      const res = await postsAPI.createPost(postData);
      const created = res?.post || res;
      setUserPosts(prev => [created, ...prev]);
      setNewPostContent('');
      setMediaAttachment(null);
      setShowCreateModal(false);
      toast.success('Post published to RIT ECE Nexus network!');
    } catch (err) {
      toast.error(err.message || 'Failed to create post');
    } finally {
      setPosting(false);
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

          {/* Activity / Posts (LinkedIn Style) */}
          <div className="card profile-activity-card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                <FileText size={18} style={{ color: 'var(--accent-500)' }} />
                {isOwnProfile ? 'Activity · My Posts' : 'Activity · Posts'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {isOwnProfile && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowCreateModal(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', padding: '5px 12px' }}
                  >
                    <Plus size={15} /> Add Post
                  </button>
                )}
                {userPosts.length > 0 && (
                  <span className="badge badge-secondary" style={{ fontSize: '0.78rem' }}>
                    {userPosts.length} {userPosts.length === 1 ? 'post' : 'posts'}
                  </span>
                )}
              </div>
            </div>
            <div className="card-body">
              {/* Quick Post Creator prompt on Own Profile */}
              {isOwnProfile && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    marginBottom: 16,
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)',
                    cursor: 'pointer'
                  }}
                  onClick={() => setShowCreateModal(true)}
                >
                  <div className="avatar avatar-sm">
                    {displayPhoto ? <img src={displayPhoto} alt="" /> : getInitials(displayName)}
                  </div>
                  <div style={{ flex: 1, color: 'var(--text-tertiary)', fontSize: '0.88rem' }}>
                    Share an update, project insight, or document...
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={(e) => { e.stopPropagation(); imageInputRef.current?.click(); }}
                      title="Add Photo"
                      style={{ padding: '6px' }}
                    >
                      <ImageIcon size={17} style={{ color: 'var(--cyan-500)' }} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={(e) => { e.stopPropagation(); docInputRef.current?.click(); }}
                      title="Add Document"
                      style={{ padding: '6px' }}
                    >
                      <FileText size={17} style={{ color: 'var(--amber-500)' }} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={(e) => { e.stopPropagation(); videoInputRef.current?.click(); }}
                      title="Add Video"
                      style={{ padding: '6px' }}
                    >
                      <Video size={17} style={{ color: 'var(--emerald-500)' }} />
                    </button>
                  </div>
                </div>
              )}

              {loadingPosts ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="skeleton" style={{ height: 60, borderRadius: 8 }} />
                  <div className="skeleton" style={{ height: 60, borderRadius: 8 }} />
                </div>
              ) : userPosts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--text-tertiary)' }}>
                  <p style={{ marginBottom: isOwnProfile ? 12 : 0, fontSize: '0.92rem' }}>
                    {isOwnProfile
                      ? "You haven't published any posts yet. Share an update, project highlight, or discussion in the ECE feed!"
                      : `${displayName} hasn't posted anything yet.`}
                  </p>
                  {isOwnProfile && (
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(true)}
                      className="btn btn-primary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <Plus size={15} /> Create First Post
                    </button>
                  )}
                </div>
              ) : (
                <div className="profile-posts-list">
                  {userPosts.map(post => {
                    const postId = post.id || post._id;
                    const isLiked = post.userReaction === 'like';
                    return (
                      <div key={postId} className="profile-post-item">
                        <div className="profile-post-header">
                          <div className="avatar avatar-sm">
                            {displayPhoto ? <img src={displayPhoto} alt="" /> : getInitials(displayName)}
                          </div>
                          <div className="profile-post-author-info">
                            <span className="profile-post-author-name">{displayName}</span>
                            <span className="profile-post-time">{formatPostTime(post.created_at)}</span>
                          </div>
                        </div>
                        <p className="profile-post-text">{post.content}</p>
                        
                        {/* Attachments */}
                        {post.media_type === 'image' && post.media_url && (
                          <img src={post.media_url} alt="Post attachment" className="profile-post-media-img" />
                        )}
                        {post.media_type === 'video' && post.media_url && (
                          <video src={post.media_url} controls style={{ width: '100%', maxHeight: 350, borderRadius: 8, marginBottom: 10 }} />
                        )}
                        {post.media_type === 'document' && (
                          <div className="profile-post-doc-badge">
                            <FileText size={16} />
                            <span>{post.media_name || 'Document attachment'}</span>
                            {post.media_size && <span style={{ opacity: 0.7 }}>({post.media_size})</span>}
                          </div>
                        )}

                        {/* Engagement Stats */}
                        <div className="profile-post-stats">
                          <span>{(post.likes_count || 0)} {(post.likes_count === 1 ? 'reaction' : 'reactions')}</span>
                          <span>{(post.comments?.length || post.comments_count || 0)} comments</span>
                        </div>

                        {/* Actions */}
                        <div className="profile-post-action-bar">
                          <button
                            className={`profile-post-action-btn ${isLiked ? 'active' : ''}`}
                            onClick={() => handleLikePost(postId)}
                          >
                            <ThumbsUp size={15} /> {isLiked ? 'Liked' : 'Like'}
                          </button>
                          <Link to={`/home#post-${postId}`} className="profile-post-action-btn">
                            <MessageSquare size={15} /> Comment
                          </Link>
                          <button
                            className="profile-post-action-btn"
                            onClick={() => handleSharePost(postId, post.content)}
                          >
                            <Share2 size={15} /> Share
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Education */}
          {profile.education?.length > 0 && (
            <div className="card"><div className="card-header"><span><GraduationCap size={18} /> Education</span></div>
              <div className="card-body">
                {profile.education.map(e => (
                  <div key={e.id} className="profile-section-item">
                    <div className="section-item-icon"><GraduationCap size={20} /></div>
                    <div><h4>{e.institution || e.school}</h4><p className="text-sm text-secondary">{e.degree} — {e.department || e.fieldOfStudy}</p>
                      <p className="text-xs text-tertiary">{e.start_year || e.startDate} - {e.end_year || e.endDate || 'Present'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Experience */}
          {((profile.experience && profile.experience.length > 0) || (profile.experiences && profile.experiences.length > 0)) && (
            <div className="card"><div className="card-header"><span><Briefcase size={18} /> Experience</span></div>
              <div className="card-body">
                {(profile.experience || profile.experiences).map((e, idx) => {
                  const pos = e.position || e.title || 'Role';
                  const comp = e.company || '';
                  const empType = e.employment_type || '';
                  const sDate = e.start_date || e.startDate || '';
                  const isCur = !!(e.is_current ?? e.current);
                  const eDate = isCur ? 'Present' : (e.end_date || e.endDate || 'Present');
                  const loc = e.location || '';
                  return (
                    <div key={e.id || `${pos}-${idx}`} className="profile-section-item">
                      <div className="section-item-icon"><Briefcase size={20} /></div>
                      <div>
                        <h4>{pos}</h4>
                        <p className="text-sm text-secondary">{comp}{empType ? ` · ${empType}` : ''}</p>
                        <p className="text-xs text-tertiary">{sDate}{sDate && eDate ? ' - ' : ''}{eDate}{loc ? ` · ${loc}` : ''}</p>
                        {e.description && <p className="text-sm" style={{ marginTop: 6, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>{e.description}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Skills */}
          {profile.skills?.length > 0 && (
            <div className="card"><div className="card-header"><span><Star size={18} /> Skills</span></div>
              <div className="card-body"><div className="skills-grid">
                {profile.skills.map((s, idx) => {
                  const sName = typeof s === 'object' ? s.name : s;
                  const eCount = typeof s === 'object' ? s.endorsement_count : 0;
                  return (
                    <span key={s?.id || `${sName}-${idx}`} className="tag">
                      {sName} {eCount > 0 && <small style={{ color: 'var(--accent-600)' }}>· {eCount}</small>}
                    </span>
                  );
                })}
              </div></div>
            </div>
          )}

          {/* Projects */}
          {profile.projects?.length > 0 && (
            <div className="card"><div className="card-header"><span><FolderOpen size={18} /> Projects</span></div>
              <div className="card-body">
                {profile.projects.map((p, idx) => {
                  const pName = p.name || p.title || 'Project';
                  const pLink = p.project_link || p.link;
                  const techs = typeof p.technologies === 'string'
                    ? p.technologies.split(',').map(t => t.trim()).filter(Boolean)
                    : (Array.isArray(p.technologies) ? p.technologies : []);

                  return (
                    <div key={p.id || `${pName}-${idx}`} className="profile-section-item">
                      <div className="section-item-icon"><FolderOpen size={20} /></div>
                      <div>
                        <h4>{pName}</h4>
                        {p.description && <p className="text-sm text-secondary">{p.description}</p>}
                        {techs.length > 0 && (
                          <div className="skills-grid" style={{ marginTop: 8 }}>
                            {techs.map((t, i) => <span key={i} className="tag">{typeof t === 'string' ? t.trim() : t}</span>)}
                          </div>
                        )}
                        {pLink && (
                          <a
                            href={ensureExternalUrl(pLink)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm"
                            style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}
                          >
                            <ExternalLink size={12} /> View Project
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
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
          {(() => {
            const gh = profile.github || profile.github_url || profile.socialLinks?.github;
            const li = profile.linkedin || profile.linkedin_url || profile.socialLinks?.linkedin;
            const pf = profile.portfolio || profile.portfolio_url || profile.website || profile.socialLinks?.portfolio;

            if (!gh && !li && !pf) return null;

            return (
              <div className="card">
                <div className="card-header">Links</div>
                <div className="card-body" style={{ padding: 0 }}>
                  {gh && (
                    <a
                      href={ensureExternalUrl(gh)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sidebar-link"
                    >
                      <Github size={16} /> GitHub
                    </a>
                  )}
                  {li && (
                    <a
                      href={ensureExternalUrl(li)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sidebar-link"
                    >
                      <Linkedin size={16} /> LinkedIn
                    </a>
                  )}
                  {pf && (
                    <a
                      href={ensureExternalUrl(pf)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sidebar-link"
                    >
                      <Globe size={16} /> Portfolio / Website
                    </a>
                  )}
                </div>
              </div>
            );
          })()}

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

      {/* Hidden File Inputs for Profile Post Composer */}
      <input
        type="file"
        ref={imageInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(e, 'image')}
      />
      <input
        type="file"
        ref={docInputRef}
        accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip"
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(e, 'document')}
      />
      <input
        type="file"
        ref={videoInputRef}
        accept="video/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(e, 'video')}
      />

      {/* Create Post Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => !posting && setShowCreateModal(false)}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 540,
              padding: 0,
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              border: '1px solid var(--border-primary)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="card-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 20px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Create a Post</h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => !posting && setShowCreateModal(false)}
                style={{ padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="card-body" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div className="avatar avatar-md">
                  {displayPhoto ? <img src={displayPhoto} alt="" /> : getInitials(displayName)}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{displayName}</h4>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Posting to RIT ECE Nexus
                  </p>
                </div>
              </div>

              <textarea
                autoFocus
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="What do you want to talk about? Share an update, project highlight, or question with your ECE community..."
                rows={5}
                style={{
                  width: '100%',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 'var(--radius-md)',
                  padding: 12,
                  fontSize: '0.92rem',
                  color: 'var(--text-primary)',
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'inherit',
                  lineHeight: 1.5,
                }}
              />

              {/* Media Attachment Preview */}
              {mediaAttachment && (
                <div
                  style={{
                    position: 'relative',
                    marginTop: 12,
                    padding: 10,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-primary)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setMediaAttachment(null)}
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      background: 'rgba(0,0,0,0.6)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      width: 24,
                      height: 24,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    title="Remove attachment"
                  >
                    <X size={14} />
                  </button>

                  {mediaAttachment.type === 'image' && (
                    <img
                      src={mediaAttachment.data}
                      alt="Attachment Preview"
                      style={{ maxHeight: 200, width: '100%', objectFit: 'contain', borderRadius: 6 }}
                    />
                  )}
                  {mediaAttachment.type === 'video' && (
                    <video
                      src={mediaAttachment.data}
                      controls
                      style={{ maxHeight: 200, width: '100%', borderRadius: 6 }}
                    />
                  )}
                  {mediaAttachment.type === 'document' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8 }}>
                      <FileText size={22} style={{ color: 'var(--accent-500)' }} />
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{mediaAttachment.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{mediaAttachment.size}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Media Action Row */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 16,
                  paddingTop: 12,
                  borderTop: '1px solid var(--border-primary)',
                }}
              >
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => imageInputRef.current?.click()}
                    title="Add Photo"
                    style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <ImageIcon size={17} style={{ color: 'var(--cyan-500)' }} /> Photo
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => docInputRef.current?.click()}
                    title="Add Document"
                    style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <FileText size={17} style={{ color: 'var(--amber-500)' }} /> Document
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => videoInputRef.current?.click()}
                    title="Add Video"
                    style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <Video size={17} style={{ color: 'var(--emerald-500)' }} /> Video
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowCreateModal(false)}
                    disabled={posting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleCreatePost}
                    disabled={posting || (!newPostContent.trim() && !mediaAttachment)}
                    style={{ minWidth: 70 }}
                  >
                    {posting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
