import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { communitiesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { 
  Hash, Volume2, Megaphone, Plus, Search, Pin, MessageSquare, 
  Send, Smile, Paperclip, Code, X, Check, MoreVertical, Bell, 
  BellOff, Users, Shield, Award, Mic, MicOff, Headphones, 
  Monitor, Radio, FileText, Download, ExternalLink, ChevronDown, 
  Sparkles, CornerDownRight, Trash2, Copy, CheckCircle2, User as UserIcon
} from 'lucide-react';

export default function Communities() {
  const { user } = useAuth();
  const toast = useToast();

  // Communities State
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCommunity, setSelectedCommunity] = useState(null);
  const [commSearch, setCommSearch] = useState('');

  // Channels State (Discord style)
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [loadingChannels, setLoadingChannels] = useState(false);

  // Messages State
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  // Modals & UI Toggles
  const [showCreateCommModal, setShowCreateCommModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showPinnedDrawer, setShowPinnedDrawer] = useState(false);
  const [showMembersSidebar, setShowMembersSidebar] = useState(true);
  const [showEmojiPickerForMsg, setShowEmojiPickerForMsg] = useState(null);
  const [channelSearch, setChannelSearch] = useState('');
  const [mutedChannels, setMutedChannels] = useState({});
  const [selectedAnnouncementMsg, setSelectedAnnouncementMsg] = useState(null);

  // Voice Lounge State (Discord Voice Room)
  const [inVoiceRoom, setInVoiceRoom] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);

  // Code Snippet input form
  const [codeData, setCodeData] = useState({
    code: '',
    language: 'verilog',
    comment: ''
  });

  // Create Channel Form State
  const [newChannelData, setNewChannelData] = useState({
    name: '',
    type: 'text', // 'text' | 'announcement' | 'voice'
    category: '💬 TEXT CHANNELS',
    topic: ''
  });

  // Create Community Form State
  const [createCommData, setCreateCommData] = useState({
    name: '',
    description: '',
    category: 'VLSI & Chip Design',
    isPrivate: false
  });

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  // Initialize Socket.IO connection
  useEffect(() => {
    const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin;
    const socket = io(socketUrl, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('community_message', (data) => {
      if (selectedCommunity && data.communityId === (selectedCommunity._id || selectedCommunity.id)) {
        if (activeChannel && (data.channelId === activeChannel.id || data.channelId === activeChannel.slug)) {
          setMessages(prev => {
            if (prev.some(m => m.id === data.message.id || m._id === data.message.id)) return prev;
            return [...prev, data.message];
          });
        }
      }
    });

    socket.on('community_reaction', (data) => {
      setMessages(prev => prev.map(m => {
        if (m.id === data.messageId || m._id === data.messageId) {
          return { ...m, reactions: data.reactions };
        }
        return m;
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedCommunity, activeChannel]);

  // Load Communities on Mount
  useEffect(() => {
    loadCommunities();
  }, []);

  const loadCommunities = async () => {
    setLoading(true);
    try {
      const res = await communitiesAPI.getAll();
      const list = Array.isArray(res) ? res : (res.communities || res.data?.communities || []);
      setCommunities(list);
      if (list.length > 0 && !selectedCommunity) {
        handleSelectCommunity(list[0]);
      }
    } catch (err) {
      console.error('Failed to load communities:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCommunity = async (comm) => {
    setSelectedCommunity(comm);
    const commId = comm._id || comm.id;
    setLoadingChannels(true);
    try {
      const res = await communitiesAPI.getChannels(commId);
      const chList = res.channels || [];
      setChannels(chList);
      if (chList.length > 0) {
        handleSelectChannel(chList[0], commId);
      }
    } catch (err) {
      console.error('Error fetching channels:', err);
    } finally {
      setLoadingChannels(false);
    }
  };

  const handleSelectChannel = async (channel, overrideCommId) => {
    setActiveChannel(channel);
    setReplyingTo(null);
    const commId = overrideCommId || (selectedCommunity?._id || selectedCommunity?.id);
    if (!commId) return;

    if (channel.type === 'voice') {
      // Voice channel doesn't strictly need text message fetch
      return;
    }

    setLoadingMessages(true);
    try {
      const res = await communitiesAPI.getMessages(commId, channel.id || channel.slug);
      setMessages(res.messages || []);
    } catch (err) {
      console.error('Error fetching channel messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!loadingMessages) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loadingMessages]);

  const handleJoin = async (id) => {
    try {
      await communitiesAPI.join(id);
      toast.show('Joined community server!', 'success');
      setCommunities(prev => prev.map(c => (c._id === id || c.id === id) ? { ...c, isMember: true, members: [...(c.members || []), user?.id] } : c));
      if (selectedCommunity && (selectedCommunity._id === id || selectedCommunity.id === id)) {
        setSelectedCommunity(prev => ({ ...prev, isMember: true, members: [...(prev.members || []), user?.id] }));
      }
    } catch (err) {
      toast.show('Failed to join community', 'error');
    }
  };

  const handleLeave = async (id) => {
    try {
      await communitiesAPI.leave(id);
      toast.show('Left community', 'info');
      setCommunities(prev => prev.map(c => (c._id === id || c.id === id) ? { ...c, isMember: false, members: (c.members || []).filter(m => m !== user?.id) } : c));
      if (selectedCommunity && (selectedCommunity._id === id || selectedCommunity.id === id)) {
        setSelectedCommunity(prev => ({ ...prev, isMember: false, members: (prev.members || []).filter(m => m !== user?.id) }));
      }
    } catch (err) {
      toast.show('Failed to leave community', 'error');
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputMessage.trim() || sending || !selectedCommunity || !activeChannel) return;

    const commId = selectedCommunity._id || selectedCommunity.id;
    const chId = activeChannel.id || activeChannel.slug;
    const text = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    try {
      const res = await communitiesAPI.sendMessage(commId, chId, {
        content: text,
        type: activeChannel.type === 'announcement' ? 'announcement' : 'text',
        reply_to: replyingTo ? { id: replyingTo.id, author: replyingTo.author?.full_name, content: replyingTo.content?.slice(0, 60) } : null
      });
      const newMsg = res.message;
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id || m._id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setReplyingTo(null);
    } catch (err) {
      toast.show('Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleSendCodeSnippet = async (e) => {
    e.preventDefault();
    if (!codeData.code.trim() || !selectedCommunity || !activeChannel) return;

    const commId = selectedCommunity._id || selectedCommunity.id;
    const chId = activeChannel.id || activeChannel.slug;

    try {
      const res = await communitiesAPI.sendMessage(commId, chId, {
        content: codeData.comment || 'Shared a code snippet:',
        type: 'code',
        code_snippet: codeData.code,
        code_language: codeData.language
      });
      const newMsg = res.message;
      setMessages(prev => [...prev, newMsg]);
      setShowCodeModal(false);
      setCodeData({ code: '', language: 'verilog', comment: '' });
      toast.show('Code snippet posted to channel!', 'success');
    } catch (err) {
      toast.show('Failed to post code', 'error');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCommunity || !activeChannel) return;

    const commId = selectedCommunity._id || selectedCommunity.id;
    const chId = activeChannel.id || activeChannel.slug;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await communitiesAPI.sendMessage(commId, chId, {
          content: `Shared file: ${file.name}`,
          type: 'file',
          attachment_name: file.name,
          attachment_url: reader.result || URL.createObjectURL(file)
        });
        setMessages(prev => [...prev, res.message]);
        toast.show('Attachment sent!', 'success');
      } catch (err) {
        toast.show('Failed to upload file', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleReaction = async (msgId, emoji) => {
    if (!selectedCommunity || !activeChannel) return;
    const commId = selectedCommunity._id || selectedCommunity.id;
    const chId = activeChannel.id || activeChannel.slug;

    // Optimistic UI update
    setMessages(prev => prev.map(m => {
      if (m.id === msgId || m._id === msgId) {
        const reactions = { ...(m.reactions || {}) };
        const userList = reactions[emoji] || [];
        if (userList.includes(user?.id)) {
          const filtered = userList.filter(id => id !== user?.id);
          if (filtered.length) reactions[emoji] = filtered;
          else delete reactions[emoji];
        } else {
          reactions[emoji] = [...userList, user?.id];
        }
        return { ...m, reactions };
      }
      return m;
    }));

    try {
      await communitiesAPI.reactMessage(commId, chId, msgId, emoji);
    } catch (err) {
      console.error('Reaction error:', err);
    }
  };

  const handleTogglePin = async (msgId) => {
    if (!selectedCommunity || !activeChannel) return;
    const commId = selectedCommunity._id || selectedCommunity.id;
    const chId = activeChannel.id || activeChannel.slug;
    try {
      const res = await communitiesAPI.pinMessage(commId, chId, msgId);
      setMessages(prev => prev.map(m => (m.id === msgId || m._id === msgId) ? { ...m, is_pinned: res.is_pinned } : m));
      toast.show(res.is_pinned ? 'Message pinned to channel!' : 'Message unpinned', 'success');
    } catch (err) {
      toast.show('Failed to toggle pin', 'error');
    }
  };

  const handleDeleteMessage = async (msgId) => {
    if (!selectedCommunity || !activeChannel) return;
    const commId = selectedCommunity._id || selectedCommunity.id;
    const chId = activeChannel.id || activeChannel.slug;
    try {
      await communitiesAPI.deleteMessage(commId, chId, msgId);
      setMessages(prev => prev.filter(m => m.id !== msgId && m._id !== msgId));
      toast.show('Message deleted', 'info');
    } catch (err) {
      toast.show('Failed to delete message', 'error');
    }
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannelData.name.trim() || !selectedCommunity) return;
    const commId = selectedCommunity._id || selectedCommunity.id;

    try {
      const res = await communitiesAPI.createChannel(commId, newChannelData);
      setChannels(prev => [...prev, res.channel]);
      setShowCreateChannelModal(false);
      setNewChannelData({ name: '', type: 'text', category: '💬 TEXT CHANNELS', topic: '' });
      toast.show(`Channel #${res.channel.name} created!`, 'success');
      handleSelectChannel(res.channel);
    } catch (err) {
      toast.show(err.response?.data?.error || 'Failed to create channel', 'error');
    }
  };

  const handleCreateCommunity = async (e) => {
    e.preventDefault();
    try {
      const res = await communitiesAPI.create(createCommData);
      const comm = res.community || res;
      toast.show('Community created!', 'success');
      setShowCreateCommModal(false);
      setCommunities(prev => [comm, ...prev]);
      handleSelectCommunity(comm);
      setCreateCommData({ name: '', description: '', category: 'VLSI & Chip Design', isPrivate: false });
    } catch (err) {
      toast.show('Failed to create community', 'error');
    }
  };

  const toggleMuteChannel = (chId) => {
    setMutedChannels(prev => ({ ...prev, [chId]: !prev[chId] }));
    toast.show(mutedChannels[chId] ? 'Channel notifications unmuted' : 'Channel notifications muted', 'info');
  };

  const isMember = (comm) => {
    if (!comm) return false;
    if (comm.isMember) return true;
    return (comm.members || []).some(m => m === user?.id || m?.id === user?.id);
  };

  // Group channels by category
  const channelCategories = channels.reduce((acc, ch) => {
    const cat = ch.category || (ch.type === 'announcement' ? '📢 BROADCASTS' : (ch.type === 'voice' ? '🔊 VOICE CHANNELS' : '💬 TEXT CHANNELS'));
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ch);
    return acc;
  }, {});

  const pinnedMessages = messages.filter(m => m.is_pinned);
  const filteredMessages = channelSearch.trim() 
    ? messages.filter(m => (m.content || '').toLowerCase().includes(channelSearch.toLowerCase()) || (m.code_snippet || '').toLowerCase().includes(channelSearch.toLowerCase()))
    : messages;

  return (
    <div style={{ height: 'calc(100vh - var(--navbar-height, 64px))', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      
      {/* 3-Panel Discord + WhatsApp Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '72px 260px 1fr ' + (showMembersSidebar ? '240px' : '0px'), height: '100%', overflow: 'hidden', transition: 'grid-template-columns 0.25s ease' }}>
        
        {/* PANEL 1: Leftmost Discord Server Rail */}
        <div style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: '10px', overflowY: 'auto' }}>
          
          {/* Main RIT ECE Server Hub Badge */}
          <div 
            title="RIT ECE Communities"
            style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--accent-500), var(--violet-500))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 148, 255, 0.3)' }}
          >
            ECE
          </div>

          <div style={{ width: '32px', height: '2px', background: 'var(--border-color)', margin: '4px 0' }} />

          {/* Communities Icons */}
          {communities.map(comm => {
            const active = selectedCommunity && (selectedCommunity._id === comm._id || selectedCommunity.id === comm.id);
            const initials = comm.name.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase();
            return (
              <div 
                key={comm._id || comm.id} 
                onClick={() => handleSelectCommunity(comm)}
                title={`${comm.name} (${comm.category})`}
                style={{ position: 'relative', cursor: 'pointer' }}
              >
                {/* Active Indicator Bar (Discord Style) */}
                {active && (
                  <div style={{ position: 'absolute', left: '-12px', top: '50%', transform: 'translateY(-50%)', width: '4px', height: '36px', background: 'var(--accent-500)', borderRadius: '0 4px 4px 0' }} />
                )}
                
                <div 
                  style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: active ? '16px' : '24px', 
                    background: active ? 'var(--accent-500)' : 'var(--bg-tertiary)', 
                    color: active ? '#fff' : 'var(--text-primary)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontWeight: 700, 
                    fontSize: '0.85rem',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    border: '1px solid ' + (active ? 'var(--accent-500)' : 'var(--border-color)'),
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.borderRadius = '16px'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.borderRadius = '24px'; }}
                >
                  {initials}
                </div>
              </div>
            );
          })}

          {/* Add Community Button */}
          <div 
            onClick={() => setShowCreateCommModal(true)}
            title="Create New Community"
            style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '24px', 
              background: 'var(--bg-tertiary)', 
              color: 'var(--accent-500)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer',
              border: '1px dashed var(--accent-500)',
              marginTop: '4px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderRadius = '16px'; e.currentTarget.style.background = 'var(--accent-500)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.borderRadius = '24px'; e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--accent-500)'; }}
          >
            <Plus size={20} />
          </div>
        </div>

        {/* PANEL 2: Discord Channel Sidebar & WhatsApp Channel Info */}
        <div style={{ background: 'var(--bg-tertiary)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          
          {/* Community Header & Join Status */}
          <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h2 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {selectedCommunity?.name || 'Select Community'}
                </h2>
                <CheckCircle2 size={15} color="var(--accent-500)" style={{ flexShrink: 0 }} />
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '6px' }}>
                <span>{selectedCommunity?.category || 'ECE Domain'}</span>
                <span>•</span>
                <span>{selectedCommunity?.members?.length || 1} members</span>
              </div>
            </div>

            {selectedCommunity && (
              isMember(selectedCommunity) ? (
                <button 
                  onClick={() => handleLeave(selectedCommunity._id || selectedCommunity.id)} 
                  className="btn btn-ghost" 
                  style={{ fontSize: '0.75rem', padding: '4px 8px', color: 'var(--text-muted)' }}
                  title="Leave Community"
                >
                  Leave
                </button>
              ) : (
                <button 
                  onClick={() => handleJoin(selectedCommunity._id || selectedCommunity.id)} 
                  className="btn btn-primary" 
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  Join
                </button>
              )
            )}
          </div>

          {/* Channel List Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-3) var(--space-2)' }}>
            
            {loadingChannels ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                <div className="loading-spinner" style={{ margin: '0 auto var(--space-2)' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading channels...</span>
              </div>
            ) : Object.keys(channelCategories).length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No channels found
              </div>
            ) : (
              Object.entries(channelCategories).map(([categoryName, chList]) => (
                <div key={categoryName} style={{ marginBottom: 'var(--space-4)' }}>
                  
                  {/* Category Header with + Create Channel Button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {categoryName}
                    </span>
                    <button 
                      onClick={() => {
                        setNewChannelData(prev => ({ ...prev, category: categoryName }));
                        setShowCreateChannelModal(true);
                      }}
                      className="btn btn-ghost" 
                      style={{ padding: '2px', color: 'var(--text-muted)', borderRadius: '4px' }}
                      title="Add Channel"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Channel Items */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {chList.map(channel => {
                      const isActive = activeChannel && (activeChannel.id === channel.id || activeChannel.slug === channel.slug);
                      const isAnnouncement = channel.type === 'announcement';
                      const isVoice = channel.type === 'voice';

                      return (
                        <div
                          key={channel.id || channel.slug}
                          onClick={() => handleSelectChannel(channel)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            background: isActive ? 'var(--accent-500-10)' : 'transparent',
                            color: isActive ? 'var(--accent-500)' : 'var(--text-secondary)',
                            fontWeight: isActive ? 700 : 500,
                            fontSize: '0.88rem',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={e => {
                            if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)';
                          }}
                          onMouseLeave={e => {
                            if (!isActive) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                            {isAnnouncement ? (
                              <Megaphone size={16} color={isActive ? 'var(--accent-500)' : 'var(--violet-400)'} />
                            ) : isVoice ? (
                              <Volume2 size={16} color={isActive ? 'var(--accent-500)' : 'var(--cyan-500)'} />
                            ) : (
                              <Hash size={16} color={isActive ? 'var(--accent-500)' : 'var(--text-muted)'} />
                            )}
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {channel.name}
                            </span>
                          </div>

                          {isVoice && inVoiceRoom && isActive && (
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success-500)', boxShadow: '0 0 8px var(--success-500)' }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bottom Discord User Panel */}
          <div style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
              <div style={{ position: 'relative' }}>
                <div className="avatar-placeholder avatar-sm" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                  {user?.full_name?.slice(0, 2).toUpperCase() || 'ME'}
                </div>
                <div style={{ position: 'absolute', bottom: '-1px', right: '-1px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--success-500)', border: '2px solid var(--bg-secondary)' }} />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.full_name || 'Innovator'}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Online</div>
              </div>
            </div>

            {/* Mic & Audio Quick Toggles */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <button 
                onClick={() => setMicMuted(!micMuted)} 
                className="btn btn-ghost" 
                style={{ padding: '6px', borderRadius: '6px', color: micMuted ? 'var(--error-500)' : 'var(--text-muted)' }}
                title={micMuted ? 'Unmute Mic' : 'Mute Mic'}
              >
                {micMuted ? <MicOff size={15} /> : <Mic size={15} />}
              </button>
              <button 
                onClick={() => setDeafened(!deafened)} 
                className="btn btn-ghost" 
                style={{ padding: '6px', borderRadius: '6px', color: deafened ? 'var(--error-500)' : 'var(--text-muted)' }}
                title={deafened ? 'Undeafen' : 'Deafen'}
              >
                <Headphones size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* PANEL 3: Active Channel Stage (Discord & WhatsApp Chat Feed) */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg-primary)' }}>
          
          {/* Top Channel Header Bar */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {activeChannel?.type === 'announcement' ? (
                  <Megaphone size={18} color="var(--violet-400)" />
                ) : activeChannel?.type === 'voice' ? (
                  <Volume2 size={18} color="var(--cyan-500)" />
                ) : (
                  <Hash size={18} color="var(--accent-500)" />
                )}
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {activeChannel?.name || 'select-a-channel'}
                </h3>
              </div>

              {activeChannel?.topic && (
                <>
                  <div style={{ width: '1px', height: '16px', background: 'var(--border-color)' }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {activeChannel.topic}
                  </span>
                </>
              )}
            </div>

            {/* Action Bar Tools */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Channel Message Search */}
              <div style={{ position: 'relative', width: '160px' }}>
                <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Search channel..." 
                  value={channelSearch} 
                  onChange={e => setChannelSearch(e.target.value)} 
                  className="form-input" 
                  style={{ paddingLeft: '28px', height: '28px', fontSize: '0.78rem' }}
                />
              </div>

              {/* Pin Drawer Toggle */}
              <button 
                onClick={() => setShowPinnedDrawer(!showPinnedDrawer)}
                className={`btn ${showPinnedDrawer ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '6px', borderRadius: '6px', position: 'relative' }}
                title="Pinned Messages"
              >
                <Pin size={16} />
                {pinnedMessages.length > 0 && (
                  <span style={{ position: 'absolute', top: 2, right: 2, width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-500)' }} />
                )}
              </button>

              {/* Notification Mute (WhatsApp style) */}
              <button 
                onClick={() => activeChannel && toggleMuteChannel(activeChannel.id || activeChannel.slug)}
                className="btn btn-ghost" 
                style={{ padding: '6px', borderRadius: '6px', color: mutedChannels[activeChannel?.id] ? 'var(--error-500)' : 'var(--text-muted)' }}
                title={mutedChannels[activeChannel?.id] ? 'Unmute Channel Alerts' : 'Mute Channel Alerts'}
              >
                {mutedChannels[activeChannel?.id] ? <BellOff size={16} /> : <Bell size={16} />}
              </button>

              {/* Members Sidebar Toggle */}
              <button 
                onClick={() => setShowMembersSidebar(!showMembersSidebar)}
                className={`btn ${showMembersSidebar ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '6px', borderRadius: '6px' }}
                title="Toggle Member List"
              >
                <Users size={16} />
              </button>
            </div>
          </div>

          {/* MAIN CHANNEL CONTENT */}
          {activeChannel?.type === 'voice' ? (
            
            /* DISCORD VOICE LOUNGE COMPONENT */
            <div style={{ flex: 1, padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at center, rgba(0, 148, 255, 0.08) 0%, rgba(10, 22, 40, 0.95) 100%)' }}>
              <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
                
                <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: inVoiceRoom ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0, 148, 255, 0.15)', marginBottom: 'var(--space-4)', border: '2px solid ' + (inVoiceRoom ? 'var(--success-500)' : 'var(--accent-500)') }}>
                  <Volume2 size={48} color={inVoiceRoom ? 'var(--success-500)' : 'var(--accent-500)'} />
                </div>

                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                  {activeChannel.name}
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: 'var(--space-6)' }}>
                  {inVoiceRoom 
                    ? '🟢 You are connected with audio! Speak freely with co-hackers and faculty.'
                    : 'Drop-in voice room for collaborative studying, lab circuits review, and sprint standups.'}
                </p>

                {/* Voice Participants Grid (Discord Style) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                  
                  {/* Current User in Voice */}
                  {inVoiceRoom && (
                    <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '2px solid var(--success-500)', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                      <div style={{ position: 'relative', marginBottom: '8px' }}>
                        <div className="avatar-placeholder avatar-lg" style={{ border: micMuted ? 'none' : '3px solid var(--success-500)', boxShadow: micMuted ? 'none' : '0 0 12px var(--success-500)' }}>
                          {user?.full_name?.slice(0, 2).toUpperCase() || 'ME'}
                        </div>
                        {micMuted && (
                          <div style={{ position: 'absolute', bottom: -2, right: -2, background: 'var(--error-500)', borderRadius: '50%', padding: '3px', color: '#fff' }}>
                            <MicOff size={12} />
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{user?.full_name}</span>
                      <span style={{ fontSize: '0.72rem', color: micMuted ? 'var(--error-500)' : 'var(--success-500)', fontWeight: 600 }}>
                        {micMuted ? 'Muted' : 'Speaking'}
                      </span>
                    </div>
                  )}

                  {/* Seeded Active Participants in Lab */}
                  <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="avatar-placeholder avatar-lg" style={{ marginBottom: '8px', border: '3px solid var(--accent-500)', boxShadow: '0 0 10px rgba(0, 148, 255, 0.4)' }}>
                      AR
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Arjun K</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--accent-500)', fontWeight: 600 }}>Active Speaker</span>
                  </div>

                  <div style={{ background: 'var(--bg-secondary)', padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="avatar-placeholder avatar-lg" style={{ marginBottom: '8px' }}>
                      PV
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Priya V</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Listening</span>
                  </div>
                </div>

                {/* Voice Controls Dock (Discord Style) */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-3)', background: 'var(--bg-secondary)', padding: '10px 20px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                  
                  {inVoiceRoom ? (
                    <>
                      <button 
                        onClick={() => setMicMuted(!micMuted)} 
                        className={`btn ${micMuted ? 'btn-outline' : 'btn-primary'}`} 
                        style={{ borderRadius: '50%', width: '42px', height: '42px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title={micMuted ? 'Unmute' : 'Mute'}
                      >
                        {micMuted ? <MicOff size={18} /> : <Mic size={18} />}
                      </button>

                      <button 
                        onClick={() => setDeafened(!deafened)} 
                        className={`btn ${deafened ? 'btn-outline' : 'btn-secondary'}`} 
                        style={{ borderRadius: '50%', width: '42px', height: '42px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title={deafened ? 'Undeafen' : 'Deafen'}
                      >
                        <Headphones size={18} />
                      </button>

                      <button 
                        onClick={() => setScreenSharing(!screenSharing)} 
                        className={`btn ${screenSharing ? 'btn-primary' : 'btn-secondary'}`} 
                        style={{ borderRadius: '50%', width: '42px', height: '42px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title={screenSharing ? 'Stop Screen Share' : 'Share Screen'}
                      >
                        <Monitor size={18} />
                      </button>

                      <button 
                        onClick={() => {
                          setInVoiceRoom(false);
                          toast.show('Disconnected from voice channel', 'info');
                        }} 
                        className="btn" 
                        style={{ background: 'var(--error-500)', color: '#fff', borderRadius: 'var(--radius-full)', padding: '8px 20px', fontWeight: 700, fontSize: '0.88rem' }}
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => {
                        setInVoiceRoom(true);
                        toast.show('Connected to voice room 🎙️', 'success');
                      }} 
                      className="btn btn-primary" 
                      style={{ padding: '10px 28px', borderRadius: 'var(--radius-full)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <Radio size={18} /> Connect to Voice Lounge
                    </button>
                  )}
                </div>
              </div>
            </div>

          ) : (
            
            /* DISCORD & WHATSAPP CHAT STREAM */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              
              {/* Pinned Messages Header Tray (if open) */}
              {showPinnedDrawer && (
                <div style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--accent-500)', padding: 'var(--space-3) var(--space-4)', maxHeight: '180px', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-500)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Pin size={15} /> Pinned Notes &amp; Highlights ({pinnedMessages.length})
                    </span>
                    <button onClick={() => setShowPinnedDrawer(false)} className="btn btn-ghost" style={{ padding: '2px', color: 'var(--text-muted)' }}>
                      <X size={16} />
                    </button>
                  </div>
                  {pinnedMessages.length === 0 ? (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>No pinned messages in this channel yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {pinnedMessages.map(pm => (
                        <div key={pm.id || pm._id} style={{ background: 'var(--bg-tertiary)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', fontSize: '0.84rem' }}>
                          <strong>{pm.author?.full_name}:</strong> {pm.content}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Message List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                
                {/* Channel Welcome Banner */}
                <div style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', marginBottom: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <div style={{ padding: '10px', borderRadius: '12px', background: 'var(--accent-500-10)', color: 'var(--accent-500)' }}>
                      {activeChannel?.type === 'announcement' ? <Megaphone size={24} /> : <Hash size={24} />}
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        Welcome to #{activeChannel?.name}!
                      </h2>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                        {activeChannel?.topic || 'This is the start of the #' + (activeChannel?.name || 'general') + ' channel.'}
                      </p>
                    </div>
                  </div>
                </div>

                {loadingMessages ? (
                  <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto var(--space-2)' }} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading conversation stream...</span>
                  </div>
                ) : filteredMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>
                    <MessageSquare size={36} style={{ margin: '0 auto var(--space-2)', opacity: 0.5 }} />
                    <p style={{ fontSize: '0.9rem', margin: 0 }}>No messages yet. Send a note to start the discussion!</p>
                  </div>
                ) : (
                  filteredMessages.map(msg => {
                    const isAuthor = msg.user_id === user?.id;
                    const isAnnouncement = msg.type === 'announcement' || activeChannel?.type === 'announcement';
                    const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0;

                    return (
                      <div 
                        key={msg.id || msg._id}
                        className="group"
                        style={{
                          display: 'flex',
                          flexDirection: isAnnouncement ? 'column' : 'row',
                          gap: '12px',
                          padding: isAnnouncement ? 'var(--space-4)' : '6px 10px',
                          borderRadius: 'var(--radius-md)',
                          background: isAnnouncement ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.08), rgba(6, 182, 212, 0.06))' : 'transparent',
                          border: isAnnouncement ? '1px solid rgba(168, 85, 247, 0.2)' : '1px solid transparent',
                          position: 'relative',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={e => {
                          if (!isAnnouncement) {
                            e.currentTarget.style.background = 'var(--bg-secondary)';
                            e.currentTarget.style.borderColor = 'var(--border-color)';
                          }
                          const tb = e.currentTarget.querySelector('.msg-toolbar');
                          if (tb) tb.style.opacity = '1';
                        }}
                        onMouseLeave={e => {
                          if (!isAnnouncement) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = 'transparent';
                          }
                          const tb = e.currentTarget.querySelector('.msg-toolbar');
                          if (tb) tb.style.opacity = '0';
                        }}
                      >
                        {/* Hover Action Bar (Discord Style) */}
                        <div 
                          className="msg-toolbar"
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '-12px',
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-full)',
                            padding: '2px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            opacity: 0,
                            transition: 'opacity 0.15s ease',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            zIndex: 10
                          }}
                        >
                          <button onClick={() => handleReaction(msg.id || msg._id, '👍')} className="btn btn-ghost" style={{ padding: '2px 4px', fontSize: '0.85rem' }} title="Thumbs up">👍</button>
                          <button onClick={() => handleReaction(msg.id || msg._id, '❤️')} className="btn btn-ghost" style={{ padding: '2px 4px', fontSize: '0.85rem' }} title="Heart">❤️</button>
                          <button onClick={() => handleReaction(msg.id || msg._id, '🚀')} className="btn btn-ghost" style={{ padding: '2px 4px', fontSize: '0.85rem' }} title="Rocket">🚀</button>
                          <button onClick={() => handleReaction(msg.id || msg._id, '🔥')} className="btn btn-ghost" style={{ padding: '2px 4px', fontSize: '0.85rem' }} title="Fire">🔥</button>
                          <button onClick={() => handleTogglePin(msg.id || msg._id)} className="btn btn-ghost" style={{ padding: '3px 4px', color: msg.is_pinned ? 'var(--accent-500)' : 'var(--text-muted)' }} title={msg.is_pinned ? 'Unpin' : 'Pin'}>
                            <Pin size={13} />
                          </button>
                          <button onClick={() => setReplyingTo(msg)} className="btn btn-ghost" style={{ padding: '3px 4px', color: 'var(--text-muted)' }} title="Reply">
                            <CornerDownRight size={13} />
                          </button>
                          {(isAuthor || user?.role === 'admin') && (
                            <button onClick={() => handleDeleteMessage(msg.id || msg._id)} className="btn btn-ghost" style={{ padding: '3px 4px', color: 'var(--error-500)' }} title="Delete">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>

                        {/* WhatsApp Broadcast Card Header (if Announcement) */}
                        {isAnnouncement ? (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="badge badge-purple" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Megaphone size={12} /> Official Broadcast
                              </span>
                              <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>{msg.author?.full_name || 'Faculty / Admin'}</strong>
                              <CheckCircle2 size={14} color="var(--accent-500)" />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(msg.created_at).toLocaleDateString()}
                              </span>
                              <button
                                className="btn btn-sm btn-ghost"
                                style={{ padding: '2px 8px', fontSize: '0.72rem', color: 'var(--accent-500)', border: '1px solid var(--accent-500-20)', borderRadius: 'var(--radius-sm)' }}
                                onClick={() => setSelectedAnnouncementMsg(msg)}
                              >
                                View Notice &rarr;
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Standard Discord Avatar */
                          <div className="avatar-placeholder avatar-md" style={{ flexShrink: 0, marginTop: '2px' }}>
                            {msg.author?.full_name?.slice(0, 2).toUpperCase() || 'U'}
                          </div>
                        )}

                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          
                          {/* Standard Message Header */}
                          {!isAnnouncement && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                                {msg.author?.full_name || 'Member'}
                              </strong>
                              {msg.author?.role === 'admin' && (
                                <span className="badge badge-accent" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>Admin</span>
                              )}
                              {msg.author?.role === 'faculty' && (
                                <span className="badge badge-cyan" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>Faculty</span>
                              )}
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {msg.is_pinned && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--accent-500)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                  <Pin size={11} /> Pinned
                                </span>
                              )}
                            </div>
                          )}

                          {/* Replying banner if present */}
                          {msg.reply_to && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px', paddingLeft: '8px', borderLeft: '2px solid var(--accent-500)' }}>
                              <CornerDownRight size={12} />
                              <span>Replying to <strong>@{msg.reply_to.author}</strong>: {msg.reply_to.content}</span>
                            </div>
                          )}

                          {/* Message Content */}
                          {msg.content && (
                            <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.6, margin: '0 0 6px 0', whiteSpace: 'pre-line' }}>
                              {msg.content}
                            </p>
                          )}

                          {/* Code Snippet Block (Discord Style) */}
                          {msg.code_snippet && (
                            <div style={{ margin: '8px 0', borderRadius: 'var(--radius-md)', background: '#070d18', border: '1px solid rgba(0, 148, 255, 0.2)', overflow: 'hidden' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 12px', background: '#0e1726', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <span style={{ fontSize: '0.72rem', color: 'var(--accent-500)', fontWeight: 700, textTransform: 'uppercase' }}>
                                  {msg.code_language || 'c'}
                                </span>
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(msg.code_snippet);
                                    toast.show('Code copied to clipboard!', 'info');
                                  }}
                                  className="btn btn-ghost" 
                                  style={{ padding: '2px 6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}
                                  title="Copy Code"
                                >
                                  <Copy size={12} /> Copy
                                </button>
                              </div>
                              <pre style={{ margin: 0, padding: '10px 14px', fontSize: '0.84rem', color: '#a5f3fc', fontFamily: 'var(--font-mono, monospace)', overflowX: 'auto' }}>
                                <code>{msg.code_snippet}</code>
                              </pre>
                            </div>
                          )}

                          {/* File Attachment Card */}
                          {msg.attachment_url && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '8px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', margin: '6px 0' }}>
                              <FileText size={20} color="var(--accent-500)" />
                              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {msg.attachment_name || 'Document Attachment'}
                              </div>
                              <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                View <ExternalLink size={12} />
                              </a>
                            </div>
                          )}

                          {/* Interactive Emoji Reaction Pills */}
                          {hasReactions && (
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                              {Object.entries(msg.reactions).map(([emoji, userIds]) => {
                                const userReacted = (userIds || []).includes(user?.id);
                                return (
                                  <button
                                    key={emoji}
                                    onClick={() => handleReaction(msg.id || msg._id, emoji)}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '2px 8px',
                                      borderRadius: 'var(--radius-full)',
                                      border: userReacted ? '1px solid var(--accent-500)' : '1px solid var(--border-color)',
                                      background: userReacted ? 'var(--accent-500-10)' : 'var(--bg-secondary)',
                                      color: userReacted ? 'var(--accent-500)' : 'var(--text-secondary)',
                                      fontSize: '0.78rem',
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease'
                                    }}
                                  >
                                    <span>{emoji}</span>
                                    <span style={{ fontWeight: 700 }}>{userIds.length}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Replying Banner */}
              {replyingTo && (
                <div style={{ background: 'var(--bg-secondary)', padding: '6px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <span>Replying to <strong>@{replyingTo.author?.full_name}</strong></span>
                  <button onClick={() => setReplyingTo(null)} className="btn btn-ghost" style={{ padding: '2px' }}>
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Rich Message Input Bar (Discord + WhatsApp Channels hybrid) */}
              <div style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
                <form 
                  onSubmit={handleSendMessage}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '6px 12px'
                  }}
                >
                  {/* File Upload Button */}
                  <label style={{ cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }} title="Attach File / Document">
                    <Paperclip size={18} />
                    <input type="file" style={{ display: 'none' }} onChange={handleFileUpload} />
                  </label>

                  {/* Add Code Block Button */}
                  <button 
                    type="button" 
                    onClick={() => setShowCodeModal(true)} 
                    className="btn btn-ghost" 
                    style={{ padding: '4px', color: 'var(--text-muted)' }}
                    title="Insert Code Snippet"
                  >
                    <Code size={18} />
                  </button>

                  {/* Text Input Area */}
                  <input
                    type="text"
                    className="form-input"
                    placeholder={`Message #${activeChannel?.name || 'channel'} (Enter to send)...`}
                    value={inputMessage}
                    onChange={e => setInputMessage(e.target.value)}
                    style={{
                      flex: 1,
                      border: 'none',
                      background: 'transparent',
                      padding: '6px 8px',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxShadow: 'none'
                    }}
                  />

                  {/* Quick Reaction Emoji Buttons */}
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <button type="button" onClick={() => setInputMessage(prev => prev + ' 👍')} className="btn btn-ghost" style={{ padding: '2px 4px', fontSize: '0.9rem' }}>👍</button>
                    <button type="button" onClick={() => setInputMessage(prev => prev + ' 🚀')} className="btn btn-ghost" style={{ padding: '2px 4px', fontSize: '0.9rem' }}>🚀</button>
                    <button type="button" onClick={() => setInputMessage(prev => prev + ' 🔥')} className="btn btn-ghost" style={{ padding: '2px 4px', fontSize: '0.9rem' }}>🔥</button>
                  </div>

                  {/* Send Button */}
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!inputMessage.trim() || sending}
                    style={{ padding: '6px 12px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Send size={15} />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* PANEL 4: Discord Server Members Directory (Collapsible) */}
        {showMembersSidebar && (
          <div style={{ background: 'var(--bg-tertiary)', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', padding: 'var(--space-3) var(--space-3)' }}>
            
            <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-3)', paddingLeft: '4px' }}>
              Community Members ({selectedCommunity?.members?.length || 1})
            </h3>

            {/* Faculty & Core Admins */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-500)', textTransform: 'uppercase', marginBottom: '6px', paddingLeft: '4px' }}>
                👑 Faculty &amp; Admins — 1
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', marginBottom: '4px' }}>
                <div style={{ position: 'relative' }}>
                  <div className="avatar-placeholder avatar-sm" style={{ width: '28px', height: '28px', fontSize: '0.75rem' }}>
                    AD
                  </div>
                  <div style={{ position: 'absolute', bottom: -1, right: -1, width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success-500)', border: '2px solid var(--bg-secondary)' }} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Dr. Faculty ECE
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Lab Incharge</div>
                </div>
              </div>
            </div>

            {/* Students & Innovators */}
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', paddingLeft: '4px' }}>
                💻 Online Students — 4
              </div>
              
              {[
                { name: user?.full_name || 'You', role: 'Student Innovator', tag: 'Online', initials: user?.full_name?.slice(0, 2).toUpperCase() || 'ME' },
                { name: 'Arjun K', role: 'Embedded Systems Lead', tag: 'In Lab', initials: 'AK' },
                { name: 'Priya V', role: 'AI & VLSI Researcher', tag: 'Online', initials: 'PV' },
                { name: 'Rahul S', role: 'Robotics Club Head', tag: 'Coding', initials: 'RS' }
              ].map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: 'var(--radius-md)', marginBottom: '2px', cursor: 'pointer' }}>
                  <div style={{ position: 'relative' }}>
                    <div className="avatar-placeholder avatar-sm" style={{ width: '28px', height: '28px', fontSize: '0.75rem' }}>
                      {m.initials}
                    </div>
                    <div style={{ position: 'absolute', bottom: -1, right: -1, width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success-500)', border: '2px solid var(--bg-tertiary)' }} />
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.name}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.role}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CREATE CHANNEL MODAL (Discord Style) */}
      {showCreateChannelModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateChannelModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', padding: 'var(--space-6)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
              Create New Channel
            </h2>
            <form onSubmit={handleCreateChannel} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              
              <div className="form-group">
                <label className="form-label">Channel Type</label>
                <div className="grid grid-3" style={{ gap: '8px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '10px', borderRadius: 'var(--radius-md)', border: newChannelData.type === 'text' ? '2px solid var(--accent-500)' : '1px solid var(--border-color)', background: newChannelData.type === 'text' ? 'var(--accent-500-10)' : 'transparent', cursor: 'pointer' }}>
                    <input type="radio" name="chType" checked={newChannelData.type === 'text'} onChange={() => setNewChannelData({ ...newChannelData, type: 'text', category: '💬 TEXT CHANNELS' })} style={{ display: 'none' }} />
                    <Hash size={20} color="var(--accent-500)" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>Text Chat</span>
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '10px', borderRadius: 'var(--radius-md)', border: newChannelData.type === 'announcement' ? '2px solid var(--violet-400)' : '1px solid var(--border-color)', background: newChannelData.type === 'announcement' ? 'rgba(168, 85, 247, 0.1)' : 'transparent', cursor: 'pointer' }}>
                    <input type="radio" name="chType" checked={newChannelData.type === 'announcement'} onChange={() => setNewChannelData({ ...newChannelData, type: 'announcement', category: '📢 BROADCASTS' })} style={{ display: 'none' }} />
                    <Megaphone size={20} color="var(--violet-400)" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>Broadcast</span>
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '10px', borderRadius: 'var(--radius-md)', border: newChannelData.type === 'voice' ? '2px solid var(--cyan-500)' : '1px solid var(--border-color)', background: newChannelData.type === 'voice' ? 'rgba(6, 182, 212, 0.1)' : 'transparent', cursor: 'pointer' }}>
                    <input type="radio" name="chType" checked={newChannelData.type === 'voice'} onChange={() => setNewChannelData({ ...newChannelData, type: 'voice', category: '🔊 VOICE CHANNELS' })} style={{ display: 'none' }} />
                    <Volume2 size={20} color="var(--cyan-500)" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>Voice Room</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Channel Name *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>#</span>
                  <input
                    type="text"
                    className="form-input"
                    required
                    style={{ paddingLeft: '28px' }}
                    placeholder="e.g. verilog-verification / circuit-help"
                    value={newChannelData.name}
                    onChange={e => setNewChannelData({ ...newChannelData, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Channel Topic / Description</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="What is this channel for?"
                  value={newChannelData.topic}
                  onChange={e => setNewChannelData({ ...newChannelData, topic: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateChannelModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Channel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSERT CODE SNIPPET MODAL (Discord Style) */}
      {showCodeModal && (
        <div className="modal-backdrop" onClick={() => setShowCodeModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', padding: 'var(--space-6)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Code size={20} color="var(--accent-500)" /> Share Code Snippet
            </h2>
            <form onSubmit={handleSendCodeSnippet} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              
              <div className="grid grid-2" style={{ gap: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Programming / Hardware Language</label>
                  <select 
                    className="form-select"
                    value={codeData.language}
                    onChange={e => setCodeData({ ...codeData, language: e.target.value })}
                  >
                    <option value="verilog">Verilog / SystemVerilog</option>
                    <option value="vhdl">VHDL</option>
                    <option value="c">Embedded C / C++</option>
                    <option value="python">Python</option>
                    <option value="matlab">MATLAB</option>
                    <option value="assembly">Assembly (ARM/RISC-V/8051)</option>
                    <option value="javascript">JavaScript / TypeScript</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Brief Note / Question</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Check my FSM state machine logic"
                    value={codeData.comment}
                    onChange={e => setCodeData({ ...codeData, comment: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Source Code *</label>
                <textarea
                  className="form-textarea"
                  rows={8}
                  required
                  placeholder="// Paste your hardware or firmware code here..."
                  style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.88rem', background: '#070d18', color: '#67e8f9' }}
                  value={codeData.code}
                  onChange={e => setCodeData({ ...codeData, code: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowCodeModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Post Snippet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE COMMUNITY MODAL */}
      {showCreateCommModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateCommModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px', padding: 'var(--space-6)' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
              Create ECE Community Hub
            </h2>
            <form onSubmit={handleCreateCommunity} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              
              <div className="form-group">
                <label className="form-label">Community / Club Name *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. RIT RISC-V Architecture Club"
                  value={createCommData.name}
                  onChange={e => setCreateCommData({ ...createCommData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Domain Category *</label>
                <select 
                  className="form-select"
                  value={createCommData.category}
                  onChange={e => setCreateCommData({ ...createCommData, category: e.target.value })}
                >
                  <option value="VLSI & Chip Design">VLSI &amp; Chip Design</option>
                  <option value="Embedded Systems & IoT">Embedded Systems &amp; IoT</option>
                  <option value="Robotics & Automation">Robotics &amp; Automation</option>
                  <option value="Telecommunications & 5G">Telecommunications &amp; 5G</option>
                  <option value="GATE ECE & Core Prep">GATE ECE &amp; Core Prep</option>
                  <option value="Hardware AI & TinyML">Hardware AI &amp; TinyML</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Description &amp; Objectives</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Describe what projects, lab activities, or study resources will be shared in this group..."
                  value={createCommData.description}
                  onChange={e => setCreateCommData({ ...createCommData, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateCommModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Community</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Announcement Detail Modal */}
      {selectedAnnouncementMsg && (
        <div className="modal-backdrop" onClick={() => setSelectedAnnouncementMsg(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-primary)', paddingBottom: 'var(--space-3)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span className="badge badge-purple" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Megaphone size={13} /> Official Broadcast Notice
                  </span>
                  <span className="badge badge-accent">
                    {selectedCommunity?.name || 'ECE Community'}
                  </span>
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Broadcast by {selectedAnnouncementMsg.author?.full_name || 'Department Faculty'}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span>{new Date(selectedAnnouncementMsg.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} at {new Date(selectedAnnouncementMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>Channel: #{activeChannel?.name || 'announcements'}</span>
                </div>
              </div>
              <button 
                className="btn btn-ghost" 
                onClick={() => setSelectedAnnouncementMsg(null)}
                style={{ padding: '6px', borderRadius: '50%', color: 'var(--text-secondary)' }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: 'var(--space-4) 0', maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ fontSize: '0.98rem', color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                {selectedAnnouncementMsg.content}
              </div>

              {selectedAnnouncementMsg.code_snippet && (
                <div style={{ marginTop: 'var(--space-4)', borderRadius: 'var(--radius-md)', background: '#070d18', border: '1px solid rgba(0, 148, 255, 0.2)', overflow: 'hidden' }}>
                  <div style={{ padding: '6px 12px', background: '#0e1726', fontSize: '0.75rem', color: 'var(--accent-500)', fontWeight: 700 }}>
                    ATTACHED CODE: {selectedAnnouncementMsg.code_snippet.language.toUpperCase()}
                  </div>
                  <pre style={{ margin: 0, padding: '12px', color: '#e0f2fe', fontSize: '0.85rem', overflowX: 'auto', fontFamily: 'monospace' }}>
                    <code>{selectedAnnouncementMsg.code_snippet.code}</code>
                  </pre>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 'var(--space-3)', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setSelectedAnnouncementMsg(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
