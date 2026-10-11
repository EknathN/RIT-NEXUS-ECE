import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { authAPI, usersAPI } from '../services/api';
import { Settings as SettingsIcon, Shield, Moon, Sun, Lock, Bell, Eye, LogOut } from 'lucide-react';

export default function Settings() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();

  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPass, setChangingPass] = useState(false);

  const [visibility, setVisibility] = useState({
    profileVisibleToPublic: user?.visibility?.profileVisibleToPublic ?? true,
    showEmail: user?.visibility?.showEmail ?? false,
    showPhone: user?.visibility?.showPhone ?? false
  });

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.show('New passwords do not match', 'error');
      return;
    }
    setChangingPass(true);
    try {
      await authAPI.changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      toast.show('Password updated successfully!', 'success');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.show(err.response?.data?.message || 'Failed to update password', 'error');
    } finally {
      setChangingPass(false);
    }
  };

  const handleVisibilityToggle = async (key) => {
    const updated = { ...visibility, [key]: !visibility[key] };
    setVisibility(updated);
    try {
      await usersAPI.updateProfile({ visibility: updated });
      toast.show('Privacy preference saved', 'success');
    } catch (err) {
      toast.show('Failed to save preference', 'error');
    }
  };

  return (
    <div className="container" style={{ padding: 'var(--space-6) var(--space-4)', maxWidth: '750px' }}>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <SettingsIcon size={24} className="text-accent" /> Account Settings
      </h1>

      {/* Theme & Display */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Appearance & Display</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Interface Theme</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Toggle between high-contrast dark mode and clean light mode</div>
          </div>
          <button className="btn btn-outline" onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {theme === 'dark' ? <><Sun size={18} /> Light Mode</> : <><Moon size={18} /> Dark Mode</>}
          </button>
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={20} className="text-accent" /> Privacy & Visibility
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Public RIT Directory Visibility</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Allow peers and recruiters in RIT ECE to find your profile</div>
            </div>
            <input
              type="checkbox"
              checked={visibility.profileVisibleToPublic}
              onChange={() => handleVisibilityToggle('profileVisibleToPublic')}
              style={{ width: 20, height: 20, cursor: 'pointer' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Show Email Address</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Display your contact email to connected peers</div>
            </div>
            <input
              type="checkbox"
              checked={visibility.showEmail}
              onChange={() => handleVisibilityToggle('showEmail')}
              style={{ width: 20, height: 20, cursor: 'pointer' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Show Phone Number</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Display your phone number for mentorship outreach</div>
            </div>
            <input
              type="checkbox"
              checked={visibility.showPhone}
              onChange={() => handleVisibilityToggle('showPhone')}
              style={{ width: 20, height: 20, cursor: 'pointer' }}
            />
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lock size={20} className="text-accent" /> Change Password
        </h2>
        <form onSubmit={handlePasswordSubmit}>
          <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
            <label className="form-label">Current Password</label>
            <input
              type="password"
              className="form-input"
              required
              value={passwords.currentPassword}
              onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
            />
          </div>

          <div className="grid grid-2" style={{ gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-input"
                required
                minLength={6}
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="form-input"
                required
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={changingPass}>
            {changingPass ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Logout Session */}
      <div className="card" style={{ border: '1px solid rgba(239, 68, 68, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--danger-500)' }}>Sign Out of Session</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Log out of your account on this device</div>
          </div>
          <button className="btn btn-outline" onClick={logout} style={{ color: 'var(--danger-500)', borderColor: 'var(--danger-500)' }}>
            <LogOut size={16} style={{ marginRight: 6 }} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
