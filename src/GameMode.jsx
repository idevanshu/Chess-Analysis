import { useState, useEffect } from 'react';
import { Users, Bot, Share2, MonitorSmartphone, Clock, Zap, Timer, Hourglass, Infinity } from 'lucide-react';
import OnlineMultiplayer from './OnlineMultiplayer';

const TIME_CONTROLS = [
  { label: 'Unlimited', format: 'unlimited', initialTime: null, increment: 0, icon: Infinity, color: 'white' },
  { label: 'Bullet 1+0', format: 'bullet', initialTime: 60, increment: 0, icon: Zap, color: 'red' },
  { label: 'Bullet 2+1', format: 'bullet', initialTime: 120, increment: 1, icon: Zap, color: 'red' },
  { label: 'Blitz 3+0', format: 'blitz', initialTime: 180, increment: 0, icon: Timer, color: 'amber' },
  { label: 'Blitz 3+2', format: 'blitz', initialTime: 180, increment: 2, icon: Timer, color: 'amber' },
  { label: 'Blitz 5+0', format: 'blitz', initialTime: 300, increment: 0, icon: Timer, color: 'amber' },
  { label: 'Blitz 5+3', format: 'blitz', initialTime: 300, increment: 3, icon: Timer, color: 'amber' },
  { label: 'Rapid 10+0', format: 'rapid', initialTime: 600, increment: 0, icon: Clock, color: 'emerald' },
  { label: 'Rapid 15+10', format: 'rapid', initialTime: 900, increment: 10, icon: Clock, color: 'emerald' },
  { label: 'Classical 30+0', format: 'classical', initialTime: 1800, increment: 0, icon: Hourglass, color: 'cyan' },
  { label: 'Classical 30+20', format: 'classical', initialTime: 1800, increment: 20, icon: Hourglass, color: 'cyan' },
];

const FORMAT_COLORS = {
  unlimited: { bg: 'bg-white/10', border: 'border-white/20', text: 'text-white/70', hover: 'hover:bg-white/15' },
  bullet: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', hover: 'hover:bg-red-500/20' },
  blitz: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', hover: 'hover:bg-amber-500/20' },
  rapid: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', hover: 'hover:bg-emerald-500/20' },
  classical: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', hover: 'hover:bg-cyan-500/20' },
};

export default function GameMode({ onPlayAI, onMultiplayerStart, onLocalStart, autoJoinRoomCode }) {
  const [selectedMode, setSelectedMode] = useState(null);
  const [selectedTC, setSelectedTC] = useState(0); // index into TIME_CONTROLS

  // When autoJoinRoomCode is set (from URL), automatically select online mode
  useEffect(() => {
    if (autoJoinRoomCode) {
      setSelectedMode('online');
    }
  }, [autoJoinRoomCode]);

  const startWithTimeControl = (startFn) => {
    const tc = TIME_CONTROLS[selectedTC];
    if (tc.initialTime === null) {
      startFn(null); // unlimited
    } else {
      startFn({ initialTime: tc.initialTime, increment: tc.increment, label: tc.label, format: tc.format });
    }
  };

  return (
    <div className="w-full h-full flex flex-col p-4 text-white overflow-y-auto">
      <h2 className="text-sm tracking-wider uppercase font-bold text-white/40 mb-4 border-b border-white/10 pb-2">Choose Mode</h2>

      {!selectedMode ? (
        <div className="flex flex-col gap-3">
          {/* Time Control Selector */}
          <div className="mb-1">
            <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2 flex items-center gap-1.5">
              <Clock size={12} /> Time Control
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {TIME_CONTROLS.map((tc, i) => {
                const Icon = tc.icon;
                const colors = FORMAT_COLORS[tc.format];
                const active = selectedTC === i;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedTC(i)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${
                      active
                        ? `${colors.bg} ${colors.border} ${colors.text} ring-1 ring-offset-0 ring-${tc.color}-500/40`
                        : `bg-white/5 border-white/10 text-white/50 ${colors.hover}`
                    }`}
                  >
                    <Icon size={11} className={active ? colors.text : 'text-white/30'} />
                    <span className="truncate">{tc.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Play AI */}
          <button
            onClick={() => startWithTimeControl(onPlayAI)}
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
            onClick={() => startWithTimeControl(onLocalStart)}
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
                timeControl={TIME_CONTROLS[selectedTC].initialTime ? {
                  initialTime: TIME_CONTROLS[selectedTC].initialTime,
                  increment: TIME_CONTROLS[selectedTC].increment,
                  label: TIME_CONTROLS[selectedTC].label,
                  format: TIME_CONTROLS[selectedTC].format
                } : null}
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
