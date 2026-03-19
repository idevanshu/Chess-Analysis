import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from './context/AuthContext';
import { PLAYERS, PLAYER_ORDER } from './players';
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar
} from 'recharts';
import {
  Trophy, Zap, Target, TrendingUp, Clock, Award,
  RefreshCw, Flame, Activity, Swords, Crown, ChevronRight
} from 'lucide-react';

// ── Shared tooltip style ──
const TT_STYLE = {
  backgroundColor: '#0c0c18',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px',
  padding: '10px 14px',
  boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
};

// ── Tiny ring chart for a single percentage ──
function MiniRing({ value, size = 52, color = '#06b6d4', bg = 'rgba(255,255,255,0.06)' }) {
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
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold" style={{ color }}>{value}%</span>
    </div>
  );
}

// ── Stat card ──
function StatCard({ label, value, sub, icon: Icon, gradient, iconColor }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/[0.06] p-5 ${gradient} group hover:border-white/[0.12] transition-all duration-300`}>
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.07] group-hover:opacity-[0.12] transition-opacity" style={{ background: iconColor }} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-widest font-semibold text-white/40 mb-1">{label}</p>
          <p className="text-3xl font-extrabold text-white tracking-tight">{value}</p>
          {sub && <p className="text-[11px] text-white/35 mt-1.5 font-medium">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.04]">
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
      </div>
    </div>
  );
}

// ── Per-opponent card ──
function OpponentCard({ name, data, player }) {
  const winRate = data.games > 0 ? Math.round((data.wins / data.games) * 100) : 0;
  const totalPlayed = data.games;
  const accent = player?.color || '#06b6d4';

  return (
    <div className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-300 overflow-hidden">
      {/* Accent top bar */}
      <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center font-extrabold text-[16px] shrink-0 border-2"
            style={{
              color: accent,
              background: `linear-gradient(135deg, ${accent}25, ${accent}08)`,
              borderColor: `${accent}40`,
            }}
          >
            {player?.avatar || name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[13px] text-white truncate">{player?.country || ''} {name}</div>
            <div className="text-[11px] text-white/35 font-medium">{player?.title || 'Opponent'} {player ? `· ${player.elo} ELO` : ''}</div>
          </div>
          <MiniRing value={winRate} size={48} color={accent} />
        </div>

        {/* W / L / D bar */}
        <div className="flex gap-1 h-2 rounded-full overflow-hidden mb-3">
          {data.wins > 0 && <div className="bg-emerald-500 rounded-l-full" style={{ flex: data.wins }} />}
          {data.draws > 0 && <div className="bg-white/20" style={{ flex: data.draws }} />}
          {data.losses > 0 && <div className="bg-rose-500 rounded-r-full" style={{ flex: data.losses }} />}
          {totalPlayed === 0 && <div className="bg-white/5 flex-1" />}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-[17px] font-bold text-white">{totalPlayed}</div>
            <div className="text-[9px] uppercase tracking-widest text-white/30 font-semibold">Played</div>
          </div>
          <div>
            <div className="text-[17px] font-bold text-emerald-400">{data.wins}</div>
            <div className="text-[9px] uppercase tracking-widest text-white/30 font-semibold">Won</div>
          </div>
          <div>
            <div className="text-[17px] font-bold text-rose-400">{data.losses}</div>
            <div className="text-[9px] uppercase tracking-widest text-white/30 font-semibold">Lost</div>
          </div>
          <div>
            <div className="text-[17px] font-bold text-indigo-400">{data.draws}</div>
            <div className="text-[9px] uppercase tracking-widest text-white/30 font-semibold">Draw</div>
          </div>
        </div>

        {/* Accuracy */}
        {data.avgAccuracy > 0 && (
          <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">Avg Accuracy</span>
            <span className="text-[13px] font-bold" style={{ color: accent }}>{data.avgAccuracy}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Dashboard ──
export default function DashboardNew() {
  const { user, token, logout } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

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
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ── Derived data ──
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
    { name: 'Strategic', value: moves.strategic || 0, fill: '#6366f1' },
    { name: 'Blunder', value: moves.blunders || 0, fill: '#ef4444' },
  ];

  const resultData = [
    { name: 'Wins', value: stats.wins || 0, fill: '#10b981' },
    { name: 'Losses', value: stats.losses || 0, fill: '#ef4444' },
    { name: 'Draws', value: stats.draws || 0, fill: '#6366f1' },
  ];

  const accuracyData = (trends.accuracyTrend || []).map((acc, i) => ({ game: `#${i + 1}`, accuracy: acc }));

  const sortedOpponents = Object.entries(opponents)
    .sort((a, b) => b[1].games - a[1].games)
    .map(([name, data]) => ({ name, data }));

  const sortedOpenings = Object.entries(openings)
    .sort((a, b) => b[1].games - a[1].games)
    .slice(0, 6);

  const TABS = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'opponents', label: 'Opponents', icon: Swords },
    { id: 'moves', label: 'Moves', icon: Zap },
    { id: 'trends', label: 'Trends', icon: TrendingUp },
    { id: 'history', label: 'History', icon: Clock },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08080f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center font-bold text-lg animate-pulse">♞</div>
          <p className="text-white/50 text-sm">Loading Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080f] text-white">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#08080f]/80 backdrop-blur-xl">
        <div className="max-w-[1360px] mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center font-bold text-sm">{user?.avatar || '♟'}</div>
            <div>
              <h1 className="text-base font-bold">{user?.name || 'Player'}</h1>
              <p className="text-[11px] text-white/30">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white/60 hover:text-white transition-all disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      <div className="max-w-[1360px] mx-auto px-5 py-6">
        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard label="Games" value={stats.totalGames || 0} sub={`${stats.totalMoves || 0} total moves`} icon={Trophy} gradient="bg-gradient-to-br from-blue-500/[0.08] to-transparent" iconColor="#3b82f6" />
          <StatCard label="Win Rate" value={`${stats.winRate || 0}%`} sub={`${stats.wins || 0}W · ${stats.losses || 0}L · ${stats.draws || 0}D`} icon={TrendingUp} gradient="bg-gradient-to-br from-emerald-500/[0.08] to-transparent" iconColor="#10b981" />
          <StatCard label="Accuracy" value={`${stats.averageAccuracy || 0}%`} sub="Average move quality" icon={Target} gradient="bg-gradient-to-br from-amber-500/[0.08] to-transparent" iconColor="#f59e0b" />
          <StatCard label="Best Streak" value={stats.bestWinStreak || 0} sub={`Current: ${stats.currentWinStreak || 0}`} icon={Flame} gradient="bg-gradient-to-br from-purple-500/[0.08] to-transparent" iconColor="#a855f7" />
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-6 p-1 bg-white/[0.03] rounded-xl border border-white/[0.05] overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === t.id
                  ? 'bg-white/[0.08] text-white shadow-sm'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══════════ OVERVIEW ═══════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Results donut */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <h3 className="text-sm font-bold text-white/80 mb-4 flex items-center gap-2"><Crown className="w-4 h-4 text-amber-400" /> Match Results</h3>
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
                  <div className="flex flex-col gap-2.5 flex-1">
                    {resultData.map(r => (
                      <div key={r.name} className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.fill }} />
                        <span className="text-xs text-white/50 flex-1">{r.name}</span>
                        <span className="text-sm font-bold text-white">{r.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Move Classification */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <h3 className="text-sm font-bold text-white/80 mb-4 flex items-center gap-2"><Zap className="w-4 h-4 text-orange-400" /> Move Classification</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={moveTypeData} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.25)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.25)" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TT_STYLE} itemStyle={{ color: '#fff', fontSize: 12 }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {moveTypeData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Color Performance */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <h3 className="text-sm font-bold text-white/80 mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-indigo-400" /> By Color</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[{ label: 'White', key: 'asWhite', c: '#e2e0db' }, { label: 'Black', key: 'asBlack', c: '#6b6b6b' }].map(side => {
                    const d = colors[side.key] || {};
                    const wr = d.games > 0 ? Math.round((d.wins / d.games) * 100) : 0;
                    return (
                      <div key={side.key} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-white/60">{side.label}</span>
                          <MiniRing value={wr} size={40} color={side.c} />
                        </div>
                        <div className="space-y-1.5 text-[11px]">
                          <div className="flex justify-between"><span className="text-white/35">Games</span><span className="font-semibold text-white">{d.games || 0}</span></div>
                          <div className="flex justify-between"><span className="text-white/35">Wins</span><span className="font-semibold text-emerald-400">{d.wins || 0}</span></div>
                          <div className="flex justify-between"><span className="text-white/35">Losses</span><span className="font-semibold text-rose-400">{d.losses || 0}</span></div>
                          <div className="flex justify-between"><span className="text-white/35">Accuracy</span><span className="font-semibold text-white">{d.avgAccuracy || 0}%</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Openings compact */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                <h3 className="text-sm font-bold text-white/80 mb-4 flex items-center gap-2"><Award className="w-4 h-4 text-cyan-400" /> Openings</h3>
                <div className="space-y-2">
                  {sortedOpenings.length === 0 && <p className="text-xs text-white/25">No opening data yet</p>}
                  {sortedOpenings.map(([name, d], i) => {
                    const wr = d.games > 0 ? Math.round((d.wins / d.games) * 100) : 0;
                    return (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors">
                        <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center text-[10px] font-bold text-cyan-400 shrink-0">{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-semibold text-white/80 truncate">{name}</div>
                          <div className="text-[10px] text-white/30">{d.games} game{d.games !== 1 ? 's' : ''}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[12px] font-bold text-white">{wr}%</div>
                          <div className="text-[9px] text-white/30">win rate</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ OPPONENTS ═══════════ */}
        {activeTab === 'opponents' && (
          <div>
            {sortedOpponents.length === 0 ? (
              <div className="text-center py-16 text-white/25 text-sm">No opponent data yet. Play some games!</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedOpponents.map(({ name, data }) => (
                  <OpponentCard key={name} name={name} data={data} player={playerLookup[name]} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════ MOVES ═══════════ */}
        {activeTab === 'moves' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Distribution bars */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <h3 className="text-sm font-bold text-white/80 mb-5">Move Distribution</h3>
              <div className="space-y-4">
                {[
                  { label: 'Best', val: moves.bestMoves || 0, color: '#10b981' },
                  { label: 'Tactical', val: moves.tactical || 0, color: '#f59e0b' },
                  { label: 'Strategic', val: moves.strategic || 0, color: '#6366f1' },
                  { label: 'Blunder', val: moves.blunders || 0, color: '#ef4444' },
                ].map((m, i) => {
                  const pct = moves.totalMoves > 0 ? Math.round((m.val / moves.totalMoves) * 100) : 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-[12px] mb-1.5">
                        <span className="text-white/50 font-medium">{m.label}</span>
                        <span className="font-bold text-white">{m.val} <span className="text-white/30 font-normal">({pct}%)</span></span>
                      </div>
                      <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: m.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quality metrics */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-white/80">Quality Metrics</h3>
              <div className="flex-1 grid grid-cols-2 gap-3">
                {[
                  { label: 'Total Moves', value: moves.totalMoves || 0, color: '#06b6d4' },
                  { label: 'Tactical Accuracy', value: `${moves.tacticalAccuracy || 0}%`, color: '#f59e0b' },
                  { label: 'Best Move Rate', value: `${moves.totalMoves > 0 ? Math.round((moves.bestMoves / moves.totalMoves) * 100) : 0}%`, color: '#10b981' },
                  { label: 'Blunder Rate', value: `${moves.totalMoves > 0 ? Math.round((moves.blunders / moves.totalMoves) * 100) : 0}%`, color: '#ef4444' },
                ].map((m, i) => (
                  <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.04] flex flex-col justify-between">
                    <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">{m.label}</p>
                    <p className="text-2xl font-extrabold mt-2" style={{ color: m.color }}>{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ TRENDS ═══════════ */}
        {activeTab === 'trends' && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h3 className="text-sm font-bold text-white/80 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-cyan-400" /> Accuracy Trend (Last 10 Games)</h3>
            {accuracyData.length === 0 ? (
              <div className="text-center py-12 text-white/25 text-sm">Play some games to see your trend</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={accuracyData}>
                  <defs>
                    <linearGradient id="gradAcc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="game" stroke="rgba(255,255,255,0.25)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.25)" domain={[0, 100]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TT_STYLE} itemStyle={{ color: '#fff', fontSize: 12 }} />
                  <Area type="monotone" dataKey="accuracy" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#gradAcc)" dot={{ r: 4, fill: '#06b6d4', stroke: '#0c0c18', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* ═══════════ HISTORY ═══════════ */}
        {activeTab === 'history' && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/[0.05] flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-white/80">Recent Games</span>
              <span className="ml-auto text-[11px] text-white/25 font-mono">{games.length} total</span>
            </div>
            {games.length === 0 ? (
              <div className="text-center py-12 text-white/25 text-sm">No games played yet</div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {games.slice(0, 20).map((g, i) => {
                  const oppName = typeof g.opponent === 'string' ? g.opponent : g.opponent?.name || 'Unknown';
                  const p = playerLookup[oppName];
                  const accent = p?.color || '#06b6d4';
                  return (
                    <div key={i} className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors">
                      {/* Result badge */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-extrabold shrink-0 ${
                        g.result === 'win' ? 'bg-emerald-500/15 text-emerald-400' :
                        g.result === 'loss' ? 'bg-rose-500/15 text-rose-400' :
                        'bg-indigo-500/15 text-indigo-400'
                      }`}>
                        {g.result === 'win' ? 'W' : g.result === 'loss' ? 'L' : 'D'}
                      </div>
                      {/* Opponent */}
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold text-white/80 truncate">
                          {p?.country || ''} {oppName}
                        </div>
                        <div className="text-[10px] text-white/25">{g.openingName || 'Unknown opening'}</div>
                      </div>
                      {/* Color */}
                      <div className={`w-5 h-5 rounded-full border-2 shrink-0 ${g.playerColor === 'w' ? 'bg-white border-white/40' : 'bg-gray-800 border-gray-500'}`} />
                      {/* Accuracy */}
                      <div className="text-right w-14 shrink-0">
                        <div className="text-[12px] font-bold text-white">{g.analysis?.totalAccuracy || 0}%</div>
                        <div className="text-[9px] text-white/20">acc</div>
                      </div>
                      {/* Date */}
                      <div className="text-[10px] text-white/20 w-16 text-right shrink-0 hidden sm:block">
                        {new Date(g.gameDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
