import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Eye, EyeOff, Mail, Lock, User, GraduationCap, Briefcase, ChevronRight, ChevronLeft, AlertCircle, MapPin, Search, Check } from 'lucide-react';
import RITLogo from '../components/RITLogo';
import { validateCollegeEmail, APPROVED_EMAIL_DOMAIN } from '../services/supabaseClient';
import './Auth.css';

// Eligible student years: 2nd, 3rd, and 4th Years only
// 2nd Years (Batch 2025–2029): Sections A, B, C, D, E
// 3rd Years (Batch 2024–2028): Sections A, B, C
// 4th Years (Batch 2023–2027): Sections A, B
const YEAR_SECTIONS = {
  '2': ['A', 'B', 'C', 'D', 'E'],
  '3': ['A', 'B', 'C'],
  '4': ['A', 'B'],
};

const YEAR_BATCH_MAP = {
  '2': '2025 - 2029',
  '3': '2024 - 2028',
  '4': '2023 - 2027',
};

const YEAR_GRADUATION_MAP = {
  '2': '2029',
  '3': '2028',
  '4': '2027',
};

// Curated top locations with instant search autocomplete
const POPULAR_LOCATIONS = [
  'Chennai, Tamil Nadu',
  'Bengaluru, Karnataka',
  'Coimbatore, Tamil Nadu',
  'Hyderabad, Telangana',
  'Madurai, Tamil Nadu',
  'Tiruchirappalli, Tamil Nadu',
  'Salem, Tamil Nadu',
  'Vellore, Tamil Nadu',
  'Kanchipuram, Tamil Nadu',
  'Chengalpattu, Tamil Nadu',
  'Sriperumbudur, Tamil Nadu',
  'Hosur, Tamil Nadu',
  'Erode, Tamil Nadu',
  'Tirunelveli, Tamil Nadu',
  'Kochi, Kerala',
  'Thiruvananthapuram, Kerala',
  'Visakhapatnam, Andhra Pradesh',
  'Vijayawada, Andhra Pradesh',
  'Mumbai, Maharashtra',
  'Pune, Maharashtra',
  'Delhi NCR, India',
  'Noida, Uttar Pradesh',
  'Gurugram, Haryana',
  'Kolkata, West Bengal',
  'Ahmedabad, Gujarat',
  'Mysuru, Karnataka',
  'San Jose, California, USA',
  'Austin, Texas, USA',
  'London, United Kingdom',
  'Singapore',
  'Dubai, UAE',
  'Munich, Germany'
];

// College established in 2008, first graduated batch was 2008, latest is 2026
const ALUMNI_GRADUATION_YEARS = Array.from({ length: 2026 - 2008 + 1 }, (_, i) => 2026 - i);

export default function Register() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    account_type: '', email: '', password: '', confirm_password: '',
    full_name: '', phone: '', register_number: '', batch: '', year: '', section: '',
    graduation_year: '', headline: '', bio: '', location: '',
    current_company: '', job_title: '', industry: '',
    github: '', linkedin: '', portfolio: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const locationRef = useRef(null);
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (locationRef.current && !locationRef.current.contains(event.target)) {
        setShowLocationDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalSteps = 4;

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleYearChange = (yearVal) => {
    const allowedSections = YEAR_SECTIONS[yearVal] || [];
    setFormData(prev => ({
      ...prev,
      year: yearVal,
      batch: YEAR_BATCH_MAP[yearVal] || prev.batch,
      graduation_year: YEAR_GRADUATION_MAP[yearVal] || prev.graduation_year,
      section: allowedSections.includes(prev.section) ? prev.section : '',
    }));
    if (errors.year || errors.section) {
      setErrors(prev => {
        const next = { ...prev };
        delete next.year;
        delete next.section;
        return next;
      });
    }
  };

  const nextStep = () => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.account_type) {
        newErrors.account_type = 'Please select an account type to proceed';
        setErrors(newErrors);
        toast.error('Account type selection is mandatory');
        return;
      }
    }

    if (step === 2) {
      if (!formData.full_name?.trim()) {
        newErrors.full_name = 'Full Name is mandatory';
      }
      if (!formData.email?.trim()) {
        newErrors.email = 'College Email is mandatory';
      } else {
        const emailDomainCheck = validateCollegeEmail(formData.email);
        if (!emailDomainCheck.isValid) {
          newErrors.email = emailDomainCheck.error;
        }
      }

      if (!formData.password) {
        newErrors.password = 'Password is mandatory (min 6 characters)';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }

      if (!formData.confirm_password) {
        newErrors.confirm_password = 'Confirm Password is mandatory';
      } else if (formData.password !== formData.confirm_password) {
        newErrors.confirm_password = 'Passwords do not match';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        const firstError = Object.values(newErrors)[0];
        toast.error(firstError);
        return;
      }
    }

    if (step === 3) {
      if (formData.account_type === 'student') {
        if (!formData.register_number?.trim()) {
          newErrors.register_number = 'Register / Roll Number is mandatory';
        }
        if (!formData.year || !['2', '3', '4'].includes(formData.year)) {
          newErrors.year = 'Current Year (2nd, 3rd, or 4th Year) is mandatory';
        }
        if (!formData.batch) {
          newErrors.batch = 'Batch / Year is mandatory';
        }

        const allowedSections = YEAR_SECTIONS[formData.year] || [];
        if (!formData.section) {
          newErrors.section = 'Class Section is mandatory';
        } else if (allowedSections.length > 0 && !allowedSections.includes(formData.section)) {
          newErrors.section = `Section ${formData.section} is not valid for ${formData.year} Year. Choose from: ${allowedSections.join(', ')}`;
        }
      } else {
        if (!formData.graduation_year) {
          newErrors.graduation_year = 'Graduation Year (2008–2026) is mandatory';
        }
        if (!formData.current_company?.trim()) {
          newErrors.current_company = 'Current Company name is mandatory';
        }
        if (!formData.job_title?.trim()) {
          newErrors.job_title = 'Job Title / Role is mandatory';
        }
        if (!formData.industry?.trim()) {
          newErrors.industry = 'Industry domain is mandatory';
        }
      }

      if (!formData.headline?.trim()) {
        newErrors.headline = 'Professional Headline is mandatory';
      }
      if (!formData.location?.trim()) {
        newErrors.location = 'Location is mandatory';
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        const firstError = Object.values(newErrors)[0];
        toast.error(firstError);
        return;
      }
    }

    setErrors({});
    setStep(s => Math.min(s + 1, totalSteps));
  };

  const prevStep = () => {
    setErrors({});
    setStep(s => Math.max(s - 1, 1));
  };

  const handleSubmit = async () => {
    const newErrors = {};

    // Validate Step 4 mandatory inputs
    if (!formData.bio?.trim()) {
      newErrors.bio = 'Bio / About section is mandatory';
    }
    if (!formData.github?.trim()) {
      newErrors.github = 'GitHub profile URL is mandatory';
    }
    if (!formData.linkedin?.trim()) {
      newErrors.linkedin = 'LinkedIn profile URL is mandatory';
    }
    // Portfolio / Website is optional per user voice instruction
    if (!formData.phone?.trim()) {
      newErrors.phone = 'Contact Phone number is mandatory';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError);
      return;
    }

    setLoading(true);
    try {
      const { confirm_password, ...data } = formData;
      const result = await register(data);
      if (result?.requiresConfirmation) {
        toast.success(`Verification email sent to ${formData.email}! Please confirm your email to activate your account.`);
        navigate('/login', { state: { message: `Verification email sent to ${formData.email}. Please verify your email before logging in.` } });
      } else {
        toast.success('Welcome to RIT ECE Nexus! Your profile has been created.');
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
            <h1>Join RIT ECE Nexus</h1>
            <p>Official Network for ECE 2nd, 3rd, 4th Years & Alumni</p>
            <div style={{ marginTop: 'var(--space-3)' }}>
              <span className="mandatory-badge">
                <AlertCircle size={13} /> All inputs are strictly mandatory (*)
              </span>
            </div>
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
              <h3 style={{ marginBottom: 'var(--space-4)', textAlign: 'center' }}>
                I am a... <span className="mandatory-star">*</span>
              </h3>
              <div className="account-type-grid">
                <div
                  className={`account-type-card ${formData.account_type === 'student' ? 'selected' : ''} ${errors.account_type ? 'input-error' : ''}`}
                  onClick={() => updateField('account_type', 'student')}
                >
                  <GraduationCap size={32} color="var(--accent-500)" />
                  <h3>Current Student</h3>
                  <p>ECE 2nd, 3rd, or 4th Year</p>
                </div>
                <div
                  className={`account-type-card ${formData.account_type === 'alumni' ? 'selected' : ''} ${errors.account_type ? 'input-error' : ''}`}
                  onClick={() => updateField('account_type', 'alumni')}
                >
                  <Briefcase size={32} color="var(--violet-500)" />
                  <h3>Alumni</h3>
                  <p>RIT ECE Graduate (2008 – 2026)</p>
                </div>
              </div>
              {errors.account_type && (
                <div className="field-error-msg" style={{ textAlign: 'center', marginBottom: 'var(--space-3)' }}>
                  {errors.account_type}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Basic Info */}
          {step === 2 && (
            <div>
              <div className="form-group">
                <label className="form-label">
                  Full Name <span className="mandatory-star">*</span>
                </label>
                <div className="input-with-icon">
                  <User size={18} className="input-icon" />
                  <input
                    type="text"
                    className={`form-input ${errors.full_name ? 'input-error' : ''}`}
                    placeholder="Your full name"
                    style={{ paddingLeft: '42px' }}
                    value={formData.full_name}
                    onChange={(e) => updateField('full_name', e.target.value)}
                    required
                  />
                </div>
                {errors.full_name && <span className="field-error-msg">{errors.full_name}</span>}
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label">
                    College Email <span className="mandatory-star">*</span>
                  </label>
                  <span style={{ fontSize: '11px', color: '#00E5FF', fontWeight: 600 }}>
                    Must be @{APPROVED_EMAIL_DOMAIN}
                  </span>
                </div>
                <div className="input-with-icon">
                  <Mail size={18} className="input-icon" />
                  <input
                    type="email"
                    className={`form-input ${errors.email ? 'input-error' : ''}`}
                    placeholder={`student@${APPROVED_EMAIL_DOMAIN}`}
                    style={{ paddingLeft: '42px' }}
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    required
                  />
                </div>
                {errors.email ? (
                  <span className="field-error-msg">{errors.email}</span>
                ) : (
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Institutional email strictly required. Verification link will be sent.
                  </p>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    Password <span className="mandatory-star">*</span>
                  </label>
                  <div className="input-with-icon">
                    <Lock size={18} className="input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className={`form-input ${errors.password ? 'input-error' : ''}`}
                      placeholder="Min 6 characters"
                      style={{ paddingLeft: '42px', paddingRight: '40px' }}
                      value={formData.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="input-icon-right"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <span className="field-error-msg">{errors.password}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Confirm Password <span className="mandatory-star">*</span>
                  </label>
                  <input
                    type="password"
                    className={`form-input ${errors.confirm_password ? 'input-error' : ''}`}
                    placeholder="Confirm password"
                    value={formData.confirm_password}
                    onChange={(e) => updateField('confirm_password', e.target.value)}
                    required
                  />
                  {errors.confirm_password && <span className="field-error-msg">{errors.confirm_password}</span>}
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
                      <label className="form-label">
                        Register / Roll Number <span className="mandatory-star">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-input ${errors.register_number ? 'input-error' : ''}`}
                        placeholder="e.g. 210801001"
                        value={formData.register_number}
                        onChange={(e) => updateField('register_number', e.target.value)}
                        required
                      />
                      {errors.register_number && <span className="field-error-msg">{errors.register_number}</span>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Current Year of Study <span className="mandatory-star">*</span>
                      </label>
                      <select
                        className={`form-input ${errors.year ? 'input-error' : ''}`}
                        value={formData.year}
                        onChange={(e) => handleYearChange(e.target.value)}
                        required
                      >
                        <option value="">Select Year of Study</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                      </select>
                      {errors.year && <span className="field-error-msg">{errors.year}</span>}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">
                        Class Section <span className="mandatory-star">*</span>
                      </label>
                      <select
                        className={`form-input ${errors.section ? 'input-error' : ''}`}
                        value={formData.section}
                        onChange={(e) => updateField('section', e.target.value)}
                        disabled={!formData.year}
                        required
                      >
                        {!formData.year ? (
                          <option value="">Select Year of Study first</option>
                        ) : (
                          <>
                            <option value="">Select Section ({formData.year === '2' ? 'Sections A to E' : formData.year === '3' ? 'Sections A to C' : 'Sections A & B'})</option>
                            {(YEAR_SECTIONS[formData.year] || []).map(sec => (
                              <option key={sec} value={sec}>
                                Section {sec}
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                      {errors.section && <span className="field-error-msg">{errors.section}</span>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        Batch <span className="mandatory-star">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-input ${errors.batch ? 'input-error' : ''}`}
                        value={formData.batch ? `${formData.batch} (Auto-assigned)` : ''}
                        placeholder="Auto-calculated from Year of Study"
                        readOnly
                        disabled
                        style={{ background: 'var(--bg-tertiary)', fontWeight: 600, color: 'var(--text-primary)', cursor: 'not-allowed' }}
                      />
                      {errors.batch && <span className="field-error-msg">{errors.batch}</span>}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">
                        Graduation Year (2008–2026) <span className="mandatory-star">*</span>
                      </label>
                      <select
                        className={`form-input ${errors.graduation_year ? 'input-error' : ''}`}
                        value={formData.graduation_year}
                        onChange={(e) => updateField('graduation_year', e.target.value)}
                        required
                      >
                        <option value="">Select Graduation Batch (2008–2026)</option>
                        {ALUMNI_GRADUATION_YEARS.map(y => (
                          <option key={y} value={y}>
                            Class of {y} {y === 2026 ? '(Recent 2026 Batch)' : y === 2008 ? '(Inaugural 2008 Batch)' : ''}
                          </option>
                        ))}
                      </select>
                      {errors.graduation_year && <span className="field-error-msg">{errors.graduation_year}</span>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        Current Company <span className="mandatory-star">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-input ${errors.current_company ? 'input-error' : ''}`}
                        placeholder="e.g. Texas Instruments, Qualcomm, Intel"
                        value={formData.current_company}
                        onChange={(e) => updateField('current_company', e.target.value)}
                        required
                      />
                      {errors.current_company && <span className="field-error-msg">{errors.current_company}</span>}
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">
                        Job Title / Role <span className="mandatory-star">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-input ${errors.job_title ? 'input-error' : ''}`}
                        placeholder="e.g. Analog IC Design Engineer"
                        value={formData.job_title}
                        onChange={(e) => updateField('job_title', e.target.value)}
                        required
                      />
                      {errors.job_title && <span className="field-error-msg">{errors.job_title}</span>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        Industry Domain <span className="mandatory-star">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-input ${errors.industry ? 'input-error' : ''}`}
                        placeholder="e.g. Semiconductors, Embedded, Telecom"
                        value={formData.industry}
                        onChange={(e) => updateField('industry', e.target.value)}
                        required
                      />
                      {errors.industry && <span className="field-error-msg">{errors.industry}</span>}
                    </div>
                  </div>
                </>
              )}
              <div className="form-group">
                <label className="form-label">
                  Professional Headline <span className="mandatory-star">*</span>
                </label>
                <input
                  type="text"
                  className={`form-input ${errors.headline ? 'input-error' : ''}`}
                  placeholder="e.g. ECE 3rd Year | Embedded Systems & RTOS Enthusiast"
                  value={formData.headline}
                  onChange={(e) => updateField('headline', e.target.value)}
                  required
                />
                {errors.headline && <span className="field-error-msg">{errors.headline}</span>}
              </div>
              <div className="form-group" ref={locationRef} style={{ position: 'relative' }}>
                <label className="form-label">
                  Location <span className="mandatory-star">*</span>
                </label>
                <div className="input-with-icon">
                  <MapPin size={18} className="input-icon" />
                  <input
                    type="text"
                    className={`form-input ${errors.location ? 'input-error' : ''}`}
                    placeholder="Search city (e.g. Chennai, Bengaluru, Coimbatore)..."
                    style={{ paddingLeft: '42px' }}
                    value={formData.location}
                    onFocus={() => setShowLocationDropdown(true)}
                    onChange={(e) => {
                      updateField('location', e.target.value);
                      setShowLocationDropdown(true);
                    }}
                    required
                  />
                </div>
                {showLocationDropdown && (
                  <div
                    className="location-suggestions-dropdown"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      maxHeight: '220px',
                      overflowY: 'auto',
                      background: 'var(--card-bg)',
                      border: '1.5px solid var(--border-color)',
                      borderRadius: 'var(--radius-lg)',
                      boxShadow: 'var(--card-shadow-elevated)',
                      zIndex: 100,
                    }}
                  >
                    {POPULAR_LOCATIONS.filter(loc =>
                      !formData.location?.trim() || loc.toLowerCase().includes(formData.location.toLowerCase())
                    ).slice(0, 7).map(loc => (
                      <div
                        key={loc}
                        onClick={() => {
                          updateField('location', loc);
                          setShowLocationDropdown(false);
                        }}
                        style={{
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          cursor: 'pointer',
                          fontSize: 'var(--text-sm)',
                          color: 'var(--text-primary)',
                          borderBottom: '1px solid var(--border-primary)',
                          transition: 'background var(--transition-fast)',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <MapPin size={15} style={{ color: 'var(--accent-500)', flexShrink: 0 }} />
                        <span style={{ flex: 1 }}>{loc}</span>
                        {formData.location?.toLowerCase() === loc.toLowerCase() && (
                          <Check size={14} style={{ color: 'var(--success-500)' }} />
                        )}
                      </div>
                    ))}
                    {formData.location?.trim() && !POPULAR_LOCATIONS.some(loc => loc.toLowerCase() === formData.location.toLowerCase()) && (
                      <div
                        onClick={() => setShowLocationDropdown(false)}
                        style={{
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          cursor: 'pointer',
                          fontSize: 'var(--text-sm)',
                          color: 'var(--accent-500)',
                          fontWeight: 600,
                          background: 'var(--bg-tertiary)',
                        }}
                      >
                        <Search size={15} style={{ flexShrink: 0 }} />
                        <span>Use "{formData.location}" as my location</span>
                      </div>
                    )}
                  </div>
                )}
                {errors.location && <span className="field-error-msg">{errors.location}</span>}
              </div>
            </div>
          )}

          {/* Step 4: Bio & Links */}
          {step === 4 && (
            <div>
              <div className="form-group">
                <label className="form-label">
                  Bio / About <span className="mandatory-star">*</span>
                </label>
                <textarea
                  className={`form-textarea ${errors.bio ? 'input-error' : ''}`}
                  placeholder="Tell us about yourself, your core technical interests, projects, and domain focus..."
                  value={formData.bio}
                  onChange={(e) => updateField('bio', e.target.value)}
                  rows={4}
                  required
                />
                {errors.bio && <span className="field-error-msg">{errors.bio}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">
                  GitHub Profile URL <span className="mandatory-star">*</span>
                </label>
                <input
                  type="url"
                  className={`form-input ${errors.github ? 'input-error' : ''}`}
                  placeholder="https://github.com/username"
                  value={formData.github}
                  onChange={(e) => updateField('github', e.target.value)}
                  required
                />
                {errors.github && <span className="field-error-msg">{errors.github}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">
                  LinkedIn Profile URL <span className="mandatory-star">*</span>
                </label>
                <input
                  type="url"
                  className={`form-input ${errors.linkedin ? 'input-error' : ''}`}
                  placeholder="https://linkedin.com/in/username"
                  value={formData.linkedin}
                  onChange={(e) => updateField('linkedin', e.target.value)}
                  required
                />
                {errors.linkedin && <span className="field-error-msg">{errors.linkedin}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">
                  Portfolio / Website Link <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>(Optional)</span>
                </label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://yourportfolio.com or project link (Optional)"
                  value={formData.portfolio}
                  onChange={(e) => updateField('portfolio', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Contact Phone Number <span className="mandatory-star">*</span>
                </label>
                <input
                  type="tel"
                  className={`form-input ${errors.phone ? 'input-error' : ''}`}
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  required
                />
                {errors.phone && <span className="field-error-msg">{errors.phone}</span>}
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
