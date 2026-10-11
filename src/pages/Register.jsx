import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Eye, EyeOff, Mail, Lock, User, GraduationCap, Briefcase, ChevronRight, ChevronLeft } from 'lucide-react';
import RITLogo from '../components/RITLogo';
import { validateCollegeEmail, APPROVED_EMAIL_DOMAIN } from '../services/supabaseClient';
import './Auth.css';

export default function Register() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    account_type: '', email: '', password: '', confirm_password: '',
    full_name: '', phone: '', register_number: '', batch: '', year: '', section: '',
    graduation_year: '', headline: '', bio: '', location: '',
    current_company: '', job_title: '', industry: '',
    github: '', linkedin: '', portfolio: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const totalSteps = 4;

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (step === 1 && !formData.account_type) {
      toast.error('Please select account type');
      return;
    }
    if (step === 2) {
      if (!formData.email || !formData.password || !formData.full_name) {
        toast.error('Please fill in required fields');
        return;
      }

      // Strict Domain Validation
      const emailDomainCheck = validateCollegeEmail(formData.email);
      if (!emailDomainCheck.isValid) {
        toast.error(emailDomainCheck.error);
        return;
      }

      if (formData.password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
      if (formData.password !== formData.confirm_password) {
        toast.error('Passwords do not match');
        return;
      }
    }
    setStep(s => Math.min(s + 1, totalSteps));
  };

  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { confirm_password, ...data } = formData;
      const result = await register(data);
      if (result?.requiresConfirmation) {
        toast.success(`Verification email sent to ${formData.email}! Please confirm your email to activate your account.`);
        navigate('/login', { state: { message: `Verification email sent to ${formData.email}. Please verify your email before logging in.` } });
      } else {
        toast.success('Welcome to RIT ECE! Your profile has been created.');
        navigate('/home');
      }
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
      </div>
      <div className="auth-container" style={{ maxWidth: step > 2 ? '560px' : '460px' }}>
        <div className="auth-card">
          <div className="auth-header">
            <Link to="/" style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: 'var(--space-3)' }}>
              <RITLogo height={42} />
            </Link>
            <h1>Join RIT ECE</h1>
            <p>Create your professional profile</p>
          </div>

          {/* Progress Steps */}
          <div className="register-steps">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div key={i} className={`register-step ${i + 1 <= step ? 'active' : ''} ${i + 1 < step ? 'completed' : ''}`} />
            ))}
          </div>

          {/* Step 1: Account Type */}
          {step === 1 && (
            <div>
              <h3 style={{ marginBottom: 'var(--space-4)', textAlign: 'center' }}>I am a...</h3>
              <div className="account-type-grid">
                <div
                  className={`account-type-card ${formData.account_type === 'student' ? 'selected' : ''}`}
                  onClick={() => updateField('account_type', 'student')}
                >
                  <GraduationCap size={32} color="var(--accent-500)" />
                  <h3>Current Student</h3>
                  <p>Currently studying ECE at RIT</p>
                </div>
                <div
                  className={`account-type-card ${formData.account_type === 'alumni' ? 'selected' : ''}`}
                  onClick={() => updateField('account_type', 'alumni')}
                >
                  <Briefcase size={32} color="var(--violet-500)" />
                  <h3>Alumni</h3>
                  <p>RIT ECE graduate</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Basic Info */}
          {step === 2 && (
            <div>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <div className="input-with-icon">
                  <User size={18} className="input-icon" />
                  <input type="text" className="form-input" placeholder="Your full name" style={{ paddingLeft: '42px' }}
                    value={formData.full_name} onChange={(e) => updateField('full_name', e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label">College Email *</label>
                  <span style={{ fontSize: '11px', color: '#00E5FF', fontWeight: 600 }}>
                    Must be @{APPROVED_EMAIL_DOMAIN}
                  </span>
                </div>
                <div className="input-with-icon">
                  <Mail size={18} className="input-icon" />
                  <input type="email" className="form-input" placeholder="student@ece.ritchennai.edu.in" style={{ paddingLeft: '42px' }}
                    value={formData.email} onChange={(e) => updateField('email', e.target.value)} required />
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Institutional email strictly required. Verification link will be sent.
                </p>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <div className="input-with-icon">
                    <Lock size={18} className="input-icon" />
                    <input type={showPassword ? 'text' : 'password'} className="form-input" placeholder="Min 6 characters" style={{ paddingLeft: '42px' }}
                      value={formData.password} onChange={(e) => updateField('password', e.target.value)} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm *</label>
                  <input type="password" className="form-input" placeholder="Confirm password"
                    value={formData.confirm_password} onChange={(e) => updateField('confirm_password', e.target.value)} required />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Academic / Professional */}
          {step === 3 && (
            <div>
              {formData.account_type === 'student' ? (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Register Number</label>
                      <input type="text" className="form-input" placeholder="e.g. RIT2021ECE001"
                        value={formData.register_number} onChange={(e) => updateField('register_number', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Batch / Year</label>
                      <select className="form-input" value={formData.batch} onChange={(e) => updateField('batch', e.target.value)}>
                        <option value="">Select</option>
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                        <option value="2027">2027</option>
                        <option value="2028">2028</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Current Year</label>
                      <select className="form-input" value={formData.year} onChange={(e) => updateField('year', e.target.value)}>
                        <option value="">Select</option>
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Section</label>
                      <select className="form-input" value={formData.section} onChange={(e) => updateField('section', e.target.value)}>
                        <option value="">Select</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Graduation Year</label>
                      <select className="form-input" value={formData.graduation_year} onChange={(e) => updateField('graduation_year', e.target.value)}>
                        <option value="">Select</option>
                        {Array.from({ length: 15 }, (_, i) => 2010 + i).map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Current Company</label>
                      <input type="text" className="form-input" placeholder="Company name"
                        value={formData.current_company} onChange={(e) => updateField('current_company', e.target.value)} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Job Title</label>
                      <input type="text" className="form-input" placeholder="Your role"
                        value={formData.job_title} onChange={(e) => updateField('job_title', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Industry</label>
                      <input type="text" className="form-input" placeholder="e.g. Semiconductors"
                        value={formData.industry} onChange={(e) => updateField('industry', e.target.value)} />
                    </div>
                  </div>
                </>
              )}
              <div className="form-group">
                <label className="form-label">Professional Headline</label>
                <input type="text" className="form-input" placeholder="e.g. ECE Student | Embedded Systems Enthusiast"
                  value={formData.headline} onChange={(e) => updateField('headline', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input type="text" className="form-input" placeholder="e.g. Chennai, Tamil Nadu"
                  value={formData.location} onChange={(e) => updateField('location', e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 4: Bio & Links */}
          {step === 4 && (
            <div>
              <div className="form-group">
                <label className="form-label">Bio / About</label>
                <textarea className="form-textarea" placeholder="Tell us about yourself, your interests, and what you're working on..."
                  value={formData.bio} onChange={(e) => updateField('bio', e.target.value)} rows={4} />
              </div>
              <div className="form-group">
                <label className="form-label">GitHub</label>
                <input type="url" className="form-input" placeholder="https://github.com/username"
                  value={formData.github} onChange={(e) => updateField('github', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">LinkedIn</label>
                <input type="url" className="form-input" placeholder="https://linkedin.com/in/username"
                  value={formData.linkedin} onChange={(e) => updateField('linkedin', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Portfolio</label>
                <input type="url" className="form-input" placeholder="https://yourportfolio.com"
                  value={formData.portfolio} onChange={(e) => updateField('portfolio', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input type="tel" className="form-input" placeholder="+91 98765 43210"
                  value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
            {step > 1 && (
              <button className="btn btn-secondary" onClick={prevStep} style={{ flex: 1 }}>
                <ChevronLeft size={16} /> Back
              </button>
            )}
            {step < totalSteps ? (
              <button className="btn btn-primary" onClick={nextStep} style={{ flex: 1 }}>
                Continue <ChevronRight size={16} />
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleSubmit} style={{ flex: 1 }} disabled={loading}>
                {loading ? 'Creating Profile...' : 'Create Profile'}
              </button>
            )}
          </div>

          <div className="auth-footer" style={{ marginTop: 'var(--space-5)' }}>
            <p>Already have an account? <Link to="/login">Sign In</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
