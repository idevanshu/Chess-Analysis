import { useAuth } from './context/AuthContext';
import { useState } from 'react';
import { Copy, Check, Plus } from 'lucide-react';

export default function RoomCreation({ onRoomCreated }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

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

      const data = await response.json();
      if (response.ok) {
        setRoomCode(data.roomCode);
        setShareUrl(data.shareUrl);
        onRoomCreated(data.roomCode);
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
      {!roomCode ? (
        <button
          onClick={createRoom}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 font-medium"
        >
          <Plus size={18} />
          {loading ? 'Creating...' : 'Create Room'}
        </button>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded p-4 w-full max-w-sm">
          <p className="text-sm text-gray-600 mb-2">Share this link with your friend:</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-sm"
            />
            <button
              onClick={copyToClipboard}
              className="p-2 hover:bg-gray-100 rounded transition"
              title="Copy to clipboard"
            >
              {copied ? <Check size={20} className="text-green-600" /> : <Copy size={20} />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">Or share room code: <strong>{roomCode}</strong></p>
        </div>
      )}
    </div>
  );
}
