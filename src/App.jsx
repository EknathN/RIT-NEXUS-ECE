import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import MobileNav from './components/MobileNav';
import { ErrorBoundary } from './components/ErrorBoundary';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import MyNetwork from './pages/MyNetwork';
import JobsInternships from './pages/JobsInternships';
import HackathonsIncubation from './pages/HackathonsIncubation';
import Communities from './pages/Communities';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import Events from './pages/Events';
import Search from './pages/Search';
import Settings from './pages/Settings';
import AdminDashboard from './pages/AdminDashboard';
import ProjectBank from './pages/ProjectBank';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-loading"><div className="loading-spinner" /></div>;
  return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-loading"><div className="loading-spinner" /></div>;
  return !user ? children : <Navigate to="/home" />;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading-pulse" style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-500), var(--cyan-500))', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Loading RIT ECE Nexus...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {user && <Navbar />}
      <main className={user ? 'app-main' : ''}>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
            <Route path="/profile/:id" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/edit-profile" element={<PrivateRoute><EditProfile /></PrivateRoute>} />
            <Route path="/network" element={<PrivateRoute><MyNetwork /></PrivateRoute>} />
            <Route path="/projects" element={<PrivateRoute><ProjectBank /></PrivateRoute>} />
            <Route path="/jobs" element={<PrivateRoute><JobsInternships /></PrivateRoute>} />
            <Route path="/hackathons" element={<PrivateRoute><HackathonsIncubation /></PrivateRoute>} />
            <Route path="/communities" element={<Navigate to="/hackathons" replace />} />
            <Route path="/messages" element={<PrivateRoute><Messages /></PrivateRoute>} />
            <Route path="/messages/:id" element={<PrivateRoute><Messages /></PrivateRoute>} />
            <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
            <Route path="/events" element={<PrivateRoute><Events /></PrivateRoute>} />
            <Route path="/search" element={<PrivateRoute><Search /></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
            <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
            <Route path="*" element={<Navigate to={user ? '/home' : '/'} />} />
          </Routes>
        </ErrorBoundary>
      </main>
      {user && <MobileNav />}
    </div>
  );
}
