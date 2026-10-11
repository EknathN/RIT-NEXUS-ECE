import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { messagesAPI, usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Send, Search, MessageSquare, Check, CheckCheck, User, Phone, Video, ChevronLeft } from 'lucide-react';
import './Messages.css';

function getInitials(name) { return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'; }

export default function Messages() {
  const { user } = useAuth();
  const toast = useToast();
  const { id: paramConvId } = useParams();
  const [searchParams] = useSearchParams();
  const directTargetUserId = searchParams.get('userId');

  const [conversations, setConversations] = useState([]);
  const [activePartner, setActivePartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, [paramConvId, directTargetUserId]);

  useEffect(() => {
    if (activePartner) {
      const partnerId = activePartner._id || activePartner.id;
      loadMessages(partnerId);
      // Fast polling for incoming messages every 2.5 seconds
      const interval = setInterval(() => {
        loadMessages(partnerId, true);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [activePartner]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    setLoading(true);
    try {
      const res = await messagesAPI.getConversations();
      const list = Array.isArray(res) ? res : (res.conversations || res.list || []);
      setConversations(list);

      if (paramConvId) {
        const match = list.find(c => (c.id === paramConvId || c._id === paramConvId || c.partner?.id === paramConvId || c.partner?._id === paramConvId || c.other?.id === paramConvId));
        if (match) {
          setActivePartner(match.partner || match.other);
        } else {
          initDirectChat(paramConvId);
        }
      } else if (directTargetUserId) {
        initDirectChat(directTargetUserId);
      } else if (list.length > 0 && !activePartner) {
        setActivePartner(list[0].partner || list[0].other);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const initDirectChat = async (targetId) => {
    try {
      const res = await usersAPI.getById(targetId);
      const partnerUser = res?.user || res?.data?.user || res;
      if (partnerUser) {
        setActivePartner({
          id: partnerUser.id || partnerUser._id,
          _id: partnerUser._id || partnerUser.id,
          fullName: partnerUser.fullName || partnerUser.full_name,
          avatar: partnerUser.avatar || partnerUser.profile_photo,
          headline: partnerUser.headline,
          role: partnerUser.role || partnerUser.account_type || 'student'
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadMessages = async (partnerId, silent = false) => {
    try {
      const res = await messagesAPI.getMessages(partnerId);
      const msgList = Array.isArray(res) ? res : (res.messages || res.list || []);
      setMessages(msgList);
    } catch (err) {
      if (!silent) console.error(err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activePartner) return;

    const messageText = text.trim();
    const partnerId = activePartner._id || activePartner.id;
    setText('');

    // Instant optimistic message shown immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      _id: tempId,
      sender_id: user?.id,
      receiver_id: partnerId,
      content: messageText,
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      sender: {
        id: user?.id,
        _id: user?.id,
        full_name: user?.full_name,
        fullName: user?.full_name,
        profile_photo: user?.profile_photo || user?.avatar,
        avatar: user?.profile_photo || user?.avatar,
      },
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setConversations(prev => prev.map(c => {
      const isCurrent = (c.partner?.id === partnerId || c.partner?._id === partnerId || c.other?.id === partnerId);
      if (isCurrent) {
        return {
          ...c,
          lastMessage: { content: messageText, createdAt: new Date().toISOString() },
        };
      }
      return c;
    }));

    try {
      const res = await messagesAPI.sendMessage(partnerId, { content: messageText });
      const newMsg = res.message || res;
      setMessages(prev => prev.map(m => m.id === tempId ? newMsg : m));
      loadConversations();
    } catch (err) {
      toast.show('Failed to send message', 'error');
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

  const filteredConversations = conversations.filter(c => {
    const p = c.partner || c.other;
    const name = p?.fullName || p?.full_name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="container messages-container">
      <div className={`card messages-card ${activePartner ? 'has-active-chat' : ''}`}>
        {/* Sidebar: Conversations */}
        <div className="messages-sidebar">
          <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border-color)' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 'var(--space-3)', color: 'var(--text-primary)' }}>Messages</h2>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '38px', fontSize: '0.88rem' }}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredConversations.length === 0 ? (
              <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                No active conversations yet. Start connecting with peers or alumni in the Network directory!
              </div>
            ) : (
              filteredConversations.map(conv => {
                const partner = conv.partner || conv.other;
                if (!partner) return null;
                const pId = partner._id || partner.id;
                const activeId = activePartner?._id || activePartner?.id;
                const isCurrent = activeId === pId;
                const name = partner.fullName || partner.full_name;
                const photo = partner.avatar || partner.profile_photo;

                return (
                  <div
                    key={conv.id || conv._id || pId}
                    onClick={() => setActivePartner(partner)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-3)',
                      padding: 'var(--space-3) var(--space-4)',
                      cursor: 'pointer',
                      background: isCurrent ? 'var(--card-bg)' : 'transparent',
                      borderLeft: isCurrent ? '3.5px solid var(--accent-500)' : '3.5px solid transparent',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    {photo ? (
                      <img src={photo} alt={name} className="avatar avatar-md" />
                    ) : (
                      <div className="avatar-placeholder avatar-md">{getInitials(name)}</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {name}
                        </h3>
                        {conv.lastMessage && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {conv.lastMessage?.content || `${partner.role || 'Member'} • RIT ECE`}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Chat Area */}
        {activePartner ? (
          <div className="messages-chat-area">
            {/* Chat Header */}
            <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <button
                  type="button"
                  className="messages-mobile-back"
                  onClick={() => setActivePartner(null)}
                  title="Back to all conversations"
                >
                  <ChevronLeft size={22} />
                </button>
                <Link to={`/profile/${activePartner._id || activePartner.id}`}>
                  {(activePartner.avatar || activePartner.profile_photo) ? (
                    <img src={activePartner.avatar || activePartner.profile_photo} alt={activePartner.fullName || activePartner.full_name} className="avatar avatar-md" />
                  ) : (
                    <div className="avatar-placeholder avatar-md">{getInitials(activePartner.fullName || activePartner.full_name)}</div>
                  )}
                </Link>
                <div>
                  <Link to={`/profile/${activePartner._id || activePartner.id}`} style={{ fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'none', fontSize: '1rem' }}>
                    {activePartner.fullName || activePartner.full_name}
                  </Link>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {activePartner.headline || `${activePartner.role || 'Student'} • RIT ECE`}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <Link to={`/profile/${activePartner._id || activePartner.id}`} className="btn btn-sm btn-ghost" title="View Profile">
                  <User size={18} />
                </Link>
              </div>
            </div>

            {/* Chat Messages */}
            <div style={{ flex: 1, padding: 'var(--space-6)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)' }}>
                  <MessageSquare size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  <p>Send a message to start communicating with {activePartner.fullName || activePartner.full_name}</p>
                </div>
              ) : (
                messages.map((m, i) => {
                  const senderId = m.sender?._id || m.sender?.id || m.sender_id || m.sender;
                  const isMe = senderId === user?.id;
                  return (
                    <div
                      key={m._id || m.id || i}
                      style={{
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        maxWidth: '70%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMe ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <div
                        style={{
                          padding: '10px 16px',
                          borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          background: isMe ? 'var(--accent-500)' : 'var(--bg-secondary)',
                          color: isMe ? '#ffffff' : 'var(--text-primary)',
                          fontSize: '0.92rem',
                          lineHeight: 1.5,
                          boxShadow: 'var(--shadow-sm)',
                          wordBreak: 'break-word'
                        }}
                      >
                        {m.content}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', padding: '0 4px' }}>
                        {new Date(m.createdAt || m.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: 'var(--space-3)', background: 'var(--bg-primary)' }}>
              <input
                type="text"
                className="form-input"
                placeholder={`Message ${activePartner.fullName || activePartner.full_name}...`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary" disabled={!text.trim() || sending} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Send size={16} /> Send
              </button>
            </form>
          </div>
        ) : (
          <div className="messages-chat-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            <div style={{ textAlign: 'center' }}>
              <MessageSquare size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
              <h3>Select a conversation to start chatting</h3>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
