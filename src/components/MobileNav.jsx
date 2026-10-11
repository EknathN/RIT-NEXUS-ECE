import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Briefcase, MessageCircle, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './MobileNav.css';

export default function MobileNav() {
  const location = useLocation();
  const { user } = useAuth();

  const items = [
    { path: '/home', icon: Home, label: 'Home' },
    { path: '/network', icon: Users, label: 'Network' },
    { path: '/jobs', icon: Briefcase, label: 'Jobs' },
    { path: '/messages', icon: MessageCircle, label: 'Messages' },
    { path: `/profile/${user?.id}`, icon: User, label: 'Profile' },
  ];

  return (
    <nav className="mobile-nav">
      {items.map(item => (
        <Link
          key={item.path}
          to={item.path}
          className={`mobile-nav-item ${location.pathname === item.path || location.pathname.startsWith(item.path + '/') ? 'active' : ''}`}
        >
          <item.icon size={20} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
