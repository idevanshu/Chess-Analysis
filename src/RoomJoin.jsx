import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { LogIn } from 'lucide-react';

export default function RoomJoin({ onRoomJoined }) {
  const { token, user } = useAuth();
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check if user is logged in
  const isLoggedIn = !!token && !!user;

  const joinRoom = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ roomCode: roomCode.toUpperCase() })
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server unreachable or returned invalid response.');
      }

      const data = await response.json();
      if (response.ok) {
        onRoomJoined(data.roomCode, data);
        setRoomCode('');
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

  return (
    <form onSubmit={joinRoom} className="flex flex-col gap-3">
      {!isLoggedIn ? (
        <div className="w-full p-4 bg-white/5 border border-amber-500/30 rounded-xl backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-2">
            <LogIn size={18} className="text-amber-400" />
            <p className="text-sm text-amber-400 font-semibold">Login Required</p>
          </div>
          <p className="text-xs text-white/70 leading-relaxed">
            You need to log in first before you can join a room. Please log in to your account to play online with others.
          </p>
        </div>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Room Code</label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-character room code"
              maxLength="6"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || roomCode.length !== 6}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 font-medium"
          >
            <LogIn size={18} />
            {loading ? 'Joining...' : 'Join Room'}
          </button>
        </>
      )}
    </form>
  );
}
