import { useState, useEffect } from 'react';
import { Users, Bot, Share2, MonitorSmartphone, Clock, Zap, Timer, Hourglass, Infinity, ChevronLeft, ArrowRight, Gamepad2 } from 'lucide-react';
import OnlineMultiplayer from './OnlineMultiplayer';

const TIME_CONTROLS = [
  { label: 'Unlimited', format: 'unlimited', initialTime: null, increment: 0, icon: Infinity, color: 'var(--text-muted)' },
  { label: '1+0', format: 'bullet', initialTime: 60, increment: 0, icon: Zap, color: '#f43f5e' },
  { label: '2+1', format: 'bullet', initialTime: 120, increment: 1, icon: Zap, color: '#f43f5e' },
  { label: '3+0', format: 'blitz', initialTime: 180, increment: 0, icon: Timer, color: '#f59e0b' },
  { label: '3+2', format: 'blitz', initialTime: 180, increment: 2, icon: Timer, color: '#f59e0b' },
  { label: '5+0', format: 'blitz', initialTime: 300, increment: 0, icon: Timer, color: '#f59e0b' },
  { label: '5+3', format: 'blitz', initialTime: 300, increment: 3, icon: Timer, color: '#f59e0b' },
  { label: '10+0', format: 'rapid', initialTime: 600, increment: 0, icon: Clock, color: '#10b981' },
  { label: '15+10', format: 'rapid', initialTime: 900, increment: 10, icon: Clock, color: '#10b981' },
  { label: '30+0', format: 'classical', initialTime: 1800, increment: 0, icon: Hourglass, color: '#8b5cf6' },
  { label: '30+20', format: 'classical', initialTime: 1800, increment: 20, icon: Hourglass, color: '#8b5cf6' },
];

const FORMAT_COLORS = {
  unlimited: 'var(--text-muted)',
  bullet: '#f43f5e',
  blitz: '#f59e0b',
  rapid: '#10b981',
  classical: '#8b5cf6',
};

const GAME_MODES = [
  {
    id: 'ai',
    title: 'Play Computer',
    desc: 'Challenge legendary AI opponents',
    icon: Bot,
    gradient: 'from-emerald-500/10 to-emerald-500/0',
    accent: '#10b981',
    borderGlow: 'rgba(16, 185, 129, 0.2)',
  },
  {
    id: 'local',
    title: 'Local Game',
    desc: 'Pass & play on one device',
    icon: MonitorSmartphone,
    gradient: 'from-violet-500/10 to-violet-500/0',
    accent: '#8b5cf6',
    borderGlow: 'rgba(139, 92, 246, 0.2)',
  },
  {
    id: 'online',
    title: 'Play a Friend',
    desc: 'Invite via shareable link',
    icon: Share2,
    gradient: 'from-amber-500/10 to-amber-500/0',
    accent: '#d4a843',
    borderGlow: 'rgba(212, 168, 67, 0.2)',
  },
];

export default function GameMode({ onPlayAI, onMultiplayerStart, onLocalStart, autoJoinRoomCode }) {
  const [selectedMode, setSelectedMode] = useState(null);
  const [selectedTC, setSelectedTC] = useState(5); // default to 5+0

  useEffect(() => {
    if (autoJoinRoomCode) {
      setSelectedMode('online');
    }
  }, [autoJoinRoomCode]);

  const startWithTimeControl = (startFn) => {
    const tc = TIME_CONTROLS[selectedTC];
    if (tc.initialTime === null) {
      startFn(null);
    } else {
      startFn({ initialTime: tc.initialTime, increment: tc.increment, label: tc.label, format: tc.format });
    }
  };

  const currentFormat = TIME_CONTROLS[selectedTC].format;

  return (
    <div className="w-full h-full flex flex-col p-4 overflow-y-auto">
      {!selectedMode ? (
        <div className="flex flex-col gap-6 animate-slideUp">
          {/* Section: Time Control */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] uppercase tracking-[0.15em] font-bold flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                <Clock size={11} /> Time Control
              </div>
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                style={{
                  background: `${FORMAT_COLORS[currentFormat]}10`,
                  border: `1px solid ${FORMAT_COLORS[currentFormat]}25`,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: FORMAT_COLORS[currentFormat] }} />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: FORMAT_COLORS[currentFormat] }}>
                  {currentFormat}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {TIME_CONTROLS.map((tc, i) => {
                const Icon = tc.icon;
                const active = selectedTC === i;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedTC(i)}
                    className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all duration-200"
                    style={{
                      background: active ? `${tc.color}12` : 'var(--bg-elevated)',
                      border: `1px solid ${active ? `${tc.color}35` : 'var(--border-color)'}`,
                      color: active ? tc.color : 'var(--text-secondary)',
                      boxShadow: active ? `0 0 16px ${tc.color}12` : 'none',
                    }}
                  >
                    <Icon size={11} style={{ color: active ? tc.color : 'var(--text-dim)' }} />
                    <span className="truncate">{tc.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="divider" />

          {/* Section: Game Mode Cards */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.15em] font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <Gamepad2 size={11} /> Choose Mode
            </div>
            <div className="flex flex-col gap-2.5">
              {GAME_MODES.map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    onClick={() => {
                      if (mode.id === 'ai') startWithTimeControl(onPlayAI);
                      else if (mode.id === 'local') startWithTimeControl(onLocalStart);
                      else setSelectedMode('online');
                    }}
                    className={`relative flex items-center gap-4 p-4 rounded-xl transition-all duration-300 text-left group overflow-hidden bg-gradient-to-r ${mode.gradient}`}
                    style={{
                      border: '1px solid var(--border-color)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = mode.borderGlow;
                      e.currentTarget.style.boxShadow = `0 0 20px ${mode.accent}10`;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Icon */}
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                      style={{
                        background: `${mode.accent}15`,
                        border: `1px solid ${mode.accent}25`,
                      }}
                    >
                      <Icon size={22} style={{ color: mode.accent }} />
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{mode.title}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{mode.desc}</div>
                    </div>

                    {/* Arrow */}
                    <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" style={{ color: mode.accent }} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full animate-slideUp">
          <button
            onClick={() => setSelectedMode(null)}
            className="text-xs font-semibold mb-4 flex items-center gap-1.5 w-fit transition-all duration-200 px-2.5 py-1.5 rounded-lg -ml-1"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.background = 'var(--bg-elevated)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <ChevronLeft size={14} /> Back
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
