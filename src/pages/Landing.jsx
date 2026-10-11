import { Link } from 'react-router-dom';
import { ArrowRight, Users, Briefcase, Rocket, GraduationCap, Globe, Sparkles, Zap, Shield, ChevronRight } from 'lucide-react';
import RITLogo from '../components/RITLogo';
import './Landing.css';

export default function Landing() {
  const features = [
    { icon: <Users size={28} />, title: 'Build Your Professional Identity', desc: 'Create a profile that represents your skills, projects, and achievements to the ECE community.' },
    { icon: <Globe size={28} />, title: 'Connect With Your Community', desc: 'Connect with students, seniors, and alumni. Build a network that supports your growth.' },
    { icon: <Briefcase size={28} />, title: 'Discover Opportunities', desc: 'Find internships, jobs, hackathons, and incubation programs tailored for ECE students.' },
    { icon: <GraduationCap size={28} />, title: 'Learn From Alumni', desc: 'Connect with experienced alumni and mentors who can guide your career journey.' },
    { icon: <Rocket size={28} />, title: 'Hackathons & Innovation', desc: 'Discover hackathons, competitions, and incubation programs to fuel your innovation.' },
    { icon: <Sparkles size={28} />, title: 'Grow Together', desc: 'Join communities, events, and professional discussions that help everyone succeed.' },
  ];

  const stats = [
    { value: '500+', label: 'ECE Students' },
    { value: '200+', label: 'Alumni Network' },
    { value: '50+', label: 'Opportunities' },
    { value: '15+', label: 'Communities' },
  ];

  return (
    <div className="landing">
      {/* Header */}
      <header className="landing-header">
        <div className="container">
          <div className="landing-nav">
            <RITLogo height={38} />
            <div className="landing-nav-links">
              <Link to="/login" className="btn btn-ghost">Sign In</Link>
              <Link to="/register" className="btn btn-primary">Join Now</Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
          <div className="hero-grid" />
        </div>
        <div className="container">
          <div className="hero-content">
            <div className="hero-badge">
              <Zap size={14} />
              <span>Exclusive for RIT ECE Nexus Community</span>
            </div>
            <h1 className="hero-title">
              Connect. Learn.<br />
              <span className="hero-gradient">Build. Grow.</span>
            </h1>
            <p className="hero-subtitle">
              The professional network connecting ECE students, alumni, and opportunities 
              at Rajalakshmi Institute of Technology, Chennai.
            </p>
            <div className="hero-actions">
              <Link to="/register" className="btn btn-primary btn-lg hero-cta">
                Join RIT ECE Nexus <ArrowRight size={18} />
              </Link>
              <Link to="/login" className="btn btn-secondary btn-lg">
                Explore Platform
              </Link>
            </div>
            <div className="hero-stats">
              {stats.map((s, i) => (
                <div key={i} className="hero-stat">
                  <div className="hero-stat-value">{s.value}</div>
                  <div className="hero-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">Why RIT ECE Nexus?</span>
            <h2>Everything you need to <span className="text-gradient">succeed professionally</span></h2>
            <p>A dedicated ecosystem built specifically for the RIT ECE Nexus community.</p>
          </div>
          <div className="features-grid">
            {features.map((f, i) => (
              <div key={i} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-card">
            <div className="cta-bg-pattern" />
            <Shield size={40} className="cta-icon" />
            <h2>Ready to join your professional community?</h2>
            <p>Start building your professional identity and connect with the entire RIT ECE Nexus network today.</p>
            <Link to="/register" className="btn btn-primary btn-lg">
              Create Your Profile <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <div style={{ marginBottom: '12px' }}>
                <RITLogo height={36} className="theme-dark-forced" />
              </div>
              <p>The professional digital ecosystem of RIT ECE Nexus.</p>
            </div>
            <div className="footer-links">
              <div>
                <h4>Platform</h4>
                <a href="#features">Features</a>
                <a href="#about">About</a>
              </div>
              <div>
                <h4>Community</h4>
                <a href="#students">Students</a>
                <a href="#alumni">Alumni</a>
              </div>
              <div>
                <h4>Resources</h4>
                <a href="#jobs">Jobs</a>
                <a href="#hackathons">Hackathons</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2024–2026 RIT ECE Nexus. Rajalakshmi Institute of Technology, Chennai.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
