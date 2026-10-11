import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationsAPI } from '../services/api';
import { useAuth } from './AuthContext';

const BadgeContext = createContext(null);

export function BadgeProvider({ children }) {
  const { user } = useAuth();
  const [badges, setBadges] = useState({
    messages: 0,
    notifications: 0,
    network: 0,
    communities: 0,
    jobs: 0,
    projects: 0,
  });

  const refreshBadges = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notificationsAPI.getBadgeCounts();
      if (res && res.success) {
        setBadges({
          messages: res.messages || 0,
          notifications: res.notifications || 0,
          network: res.network || 0,
          communities: res.communities || 0,
          jobs: res.jobs || 0,
          projects: res.projects || 0,
        });
      }
    } catch (_) {
      // Silently catch background badge polling errors
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setBadges({
        messages: 0,
        notifications: 0,
        network: 0,
        communities: 0,
        jobs: 0,
        projects: 0,
      });
      return;
    }

    refreshBadges();

    // Poll badge counts every 6 seconds in the background
    const interval = setInterval(refreshBadges, 6000);

    // Refresh when user returns to window tab
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshBadges();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user, refreshBadges]);

  return (
    <BadgeContext.Provider value={{ badges, refreshBadges }}>
      {children}
    </BadgeContext.Provider>
  );
}

export function useBadges() {
  const context = useContext(BadgeContext);
  if (!context) {
    return {
      badges: { messages: 0, notifications: 0, network: 0, communities: 0, jobs: 0, projects: 0 },
      refreshBadges: () => {},
    };
  }
  return context;
}
