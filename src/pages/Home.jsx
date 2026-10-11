import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { postsAPI, connectionsAPI, adminAPI } from '../services/api';
import {
  Image, Send, ThumbsUp, MessageCircle, Share2, Bookmark,
  MoreHorizontal, Award, CheckCircle, TrendingUp, Calendar,
  Users, Sparkles, Briefcase, FileText, Video, X, Download,
  Edit3, Trash2, Clock, Camera
} from 'lucide-react';
import './Home.css';

function getInitials(name) {
  if (!name || typeof name !== 'string') return 'RE';
  const parts = name.trim().split(/\s+/);
  return parts.map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'RE';
}

function timeAgo(date) {
  if (!date) return 'Recently';
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return 'Recently';
  const seconds = Math.floor((new Date() - parsed) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return parsed.toLocaleDateString();
}

function getTimeRemaining(createdAt) {
  if (!createdAt) return '';
  const postTime = new Date(createdAt).getTime();
  const diffMs = (postTime + 3600000) - Date.now();
  if (diffMs <= 0) return 'Expired';
  const mins = Math.ceil(diffMs / 60000);
  return `${mins}m left to edit`;
}

const reactionTypes = [
  { type: 'like', icon: '👍', label: 'Like' },
  { type: 'celebrate', icon: '🎉', label: 'Celebrate' },
  { type: 'support', icon: '💪', label: 'Support' },
  { type: 'insightful', icon: '💡', label: 'Insightful' },
  { type: 'interesting', icon: '🤔', label: 'Interesting' },
];

export default function Home() {
  const { user } = useAuth();
  const toast = useToast();
  const [posts, setPosts] = useState(() => {
    try {
      const cached = localStorage.getItem('ritece_cached_feed');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('ritece_cached_feed');
      return !cached || JSON.parse(cached).length === 0;
    } catch {
      return true;
    }
  });
  const [posting, setPosting] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [showReactions, setShowReactions] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [feedTab, setFeedTab] = useState('all'); // 'all' | 'saved' | 'my'
  const [mediaAttachment, setMediaAttachment] = useState(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [sentIds, setSentIds] = useState(new Set());

  // Edit / Delete post states
  const [activePostMenu, setActivePostMenu] = useState(null);
  const [editingPostId, setEditingPostId] = useState(null);
  const [editContent, setEditContent] = useState('');

  const imageInputRef = useRef(null);
  const docInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const reactionTimerRef = useRef(null);

  useEffect(() => {
    loadFeed();
    loadSidebar();
  }, []);

  const loadFeed = async () => {
    try {
      const data = await postsAPI.getFeed();
      const list = Array.isArray(data?.posts) ? data.posts : (Array.isArray(data) ? data : []);
      if (list && list.length > 0) {
        setPosts(list);
        try { localStorage.setItem('ritece_cached_feed', JSON.stringify(list)); } catch (_) {}
      } else {
        // If server returned empty, but we have cached posts, preserve cache
        setPosts(prev => prev.length > 0 ? prev : []);
      }
    } catch (err) {
      console.error('Feed load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSidebar = async () => {
    try {
      const [sug, ann] = await Promise.allSettled([
        connectionsAPI.getSuggestions(),
        adminAPI.getAnnouncements(),
      ]);
      const suggestionsData = sug.status === 'fulfilled' ? (Array.isArray(sug.value) ? sug.value : sug.value?.suggestions || []) : [];
      const announcementsData = ann.status === 'fulfilled' ? (Array.isArray(ann.value) ? ann.value : ann.value?.announcements || []) : [];
      setSuggestions(suggestionsData.slice(0, 4));
      setAnnouncements(announcementsData.slice(0, 3));
    } catch (err) {
      console.error('Sidebar load error:', err);
    }
  };

  const handleFileSelect = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.show('File size exceeds 10MB limit', 'error');
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
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCreatePost = async () => {
    if (!newPost.trim() && !mediaAttachment) return;
    setPosting(true);
    try {
      const post = await postsAPI.createPost({
        content: newPost,
        media: mediaAttachment?.data || '',
        post_type: mediaAttachment?.type || 'text',
        document_name: mediaAttachment?.name || '',
      });
      setPosts(prev => {
        const next = [post, ...prev.filter(p => (p.id || p._id) !== (post.id || post._id))];
        try { localStorage.setItem('ritece_cached_feed', JSON.stringify(next)); } catch (_) {}
        return next;
      });
      setNewPost('');
      setMediaAttachment(null);
      toast.show('Post published to RIT ECE Nexus network!', 'success');
    } catch (err) {
      toast.show('Failed to create post', 'error');
    } finally {
      setPosting(false);
    }
  };

  const handleStartEditPost = (post) => {
    const pId = post.id || post._id;
    const postTime = new Date(post.created_at || post.createdAt).getTime();
    if (user?.role !== 'admin' && (Date.now() - postTime > 3600000)) {
      toast.show('Posts can only be edited within 1 hour of publishing', 'error');
      setActivePostMenu(null);
      return;
    }
    setEditingPostId(pId);
    setEditContent(post.content || '');
    setActivePostMenu(null);
  };

  const handleSaveEditPost = async (postId) => {
    if (!editContent.trim()) {
      toast.show('Post content cannot be empty', 'error');
      return;
    }
    try {
      const updated = await postsAPI.updatePost(postId, { content: editContent });
      setPosts(prev => prev.map(p => (p.id === postId || p._id === postId) ? { ...p, content: editContent, is_edited: 1 } : p));
      setEditingPostId(null);
      toast.show('Post updated successfully!', 'success');
    } catch (err) {
      toast.show(err.message || 'Failed to update post', 'error');
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) return;
    try {
      await postsAPI.deletePost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId && p._id !== postId));
      setActivePostMenu(null);
      toast.show('Post deleted', 'info');
    } catch (err) {
      toast.show(err.message || 'Failed to delete post', 'error');
    }
  };

  const handleReaction = async (postId, type) => {
    // 1. Optimistic UI update
    setPosts(prev => prev.map(p => {
      if (p.id === postId || p._id === postId) {
        const isSame = p.userReaction === type;
        const newReactionCounts = { ...(p.reactionCounts || {}) };
        if (isSame) {
          if (newReactionCounts[type]) newReactionCounts[type] = Math.max(0, newReactionCounts[type] - 1);
          return {
            ...p,
            userReaction: null,
            likes_count: Math.max(0, (p.likes_count || 1) - 1),
            reactionCounts: newReactionCounts,
          };
        } else {
          if (p.userReaction && newReactionCounts[p.userReaction]) {
            newReactionCounts[p.userReaction] = Math.max(0, newReactionCounts[p.userReaction] - 1);
          }
          newReactionCounts[type] = (newReactionCounts[type] || 0) + 1;
          return {
            ...p,
            userReaction: type,
            likes_count: p.userReaction ? p.likes_count : (p.likes_count || 0) + 1,
            reactionCounts: newReactionCounts,
          };
        }
      }
      return p;
    }));
    setShowReactions(null);

    // 2. Network sync in background
    try {
      await postsAPI.reactToPost(postId, type);
    } catch (err) {
      console.warn('Reaction background sync notice:', err.message);
    }
  };

  const toggleComments = (postId) => {
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const handleComment = async (postId) => {
    const content = commentInputs[postId];
    if (!content?.trim()) return;
    try {
      const comment = await postsAPI.commentOnPost(postId, content);
      setPosts(prev => prev.map(p => {
        if (p.id === postId || p._id === postId) {
          return {
            ...p,
            comments: [...(p.comments || []), comment],
            totalComments: (p.totalComments || 0) + 1,
            comments_count: (p.comments_count || 0) + 1
          };
        }
        return p;
      }));
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      setExpandedComments(prev => ({ ...prev, [postId]: true }));
      toast.show('Comment added!', 'success');
    } catch (err) {
      toast.show('Failed to comment', 'error');
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      await postsAPI.deleteComment(postId, commentId);
      setPosts(prev => prev.map(p => {
        if (p.id === postId || p._id === postId) {
          return {
            ...p,
            comments: (p.comments || []).filter(c => (c.id || c._id) !== commentId),
            totalComments: Math.max(0, (p.totalComments || 1) - 1),
            comments_count: Math.max(0, (p.comments_count || 1) - 1),
          };
        }
        return p;
      }));
      toast.show('Comment deleted', 'info');
    } catch (err) {
      toast.show('Failed to delete comment', 'error');
    }
  };

  const handleLikeComment = async (postId, commentId) => {
    try {
      const res = await postsAPI.likeComment(postId, commentId);
      setPosts(prev => prev.map(p => {
        if (p.id === postId || p._id === postId) {
          return {
            ...p,
            comments: (p.comments || []).map(c => {
              if ((c.id || c._id) === commentId) {
                return {
                  ...c,
                  isLiked: res?.liked,
                  likes_count: res?.likes_count !== undefined ? res.likes_count : (c.likes_count || 0) + (res?.liked ? 1 : -1)
                };
              }
              return c;
            })
          };
        }
        return p;
      }));
    } catch (err) {
      toast.show('Failed to like comment', 'error');
    }
  };

  const handleSave = async (postId) => {
    try {
      const result = await postsAPI.savePost(postId);
      const isSaved = !!result?.saved;
      setPosts(prev => prev.map(p => (p.id === postId || p._id === postId) ? { ...p, isSaved } : p));
      toast.show(isSaved ? 'Post saved to your collection!' : 'Post removed from saved collection', 'info');
    } catch (err) {
      toast.show('Failed to update saved state', 'error');
    }
  };

  const handleShare = async (post) => {
    const postId = post.id || post._id;
    try {
      const res = await postsAPI.sharePost(postId);
      setPosts(prev => prev.map(p => (p.id === postId || p._id === postId)
        ? { ...p, shares_count: res?.shares_count || (p.shares_count || 0) + 1 }
        : p
      ));

      const shareUrl = `${window.location.origin}/#post-${postId}`;
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'RIT ECE Nexus Post',
            text: post.content?.slice(0, 100),
            url: shareUrl,
          });
          toast.show('Shared successfully!', 'success');
          return;
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') return;
        }
      }

      await navigator.clipboard.writeText(shareUrl);
      toast.show('Post link copied to clipboard!', 'success');
    } catch (err) {
      try {
        await navigator.clipboard.writeText(`${window.location.origin}/#post-${postId}`);
        toast.show('Post link copied to clipboard!', 'success');
      } catch {
        toast.show('Share recorded', 'info');
      }
    }
  };

  const userDisplayName = user?.full_name || user?.fullName || 'ECE Member';
  const userHeadline = user?.headline || 'ECE Department • RIT Chennai';

  const displayedPosts = posts.filter(post => {
    if (!post) return false;
    if (feedTab === 'saved') return !!post.isSaved;
    if (feedTab === 'my') {
      const myId = user?.id || user?._id;
      return (post.user_id && post.user_id === myId) || (post.author?.id && post.author?.id === myId);
    }
    return true;
  });

  return (
    <div className="container">
      <div className="page-grid">
        {/* Left Sidebar */}
        <aside className="home-sidebar-left">
          <div className="card profile-mini-card">
            <div className="profile-mini-cover" />
            <div className="profile-mini-content">
              <div className="profile-mini-avatar-wrap">
                <div className="profile-mini-avatar">
                  {user?.profile_photo || user?.avatar ? (
                    <img src={user.profile_photo || user.avatar} alt={userDisplayName} />
                  ) : (
                    getInitials(userDisplayName)
                  )}
                </div>
                <Link
                  to="/edit-profile"
                  title="Upload or change profile picture"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    zIndex: 10,
                    background: 'var(--accent-500)',
                    color: '#fff',
                    borderRadius: '50%',
                    width: 22,
                    height: 22,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    border: '2px solid var(--card-bg)',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <Camera size={11} />
                </Link>
              </div>
              <Link to={`/profile/${user?.id || user?._id || ''}`} className="profile-mini-name">{userDisplayName}</Link>
              {(user?.verification_status === 'verified' || user?.isVerified) && (
                <span className="verified-badge"><CheckCircle size={10} /></span>
              )}
              <p className="profile-mini-headline">{userHeadline}</p>

              <div className="profile-mini-stats-section">
                <div className="profile-stat-row">
                  <span>Connections</span>
                  <strong>{user?.connections_count || user?.connectionCount || 0}</strong>
                </div>
                <div className="profile-stat-row">
                  <span>Profile Strength</span>
                  <strong>{user?.profile_completion || 75}%</strong>
                </div>
                <div className="progress-bar" style={{ margin: '4px 0 2px' }}>
                  <div className="progress-bar-fill" style={{ width: `${user?.profile_completion || 75}%` }} />
                </div>
              </div>

              <Link to="/edit-profile" className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: 8 }}>
                Edit Profile
              </Link>
            </div>
          </div>
        </aside>

        {/* Center Feed */}
        <main className="home-feed">
          {/* Hidden File Inputs for Attachments */}
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

          {/* Create Post Card */}
          <div className="card create-post-card">
            <div className="card-body">
              <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                <div className="avatar">
                  {user?.profile_photo || user?.avatar ? (
                    <img src={user.profile_photo || user.avatar} alt={userDisplayName} />
                  ) : (
                    getInitials(userDisplayName)
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <textarea
                    className="create-post-input"
                    placeholder="Share something with your ECE network (projects, internships, ideas)..."
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    rows={newPost ? 4 : 2}
                  />

                  {/* Attachment Preview */}
                  {mediaAttachment && (
                    <div style={{ margin: 'var(--space-3) 0', padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        {mediaAttachment.type === 'image' ? (
                          <img src={mediaAttachment.data} alt="Upload preview" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                        ) : mediaAttachment.type === 'video' ? (
                          <Video size={24} className="text-accent" />
                        ) : (
                          <FileText size={24} className="text-accent" />
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {mediaAttachment.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {mediaAttachment.type.toUpperCase()} • {mediaAttachment.size}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => setMediaAttachment(null)}
                        style={{ color: 'var(--danger-500)', padding: 4 }}
                        title="Remove attachment"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  <div className="create-post-actions">
                    <div className="create-post-media">
                      <button type="button" className="media-trigger-btn" onClick={() => imageInputRef.current?.click()} title="Add photo or figure">
                        <Image size={17} style={{ color: '#378fe9' }} /> Photo
                      </button>
                      <button type="button" className="media-trigger-btn" onClick={() => docInputRef.current?.click()} title="Add PDF paper, report, or document">
                        <FileText size={17} style={{ color: '#f59e0b' }} /> Document
                      </button>
                      <button type="button" className="media-trigger-btn" onClick={() => videoInputRef.current?.click()} title="Add project demo video">
                        <Video size={17} style={{ color: '#10b981' }} /> Video
                      </button>
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleCreatePost}
                      disabled={posting || (!newPost.trim() && !mediaAttachment)}
                      style={{ padding: '6px 18px', borderRadius: 'var(--radius-full)' }}
                    >
                      <Send size={13} /> {posting ? 'Posting...' : 'Post'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Posts Feed */}
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card" style={{ padding: 'var(--space-5)' }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <div className="skeleton skeleton-avatar" />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton skeleton-text" style={{ width: '40%' }} />
                    <div className="skeleton skeleton-text-sm" />
                  </div>
                </div>
                <div className="skeleton skeleton-text" />
                <div className="skeleton skeleton-text" />
                <div className="skeleton skeleton-text" style={{ width: '70%' }} />
              </div>
            ))
          ) : displayedPosts.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-state-icon">
                {feedTab === 'saved' ? <Bookmark size={32} /> : <TrendingUp size={32} />}
              </div>
              <h3>{feedTab === 'saved' ? 'No saved posts yet' : feedTab === 'my' ? 'You have not posted yet' : 'Your feed is empty'}</h3>
              <p>
                {feedTab === 'saved'
                  ? 'Click the Save icon under any post to keep it bookmarked here.'
                  : feedTab === 'my'
                  ? 'Share project updates, paper publications, or opportunities using the box above.'
                  : 'Connect with peers and faculty to see departmental posts and project showcases.'}
              </p>
              {feedTab !== 'all' && (
                <button className="btn btn-primary" onClick={() => setFeedTab('all')}>
                  Explore All Posts
                </button>
              )}
            </div>
          ) : (
            displayedPosts.map(post => {
              const pId = post.id || post._id;
              const authorName = post.author?.full_name || post.author?.fullName || 'ECE Member';
              const authorHeadline = post.author?.headline || 'ECE Department';
              const authorPhoto = post.author?.profile_photo || post.author?.avatar;
              const authorId = post.author?.id || post.author?._id || '';
              const validReactions = Object.entries(post.reactionCounts || {}).filter(([_, count]) => count > 0);
              const isCommentsOpen = !!expandedComments[pId];

              const isAuthor = authorId === user?.id || authorId === user?._id || post.user_id === user?.id || post.user_id === user?._id;
              const postAgeMs = Date.now() - new Date(post.created_at || post.createdAt || Date.now()).getTime();
              const canEdit = (isAuthor && postAgeMs <= 3600000) || user?.role === 'admin';
              const isEditExpired = isAuthor && postAgeMs > 3600000 && user?.role !== 'admin';
              const isEditing = editingPostId === pId;

              return (
                <div key={pId} id={`post-${pId}`} className="card post-card" style={{ position: 'relative' }}>
                  <div className="card-body">
                    {/* Post Header */}
                    <div className="post-header">
                      <Link to={`/profile/${authorId}`} className="avatar">
                        {authorPhoto ? <img src={authorPhoto} alt={authorName} /> : getInitials(authorName)}
                      </Link>
                      <div className="post-author-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Link to={`/profile/${authorId}`} className="post-author-name">{authorName}</Link>
                          {(post.author?.verification_status === 'verified' || post.author?.isVerified) && (
                            <span className="verified-badge"><CheckCircle size={10} /></span>
                          )}
                        </div>
                        <p className="post-author-headline">{authorHeadline}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="post-time">{timeAgo(post.created_at || post.createdAt)}</span>
                          {post.is_edited ? <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>• edited</span> : null}
                        </div>
                      </div>

                      {/* 3-dots Menu Button & Dropdown */}
                      <div style={{ position: 'relative' }}>
                        <button
                          type="button"
                          className="btn btn-icon btn-ghost"
                          onClick={() => setActivePostMenu(activePostMenu === pId ? null : pId)}
                          title="Post options"
                        >
                          <MoreHorizontal size={18} />
                        </button>

                        {activePostMenu === pId && (
                          <div
                            className="dropdown-menu"
                            style={{
                              position: 'absolute',
                              top: '100%',
                              right: 0,
                              minWidth: '180px',
                              zIndex: 20,
                              boxShadow: 'var(--shadow-lg)'
                            }}
                          >
                            {/* Author edit within 1 hour */}
                            {canEdit && (
                              <button
                                type="button"
                                className="dropdown-item"
                                onClick={() => handleStartEditPost(post)}
                              >
                                <Edit3 size={15} /> Edit Post
                              </button>
                            )}

                            {isEditExpired && (
                              <div
                                className="dropdown-item"
                                style={{ opacity: 0.55, cursor: 'not-allowed', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}
                                title="Posts can only be edited within 1 hour of publishing"
                              >
                                <Clock size={14} /> Edit expired (&gt;1h)
                              </div>
                            )}

                            {/* Author or Admin delete */}
                            {(isAuthor || user?.role === 'admin') && (
                              <button
                                type="button"
                                className="dropdown-item"
                                style={{ color: 'var(--danger-500)' }}
                                onClick={() => handleDeletePost(pId)}
                              >
                                <Trash2 size={15} /> Delete Post
                              </button>
                            )}

                            <button
                              type="button"
                              className="dropdown-item"
                              onClick={() => { handleSave(pId); setActivePostMenu(null); }}
                            >
                              <Bookmark size={15} /> {post.isSaved ? 'Unsave Post' : 'Save Post'}
                            </button>

                            <button
                              type="button"
                              className="dropdown-item"
                              onClick={() => { handleShare(post); setActivePostMenu(null); }}
                            >
                              <Share2 size={15} /> Share Post
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Post Content / Inline Edit Form */}
                    {isEditing ? (
                      <div style={{ margin: 'var(--space-3) 0', padding: 'var(--space-3)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-500-30)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={13} /> Editing allowed within 1 hour</span>
                          <span style={{ color: 'var(--accent-500)', fontWeight: 600 }}>{getTimeRemaining(post.created_at || post.createdAt)}</span>
                        </div>
                        <textarea
                          className="form-textarea"
                          rows={3}
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          style={{ width: '100%', marginBottom: '8px' }}
                          autoFocus
                        />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditingPostId(null)}>
                            Cancel
                          </button>
                          <button type="button" className="btn btn-sm btn-primary" onClick={() => handleSaveEditPost(pId)}>
                            Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      post.content && <div className="post-content">{post.content}</div>
                    )}

                    {/* Post Media Attachment */}
                    {post.media && (
                      post.post_type === 'image' || post.media.startsWith('data:image') || post.media.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) ? (
                        <div className="post-media-container" style={{ margin: 'var(--space-3) 0', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                          <img src={post.media} alt="Post attachment" style={{ width: '100%', maxHeight: '440px', objectFit: 'contain', background: 'var(--bg-secondary)', display: 'block' }} />
                        </div>
                      ) : post.post_type === 'video' || post.media.startsWith('data:video') ? (
                        <div className="post-media-container" style={{ margin: 'var(--space-3) 0', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                          <video src={post.media} controls style={{ width: '100%', maxHeight: '440px', display: 'block' }} />
                        </div>
                      ) : (
                        <div className="post-document-attachment" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px var(--space-4)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', margin: 'var(--space-3) 0' }}>
                          <FileText size={32} className="text-accent" style={{ flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {post.document_name || 'Attached Project Document'}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>ECE Document Resource</div>
                          </div>
                          <a
                            href={post.media}
                            download={post.document_name || 'document'}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-sm btn-outline"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Download size={14} /> Download
                          </a>
                        </div>
                      )
                    )}

                    {/* Reactions & Engagement Summary */}
                    <div className="post-engagement">
                      <div className="post-reactions-summary">
                        {validReactions.length > 0 && (
                          <>
                            {validReactions.slice(0, 3).map(([type]) => (
                              <span key={type} className="reaction-emoji">{reactionTypes.find(r => r.type === type)?.icon || '👍'}</span>
                            ))}
                            <span className="reaction-count">{post.likes_count || validReactions.reduce((acc, [_, c]) => acc + c, 0) || 0}</span>
                          </>
                        )}
                      </div>
                      <div className="post-engagement-counts">
                        {(post.totalComments || post.comments?.length || 0) > 0 && (
                          <span
                            onClick={() => toggleComments(pId)}
                            style={{ cursor: 'pointer', textDecoration: 'underline' }}
                            title="Click to view/hide comments"
                          >
                            {post.totalComments || post.comments.length} comments
                          </span>
                        )}
                        {(post.shares_count || 0) > 0 && <span>{post.shares_count} shares</span>}
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="post-actions">
                      <div
                        className="post-action-wrapper"
                        onMouseEnter={() => {
                          clearTimeout(reactionTimerRef.current);
                          setShowReactions(pId);
                        }}
                        onMouseLeave={() => {
                          reactionTimerRef.current = setTimeout(() => {
                            setShowReactions(null);
                          }, 320);
                        }}
                      >
                        <button
                          className={`post-action ${post.userReaction ? 'reacted' : ''}`}
                          onClick={() => handleReaction(pId, post.userReaction || 'like')}
                        >
                          {post.userReaction ? (
                            <span className="reaction-emoji">{reactionTypes.find(r => r.type === post.userReaction)?.icon || '👍'}</span>
                          ) : (
                            <ThumbsUp size={18} />
                          )}
                          <span>{post.userReaction ? reactionTypes.find(r => r.type === post.userReaction)?.label || 'Liked' : 'Like'}</span>
                        </button>
                        {showReactions === pId && (
                          <div className="reaction-picker">
                            {reactionTypes.map(r => (
                              <button key={r.type} className="reaction-picker-item" onClick={() => handleReaction(pId, r.type)} title={r.label}>
                                {r.icon}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Comment Toggle Button */}
                      <button
                        className={`post-action ${isCommentsOpen ? 'active text-accent' : ''}`}
                        onClick={() => toggleComments(pId)}
                      >
                        <MessageCircle size={18} /> <span>Comment</span>
                      </button>

                      {/* Share Button */}
                      <button className="post-action" onClick={() => handleShare(post)}>
                        <Share2 size={18} /> <span>Share</span>
                      </button>

                      {/* Save Button */}
                      <button
                        className={`post-action ${post.isSaved ? 'saved' : ''}`}
                        onClick={() => handleSave(pId)}
                      >
                        <Bookmark size={18} fill={post.isSaved ? 'var(--accent-500)' : 'none'} />
                        <span>{post.isSaved ? 'Saved' : 'Save'}</span>
                      </button>
                    </div>

                    {/* Comments Section (Only shown when user clicks Comment) */}
                    {isCommentsOpen && (
                      <div className="post-comments-expanded" style={{ marginTop: 'var(--space-3)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-3)' }}>
                        {/* Comment Input */}
                        <div className="comment-input-row" style={{ marginBottom: 'var(--space-3)' }}>
                          <div className="avatar avatar-sm">{getInitials(userDisplayName)}</div>
                          <div className="comment-input-wrapper">
                            <input
                              type="text"
                              className="comment-input"
                              placeholder="Write a comment..."
                              value={commentInputs[pId] || ''}
                              onChange={(e) => setCommentInputs(prev => ({ ...prev, [pId]: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && handleComment(pId)}
                              autoFocus
                            />
                            <button className="comment-send" onClick={() => handleComment(pId)}>
                              <Send size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Comments List */}
                        {(post.comments || []).length > 0 ? (
                          <div className="post-comments">
                            {post.comments.map(c => {
                              const cId = c.id || c._id;
                              const cAuthorName = c.author?.full_name || c.author?.fullName || 'Member';
                              const cAuthorPhoto = c.author?.profile_photo || c.author?.avatar;
                              const cAuthorId = c.author?.id || c.author?._id || c.user_id || '';
                              const canDeleteComment = c.user_id === user?.id || c.user_id === user?._id || cAuthorId === user?.id || cAuthorId === user?._id || isAuthor || user?.role === 'admin';

                              return (
                                <div key={cId} className="comment">
                                  <Link to={`/profile/${cAuthorId}`} className="avatar avatar-sm">
                                    {cAuthorPhoto ? <img src={cAuthorPhoto} alt={cAuthorName} /> : getInitials(cAuthorName)}
                                  </Link>
                                  <div className="comment-body">
                                    <div className="comment-bubble">
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Link to={`/profile/${cAuthorId}`} className="comment-author">{cAuthorName}</Link>
                                        {canDeleteComment && (
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteComment(pId, cId)}
                                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
                                            title="Delete comment"
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        )}
                                      </div>
                                      <p>{c.content}</p>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '2px', paddingLeft: '6px' }}>
                                      <span className="comment-time">{timeAgo(c.created_at || c.createdAt)}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleLikeComment(pId, cId)}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          color: c.isLiked ? 'var(--accent-500)' : 'var(--text-muted)',
                                          cursor: 'pointer',
                                          fontSize: '0.78rem',
                                          fontWeight: 600,
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}
                                      >
                                        <ThumbsUp size={12} fill={c.isLiked ? 'currentColor' : 'none'} />
                                        {c.likes_count > 0 ? c.likes_count : ''} Like
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', padding: 'var(--space-2)' }}>
                            No comments yet. Be the first to share your thoughts!
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </main>

        {/* Right Sidebar */}
        <aside className="home-sidebar-right">
          {/* Announcements */}
          {announcements.length > 0 && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>📢 Announcements</span>
                <span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>Official</span>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {announcements.map(a => (
                  <div 
                    key={a.id || a._id} 
                    className="sidebar-announcement"
                    onClick={() => setSelectedAnnouncement(a)}
                    title="Click to view full announcement"
                    style={{ cursor: 'pointer', transition: 'background var(--transition-fast)' }}
                  >
                    <div className={`announcement-priority priority-${a.priority || 'normal'}`} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', marginBottom: '2px' }}>
                        <h4 style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{a.title}</h4>
                        <span className={`badge ${a.priority === 'urgent' || a.priority === 'high' ? 'badge-danger' : 'badge-accent'}`} style={{ fontSize: '0.65rem', padding: '1px 5px', textTransform: 'capitalize' }}>
                          {a.priority || 'normal'}
                        </span>
                      </div>
                      <p style={{ margin: '3px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {a.content?.slice(0, 75)}...
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {timeAgo(a.created_at || a.publish_date)}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--accent-500)', fontWeight: 600 }}>
                          View notice &rarr;
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* People You May Know */}
          {suggestions.length > 0 && (
            <div className="card" style={{ marginTop: 'var(--space-4)' }}>
              <div className="card-header">
                <span>People You May Know</span>
                <Link to="/network" className="text-sm">See all</Link>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {suggestions.map(s => {
                  const sId = s.id || s._id;
                  const sName = s.full_name || s.fullName;
                  const sPhoto = s.profile_photo || s.avatar;
                  return (
                    <div key={sId} className="sidebar-suggestion">
                      <Link to={`/profile/${sId}`} className="avatar avatar-sm">
                        {sPhoto ? <img src={sPhoto} alt={sName} /> : getInitials(sName)}
                      </Link>
                      <div className="suggestion-info">
                        <Link to={`/profile/${sId}`} className="suggestion-name">{sName}</Link>
                        <p className="suggestion-headline">{s.headline || `${s.role || 'Student'} • ECE`}</p>
                      </div>
                      {sentIds.has(sId) ? (
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={async () => {
                            try {
                              await connectionsAPI.withdrawRequest(sId);
                              toast.show('Invitation withdrawn', 'info');
                              setSentIds(prev => {
                                const next = new Set(prev);
                                next.delete(sId);
                                return next;
                              });
                            } catch (e) {
                              toast.show('Could not withdraw request', 'error');
                            }
                          }}
                          title="Click to withdraw invitation"
                          style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}
                        >
                          Withdraw
                        </button>
                      ) : (
                        <button className="btn btn-sm btn-outline" onClick={async () => {
                          try {
                            await connectionsAPI.sendRequest(sId);
                            toast.show('Connection request sent!', 'success');
                            setSentIds(prev => new Set(prev).add(sId));
                          } catch (e) {
                            toast.show('Could not send request', 'error');
                          }
                        }}>
                          Connect
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Announcement Details Modal */}
      {selectedAnnouncement && (
        <div className="modal-backdrop" onClick={() => setSelectedAnnouncement(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-primary)', paddingBottom: 'var(--space-3)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span className={`badge ${selectedAnnouncement.priority === 'urgent' || selectedAnnouncement.priority === 'high' ? 'badge-danger' : 'badge-accent'}`}>
                    {(selectedAnnouncement.priority || 'General Notice').toUpperCase()}
                  </span>
                  <span className="badge badge-purple">
                    ECE Department, RIT Chennai
                  </span>
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
                  {selectedAnnouncement.title}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={14} /> {selectedAnnouncement.publish_date ? new Date(selectedAnnouncement.publish_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recent'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={14} /> {timeAgo(selectedAnnouncement.created_at || selectedAnnouncement.publish_date)}
                  </span>
                </div>
              </div>
              <button 
                className="btn btn-ghost" 
                onClick={() => setSelectedAnnouncement(null)}
                style={{ padding: '6px', borderRadius: '50%', color: 'var(--text-secondary)' }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: 'var(--space-4) 0', maxHeight: '60vh', overflowY: 'auto' }}>
              {selectedAnnouncement.image && (
                <div style={{ marginBottom: 'var(--space-4)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <img src={selectedAnnouncement.image} alt={selectedAnnouncement.title} style={{ width: '100%', maxHeight: '280px', objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                {selectedAnnouncement.content}
              </div>

              {selectedAnnouncement.attachment && (
                <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={20} color="var(--accent-500)" />
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Official Circular / Attachment</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Download official notice file</div>
                    </div>
                  </div>
                  <a href={selectedAnnouncement.attachment} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline">
                    <Download size={14} /> Download
                  </a>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 'var(--space-3)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button className="btn btn-primary" onClick={() => setSelectedAnnouncement(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
