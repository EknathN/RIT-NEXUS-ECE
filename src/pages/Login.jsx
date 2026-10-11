import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';
import RITLogo from '../components/RITLogo';
import { APPROVED_EMAIL_DOMAIN } from '../services/supabaseClient';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const { login, resetPassword, unconfirmedEmail } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const infoMessage = location.state?.message;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back to RIT ECE Nexus!');
      navigate('/home');
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error('Please enter your @ece.ritchennai.edu.in email');
      return;
    }
    setForgotLoading(true);
    try {
      await resetPassword(forgotEmail);
      toast.success('Password reset link sent! Check your inbox.');
      setShowForgotModal(false);
    } catch (err) {
      toast.error(err.message || 'Failed to send reset link');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
      </div>
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <Link to="/" style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: 'var(--space-3)' }}>
              <RITLogo height={42} />
            </Link>
            <h1>Welcome Back</h1>
            <p>Sign in to your professional network</p>
          </div>

          {(infoMessage || unconfirmedEmail) && (
            <div style={{
              background: 'rgba(0, 229, 255, 0.1)',
              border: '1px solid rgba(0, 229, 255, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
            }}>
              <AlertCircle size={20} color="#00E5FF" />
              <p style={{ margin: 0, fontSize: '13px', color: '#E2E8F0' }}>
                {infoMessage || `Verification email pending for ${unconfirmedEmail}. Please check your inbox and click the Supabase verification link to activate.`}
              </p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">College Email</label>
                <span style={{ fontSize: '11px', color: '#00E5FF', fontWeight: 600 }}>
                  @{APPROVED_EMAIL_DOMAIN}
                </span>
              </div>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  className="form-input"
                  placeholder="student@ece.ritchennai.edu.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ paddingLeft: '42px' }}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingLeft: '42px', paddingRight: '42px' }}
                />
                <button
                  type="button"
                  className="input-icon-right"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            <div style={{ textAlign: 'right', marginBottom: 'var(--space-4)' }}>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                style={{ background: 'none', border: 'none', color: '#00E5FF', fontSize: 'var(--text-sm)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Forgot Password?
              </button>
            </div>
            
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          
          <div className="auth-footer">
            <p>Don't have an account? <Link to="/register">Create Account</Link></p>
          </div>

          <div className="auth-info">
            <p>Exclusive professional network for the RIT ECE Nexus community (@{APPROVED_EMAIL_DOMAIN}).</p>
          </div>

          {/* Forgot Password Modal */}
          {showForgotModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(10, 17, 40, 0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px',
            }}>
              <div style={{
                background: 'var(--card-bg, #101F42)',
                borderRadius: '16px',
                border: '1px solid rgba(0, 229, 255, 0.3)',
                padding: '28px',
                maxWidth: '420px',
                width: '100%',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#F1F5F9' }}>Reset Password</h3>
                <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '18px' }}>
                  Enter your official college email. A password reset link will be sent to your inbox.
                </p>
                <form onSubmit={handleForgotPassword}>
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <div className="input-with-icon">
                      <Mail size={18} className="input-icon" />
                      <input
                        type="email"
                        className="form-input"
                        placeholder="student@ece.ritchennai.edu.in"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                        style={{ paddingLeft: '42px' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowForgotModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={forgotLoading}
                    >
                      {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
