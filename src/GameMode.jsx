import { useState } from 'react';
import { Users, Robot, Zap } from 'lucide-react';
import RoomCreation from './RoomCreation';
import RoomJoin from './RoomJoin';

export default function GameMode({ onPlayAI, onMultiplayerStart }) {
  console.log('GameMode component rendering...');
  const [selectedMode, setSelectedMode] = useState(null);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full mx-4">
        <h2 className="text-2xl font-bold mb-6 text-center">Choose Game Mode</h2>

        {!selectedMode ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Play AI */}
            <button
              onClick={() => onPlayAI()}
              className="flex flex-col items-center gap-3 p-6 border-2 border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition"
            >
              <Robot size={32} className="text-purple-600" />
              <h3 className="font-semibold">Play Against AI</h3>
              <p className="text-xs text-gray-600 text-center">Challenge one of our AI opponents</p>
            </button>

            {/* Create Room */}
            <button
              onClick={() => setSelectedMode('create')}
              className="flex flex-col items-center gap-3 p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
            >
              <Zap size={32} className="text-blue-600" />
              <h3 className="font-semibold">Create Room</h3>
              <p className="text-xs text-gray-600 text-center">Host a game and invite a friend</p>
            </button>

            {/* Join Room */}
            <button
              onClick={() => setSelectedMode('join')}
              className="flex flex-col items-center gap-3 p-6 border-2 border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition"
            >
              <Users size={32} className="text-green-600" />
              <h3 className="font-semibold">Join Room</h3>
              <p className="text-xs text-gray-600 text-center">Join a friend's game</p>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => setSelectedMode(null)}
              className="text-sm text-gray-600 hover:text-gray-800 mb-4"
            >
              ← Back
            </button>

            {selectedMode === 'create' && (
              <div>
                <h3 className="font-semibold mb-4">Create a Multiplayer Room</h3>
                <RoomCreation
                  onRoomCreated={(roomCode) => {
                    onMultiplayerStart('host', roomCode);
                  }}
                />
              </div>
            )}

            {selectedMode === 'join' && (
              <div>
                <h3 className="font-semibold mb-4">Join a Room</h3>
                <RoomJoin
                  onRoomJoined={(roomCode, data) => {
                    onMultiplayerStart('guest', roomCode, data);
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
