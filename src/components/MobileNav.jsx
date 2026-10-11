import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Briefcase, MessageCircle, MessageSquare, Cpu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useBadges } from '../contexts/BadgeContext';
import './MobileNav.css';

export default function MobileNav() {
  const location = useLocation();
  const { user } = useAuth();
  const { badges } = useBadges();

  const items = [
    { path: '/home', icon: Home, label: 'Home' },
    { path: '/network', icon: Users, label: 'Network', badgeKey: 'network' },
    { path: '/communities', icon: MessageSquare, label: 'Circles', badgeKey: 'communities' },
    { path: '/projects', icon: Cpu, label: 'Projects', badgeKey: 'projects' },
    { path: '/jobs', icon: Briefcase, label: 'Jobs', badgeKey: 'jobs' },
    { path: '/messages', icon: MessageCircle, label: 'Messages', badgeKey: 'messages' },
  ];

  return (
    <nav className="mobile-nav">
      {items.map(item => {
        const badgeCount = item.badgeKey ? (badges[item.badgeKey] || 0) : 0;
        const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`mobile-nav-item ${isActive ? 'active' : ''}`}
          >
            <div className="mobile-nav-icon-wrap">
              <item.icon size={20} />
              {badgeCount > 0 && (
                <span className="mobile-nav-badge">
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}
            </div>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
