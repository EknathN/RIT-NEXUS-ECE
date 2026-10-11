import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Home, Users, Briefcase, Rocket, MessageCircle, Bell, Search, Settings, LogOut, Moon, Sun, Monitor, Shield, Calendar, User, ChevronDown, Edit3, Cpu, X } from 'lucide-react';
import { notificationsAPI, messagesAPI } from '../services/api';
import RITLogo from './RITLogo';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, setTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    setIsMobileSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [notifs, msgs] = await Promise.all([
          notificationsAPI.getUnreadCount(),
          messagesAPI.getUnreadCount(),
        ]);
        setUnreadNotifs(notifs.count);
        setUnreadMessages(msgs.count);
      } catch (e) {}
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsMobileSearchOpen(false);
    }
  };

  const navItems = [
    { path: '/home', icon: Home, label: 'Home' },
    { path: '/network', icon: Users, label: 'Mentors & Network' },
    { path: '/projects', icon: Cpu, label: 'Project Bank' },
    { path: '/jobs', icon: Briefcase, label: 'Opportunities' },
    { path: '/hackathons', icon: Rocket, label: 'Hackathons' },
    { path: '/communities', icon: Users, label: 'Communities' },
  ];

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-left">
          <Link to="/home" className="navbar-logo">
            <RITLogo height={36} />
          </Link>
          
          <form className="navbar-search desktop-search" onSubmit={handleSearch}>
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search people, jobs, hackathons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </form>
        </div>

        <div className="navbar-center">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              title={item.label}
            >
              <item.icon size={20} />
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="navbar-right">
          {/* Mobile Search Toggle Button */}
          <button
            type="button"
            className="nav-icon-btn mobile-search-toggle-btn"
            onClick={() => setIsMobileSearchOpen(prev => !prev)}
            title="Search"
            aria-label="Search"
          >
            {isMobileSearchOpen ? <X size={20} /> : <Search size={20} />}
          </button>

          <Link to="/messages" className={`nav-icon-btn navbar-msg-btn ${location.pathname.startsWith('/messages') ? 'active' : ''}`}>
            <MessageCircle size={20} />
            {unreadMessages > 0 && <span className="nav-badge">{unreadMessages}</span>}
          </Link>
          
          <Link to="/notifications" className={`nav-icon-btn ${location.pathname === '/notifications' ? 'active' : ''}`}>
            <Bell size={20} />
            {unreadNotifs > 0 && <span className="nav-badge">{unreadNotifs}</span>}
          </Link>

          {user?.role === 'admin' && (
            <Link to="/admin" className={`nav-icon-btn ${location.pathname === '/admin' ? 'active' : ''}`} title="Admin Dashboard">
              <Shield size={20} />
            </Link>
          )}

          <div className="nav-profile" ref={profileRef}>
            <button className="nav-profile-btn" onClick={() => setShowProfile(!showProfile)}>
              <div className="avatar avatar-sm">
                {user?.profile_photo ? (
                  <img src={user.profile_photo} alt={user.full_name} />
                ) : (
                  getInitials(user?.full_name)
                )}
              </div>
              <ChevronDown size={14} />
            </button>

            {showProfile && (
              <div className="dropdown-menu profile-dropdown">
                <div className="profile-dropdown-header">
                  <div className="avatar">
                    {user?.profile_photo ? (
                      <img src={user.profile_photo} alt={user.full_name} />
                    ) : (
                      getInitials(user?.full_name)
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 'var(--text-base)' }}>{user?.full_name}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{user?.headline || user?.email}</div>
                  </div>
                </div>
                
                <Link to={`/profile/${user?.id}`} className="dropdown-item" onClick={() => setShowProfile(false)}>
                  <User size={16} /> View Profile
                </Link>
                <Link to="/edit-profile" className="dropdown-item" onClick={() => setShowProfile(false)}>
                  <Edit3 size={16} /> Edit Profile
                </Link>
                <Link to="/settings" className="dropdown-item" onClick={() => setShowProfile(false)}>
                  <Settings size={16} /> Settings
                </Link>

                <div className="mobile-dropdown-nav">
                  <div className="dropdown-divider" />
                  <div style={{ padding: '4px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Quick Access
                  </div>
                  <Link to="/communities" className="dropdown-item" onClick={() => setShowProfile(false)}>
                    <Users size={16} /> Communities & Circles
                  </Link>
                  <Link to="/projects" className="dropdown-item" onClick={() => setShowProfile(false)}>
                    <Cpu size={16} /> Project Bank
                  </Link>
                  <Link to="/jobs" className="dropdown-item" onClick={() => setShowProfile(false)}>
                    <Briefcase size={16} /> Opportunities
                  </Link>
                  <Link to="/hackathons" className="dropdown-item" onClick={() => setShowProfile(false)}>
                    <Rocket size={16} /> Hackathons & Incubation
                  </Link>
                  <Link to="/events" className="dropdown-item" onClick={() => setShowProfile(false)}>
                    <Calendar size={16} /> Department Events
                  </Link>
                </div>
                
                <div className="dropdown-divider" />
                
                <div className="theme-switcher">
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>Theme</span>
                  <div className="theme-options">
                    <button className={`theme-option ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')} title="Light">
                      <Sun size={14} />
                    </button>
                    <button className={`theme-option ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')} title="Dark">
                      <Moon size={14} />
                    </button>
                    <button className={`theme-option ${theme === 'system' ? 'active' : ''}`} onClick={() => setTheme('system')} title="System">
                      <Monitor size={14} />
                    </button>
                  </div>
                </div>
                
                <div className="dropdown-divider" />
                
                <button className="dropdown-item" onClick={() => { logout(); navigate('/'); setShowProfile(false); }} style={{ color: 'var(--error-500)' }}>
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {isMobileSearchOpen && (
        <div className="mobile-search-overlay">
          <form className="mobile-search-form" onSubmit={handleSearch}>
            <Search size={18} className="mobile-search-icon" />
            <input
              type="text"
              autoFocus
              placeholder="Search people, jobs, hackathons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mobile-search-input"
            />
            <button
              type="button"
              className="mobile-search-close-btn"
              onClick={() => setIsMobileSearchOpen(false)}
              aria-label="Close search"
            >
              <X size={18} />
            </button>
          </form>
        </div>
      )}
    </nav>
  );
}
