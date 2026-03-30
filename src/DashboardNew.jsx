import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Chess } from 'chess.js';
import { useAuth } from './context/AuthContext';
import { PLAYERS, PLAYER_ORDER } from './players';
import GameAnalysis, { EvalBar } from './GameAnalysis';
import { PIECE_SVG } from './utils';
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Trophy, Zap, Target, TrendingUp, Clock, Award,
  RefreshCw, Flame, Activity, Swords, Crown, ChevronRight, X, BarChart3
} from 'lucide-react';

// ── Tooltip styling ──
const TT_STYLE = {
  backgroundColor: 'rgba(10, 10, 15, 0.95)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  padding: '10px 14px',
  boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
  backdropFilter: 'blur(12px)',
};

// ── Mini ring chart ──
function MiniRing({ value, size = 52, color = '#10b981', bg = 'rgba(255,255,255,0.04)' }) {
  const data = [{ value }, { value: 100 - value }];
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius="72%" outerRadius="100%" startAngle={90} endAngle={-270} paddingAngle={0} stroke="none">
            <Cell fill={color} />
            <Cell fill={bg} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black" style={{ color }}>{value}%</span>
    </div>
  );
}

// ── Stat card ──
function StatCard({ label, value, sub, icon: Icon, gradient, iconColor }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/[0.06] p-5 ${gradient} group hover:border-white/[0.1] transition-all duration-300`}>
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.06] group-hover:opacity-[0.1] transition-opacity" style={{ background: iconColor }} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-white/35 mb-1">{label}</p>
          <p className="text-3xl font-black text-white tracking-tight">{value}</p>
          {sub && <p className="text-[11px] text-white/30 mt-1.5 font-semibold">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.04] border border-white/[0.04]">
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
      </div>
    </div>
  );
}

// ── Opponent card ──
function OpponentCard({ name, data, player }) {
  const winRate = data.games > 0 ? Math.round((data.wins / data.games) * 100) : 0;
  const totalPlayed = data.games;
  const accent = player?.color || '#10b981';

  return (
    <div className="group rounded-2xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.1] transition-all duration-300 overflow-hidden">
      <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-[16px] shrink-0 border-2" style={{
            color: accent, background: `linear-gradient(135deg, ${accent}20, ${accent}08)`, borderColor: `${accent}35`,
          }}>
            {player?.avatar || name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[13px] text-white truncate">{player?.country || ''} {name}</div>
            <div className="text-[11px] text-white/30 font-semibold">{player?.title || 'Opponent'} {player ? `· ${player.elo} ELO` : ''}</div>
          </div>
          <MiniRing value={winRate} size={48} color={accent} />
        </div>
        <div className="flex gap-1 h-2 rounded-full overflow-hidden mb-3">
          {data.wins > 0 && <div className="bg-emerald-500 rounded-l-full" style={{ flex: data.wins }} />}
          {data.draws > 0 && <div className="bg-white/15" style={{ flex: data.draws }} />}
          {data.losses > 0 && <div className="bg-rose-500 rounded-r-full" style={{ flex: data.losses }} />}
          {totalPlayed === 0 && <div className="bg-white/5 flex-1" />}
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { v: totalPlayed, l: 'Played', c: 'text-white' },
            { v: data.wins, l: 'Won', c: 'text-emerald-400' },
            { v: data.losses, l: 'Lost', c: 'text-rose-400' },
            { v: data.draws, l: 'Draw', c: 'text-violet-400' },
          ].map((s, i) => (
            <div key={i}>
              <div className={`text-[17px] font-black ${s.c}`}>{s.v}</div>
              <div className="text-[9px] uppercase tracking-[0.1em] text-white/25 font-bold">{s.l}</div>
            </div>
          ))}
        </div>
        {data.avgAccuracy > 0 && (
          <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.1em] text-white/25 font-bold">Avg Accuracy</span>
            <span className="text-[13px] font-black" style={{ color: accent }}>{data.avgAccuracy}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Mini board ──
function MiniBoard({ fen, flipped = false }) {
  const board = useMemo(() => {
    try { const g = new Chess(fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'); return g.board(); }
    catch { return new Chess().board(); }
  }, [fen]);
  const pieceMap = { k: 'K', q: 'Q', r: 'R', b: 'B', n: 'N', p: 'P' };
  const rows = flipped ? [...board].reverse() : board;
  return (
    <div className="grid grid-cols-8 aspect-square rounded-xl overflow-hidden border border-white/[0.06] shadow-xl">
      {rows.map((row, ri) => {
        const cols = flipped ? [...row].reverse() : row;
        return cols.map((sq, ci) => {
          const isLight = (flipped ? 7 - ri : ri) % 2 === (flipped ? 7 - ci : ci) % 2;
          const piece = sq ? `${sq.color}${pieceMap[sq.type]}` : null;
          return (
            <div key={`${ri}-${ci}`} className="aspect-square relative" style={{ backgroundColor: isLight ? '#e8dcc8' : '#a67b5b' }}>
              {piece && PIECE_SVG[piece] && (<div className="absolute inset-[4%] pointer-events-none" dangerouslySetInnerHTML={{ __html: PIECE_SVG[piece] }} />)}
            </div>
          );
        });
      })}
    </div>
  );
}

// ── History Analysis Modal ──
function HistoryAnalysisModal({ game, onClose }) {
  const [viewingMoveIndex, setViewingMoveIndex] = useState(null);
  const [analysisEval, setAnalysisEval] = useState(null);

  const moveHistory = useMemo(() => {
    if (!game?.moves?.length) return [];
    return game.moves.map((m, i) => ({
      san: m.san,
      before: i === 0 ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' : game.moves[i - 1].fen,
      after: m.fen, color: m.color,
    }));
  }, [game]);

  const goToMove = useCallback((index) => {
    if (index >= moveHistory.length - 1) setViewingMoveIndex(null);
    else if (index < -1) setViewingMoveIndex(-1);
    else setViewingMoveIndex(index);
  }, [moveHistory.length]);

  const goBack = useCallback(() => {
    if (moveHistory.length === 0) return;
    setViewingMoveIndex(prev => {
      if (prev === null) return moveHistory.length - 2;
      return prev > -1 ? prev - 1 : prev;
    });
  }, [moveHistory.length]);

  const goForward = useCallback(() => {
    setViewingMoveIndex(prev => {
      if (prev === null) return null;
      return prev >= moveHistory.length - 2 ? null : prev + 1;
    });
  }, [moveHistory.length]);

  const goToStart = useCallback(() => { if (moveHistory.length > 0) setViewingMoveIndex(-1); }, [moveHistory.length]);
  const goToEnd = useCallback(() => setViewingMoveIndex(null), []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goBack(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goForward(); }
      else if (e.key === 'Home') { e.preventDefault(); goToStart(); }
      else if (e.key === 'End') { e.preventDefault(); goToEnd(); }
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goBack, goForward, goToStart, goToEnd, onClose]);

  const currentFen = useMemo(() => {
    if (viewingMoveIndex === null) return moveHistory.length > 0 ? moveHistory[moveHistory.length - 1].after : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    if (viewingMoveIndex === -1) return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    return moveHistory[viewingMoveIndex]?.after || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  }, [viewingMoveIndex, moveHistory]);

  const oppName = typeof game.opponent === 'string' ? game.opponent : game.opponent?.name || 'Unknown';
  const flipped = game.playerColor === 'b';

  if (!moveHistory.length) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="rounded-2xl border border-white/[0.08] p-8 text-center max-w-sm" style={{ background: 'var(--bg-surface)' }}>
          <p className="text-white/50 text-sm">No move data available for analysis.</p>
          <button onClick={onClose} className="mt-4 btn">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm overflow-y-auto p-4">
      <div className="w-full max-w-5xl rounded-2xl border border-white/[0.06] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]" style={{ background: 'var(--bg-primary)' }}>
        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <div>
              <h2 className="text-sm font-black text-white">Game Review</h2>
              <p className="text-[11px] text-white/30">vs {oppName} — {new Date(game.gameDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${
              game.result === 'win' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
              game.result === 'loss' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20' :
              'bg-violet-500/15 text-violet-400 border border-violet-500/20'
            }`}>
              {game.result === 'win' ? 'Victory' : game.result === 'loss' ? 'Defeat' : 'Draw'}
            </span>
            <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <div className="flex-1 flex items-center justify-center p-4 lg:p-6 min-w-0">
            <div className="w-full max-w-[480px] flex gap-2">
              {analysisEval && <EvalBar whitePercent={analysisEval.whitePercent} evalText={analysisEval.evalText} flipped={flipped} />}
              <div className="flex-1"><MiniBoard fen={currentFen} flipped={flipped} /></div>
            </div>
          </div>
          <div className="w-full lg:w-[340px] xl:w-[370px] shrink-0 border-t lg:border-t-0 lg:border-l border-white/[0.06] flex flex-col overflow-hidden">
            <GameAnalysis moveHistory={moveHistory} playerColor={game.playerColor} gameResult={game.result} gameMode={game.gameMode} currentPlayer={null} opponentName={oppName} onClose={onClose} onNewGame={onClose} onBackToMenu={onClose} goToMove={goToMove} goBack={goBack} goForward={goForward} goToStart={goToStart} goToEnd={goToEnd} viewingMoveIndex={viewingMoveIndex} onEvalUpdate={setAnalysisEval} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardNew() {
  const { user, token } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedGame, setSelectedGame] = useState(null);

  useEffect(() => {
    if (token) {
      fetchDashboardData();
      const interval = setInterval(() => fetchDashboardData(false), 5000);
      const onVisible = () => { if (!document.hidden) fetchDashboardData(false); };
      document.addEventListener('visibilitychange', onVisible);
      return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); };
    }
  }, [token]);

  const fetchDashboardData = async (showSpinner = true) => {
    try {
      if (showSpinner) setRefreshing(true);
      const [aRes, gRes] = await Promise.all([
        fetch('/api/analytics/comprehensive', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/games/history', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (aRes.ok) setAnalytics(await aRes.json());
      if (gRes.ok) setGames((await gRes.json()) || []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  const stats = analytics?.stats || {};
  const moves = analytics?.moves || {};
  const opponents = analytics?.opponents || {};
  const colors = analytics?.colors || {};
  const trends = analytics?.trends || {};
  const openings = analytics?.openings || {};

  const playerLookup = useMemo(() => {
    const map = {};
    PLAYER_ORDER.forEach(id => { map[PLAYERS[id].name] = PLAYERS[id]; });
    return map;
  }, []);

  const moveTypeData = [
    { name: 'Best', value: moves.bestMoves || 0, fill: '#10b981' },
    { name: 'Tactical', value: moves.tactical || 0, fill: '#f59e0b' },
    { name: 'Strategic', value: moves.strategic || 0, fill: '#8b5cf6' },
    { name: 'Blunder', value: moves.blunders || 0, fill: '#f43f5e' },
  ];

  const resultData = [
    { name: 'Wins', value: stats.wins || 0, fill: '#10b981' },
    { name: 'Losses', value: stats.losses || 0, fill: '#f43f5e' },
    { name: 'Draws', value: stats.draws || 0, fill: '#8b5cf6' },
  ];

  const accuracyData = (trends.accuracyTrend || []).map((acc, i) => ({ game: `#${i + 1}`, accuracy: acc }));

  const sortedOpponents = Object.entries(opponents).sort((a, b) => b[1].games - a[1].games).map(([name, data]) => ({ name, data }));
  const sortedOpenings = Object.entries(openings).sort((a, b) => b[1].games - a[1].games).slice(0, 6);

  const TABS = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'opponents', label: 'Opponents', icon: Swords },
    { id: 'moves', label: 'Moves', icon: Zap },
    { id: 'trends', label: 'Trends', icon: TrendingUp },
    { id: 'history', label: 'History', icon: Clock },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-3 animate-slideUp">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl animate-glow" style={{ background: 'linear-gradient(135deg, var(--accent), #059669)' }}>♞</div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Loading Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06]" style={{ background: 'rgba(10, 10, 15, 0.85)', backdropFilter: 'blur(16px)' }}>
        <div className="max-w-[1360px] mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm" style={{ background: 'linear-gradient(135deg, var(--accent), #059669)', boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)' }}>
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight">{user?.name || 'Player'}</h1>
              <p className="text-[11px] text-white/25 font-medium">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="btn btn-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      <div className="max-w-[1360px] mx-auto px-5 py-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard label="Games" value={stats.totalGames || 0} sub={`${stats.totalMoves || 0} total moves`} icon={Trophy} gradient="bg-gradient-to-br from-blue-500/[0.08] to-transparent" iconColor="#3b82f6" />
          <StatCard label="Win Rate" value={`${stats.winRate || 0}%`} sub={`${stats.wins || 0}W · ${stats.losses || 0}L · ${stats.draws || 0}D`} icon={TrendingUp} gradient="bg-gradient-to-br from-emerald-500/[0.08] to-transparent" iconColor="#10b981" />
          <StatCard label="Accuracy" value={`${stats.averageAccuracy || 0}%`} sub="Average move quality" icon={Target} gradient="bg-gradient-to-br from-amber-500/[0.08] to-transparent" iconColor="#f59e0b" />
          <StatCard label="Best Streak" value={stats.bestWinStreak || 0} sub={`Current: ${stats.currentWinStreak || 0}`} icon={Flame} gradient="bg-gradient-to-br from-purple-500/[0.08] to-transparent" iconColor="#a855f7" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-2xl border border-white/[0.04] overflow-x-auto" style={{ background: 'rgba(255,255,255,0.02)' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === t.id ? 'text-white shadow-sm' : 'text-white/35 hover:text-white/60'
              }`}
              style={activeTab === t.id ? { background: 'var(--bg-elevated)', border: '1px solid var(--border-color)' } : {}}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6 animate-slideUp">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-5">
                <h3 className="text-sm font-black text-white/80 mb-4 flex items-center gap-2"><Crown className="w-4 h-4" style={{ color: 'var(--gold)' }} /> Match Results</h3>
                <div className="flex items-center gap-6">
                  <div className="w-[160px] h-[160px] shrink-0">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={resultData} dataKey="value" innerRadius="60%" outerRadius="90%" paddingAngle={3} stroke="none">
                          {resultData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                        </Pie>
                        <Tooltip contentStyle={TT_STYLE} itemStyle={{ color: '#fff', fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-3 flex-1">
                    {resultData.map(r => (
                      <div key={r.name} className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.fill }} />
                        <span className="text-xs text-white/40 flex-1 font-medium">{r.name}</span>
                        <span className="text-sm font-black text-white">{r.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-5">
                <h3 className="text-sm font-black text-white/80 mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-orange-400" /> Move Classification</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={moveTypeData} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TT_STYLE} itemStyle={{ color: '#fff', fontSize: 12 }} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {moveTypeData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-5">
                <h3 className="text-sm font-black text-white/80 mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-violet-400" /> By Color</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[{ label: 'White', key: 'asWhite', c: '#e2e0db' }, { label: 'Black', key: 'asBlack', c: '#6b6b6b' }].map(side => {
                    const d = colors[side.key] || {};
                    const wr = d.games > 0 ? Math.round((d.wins / d.games) * 100) : 0;
                    return (
                      <div key={side.key} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-black text-white/50">{side.label}</span>
                          <MiniRing value={wr} size={40} color={side.c} />
                        </div>
                        <div className="space-y-1.5 text-[11px]">
                          {[
                            { l: 'Games', v: d.games || 0, c: 'text-white' },
                            { l: 'Wins', v: d.wins || 0, c: 'text-emerald-400' },
                            { l: 'Losses', v: d.losses || 0, c: 'text-rose-400' },
                            { l: 'Accuracy', v: `${d.avgAccuracy || 0}%`, c: 'text-white' },
                          ].map((s, i) => (
                            <div key={i} className="flex justify-between"><span className="text-white/30 font-medium">{s.l}</span><span className={`font-bold ${s.c}`}>{s.v}</span></div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-5">
                <h3 className="text-sm font-black text-white/80 mb-4 flex items-center gap-2"><Award className="w-4 h-4" style={{ color: 'var(--gold)' }} /> Openings</h3>
                <div className="space-y-2">
                  {sortedOpenings.length === 0 && <p className="text-xs text-white/20">No opening data yet</p>}
                  {sortedOpenings.map(([name, d], i) => {
                    const wr = d.games > 0 ? Math.round((d.wins / d.games) * 100) : 0;
                    return (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-bold text-white/70 truncate">{name}</div>
                          <div className="text-[10px] text-white/25 font-medium">{d.games} game{d.games !== 1 ? 's' : ''}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[12px] font-black text-white">{wr}%</div>
                          <div className="text-[9px] text-white/25">win rate</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'opponents' && (
          <div className="animate-slideUp">
            {sortedOpponents.length === 0 ? (
              <div className="text-center py-16 text-white/20 text-sm">No opponent data yet. Play some games!</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedOpponents.map(({ name, data }) => (<OpponentCard key={name} name={name} data={data} player={playerLookup[name]} />))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'moves' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-slideUp">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-5">
              <h3 className="text-sm font-black text-white/80 mb-5">Move Distribution</h3>
              <div className="space-y-4">
                {[
                  { label: 'Best', val: moves.bestMoves || 0, color: '#10b981' },
                  { label: 'Tactical', val: moves.tactical || 0, color: '#f59e0b' },
                  { label: 'Strategic', val: moves.strategic || 0, color: '#8b5cf6' },
                  { label: 'Blunder', val: moves.blunders || 0, color: '#f43f5e' },
                ].map((m, i) => {
                  const pct = moves.totalMoves > 0 ? Math.round((m.val / moves.totalMoves) * 100) : 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-[12px] mb-1.5">
                        <span className="text-white/40 font-semibold">{m.label}</span>
                        <span className="font-black text-white">{m.val} <span className="text-white/25 font-normal">({pct}%)</span></span>
                      </div>
                      <div className="h-2 rounded-full bg-white/[0.03] overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: m.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-5 flex flex-col gap-4">
              <h3 className="text-sm font-black text-white/80">Quality Metrics</h3>
              <div className="flex-1 grid grid-cols-2 gap-3">
                {[
                  { label: 'Total Moves', value: moves.totalMoves || 0, color: '#10b981' },
                  { label: 'Tactical Acc.', value: `${moves.tacticalAccuracy || 0}%`, color: '#f59e0b' },
                  { label: 'Best Rate', value: `${moves.totalMoves > 0 ? Math.round((moves.bestMoves / moves.totalMoves) * 100) : 0}%`, color: '#10b981' },
                  { label: 'Blunder Rate', value: `${moves.totalMoves > 0 ? Math.round((moves.blunders / moves.totalMoves) * 100) : 0}%`, color: '#f43f5e' },
                ].map((m, i) => (
                  <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] flex flex-col justify-between">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-white/25 font-bold">{m.label}</p>
                    <p className="text-2xl font-black mt-2" style={{ color: m.color }}>{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trends' && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-5 animate-slideUp">
            <h3 className="text-sm font-black text-white/80 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4" style={{ color: 'var(--accent)' }} /> Accuracy Trend</h3>
            {accuracyData.length === 0 ? (
              <div className="text-center py-12 text-white/20 text-sm">Play some games to see your trend</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={accuracyData}>
                  <defs>
                    <linearGradient id="gradAcc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="game" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.2)" domain={[0, 100]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TT_STYLE} itemStyle={{ color: '#fff', fontSize: 12 }} />
                  <Area type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#gradAcc)" dot={{ r: 4, fill: '#10b981', stroke: 'var(--bg-primary)', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {activeTab === 'history' && (<>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] overflow-hidden animate-slideUp">
            <div className="px-5 py-3.5 border-b border-white/[0.04] flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <span className="text-sm font-black text-white/80">Recent Games</span>
              <span className="ml-auto text-[11px] text-white/20 font-mono font-bold">{games.length} total</span>
            </div>
            {games.length === 0 ? (
              <div className="text-center py-12 text-white/20 text-sm">No games played yet</div>
            ) : (
              <div className="divide-y divide-white/[0.03]">
                {games.slice(0, 20).map((g, i) => {
                  const oppName = typeof g.opponent === 'string' ? g.opponent : g.opponent?.name || 'Unknown';
                  const p = playerLookup[oppName];
                  return (
                    <div key={i} className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors group">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                        g.result === 'win' ? 'bg-emerald-500/12 text-emerald-400' :
                        g.result === 'loss' ? 'bg-rose-500/12 text-rose-400' :
                        'bg-violet-500/12 text-violet-400'
                      }`}>
                        {g.result === 'win' ? 'W' : g.result === 'loss' ? 'L' : 'D'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-bold text-white/70 truncate">{p?.country || ''} {oppName}</div>
                        <div className="text-[10px] text-white/20 font-medium">{g.openingName || 'Unknown opening'}</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 shrink-0 ${g.playerColor === 'w' ? 'bg-white border-white/40' : 'bg-gray-800 border-gray-500'}`} />
                      <div className="text-right w-14 shrink-0">
                        <div className="text-[12px] font-black text-white">{g.analysis?.totalAccuracy || 0}%</div>
                        <div className="text-[9px] text-white/15 font-semibold">acc</div>
                      </div>
                      <div className="text-[10px] text-white/15 w-16 text-right shrink-0 hidden sm:block font-medium">
                        {new Date(g.gameDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      {g.moves?.length > 0 && (
                        <button
                          onClick={() => setSelectedGame(g)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-black transition-all opacity-0 group-hover:opacity-100 shrink-0"
                          style={{ background: 'var(--accent-muted)', color: 'var(--accent)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                        >
                          <BarChart3 className="w-3 h-3 inline mr-1" />Review
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {selectedGame && <HistoryAnalysisModal game={selectedGame} onClose={() => setSelectedGame(null)} />}
        </>)}
      </div>
    </div>
  );
}
