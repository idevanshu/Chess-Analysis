import { useAuth } from './context/AuthContext';
import { useState } from 'react';
import { Copy, Check, Plus, LogIn } from 'lucide-react';

export default function RoomCreation({ onRoomCreated }) {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  // Check if user is logged in
  const isLoggedIn = !!token && !!user;

  const createRoom = async () => {
    setLoading(true);
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
        setShareUrl(data.shareUrl);
      } else {
        alert('Failed to create room: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Error creating room');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(shareUrl || roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {!isLoggedIn ? (
        <div className="w-full max-w-sm p-5 bg-white/5 border border-amber-500/30 rounded-xl backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-3">
            <LogIn size={20} className="text-amber-400" />
            <p className="text-sm text-amber-400 font-semibold">Login Required</p>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">
            You need to log in first before you can create a room. Please log in to your account to play online with others.
          </p>
        </div>
      ) : !roomCode ? (
        <button
          onClick={createRoom}
          disabled={loading || !isLoggedIn}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:opacity-90 disabled:opacity-50 font-semibold transition-all shadow-lg"
        >
          <Plus size={18} />
          {loading ? 'Creating...' : 'Create Room'}
        </button>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 w-full max-w-sm backdrop-blur-sm">
          <p className="text-sm text-white/80 mb-3 font-medium">Share this link with your opponent:</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 px-3 py-2.5 bg-black/20 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-400 transition-colors"
            />
            <button
              onClick={copyToClipboard}
              className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all"
              title="Copy to clipboard"
            >
              {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} className="text-white/70" />}
            </button>
          </div>
          <div className="text-xs text-white/50 mt-4 tracking-wide text-center">
            Or share room code: <strong className="text-cyan-400 font-mono text-[13px] ml-1">{roomCode}</strong>
          </div>
          
          <button 
            onClick={() => onRoomCreated(roomCode)}
            className="mt-6 w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-90 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
          >
            Enter Game Room
          </button>
        </div>
      )}
    </div>
  );
}
