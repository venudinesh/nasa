import { useState, useEffect } from 'react';

type SessionView = {
  assistant: { id: string; content: string; ts: number }[];
  embeddingsCount: number;
};

type SystemStats = {
  totalSessions: number;
  totalMessages: number;
  totalUsers: number;
  totalPlanets: number;
  avgMessagesPerSession: string;
};

type SessionListItem = {
  id: string;
  userId: number | null;
  username: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
};

const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.MODE !== 'production'));

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionView | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [activeTab, setActiveTab] = useState<'session' | 'stats' | 'list'>('stats');

  if (!isDev) return null;

  // Load stats on mount
  useEffect(() => {
    loadStats();
    loadSessions();
  }, []);

  const loadStats = async () => {
    try {
      const r = await fetch('/api/admin/stats');
      if (r.ok) {
        const data = await r.json();
        setStats(data.stats);
      }
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
  };

  const loadSessions = async () => {
    try {
      const r = await fetch('/api/admin/sessions');
      if (r.ok) {
        const data = await r.json();
        setSessions(data.data || []);
      }
    } catch (e) {
      console.error('Failed to load sessions:', e);
    }
  };

  const fetchSession = async () => {
    setError(null);
    setSession(null);
    if (!sessionId) return setError('Enter a session id');
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/session/${encodeURIComponent(sessionId)}`);
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setError(j && j.error ? j.error : `Request failed: ${r.status}`);
        setLoading(false);
        return;
      }
      const j = await r.json();
      setSession(j.data || null);
    } catch (e: any) {
      setError(e && e.message ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async () => {
    if (!sessionId) return setError('Enter a session id');
    if (!confirm(`Delete session ${sessionId}? This cannot be undone.`)) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/session/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setError(j && j.error ? j.error : `Delete failed: ${r.status}`);
        setLoading(false);
        return;
      }
      setSession(null);
      setError(null);
      alert('Deleted');
      loadStats();
      loadSessions();
    } catch (e: any) {
      setError(e && e.message ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-panel-overlay" role="dialog" aria-modal="true" aria-label="Admin panel">
      <div className="admin-panel" role="document">
        <div className="admin-header">
          <h3>🔧 Dev Admin Panel</h3>
          <button aria-label="Close admin panel" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 8 }}>
          <button 
            onClick={() => setActiveTab('stats')}
            style={{ 
              padding: '6px 12px', 
              background: activeTab === 'stats' ? 'var(--neon-cyan)' : 'transparent',
              color: activeTab === 'stats' ? '#000' : 'var(--neon-cyan)',
              border: '1px solid var(--neon-cyan)',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            Statistics
          </button>
          <button 
            onClick={() => setActiveTab('list')}
            style={{ 
              padding: '6px 12px', 
              background: activeTab === 'list' ? 'var(--neon-cyan)' : 'transparent',
              color: activeTab === 'list' ? '#000' : 'var(--neon-cyan)',
              border: '1px solid var(--neon-cyan)',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            Sessions List
          </button>
          <button 
            onClick={() => setActiveTab('session')}
            style={{ 
              padding: '6px 12px', 
              background: activeTab === 'session' ? 'var(--neon-cyan)' : 'transparent',
              color: activeTab === 'session' ? '#000' : 'var(--neon-cyan)',
              border: '1px solid var(--neon-cyan)',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            Session Details
          </button>
        </div>

        {/* Stats Tab */}
        {activeTab === 'stats' && stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <div style={{ background: 'rgba(0,255,255,0.1)', padding: 12, borderRadius: 6 }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--neon-cyan)' }}>{stats.totalSessions}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Total Sessions</div>
            </div>
            <div style={{ background: 'rgba(0,255,255,0.1)', padding: 12, borderRadius: 6 }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--neon-cyan)' }}>{stats.totalMessages}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Total Messages</div>
            </div>
            <div style={{ background: 'rgba(0,255,255,0.1)', padding: 12, borderRadius: 6 }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--neon-cyan)' }}>{stats.totalUsers}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Total Users</div>
            </div>
            <div style={{ background: 'rgba(0,255,255,0.1)', padding: 12, borderRadius: 6 }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--neon-cyan)' }}>{stats.totalPlanets}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Total Planets</div>
            </div>
            <div style={{ background: 'rgba(0,255,255,0.1)', padding: 12, borderRadius: 6, gridColumn: 'span 2' }}>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--neon-cyan)' }}>{stats.avgMessagesPerSession}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Avg Messages per Session</div>
            </div>
          </div>
        )}

        {/* Sessions List Tab */}
        {activeTab === 'list' && (
          <div style={{ maxHeight: '400px', overflow: 'auto' }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)', textAlign: 'left' }}>
                  <th style={{ padding: 8 }}>Session ID</th>
                  <th style={{ padding: 8 }}>User</th>
                  <th style={{ padding: 8 }}>Messages</th>
                  <th style={{ padding: 8 }}>Created</th>
                  <th style={{ padding: 8 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: 8 }}>
                      <code style={{ fontSize: 10 }}>{s.id.substring(0, 8)}...</code>
                    </td>
                    <td style={{ padding: 8 }}>{s.username}</td>
                    <td style={{ padding: 8 }}>{s.messageCount}</td>
                    <td style={{ padding: 8 }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: 8 }}>
                      <button 
                        onClick={() => { setSessionId(s.id); setActiveTab('session'); }}
                        style={{ padding: '2px 8px', fontSize: 10, cursor: 'pointer' }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Session Details Tab */}
        {activeTab === 'session' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input 
                aria-label="Session id" 
                value={sessionId} 
                onChange={(e) => setSessionId(e.target.value)} 
                placeholder="session id" 
                style={{ flex: 1, padding: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: 4 }}
              />
              <button onClick={fetchSession} disabled={loading} style={{ padding: '6px 16px', cursor: 'pointer' }}>Fetch</button>
              <button onClick={deleteSession} disabled={loading || !sessionId} style={{ padding: '6px 16px', cursor: 'pointer', background: '#b02a37' }}>Delete</button>
            </div>
            {loading && <div>Loading…</div>}
            {error && <div style={{ color: 'var(--color-danger, #b02a37)', padding: 8, background: 'rgba(176,42,55,0.2)', borderRadius: 4, marginBottom: 8 }} role="status">{error}</div>}

            {session && (
              <div className="admin-session-view">
                <div style={{ background: 'rgba(0,255,255,0.1)', padding: 12, borderRadius: 6, marginBottom: 12 }}>
                  <strong>Embeddings count:</strong> {session.embeddingsCount}
                </div>
                <div style={{ marginTop: 8 }}>
                  <strong>Assistant messages ({session.assistant.length})</strong>
                  <ul style={{ maxHeight: 300, overflow: 'auto', marginTop: 8 }}>
                    {session.assistant.map((a) => (
                      <li key={a.id} style={{ marginBottom: 12, padding: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 4 }}>
                        <code style={{ fontSize: 10, opacity: 0.7 }}>{new Date(a.ts).toLocaleString()}</code>
                        <div style={{ marginTop: 4, fontSize: 13 }}>{a.content}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <small style={{ opacity: 0.6 }}>🔒 Dev-only admin panel. This will not render in production builds.</small>
        </div>
      </div>
    </div>
  );
}
