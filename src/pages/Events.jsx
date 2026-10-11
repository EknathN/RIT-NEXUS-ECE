import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Calendar, MapPin, Clock, Users, Plus, ExternalLink, CheckCircle } from 'lucide-react';

export default function Events() {
  const { user } = useAuth();
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: 'workshop',
    description: '',
    startDate: '',
    endDate: '',
    venue: '',
    speakers: '',
    registrationLink: ''
  });

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getEvents();
      const list = Array.isArray(res) ? res : (res.events || res.data?.events || []);
      setEvents(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        speakers: formData.speakers ? formData.speakers.split(',').map(s => s.trim()).filter(Boolean) : []
      };
      await adminAPI.createEvent(payload);
      toast.show('Event scheduled successfully!', 'success');
      setShowModal(false);
      loadEvents();
    } catch (err) {
      toast.show(err.response?.data?.message || err.message || 'Failed to schedule event', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRSVP = async (id) => {
    try {
      await adminAPI.rsvpEvent(id);
      toast.show('RSVP confirmed! Added to your calendar.', 'success');
      setEvents(prev => prev.map(e => (e._id === id || e.id === id) ? { ...e, attendees: [...(e.attendees || []), user?.id] } : e));
    } catch (err) {
      toast.show(err.response?.data?.message || err.message || 'Failed to RSVP', 'error');
    }
  };

  return (
    <div className="container" style={{ padding: 'var(--space-6) var(--space-4)' }}>
      {/* Banner */}
      <div className="card" style={{ marginBottom: 'var(--space-6)', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(168, 85, 247, 0.2))', border: '1px solid var(--accent-500-20)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
              ECE Events, Symposia & Masterclasses
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Hands-on workshops, IEEE RIT technical talks, national conferences, alumni guidance sessions, and core placement bootcamps.
            </p>
          </div>
          {(user?.role === 'faculty' || user?.role === 'admin' || user?.role === 'alumni') && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} /> Schedule Event
            </button>
          )}
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <div className="loading-spinner" style={{ margin: '0 auto var(--space-4)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading department calendar...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <Calendar size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-4)' }} />
          <h3>No upcoming events scheduled</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>Check back soon for new workshops and guest seminars.</p>
        </div>
      ) : (
        <div className="grid grid-2" style={{ gap: 'var(--space-6)' }}>
          {events.map(item => {
            const hasRSVP = (item.attendees || []).includes(user?.id);
            return (
              <div key={item._id || item.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: '4px solid var(--purple-500)' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                    <span className="badge badge-purple" style={{ textTransform: 'uppercase' }}>{item.category}</span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      👥 {item.attendees?.length || 0} attending
                    </span>
                  </div>

                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                    {item.title}
                  </h2>

                  <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 'var(--space-4)' }}>
                    {item.description}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={15} className="text-accent" /> Date: {new Date(item.startDate).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={15} className="text-accent" /> Venue: {item.venue || 'RIT ECE Seminar Hall / Online'}
                    </div>
                    {item.speakers && item.speakers.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={15} className="text-accent" /> Speakers: {item.speakers.join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-2)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-4)' }}>
                  {item.registrationLink ? (
                    <a href={item.registrationLink} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                      Register <ExternalLink size={16} />
                    </a>
                  ) : (
                    <button
                      className={`btn ${hasRSVP ? 'btn-outline' : 'btn-primary'}`}
                      onClick={() => handleRSVP(item._id || item.id)}
                      disabled={hasRSVP}
                      style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                    >
                      {hasRSVP ? <><CheckCircle size={16} /> Attending</> : 'RSVP for Event'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Schedule Department Event</h2>
            <form onSubmit={handleCreate}>
              <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                <label className="form-label">Event Title *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Industry 4.0 & Embedded Robotics Symposium"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="grid grid-2" style={{ gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Event Category</label>
                  <select className="form-select" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                    <option value="workshop">Technical Workshop</option>
                    <option value="seminar">Guest Seminar / Talk</option>
                    <option value="conference">National Conference / Symposium</option>
                    <option value="webinar">Alumni Webinar</option>
                    <option value="hackathon">Hackathon / Sprint</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Venue</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. ECE Seminar Hall 3 / Google Meet"
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-2" style={{ gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label">Date & Time *</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Speakers / Resource Persons</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Dr. K. Ramesh, Senior Staff Engineer"
                    value={formData.speakers}
                    onChange={(e) => setFormData({ ...formData, speakers: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  required
                  placeholder="Outline the agenda, prerequisites, learning outcomes, and certificate details..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                <label className="form-label">Registration / Meet Link (Optional)</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://meet.google.com/..."
                  value={formData.registrationLink}
                  onChange={(e) => setFormData({ ...formData, registrationLink: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Publishing...' : 'Publish Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
