import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { searchAPI } from '../services/api';
import { Search as SearchIcon, Users, FileText, Briefcase, Trophy, Layers } from 'lucide-react';

function getInitials(name) { return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'; }

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState({ users: [], posts: [], jobs: [], hackathons: [], communities: [] });
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSearch = async (q) => {
    if (!q || !q.trim()) return;
    setLoading(true);
    try {
      const res = await searchAPI.globalSearch(q);
      setResults(res.data.results || { users: [], posts: [], jobs: [], hackathons: [], communities: [] });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ q: query });
    handleSearch(query);
  };

  const totalResults = (results.users?.length || 0) + (results.posts?.length || 0) + (results.jobs?.length || 0) + (results.hackathons?.length || 0) + (results.communities?.length || 0);

  return (
    <div className="container" style={{ padding: 'var(--space-6) var(--space-4)', maxWidth: '900px' }}>
      <form onSubmit={handleSubmit} style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ position: 'relative' }}>
          <SearchIcon size={20} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '48px', height: '52px', fontSize: '1.05rem', borderRadius: 'var(--radius-xl)' }}
            placeholder="Search across students, alumni, jobs, hackathons, skills..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </form>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', overflowX: 'auto', paddingBottom: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
        <button className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('all')}>
          All ({totalResults})
        </button>
        <button className={`btn btn-sm ${activeTab === 'users' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('users')}>
          People ({results.users?.length || 0})
        </button>
        <button className={`btn btn-sm ${activeTab === 'jobs' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('jobs')}>
          Jobs ({results.jobs?.length || 0})
        </button>
        <button className={`btn btn-sm ${activeTab === 'posts' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('posts')}>
          Posts ({results.posts?.length || 0})
        </button>
        <button className={`btn btn-sm ${activeTab === 'hackathons' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('hackathons')}>
          Hackathons ({results.hackathons?.length || 0})
        </button>
        <button className={`btn btn-sm ${activeTab === 'communities' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('communities')}>
          Communities ({results.communities?.length || 0})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <div className="loading-spinner" style={{ margin: '0 auto var(--space-4)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Searching RIT ECE Nexus platform...</p>
        </div>
      ) : totalResults === 0 && query ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <SearchIcon size={48} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-4)' }} />
          <h3>No results found for &quot;{query}&quot;</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>Try searching for a different person, skill like &quot;VLSI&quot;, or company.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Users Section */}
          {(activeTab === 'all' || activeTab === 'users') && results.users?.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} className="text-accent" /> People ({results.users.length})
              </h2>
              <div className="grid grid-2" style={{ gap: 'var(--space-3)' }}>
                {results.users.map(u => (
                  <Link key={u._id} to={`/profile/${u._id}`} className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', textDecoration: 'none' }}>
                    {u.avatar ? (
                      <img src={u.avatar} alt={u.fullName} className="avatar avatar-md" />
                    ) : (
                      <div className="avatar-placeholder avatar-md">{getInitials(u.fullName)}</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{u.fullName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {u.headline || `${u.role} • RIT ECE`}
                      </div>
                      <span className="badge badge-accent" style={{ marginTop: '2px', fontSize: '0.7rem' }}>{u.role}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Jobs Section */}
          {(activeTab === 'all' || activeTab === 'jobs') && results.jobs?.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Briefcase size={18} className="text-accent" /> Opportunities ({results.jobs.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {results.jobs.map(job => (
                  <Link key={job._id} to="/jobs" className="card" style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{job.title}</h3>
                      <span className="badge badge-accent">{job.type}</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px' }}>{job.company} • {job.location || 'Remote'}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Hackathons Section */}
          {(activeTab === 'all' || activeTab === 'hackathons') && results.hackathons?.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trophy size={18} className="text-accent" /> Hackathons & Programs ({results.hackathons.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {results.hackathons.map(h => (
                  <Link key={h._id} to="/hackathons" className="card" style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{h.title}</h3>
                      <span className="badge badge-purple">{h.category}</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px' }}>Organized by {h.organizer} • Prize: {h.prizePool || 'Mentorship'}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Posts Section */}
          {(activeTab === 'all' || activeTab === 'posts') && results.posts?.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} className="text-accent" /> Posts ({results.posts.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {results.posts.map(p => (
                  <div key={p._id} className="card">
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      Posted by {p.author?.fullName || 'Member'}
                    </div>
                    <p style={{ color: 'var(--text-primary)', fontSize: '0.92rem' }}>{p.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
