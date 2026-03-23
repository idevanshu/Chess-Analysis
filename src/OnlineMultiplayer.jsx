import { useAuth } from './context/AuthContext';
import { useState, useEffect } from 'react';
import { Copy, Check, Share2, Users, LogIn, Shuffle, Crown } from 'lucide-react';

export default function OnlineMultiplayer({ onGameStart, autoJoinRoomCode, timeControl }) {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [view, setView] = useState('menu'); // 'menu' | 'create' | 'join' | 'waiting' | 'done'
  const [shareUrl, setShareUrl] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [colorPref, setColorPref] = useState('random'); // 'w' | 'b' | 'random'

  // Auto-join from URL
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
      // Tell App.jsx we're the host
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
      <div className="p-4 border border-amber-500/20 rounded-xl bg-amber-500/5">
        <div className="flex items-center gap-2 mb-1">
          <LogIn size={16} className="text-amber-400" />
          <span className="text-sm font-semibold text-amber-300">Login Required</span>
        </div>
        <p className="text-xs text-white/50">Sign in to play online.</p>
      </div>
    );
  }

  // Loading state (auto-join)
  if (loading && autoJoinRoomCode) {
    return (
      <div className="flex flex-col items-center py-6 gap-3">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-white/70">Joining game...</p>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>
    );
  }

  // Create game setup — color selection
  if (view === 'create') {
    return (
      <div className="flex flex-col gap-4">
        <button onClick={() => { setView('menu'); setError(''); }} className="text-xs text-white/40 hover:text-white w-fit">
          ← Back
        </button>

        {/* Color preference */}
        <div>
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2">Play as</div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setColorPref('w')}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                colorPref === 'w'
                  ? 'bg-white/10 border-white/30 ring-1 ring-white/20'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              <span className="text-2xl">♔</span>
              <span className="text-[10px] font-bold text-white/70">White</span>
            </button>
            <button
              onClick={() => setColorPref('random')}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                colorPref === 'random'
                  ? 'bg-cyan-500/10 border-cyan-500/30 ring-1 ring-cyan-500/20'
                  : 'bg-white/5 border-white/10 hover:border-cyan-500/20'
              }`}
            >
              <Shuffle size={24} className="text-cyan-400" />
              <span className="text-[10px] font-bold text-cyan-400/70">Random</span>
            </button>
            <button
              onClick={() => setColorPref('b')}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                colorPref === 'b'
                  ? 'bg-slate-500/10 border-slate-400/30 ring-1 ring-slate-400/20'
                  : 'bg-white/5 border-white/10 hover:border-slate-400/20'
              }`}
            >
              <span className="text-2xl">♚</span>
              <span className="text-[10px] font-bold text-white/70">Black</span>
            </button>
          </div>
        </div>

        {/* Time control display */}
        {timeControl && (
          <div className="flex items-center gap-2 p-2.5 bg-white/5 border border-white/10 rounded-lg">
            <Crown size={14} className="text-amber-400" />
            <span className="text-xs text-white/60">Time:</span>
            <span className="text-xs font-bold text-white/90">{timeControl.label}</span>
          </div>
        )}

        {/* Create button */}
        <button
          onClick={doCreate}
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Share2 size={16} />
          {loading ? 'Creating...' : 'Create Game & Get Link'}
        </button>

        {error && <p className="text-red-400 text-xs text-center">{error}</p>}
      </div>
    );
  }

  // Join code entry
  if (view === 'join') {
    return (
      <div className="flex flex-col gap-3">
        <button onClick={() => { setView('menu'); setError(''); }} className="text-xs text-white/40 hover:text-white w-fit">
          ← Back
        </button>
        <p className="text-sm text-white/70 font-medium">Enter room code:</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            placeholder="e.g. A1B2C3"
            maxLength={8}
            autoFocus
            className="flex-1 px-3 py-2.5 bg-black/20 border border-white/10 rounded-lg text-sm text-white font-mono text-center uppercase outline-none focus:border-purple-500/50 tracking-widest"
            onKeyDown={e => { if (e.key === 'Enter' && joinCode.length >= 4) doJoin(joinCode); }}
          />
          <button
            onClick={() => doJoin(joinCode)}
            disabled={loading || joinCode.length < 4}
            className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-sm text-purple-300 font-semibold disabled:opacity-40"
          >
            {loading ? '...' : 'Join'}
          </button>
        </div>
        {error && <p className="text-red-400 text-xs text-center">{error}</p>}
      </div>
    );
  }

  // Main menu: Create or Join
  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => setView('create')}
        className="flex items-center gap-3 p-3 border border-white/10 bg-white/5 rounded-xl hover:border-cyan-500/40 hover:bg-cyan-500/10 transition-all text-left group"
      >
        <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
          <Share2 size={18} />
        </div>
        <div>
          <h3 className="font-semibold text-sm text-white/90">Create Game</h3>
          <p className="text-[11px] text-white/50">Choose color & get a link to share</p>
        </div>
      </button>

      <button
        onClick={() => setView('join')}
        className="flex items-center gap-3 p-3 border border-white/10 bg-white/5 rounded-xl hover:border-purple-500/40 hover:bg-purple-500/10 transition-all text-left group"
      >
        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
          <Users size={18} />
        </div>
        <div>
          <h3 className="font-semibold text-sm text-white/90">Join Game</h3>
          <p className="text-[11px] text-white/50">Enter a room code from a friend</p>
        </div>
      </button>

      {error && <p className="text-red-400 text-xs text-center">{error}</p>}
    </div>
  );
}
