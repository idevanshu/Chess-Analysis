import { useAuth } from './context/AuthContext';
import { useState, useEffect } from 'react';
import { Copy, Check, Share2, LogIn, Users } from 'lucide-react';

export default function OnlineMultiplayer({ onGameStart, autoJoinRoomCode: initialRoomCode }) {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [createdRoom, setCreatedRoom] = useState('');
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [error, setError] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState(initialRoomCode ? 'auto-join' : null); // null | 'create' | 'join' | 'auto-join'

  const isLoggedIn = !!token && !!user;

  // Auto-join if room code is in URL
  useEffect(() => {
    if (initialRoomCode && !gameStarted) {
      joinRoom(initialRoomCode);
    }
  }, [initialRoomCode]);

  const createRoom = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const ct = res.headers.get('content-type');
      if (!ct || !ct.includes('application/json')) throw new Error('Server unreachable');

      const data = await res.json();
      if (res.ok) {
        setCreatedRoom(data.roomCode);
        const url = `${window.location.origin}${window.location.pathname}?roomCode=${data.roomCode}`;
        setShareUrl(url);
        setGameStarted(true);
        onGameStart('host', data.roomCode);
      } else {
        setError(data.error || 'Failed to create room');
      }
    } catch (e) {
      setError('Error creating room');
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (code) => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code.toUpperCase().trim() })
      });
      const ct = res.headers.get('content-type');
      if (!ct || !ct.includes('application/json')) throw new Error('Server unreachable');

      const data = await res.json();
      if (res.ok) {
        setGameStarted(true);
        const guestColor = data?.guestColor?.toLowerCase() || 'b';
        onGameStart('guest', code.toUpperCase().trim(), { ...data, guestColor });
      } else {
        setError(data.error || 'Failed to join room');
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(shareUrl || createdRoom);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (gameStarted) return null;

  if (!isLoggedIn) {
    return (
      <div className="p-5 bg-white/5 border border-amber-500/30 rounded-xl">
        <div className="flex items-center gap-3 mb-3">
          <LogIn size={20} className="text-amber-400" />
          <p className="text-sm text-amber-400 font-semibold">Login Required</p>
        </div>
        <p className="text-xs text-white/70">Log in to play online with friends.</p>
      </div>
    );
  }

  // After room creation — show the share UI
  if (createdRoom) {
    return (
      <div className="p-5 bg-white/5 border border-white/10 rounded-xl">
        <div className="text-center mb-4">
          <p className="text-sm text-white/80 font-medium mb-3">Share this with your opponent:</p>
          <div className="flex items-center gap-2 mb-3">
            <input type="text" value={shareUrl} readOnly className="flex-1 px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-[11px] text-white/80 text-center outline-none" />
            <button onClick={copyToClipboard} className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all">
              {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} className="text-white/70" />}
            </button>
          </div>
          <div className="text-xs text-white/40">
            Room code: <strong className="text-cyan-400 font-mono text-sm ml-1">{createdRoom}</strong>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 text-[10px] text-white/30">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Waiting for opponent to join...
        </div>
      </div>
    );
  }

  // Mode selection: Create or Join
  if (!mode) {
    return (
      <div className="flex flex-col gap-3">
        <button
          onClick={() => { setMode('create'); createRoom(); }}
          disabled={loading}
          className="flex items-center gap-3 p-3 border border-white/10 bg-white/5 rounded-xl hover:border-cyan-500/40 hover:bg-cyan-500/10 transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform"><Share2 size={18} /></div>
          <div>
            <h3 className="font-semibold text-sm text-white/90">Create Game</h3>
            <p className="text-[11px] text-white/50">Get a room code to share</p>
          </div>
        </button>

        <button
          onClick={() => setMode('join')}
          className="flex items-center gap-3 p-3 border border-white/10 bg-white/5 rounded-xl hover:border-purple-500/40 hover:bg-purple-500/10 transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform"><Users size={18} /></div>
          <div>
            <h3 className="font-semibold text-sm text-white/90">Join Game</h3>
            <p className="text-[11px] text-white/50">Enter a room code</p>
          </div>
        </button>

        {error && <p className="text-red-400 text-xs text-center">{error}</p>}
      </div>
    );
  }

  // Join by code
  if (mode === 'join') {
    return (
      <div className="flex flex-col gap-3">
        <button onClick={() => { setMode(null); setError(''); }} className="text-xs text-white/40 hover:text-white w-fit transition-colors">
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
            className="flex-1 px-3 py-2.5 bg-black/20 border border-white/10 rounded-lg text-sm text-white font-mono text-center uppercase outline-none focus:border-purple-500/50 transition-colors tracking-widest"
            onKeyDown={e => { if (e.key === 'Enter') joinRoom(joinCode); }}
          />
          <button
            onClick={() => joinRoom(joinCode)}
            disabled={loading || joinCode.length < 4}
            className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-sm text-purple-300 font-semibold transition-all disabled:opacity-40"
          >
            {loading ? '...' : 'Join'}
          </button>
        </div>
        {error && <p className="text-red-400 text-xs text-center">{error}</p>}
      </div>
    );
  }

  // Auto-join loading
  return (
    <div className="text-center p-5">
      <p className="text-white/70 mb-4">Joining game...</p>
      <div className="animate-spin inline-block w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full" />
      {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
    </div>
  );
}
