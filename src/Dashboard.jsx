import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LogOut, BarChart3, Trophy, Zap, Target, TrendingUp, Clock, Award, RefreshCw } from 'lucide-react';

export default function Dashboard() {
  const { user, token, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [games, setGames] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (token) {
      fetchDashboardData();
      
      const interval = setInterval(() => {
        fetchDashboardData();
      }, 3000);

      const handleVisibilityChange = () => {
        if (!document.hidden) {
          fetchDashboardData();
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

      const [profileRes, gamesRes, statsRes] = await Promise.all([
        fetch('/api/auth/profile', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/games/history', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/stats/performance', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        setStats(data.user);
      }

      if (gamesRes.ok) {
        const games = await gamesRes.json();
        setGames(games);
      }

      if (statsRes.ok) {
        const perf = await statsRes.json();
        setPerformance(perf);
      } else {
        setPerformance(null);
      }
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="text-white">Loading...</div></div>;
  }

  const opponentData = stats?.stats?.favoriteOpponent ? [
    { name: 'Opponent', value: 1 }
  ] : [];

  const moveTypeData = [
    { name: 'Blunders', value: stats?.moveAnalysis?.blunders || 0, fill: '#ef4444' },
    { name: 'Tactical', value: stats?.moveAnalysis?.tacticalMoves || 0, fill: '#f59e0b' },
    { name: 'Strategic', value: stats?.moveAnalysis?.strategicMoves || 0, fill: '#3b82f6' },
    { name: 'Best', value: stats?.moveAnalysis?.bestMoves || 0, fill: '#10b981' }
  ];

  const winRateData = [
    { name: 'Wins', value: stats?.stats?.wins || 0, fill: '#10b981' },
    { name: 'Losses', value: stats?.stats?.losses || 0, fill: '#ef4444' },
    { name: 'Draws', value: stats?.stats?.draws || 0, fill: '#6366f1' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center font-bold">
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
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white transition-all disabled:opacity-50"
              title="Refresh stats"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white transition-all"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Games */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Total Games</p>
                <p className="text-3xl font-bold text-white mt-2">{stats?.stats?.totalGames || 0}</p>
              </div>
              <Trophy className="w-12 h-12 text-cyan-400/20" />
            </div>
          </div>

          {/* Win Rate */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Win Rate</p>
                <p className="text-3xl font-bold text-white mt-2">{stats?.stats?.winRate || 0}%</p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-400/20" />
            </div>
          </div>

          {/* Average Accuracy */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Avg Accuracy</p>
                <p className="text-3xl font-bold text-white mt-2">{stats?.moveAnalysis?.averageAccuracy || 0}%</p>
              </div>
              <Target className="w-12 h-12 text-orange-400/20" />
            </div>
          </div>

          {/* ELO Rating */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">ELO Rating</p>
                <p className="text-3xl font-bold text-white mt-2">{stats?.stats?.eloRating || 1200}</p>
              </div>
              <Award className="w-12 h-12 text-purple-400/20" />
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Win/Loss/Draw Chart */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Match Results
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={winRateData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} fill="#8884d8" dataKey="value">
                  {winRateData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Move Types Chart */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Move Classification
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={moveTypeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.1)' }} />
                <Bar dataKey="value" fill="#06b6d4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Games */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
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
                  <th className="px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="text-white">
                {games.slice(0, 10).map((game, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">{game.opponent}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        game.result === 'win' ? 'bg-green-500/20 text-green-300' :
                        game.result === 'loss' ? 'bg-red-500/20 text-red-300' :
                        'bg-blue-500/20 text-blue-300'
                      }`}>
                        {game.result.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">{game.playerColor === 'w' ? '⚪ White' : '⚫ Black'}</td>
                    <td className="px-4 py-3">{game.analysis?.totalAccuracy || 0}%</td>
                    <td className="px-4 py-3 text-white/60">{new Date(game.gameDate).toLocaleDateString()}</td>
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
