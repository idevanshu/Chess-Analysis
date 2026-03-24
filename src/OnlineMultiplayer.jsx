import { useAuth } from './context/AuthContext';
import { useState, useEffect } from 'react';
import { Copy, Check, Share2, Users, LogIn, Shuffle, Crown, ArrowRight, Globe, Link } from 'lucide-react';

export default function OnlineMultiplayer({ onGameStart, autoJoinRoomCode, timeControl }) {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [view, setView] = useState('menu');
  const [shareUrl, setShareUrl] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [colorPref, setColorPref] = useState('random');

  useEffect(() => {
    if (autoJoinRoomCode) {
      doJoin(autoJoinRoomCode);
    }
  }, [autoJoinRoomCode]);

  async function doCreate() {
    setLoading(true);
    setError('');
    try {
      const body = { colorPreference: colorPref };
      if (timeControl && timeControl.initialTime) {
        body.timeControl = timeControl;
      }
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to create room');
      }
      const data = await res.json();
      const code = data.roomCode;
      const url = `${window.location.origin}${window.location.pathname}?roomCode=${code}`;
      setRoomCode(code);
      setShareUrl(url);
      setView('waiting');
      onGameStart('host', code);
    } catch (e) {
      setError(e.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  }

  async function doJoin(code) {
    if (!code?.trim()) return;
    const cleanCode = code.toUpperCase().trim();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: cleanCode })
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to join room');
      }
      const data = await res.json();
      setView('done');
      const guestColor = data?.guestColor || 'b';
      onGameStart('guest', cleanCode, { ...data, guestColor });
    } catch (e) {
      setError(e.message || 'Failed to join');
      setView('menu');
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (view === 'done' || view === 'waiting') return null;

  if (!token || !user) {
    return (
      <div
        className="p-4 rounded-xl flex items-start gap-3"
        style={{
          background: 'rgba(245, 158, 11, 0.06)',
          border: '1px solid rgba(245, 158, 11, 0.15)',
        }}
      >
        <LogIn size={16} style={{ color: 'var(--warning)', marginTop: 2 }} />
        <div>
          <span className="text-xs font-bold block mb-0.5" style={{ color: 'var(--warning)' }}>Login Required</span>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Sign in to play online matches.</p>
        </div>
      </div>
    );
  }

  if (loading && autoJoinRoomCode) {
    return (
      <div className="flex flex-col items-center py-8 gap-3">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Joining game...</p>
        {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>
    );
  }

  // Color selection + create
  if (view === 'create') {
    return (
      <div className="flex flex-col gap-5 animate-slideUp">
        <button onClick={() => { setView('menu'); setError(''); }} className="text-xs font-semibold w-fit flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
          &larr; Back
        </button>

        <div>
          <div className="text-[10px] uppercase tracking-[0.15em] font-bold mb-3" style={{ color: 'var(--text-muted)' }}>Play as</div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { val: 'w', label: 'White', icon: <span className="text-2xl">♔</span> },
              { val: 'random', label: 'Random', icon: <Shuffle size={22} style={{ color: 'var(--accent)' }} /> },
              { val: 'b', label: 'Black', icon: <span className="text-2xl">♚</span> },
            ].map(opt => (
              <button
                key={opt.val}
                onClick={() => setColorPref(opt.val)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200"
                style={{
                  background: colorPref === opt.val ? 'var(--accent-muted)' : 'var(--bg-elevated)',
                  border: `1px solid ${colorPref === opt.val ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'}`,
                  boxShadow: colorPref === opt.val ? '0 0 16px rgba(16, 185, 129, 0.1)' : 'none',
                }}
              >
                {opt.icon}
                <span className="text-[10px] font-bold" style={{ color: colorPref === opt.val ? 'var(--accent)' : 'var(--text-secondary)' }}>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {timeControl && (
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)' }}>
            <Crown size={14} style={{ color: 'var(--gold)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Time:</span>
            <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{timeControl.label}</span>
          </div>
        )}

        <button
          onClick={doCreate}
          disabled={loading}
          className="btn btn-primary btn-lg w-full"
        >
          <Link size={16} />
          {loading ? 'Creating...' : 'Create & Share Link'}
        </button>

        {error && <p className="text-xs text-center" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>
    );
  }

  // Join by code
  if (view === 'join') {
    return (
      <div className="flex flex-col gap-4 animate-slideUp">
        <button onClick={() => { setView('menu'); setError(''); }} className="text-xs font-semibold w-fit flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
          &larr; Back
        </button>
        <p className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>Enter room code:</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            placeholder="e.g. A1B2C3"
            maxLength={8}
            autoFocus
            className="input flex-1 text-center uppercase tracking-[0.2em]"
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '16px', fontWeight: 700 }}
            onKeyDown={e => { if (e.key === 'Enter' && joinCode.length >= 4) doJoin(joinCode); }}
          />
          <button
            onClick={() => doJoin(joinCode)}
            disabled={loading || joinCode.length < 4}
            className="btn btn-primary"
          >
            {loading ? '...' : 'Join'}
          </button>
        </div>
        {error && <p className="text-xs text-center" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>
    );
  }

  // Main menu
  return (
    <div className="flex flex-col gap-2.5 animate-slideUp">
      <button
        onClick={() => setView('create')}
        className="flex items-center gap-3.5 p-4 rounded-xl transition-all text-left group"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)' }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'rgba(212, 168, 67, 0.2)';
          e.currentTarget.style.boxShadow = '0 0 20px rgba(212, 168, 67, 0.06)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border-color)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(212, 168, 67, 0.1)', border: '1px solid rgba(212, 168, 67, 0.15)' }}>
          <Globe size={18} style={{ color: 'var(--gold)' }} />
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Create Game</div>
          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Get a link to share</div>
        </div>
        <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" style={{ color: 'var(--gold)' }} />
      </button>

      <button
        onClick={() => setView('join')}
        className="flex items-center gap-3.5 p-4 rounded-xl transition-all text-left group"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)' }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.2)';
          e.currentTarget.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.06)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border-color)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
          <Users size={18} style={{ color: 'var(--accent)' }} />
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Join Game</div>
          <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Enter a room code</div>
        </div>
        <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" style={{ color: 'var(--accent)' }} />
      </button>

      {error && <p className="text-xs text-center" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  );
}
