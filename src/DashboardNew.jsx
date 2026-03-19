import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { LogOut, BarChart3, Trophy, Zap, Target, TrendingUp, Clock, Award, RefreshCw, TrendingDown, Flame, Activity } from 'lucide-react';

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
      
      // Auto-refresh stats every 5 seconds
      const interval = setInterval(() => {
        fetchDashboardData(false);
      }, 5000);

      // Also refresh when tab becomes visible
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          fetchDashboardData(false);
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [token]);

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      
      const [analyticsRes, gamesRes] = await Promise.all([
        fetch('/api/analytics/comprehensive', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/games/history', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        console.log('Analytics received:', data);
        setAnalytics(data);
      } else {
        console.error('Analytics fetch failed');
      }

      if (gamesRes.ok) {
        const gamesData = await gamesRes.json();
        setGames(gamesData || []);
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center"><div className="text-white text-xl">Loading Analytics...</div></div>;
  }

  const stats = analytics?.stats || {};
  const moves = analytics?.moves || {};
  const opponents = analytics?.opponents || {};
  const colors = analytics?.colors || {};
  const trends = analytics?.trends || {};
  const openings = analytics?.openings || {};

  // Prepare data for charts
  const moveTypeData = [
    { name: 'Blunders', value: moves.blunders || 0, fill: '#ef4444' },
    { name: 'Tactical', value: moves.tactical || 0, fill: '#f59e0b' },
    { name: 'Strategic', value: moves.strategic || 0, fill: '#3b82f6' },
    { name: 'Best', value: moves.bestMoves || 0, fill: '#10b981' }
  ];

  const resultData = [
    { name: 'Wins', value: stats.wins || 0, fill: '#10b981' },
    { name: 'Losses', value: stats.losses || 0, fill: '#ef4444' },
    { name: 'Draws', value: stats.draws || 0, fill: '#6366f1' }
  ];

  const colorPerformanceData = [
    {
      name: 'White',
      wins: colors.asWhite?.wins || 0,
      losses: colors.asWhite?.losses || 0,
      draws: colors.asWhite?.draws || 0
    },
    {
      name: 'Black',
      wins: colors.asBlack?.wins || 0,
      losses: colors.asBlack?.losses || 0,
      draws: colors.asBlack?.draws || 0
    }
  ];

  const accuracyData = (trends.accuracyTrend || []).map((acc, idx) => ({
    game: `Game ${idx + 1}`,
    accuracy: acc
  }));

  const topOpponents = Object.entries(opponents)
    .sort((a, b) => b[1].games - a[1].games)
    .slice(0, 5)
    .map(([name, data]) => ({
      name: name.substring(0, 10),
      fullName: name,
      ...data
    }));

  const topOpenings = Object.entries(openings)
    .sort((a, b) => b[1].games - a[1].games)
    .slice(0, 5)
    .map(([name, data]) => ({
      name: name.substring(0, 15),
      fullName: name,
      ...data
    }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center font-bold text-xl">
              {user?.avatar}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{user?.name}</h1>
              <p className="text-xs text-white/40">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-sm text-cyan-300 transition-all disabled:opacity-50 font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-sm text-red-300 transition-all font-medium"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Games */}
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-6 backdrop-blur hover:border-blue-500/40 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-300/70 text-sm font-medium">Total Games</p>
                <p className="text-4xl font-bold text-white mt-2">{stats.totalGames || 0}</p>
                <p className="text-xs text-blue-300/50 mt-1">{stats.totalMoves || 0} moves</p>
              </div>
              <Trophy className="w-14 h-14 text-blue-400/20" />
            </div>
          </div>

          {/* Win Rate */}
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-6 backdrop-blur hover:border-green-500/40 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-300/70 text-sm font-medium">Win Rate</p>
                <p className="text-4xl font-bold text-white mt-2">{stats.winRate || 0}%</p>
                <p className="text-xs text-green-300/50 mt-1">{stats.wins || 0}W - {stats.losses || 0}L - {stats.draws || 0}D</p>
              </div>
              <TrendingUp className="w-14 h-14 text-green-400/20" />
            </div>
          </div>

          {/* Accuracy */}
          <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl p-6 backdrop-blur hover:border-orange-500/40 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-300/70 text-sm font-medium">Avg Accuracy</p>
                <p className="text-4xl font-bold text-white mt-2">{stats.averageAccuracy || 0}%</p>
                <p className="text-xs text-orange-300/50 mt-1">Move quality</p>
              </div>
              <Target className="w-14 h-14 text-orange-400/20" />
            </div>
          </div>

          {/* Win Streak */}
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-6 backdrop-blur hover:border-purple-500/40 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-300/70 text-sm font-medium">Best Streak</p>
                <p className="text-4xl font-bold text-white mt-2">{stats.bestWinStreak || 0}</p>
                <p className="text-xs text-purple-300/50 mt-1">Current: {stats.currentWinStreak || 0}</p>
              </div>
              <Flame className="w-14 h-14 text-purple-400/20" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-white/10 overflow-x-auto">
          {['overview', 'moves', 'opponents', 'openings', 'trends'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium text-sm whitespace-nowrap transition-all border-b-2 ${
                activeTab === tab
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-white/60 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Match Results */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  Match Results
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={resultData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {resultData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Move Classification */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-orange-400" />
                  Move Classification
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={moveTypeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                    <YAxis stroke="rgba(255,255,255,0.5)" />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)' }} />
                    <Bar dataKey="value" fill="#06b6d4" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Color Performance */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-400" />
                  Performance by Color
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={colorPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                    <YAxis stroke="rgba(255,255,255,0.5)" />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)' }} />
                    <Legend />
                    <Bar dataKey="wins" fill="#10b981" />
                    <Bar dataKey="losses" fill="#ef4444" />
                    <Bar dataKey="draws" fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Statistics Summary */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-400" />
                  Summary
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                    <span className="text-white/70">Total Moves</span>
                    <span className="font-bold text-white">{stats.totalMoves || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                    <span className="text-white/70">Tactical Moves</span>
                    <span className="font-bold text-orange-400">{moves.tactical || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                    <span className="text-white/70">Blunders</span>
                    <span className="font-bold text-red-400">{moves.blunders || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                    <span className="text-white/70">Best Moves</span>
                    <span className="font-bold text-green-400">{moves.bestMoves || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                    <span className="text-white/70">Strategic Moves</span>
                    <span className="font-bold text-blue-400">{moves.strategic || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Moves Tab */}
        {activeTab === 'moves' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur">
                <h3 className="text-lg font-semibold text-white mb-6">Move Distribution</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Best Moves', value: moves.bestMoves || 0, color: 'bg-green-500', percent: moves.totalMoves > 0 ? Math.round((moves.bestMoves / moves.totalMoves) * 100) : 0 },
                    { label: 'Tactical', value: moves.tactical || 0, color: 'bg-orange-500', percent: moves.totalMoves > 0 ? Math.round((moves.tactical / moves.totalMoves) * 100) : 0 },
                    { label: 'Strategic', value: moves.strategic || 0, color: 'bg-blue-500', percent: moves.totalMoves > 0 ? Math.round((moves.strategic / moves.totalMoves) * 100) : 0 },
                    { label: 'Blunders', value: moves.blunders || 0, color: 'bg-red-500', percent: moves.totalMoves > 0 ? Math.round((moves.blunders / moves.totalMoves) * 100) : 0 }
                  ].map((item, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-white/70">{item.label}</span>
                        <span className="font-bold text-white">{item.value} ({item.percent}%)</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                        <div className={`h-full ${item.color}`} style={{ width: `${item.percent}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur">
                <h3 className="text-lg font-semibold text-white mb-6">Quality Metrics</h3>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-green-600/5 border border-green-500/20">
                    <p className="text-green-300/70 text-sm">Tactical Accuracy</p>
                    <p className="text-3xl font-bold text-green-400 mt-2">{moves.tacticalAccuracy || 0}%</p>
                  </div>
                  <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-blue-600/5 border border-blue-500/20">
                    <p className="text-blue-300/70 text-sm">Average Move Quality</p>
                    <p className="text-3xl font-bold text-blue-400 mt-2">{((moves.bestMoves + moves.tactical) / moves.totalMoves * 100 || 0).toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Opponents Tab */}
        {activeTab === 'opponents' && (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur">
              <h3 className="text-lg font-semibold text-white mb-6">Top Opponents</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-white/60 text-xs uppercase tracking-wider border-b border-white/5">
                    <tr>
                      <th className="px-4 py-3 text-left">Opponent</th>
                      <th className="px-4 py-3 text-center">Games</th>
                      <th className="px-4 py-3 text-center">Wins</th>
                      <th className="px-4 py-3 text-center">Losses</th>
                      <th className="px-4 py-3 text-center">Draws</th>
                      <th className="px-4 py-3 text-center">Win Rate</th>
                      <th className="px-4 py-3 text-center">Avg Acc</th>
                    </tr>
                  </thead>
                  <tbody className="text-white">
                    {topOpponents.map((opp, idx) => (
                      <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3" title={opp.fullName}>{opp.fullName}</td>
                        <td className="px-4 py-3 text-center font-semibold">{opp.games}</td>
                        <td className="px-4 py-3 text-center text-green-400">{opp.wins}</td>
                        <td className="px-4 py-3 text-center text-red-400">{opp.losses}</td>
                        <td className="px-4 py-3 text-center text-blue-400">{opp.draws}</td>
                        <td className="px-4 py-3 text-center font-bold">{opp.winRate}%</td>
                        <td className="px-4 py-3 text-center">{opp.avgAccuracy}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Openings Tab */}
        {activeTab === 'openings' && (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur">
              <h3 className="text-lg font-semibold text-white mb-6">Top Openings</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-white/60 text-xs uppercase tracking-wider border-b border-white/5">
                    <tr>
                      <th className="px-4 py-3 text-left">Opening</th>
                      <th className="px-4 py-3 text-center">Games</th>
                      <th className="px-4 py-3 text-center">Wins</th>
                      <th className="px-4 py-3 text-center">Losses</th>
                      <th className="px-4 py-3 text-center">Draws</th>
                      <th className="px-4 py-3 text-center">Win Rate</th>
                      <th className="px-4 py-3 text-center">Avg Acc</th>
                    </tr>
                  </thead>
                  <tbody className="text-white">
                    {topOpenings.map((op, idx) => (
                      <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3" title={op.fullName}>{op.fullName}</td>
                        <td className="px-4 py-3 text-center font-semibold">{op.games}</td>
                        <td className="px-4 py-3 text-center text-green-400">{op.wins}</td>
                        <td className="px-4 py-3 text-center text-red-400">{op.losses}</td>
                        <td className="px-4 py-3 text-center text-blue-400">{op.draws}</td>
                        <td className="px-4 py-3 text-center font-bold">{op.winRate}%</td>
                        <td className="px-4 py-3 text-center">{op.avgAccuracy}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Trends Tab */}
        {activeTab === 'trends' && (
          <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                Accuracy Trend (Last 10 Games)
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={accuracyData}>
                  <defs>
                    <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="game" stroke="rgba(255,255,255,0.5)" />
                  <YAxis stroke="rgba(255,255,255,0.5)" domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)' }} />
                  <Area type="monotone" dataKey="accuracy" stroke="#06b6d4" fillOpacity={1} fill="url(#colorAccuracy)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Recent Games */}
        <div className="mt-8 bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            Recent Games ({games.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-white/60 text-xs uppercase tracking-wider border-b border-white/5">
                <tr>
                  <th className="px-4 py-3 text-left">Opponent</th>
                  <th className="px-4 py-3 text-left">Result</th>
                  <th className="px-4 py-3 text-left">Color</th>
                  <th className="px-4 py-3 text-left">Accuracy</th>
                  <th className="px-4 py-3 text-left">Opening</th>
                  <th className="px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="text-white">
                {games.slice(0, 15).map((game, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">{typeof game.opponent === 'string' ? game.opponent : game.opponent?.name || 'Unknown'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        game.result === 'win' ? 'bg-green-500/20 text-green-300' :
                        game.result === 'loss' ? 'bg-red-500/20 text-red-300' :
                        'bg-blue-500/20 text-blue-300'
                      }`}>
                        {game.result?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">{game.playerColor === 'w' ? '⚪ White' : '⚫ Black'}</td>
                    <td className="px-4 py-3">{game.analysis?.totalAccuracy || 0}%</td>
                    <td className="px-4 py-3 text-white/70 text-xs">{game.openingName || 'Unknown'}</td>
                    <td className="px-4 py-3 text-white/60 text-xs">{new Date(game.gameDate).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
