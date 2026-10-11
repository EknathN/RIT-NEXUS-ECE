import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { notificationsAPI } from '../services/api';
import { Bell, Check, UserPlus, Heart, MessageCircle, Briefcase, Calendar, CheckCircle } from 'lucide-react';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationsAPI.getAll();
      const list = Array.isArray(res) ? res : (res.notifications || res.list || res.data?.notifications || []);
      setNotifications(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true, is_read: 1 })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev => prev.map(n => (n._id === id || n.id === id) ? { ...n, read: true, is_read: 1 } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'connection_request':
      case 'connection_accepted':
        return <UserPlus size={20} className="text-accent" />;
      case 'like':
        return <Heart size={20} style={{ color: 'var(--rose-500)' }} />;
      case 'comment':
        return <MessageCircle size={20} className="text-cyan" />;
      case 'job_alert':
        return <Briefcase size={20} className="text-emerald" />;
      case 'event_reminder':
        return <Calendar size={20} className="text-purple" />;
      default:
        return <Bell size={20} className="text-accent" />;
    }
  };

  return (
    <div className="container" style={{ padding: 'var(--space-6) var(--space-4)', maxWidth: '800px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>Notifications</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Updates on your connections, posts, and departmental alerts</p>
        </div>
        {notifications.some(n => (!n.read && !n.is_read)) && (
          <button className="btn btn-sm btn-outline" onClick={handleMarkAllRead} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Check size={16} /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <div className="loading-spinner" style={{ margin: '0 auto var(--space-4)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading alerts...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <Bell size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-4)', opacity: 0.4 }} />
          <h3>No notifications yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
            When someone connects with you, likes your project updates, or posts a new hackathon, you&apos;ll see it here!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {notifications.map(notif => {
            const notifId = notif._id || notif.id;
            const isRead = notif.read || notif.is_read;
            const content = notif.content || notif.message;
            const dateStr = notif.createdAt || notif.created_at;

            return (
              <div
                key={notifId}
                onClick={() => handleMarkRead(notifId)}
                className="card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-4)',
                  padding: 'var(--space-4)',
                  background: isRead ? 'var(--card-bg)' : 'var(--bg-secondary)',
                  borderLeft: isRead ? '1px solid var(--border-color)' : '4px solid var(--accent-500)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ padding: '8px', borderRadius: '50%', background: 'var(--bg-tertiary)' }}>
                  {getIcon(notif.type)}
                </div>

                <div style={{ flex: 1 }}>
                  <p style={{ color: 'var(--text-primary)', fontSize: '0.92rem', marginBottom: '4px' }}>
                    {content}
                  </p>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {dateStr ? new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                  </span>
                </div>

                {notif.link && (
                  <Link to={notif.link} className="btn btn-sm btn-ghost" onClick={(e) => e.stopPropagation()}>
                    View
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
