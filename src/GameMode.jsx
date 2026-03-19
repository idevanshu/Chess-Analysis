import { useState, useEffect } from 'react';
import { Users, Bot, Share2, MonitorSmartphone } from 'lucide-react';
import OnlineMultiplayer from './OnlineMultiplayer';

export default function GameMode({ onPlayAI, onMultiplayerStart, onLocalStart, autoJoinRoomCode }) {
  const [selectedMode, setSelectedMode] = useState(null);

  // When autoJoinRoomCode is set (from URL), automatically select online mode
  useEffect(() => {
    if (autoJoinRoomCode) {
      setSelectedMode('online');
    }
  }, [autoJoinRoomCode]);

  return (
    <div className="w-full h-full flex flex-col p-4 text-white">
      <h2 className="text-sm tracking-wider uppercase font-bold text-white/40 mb-4 border-b border-white/10 pb-2">Choose Mode</h2>

      {!selectedMode ? (
        <div className="flex flex-col gap-3">
          {/* Play AI */}
          <button
            onClick={() => onPlayAI()}
            className="flex items-center gap-4 p-3 border border-white/10 bg-white/5 rounded-xl hover:border-purple-500/50 hover:bg-purple-500/10 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform"><Bot size={20} /></div>
            <div>
              <h3 className="font-semibold text-sm text-white/90">Play Against AI</h3>
              <p className="text-[11px] text-white/50">Challenge legendary bots</p>
            </div>
          </button>

          {/* Local Multiplayer */}
          <button
            onClick={() => onLocalStart()}
            className="flex items-center gap-4 p-3 border border-white/10 bg-white/5 rounded-xl hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform"><MonitorSmartphone size={20} /></div>
            <div>
              <h3 className="font-semibold text-sm text-white/90">Local Multiplayer</h3>
              <p className="text-[11px] text-white/50">Play side-by-side</p>
            </div>
          </button>

          {/* Play with Friend Online */}
          <button
            onClick={() => setSelectedMode('online')}
            className="flex items-center gap-4 p-3 border border-white/10 bg-white/5 rounded-xl hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform"><Share2 size={20} /></div>
            <div>
              <h3 className="font-semibold text-sm text-white/90">Play with Friend Online</h3>
              <p className="text-[11px] text-white/50">Share a link to play together</p>
            </div>
          </button>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <button
            onClick={() => setSelectedMode(null)}
            className="text-xs text-white/50 hover:text-white mb-4 flex items-center gap-1 w-fit transition-colors"
          >
            ← Back to modes
          </button>

          {selectedMode === 'online' && (
            <div className="flex-1">
              <OnlineMultiplayer
                autoJoinRoomCode={autoJoinRoomCode}
                onGameStart={(role, roomCode, data) => {
                  onMultiplayerStart(role, roomCode, data);
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
