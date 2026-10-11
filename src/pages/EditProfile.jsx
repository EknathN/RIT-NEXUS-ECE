import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { usersAPI } from '../services/api';
import { User, Briefcase, GraduationCap, Award, FolderOpen, Save, ArrowLeft, Plus, Trash2, Camera, X } from 'lucide-react';

export default function EditProfile() {
  const { user, login, updateUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState('');
  const photoInputRef = useRef(null);

  const [formData, setFormData] = useState({
    headline: '',
    bio: '',
    phone: '',
    location: '',
    skills: '',
    linkedin: '',
    github: '',
    portfolio: '',
    isAvailableForMentoring: false,
    mentoringTopics: '',
    interests: '',
    experiences: [],
    education: [],
    projects: [],
    certifications: []
  });

  useEffect(() => {
    if (user) {
      setProfilePhoto(user.profile_photo || user.avatar || '');
      setFormData({
        headline: user.headline || '',
        bio: user.bio || '',
        phone: user.phone || '',
        location: user.location || '',
        skills: Array.isArray(user.skills) ? user.skills.join(', ') : '',
        linkedin: user.socialLinks?.linkedin || '',
        github: user.socialLinks?.github || '',
        portfolio: user.socialLinks?.portfolio || '',
        isAvailableForMentoring: user.isAvailableForMentoring || false,
        mentoringTopics: Array.isArray(user.mentoringTopics) ? user.mentoringTopics.join(', ') : '',
        interests: Array.isArray(user.interests) ? user.interests.join(', ') : '',
        experiences: user.experiences || [],
        education: user.education || [],
        projects: user.projects || [],
        certifications: user.certifications || []
      });
    }
  }, [user]);

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.show('Photo must be less than 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProfilePhoto(reader.result);
      toast.show('Photo selected! Click Save Profile to apply.', 'info');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Dynamic Array helpers
  const addExperience = () => {
    setFormData(prev => ({
      ...prev,
      experiences: [...prev.experiences, { title: '', company: '', location: '', startDate: '', endDate: '', current: false, description: '' }]
    }));
  };

  const removeExperience = (index) => {
    setFormData(prev => ({
      ...prev,
      experiences: prev.experiences.filter((_, i) => i !== index)
    }));
  };

  const updateExperience = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.experiences];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, experiences: updated };
    });
  };

  const addProject = () => {
    setFormData(prev => ({
      ...prev,
      projects: [...prev.projects, { title: '', description: '', technologies: '', link: '' }]
    }));
  };

  const removeProject = (index) => {
    setFormData(prev => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index)
    }));
  };

  const updateProject = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.projects];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, projects: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        headline: formData.headline,
        bio: formData.bio,
        phone: formData.phone,
        location: formData.location,
        skills: formData.skills ? formData.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
        socialLinks: {
          linkedin: formData.linkedin,
          github: formData.github,
          portfolio: formData.portfolio
        },
        isAvailableForMentoring: formData.isAvailableForMentoring,
        mentoringTopics: formData.mentoringTopics ? formData.mentoringTopics.split(',').map(s => s.trim()).filter(Boolean) : [],
        interests: formData.interests ? formData.interests.split(',').map(s => s.trim()).filter(Boolean) : [],
        experiences: formData.experiences,
        education: formData.education,
        projects: formData.projects.map(p => ({
          ...p,
          technologies: typeof p.technologies === 'string' ? p.technologies.split(',').map(t => t.trim()).filter(Boolean) : p.technologies
        })),
        certifications: formData.certifications,
        profile_photo: profilePhoto,
        avatar: profilePhoto,
      };

      const res = await usersAPI.updateProfile(payload);
      if (res && !res.error) {
        if (updateUser) {
          updateUser({
            ...payload,
            profile_photo: profilePhoto,
            avatar: profilePhoto,
          });
        }
        toast.show('Profile updated successfully!', 'success');
        navigate(`/profile/${user?.id || user?._id}`);
      } else {
        toast.show(res?.error || 'Failed to update profile', 'error');
      }
    } catch (err) {
      toast.show(err.message || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: 'var(--space-6) var(--space-4)', maxWidth: '900px' }}>
      <button 
        className="btn btn-outline" 
        onClick={() => navigate(-1)} 
        style={{ marginBottom: 'var(--space-6)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
      >
        <ArrowLeft size={18} /> Back
      </button>

      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={20} className="text-accent" /> Basic Information
          </h2>

          {/* Profile Picture Upload Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-5)', padding: 'var(--space-4)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: 84, height: 84, flexShrink: 0 }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: 'var(--accent-500-15)', border: '2px solid var(--accent-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Profile preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-500)' }}>
                    {(user?.full_name || user?.fullName || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                title="Upload or change photo"
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  zIndex: 10,
                  background: 'var(--accent-500)',
                  color: '#fff',
                  border: '2px solid var(--bg-card, #1e293b)',
                  borderRadius: '50%',
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <Camera size={13} />
              </button>
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: 4 }}>
                Profile Picture
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                PNG, JPG or WebP up to 5MB. Help peers and faculty recognize your profile across RIT ECE.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  type="file"
                  ref={photoInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handlePhotoSelect}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => photoInputRef.current?.click()}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Camera size={14} /> Upload New Photo
                </button>
                {profilePhoto && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => setProfilePhoto('')}
                    style={{ color: 'var(--danger-500)', borderColor: 'var(--danger-500-30)' }}
                  >
                    <X size={14} /> Remove Photo
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="form-label">Professional Headline</label>
            <input 
              type="text" 
              name="headline" 
              className="form-input" 
              value={formData.headline} 
              onChange={handleChange} 
              placeholder="e.g. VLSI Design Enthusiast | Final Year ECE | Aspiring Embedded Engineer" 
            />
          </div>

          <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="form-label">About / Bio</label>
            <textarea 
              name="bio" 
              className="form-textarea" 
              rows={4} 
              value={formData.bio} 
              onChange={handleChange} 
              placeholder="Share your passion for electronics, achievements, technical interests, or what you're currently learning..." 
            />
          </div>

          <div className="grid grid-2" style={{ gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input 
                type="text" 
                name="location" 
                className="form-input" 
                value={formData.location} 
                onChange={handleChange} 
                placeholder="e.g. Chennai, Tamil Nadu" 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input 
                type="text" 
                name="phone" 
                className="form-input" 
                value={formData.phone} 
                onChange={handleChange} 
                placeholder="e.g. +91 9876543210" 
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Skills (comma separated)</label>
            <input 
              type="text" 
              name="skills" 
              className="form-input" 
              value={formData.skills} 
              onChange={handleChange} 
              placeholder="e.g. Verilog, Embedded C, MATLAB, IoT, PCB Design, Python, Arduino, Signal Processing" 
            />
          </div>
        </div>

        {/* Social & Portfolio Links */}
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Social & Portfolio Links</h2>
          <div className="grid grid-3" style={{ gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">LinkedIn URL</label>
              <input type="url" name="linkedin" className="form-input" value={formData.linkedin} onChange={handleChange} placeholder="https://linkedin.com/in/username" />
            </div>
            <div className="form-group">
              <label className="form-label">GitHub URL</label>
              <input type="url" name="github" className="form-input" value={formData.github} onChange={handleChange} placeholder="https://github.com/username" />
            </div>
            <div className="form-group">
              <label className="form-label">Portfolio URL</label>
              <input type="url" name="portfolio" className="form-input" value={formData.portfolio} onChange={handleChange} placeholder="https://myportfolio.com" />
            </div>
          </div>
        </div>

        {/* Mentorship Settings */}
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Mentorship Opportunities</h2>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: 'var(--space-3)' }}>
            <input 
              type="checkbox" 
              name="isAvailableForMentoring" 
              checked={formData.isAvailableForMentoring} 
              onChange={handleChange} 
              style={{ width: 18, height: 18 }} 
            />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Available for Mentoring Juniors</span>
          </label>
          <div className="form-group">
            <label className="form-label">Mentoring Topics (comma separated)</label>
            <input 
              type="text" 
              name="mentoringTopics" 
              className="form-input" 
              value={formData.mentoringTopics} 
              onChange={handleChange} 
              placeholder="e.g. Core placements, GATE prep, VLSI interview, Resume review" 
            />
          </div>
        </div>

        {/* Work Experience */}
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Briefcase size={20} className="text-accent" /> Work & Internship Experience
            </h2>
            <button type="button" className="btn btn-sm btn-outline" onClick={addExperience} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Plus size={16} /> Add Experience
            </button>
          </div>

          {formData.experiences.map((exp, idx) => (
            <div key={idx} style={{ padding: 'var(--space-4)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-4)', background: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Position #{idx + 1}</span>
                <button type="button" className="btn btn-sm" onClick={() => removeExperience(idx)} style={{ color: 'var(--danger-500)', background: 'transparent', padding: 0 }}>
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="grid grid-2" style={{ gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Job Title / Role (e.g. Embedded Firmware Intern)" 
                  value={exp.title} 
                  onChange={(e) => updateExperience(idx, 'title', e.target.value)} 
                  required 
                />
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Company / Organization (e.g. Bosch, Intel, RIT ECE Lab)" 
                  value={exp.company} 
                  onChange={(e) => updateExperience(idx, 'company', e.target.value)} 
                  required 
                />
              </div>
              <textarea 
                className="form-textarea" 
                rows={2} 
                placeholder="Description of duties, projects, and impact..." 
                value={exp.description} 
                onChange={(e) => updateExperience(idx, 'description', e.target.value)} 
              />
            </div>
          ))}
          {formData.experiences.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No experiences added yet. Click &quot;Add Experience&quot; to highlight your internships or roles.</p>
          )}
        </div>

        {/* Projects */}
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderOpen size={20} className="text-accent" /> Projects
            </h2>
            <button type="button" className="btn btn-sm btn-outline" onClick={addProject} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Plus size={16} /> Add Project
            </button>
          </div>

          {formData.projects.map((proj, idx) => (
            <div key={idx} style={{ padding: 'var(--space-4)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-4)', background: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Project #{idx + 1}</span>
                <button type="button" className="btn btn-sm" onClick={() => removeProject(idx)} style={{ color: 'var(--danger-500)', background: 'transparent', padding: 0 }}>
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="grid grid-2" style={{ gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Project Title (e.g. Smart IoT Agriculture System)" 
                  value={proj.title} 
                  onChange={(e) => updateProject(idx, 'title', e.target.value)} 
                  required 
                />
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Technologies (e.g. ESP32, MQTT, Node.js)" 
                  value={proj.technologies} 
                  onChange={(e) => updateProject(idx, 'technologies', e.target.value)} 
                />
              </div>
              <textarea 
                className="form-textarea" 
                rows={2} 
                placeholder="What did you build? What problem does it solve?" 
                value={proj.description} 
                onChange={(e) => updateProject(idx, 'description', e.target.value)} 
              />
            </div>
          ))}
          {formData.projects.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No projects listed yet. Adding capstone, mini, or personal projects makes your profile stand out.</p>
          )}
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
          <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Save size={18} /> {loading ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
