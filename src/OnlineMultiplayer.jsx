import { useAuth } from './context/AuthContext';
import { useState, useEffect } from 'react';
import { Copy, Check, Plus, LogIn, Share2 } from 'lucide-react';

export default function OnlineMultiplayer({ onGameStart, autoJoinRoomCode: initialRoomCode }) {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [roomCode, setRoomCode] = useState(initialRoomCode || '');
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(!!initialRoomCode);

  // Check if user is logged in
  const isLoggedIn = !!token && !!user;

  // If auto-joining with a room code, join automatically
  useEffect(() => {
    if (isJoining && initialRoomCode && !gameStarted) {
      joinRoomAutomatically(initialRoomCode);
    }
  }, [initialRoomCode, isJoining, gameStarted]);

  const createRoom = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server unreachable or returned invalid response.');
      }

      const data = await response.json();
      if (response.ok) {
        setRoomCode(data.roomCode);
        const baseUrl = window.location.origin + window.location.pathname;
        const url = `${baseUrl}?roomCode=${data.roomCode}`;
        setShareUrl(url);
        // Auto-start the game for the host immediately
        setGameStarted(true);
        onGameStart('host', data.roomCode);
      } else {
        setError('Failed to create room: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating room:', error);
      setError('Error creating room');
    } finally {
      setLoading(false);
    }
  };

  const joinRoomAutomatically = async (code) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ roomCode: code.toUpperCase() })
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server unreachable or returned invalid response.');
      }

      const data = await response.json();
      if (response.ok) {
        setGameStarted(true);
        // Ensure guest gets black and host gets white
        const guestColor = data?.guestColor?.toLowerCase() || 'b';
        onGameStart('guest', code, { ...data, guestColor });
      } else {
        setError(data.error || 'Failed to join room');
      }
    } catch (error) {
      console.error('Error joining room:', error);
      setError('Network error while joining room');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(shareUrl || roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (gameStarted) {
    return null; // Game will be started in parent component
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {!isLoggedIn ? (
        <div className="w-full max-w-sm p-5 bg-white/5 border border-amber-500/30 rounded-xl backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-3">
            <LogIn size={20} className="text-amber-400" />
            <p className="text-sm text-amber-400 font-semibold">Login Required</p>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">
            You need to log in first before you can play online. Please log in to your account.
          </p>
        </div>
      ) : isJoining && !roomCode ? (
        <div className="w-full max-w-sm p-5 text-center">
          <p className="text-white/70 mb-4">Connecting to game room...</p>
          <div className="animate-spin inline-block w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
        </div>
      ) : !roomCode ? (
        <div className="w-full max-w-sm flex flex-col gap-4">
          <button
            onClick={createRoom}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:opacity-90 disabled:opacity-50 font-semibold transition-all shadow-lg"
          >
            <Share2 size={20} />
            {loading ? 'Creating...' : 'Play with Friend Online'}
          </button>
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 w-full max-w-sm backdrop-blur-sm">
          <div className="text-center mb-6">
            <p className="text-sm text-white/80 mb-4 font-medium">Game room created! Share this link with your opponent:</p>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2.5 bg-black/20 border border-white/10 rounded-lg text-sm text-white/80 focus:outline-none focus:border-cyan-400 transition-colors text-center"
              />
              <button
                onClick={copyToClipboard}
                className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all"
                title="Copy to clipboard"
              >
                {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} className="text-white/70" />}
              </button>
            </div>
            <div className="text-xs text-white/50 mb-6 tracking-wide">
              Room code: <strong className="text-cyan-400 font-mono text-sm ml-1">{roomCode}</strong>
            </div>
          </div>
          
          {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}
          
          <p className="text-xs text-white/50 text-center">
            The game will start automatically when your opponent joins via the link or room code.
          </p>
        </div>
      )}
    </div>
  );
}
