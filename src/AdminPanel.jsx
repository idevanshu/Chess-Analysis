import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './context/AuthContext';
import {
  Users, Activity, Server, LogOut, RefreshCw, Search,
  Shield, Database, Wifi, Clock, Trophy, Zap, Gamepad2,
  TrendingUp, CheckCircle, XCircle, BarChart3, Cpu,
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────

function LiveDot({ color = '#10b981' }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full animate-pulse shrink-0"
      style={{ background: color }}
    />
  );
}

function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div
      className="rounded-2xl p-4 border"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${color}1a` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span
          className="text-[9px] uppercase tracking-widest font-bold text-right ml-2"
          style={{ color: 'var(--text-dim)' }}
        >
          {label}
        </span>
      </div>
      <div className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>
        {value}
      </div>
      {sub && (
        <div className="text-[10px] mt-1 font-medium" style={{ color: 'var(--text-dim)' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function formatEventType(type) {
  const map = {
    userConnected: 'User connected',
    userDisconnected: 'User disconnected',
    aiGameStarted: 'AI game started',
    aiGameEnded: 'AI game ended',
    multiplayerGameStarted: 'Multiplayer game started',
    multiplayerGameEnded: 'Multiplayer game ended',
    userStatusChanged: 'User status changed',
  };
  return map[type] || type;
}

function formatEventData(data) {
  if (!data) return '';
  if (data.name) return data.name;
  if (data.userName) return `${data.userName}${data.opponent ? ` vs ${data.opponent}` : ''}`;
  if (data.status) return `Status → ${data.status}`;
  return '';
}

function formatUptime(secs) {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ── Sub-tabs ─────────────────────────────────────────────────────────────────

function OverviewTab({ stats, events }) {
  if (!stats) return null;
  const { live, platform, activeRooms, aiGames } = stats;

  return (
    <div className="space-y-6">
      {/* Live stats */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <LiveDot />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
            Live
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Online" value={live.onlineUsers} sub="WebSocket connections" icon={Wifi} color="#10b981" />
          <StatCard label="AI Games" value={live.aiGamesActive} sub="Active sessions" icon={Cpu} color="#6366f1" />
          <StatCard label="Multiplayer" value={live.multiplayerGamesActive} sub="Active rooms" icon={Gamepad2} color="#f59e0b" />
          <StatCard label="Waiting" value={live.waitingRooms} sub="Looking for opponent" icon={Clock} color="#8b5cf6" />
        </div>
      </section>

      {/* Platform stats */}
      <section>
        <div className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-dim)' }}>
          Platform
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Users" value={platform.totalUsers.toLocaleString()} icon={Users} color="#10b981" />
          <StatCard label="Active (7d)" value={platform.activeUsers.toLocaleString()} sub="Logged in past week" icon={TrendingUp} color="#3b82f6" />
          <StatCard label="Total Games" value={platform.totalGames.toLocaleString()} icon={Trophy} color="#f59e0b" />
          <StatCard label="Games Today" value={platform.gamesToday.toLocaleString()} icon={Zap} color="#ec4899" />
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Active Multiplayer Rooms */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-4 h-4" style={{ color: '#f59e0b' }} />
              <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                Active Multiplayer Rooms
              </span>
            </div>
            <span
              className="text-[9px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: 'rgba(245,158,11,0.1)',
                color: '#f59e0b',
                border: '1px solid rgba(245,158,11,0.2)',
              }}
            >
              {activeRooms?.length || 0} rooms
            </span>
          </div>
          <div className="overflow-x-auto">
            {!activeRooms?.length ? (
              <div className="py-8 text-center text-xs" style={{ color: 'var(--text-dim)' }}>
                No active multiplayer rooms
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {['Room', 'Host', 'Guest', 'Moves', 'Time', 'Status'].map(h => (
                      <th
                        key={h}
                        className="px-4 py-2 text-left font-bold uppercase tracking-wider"
                        style={{ color: 'var(--text-dim)', fontSize: '9px' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeRooms.map(room => (
                    <tr key={room.roomCode} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="px-4 py-2.5">
                        <span className="font-mono font-bold" style={{ color: 'var(--accent)' }}>
                          {room.roomCode}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--text-primary)' }}>
                        {room.host?.name || '—'}
                        {room.host?.elo && (
                          <span className="ml-1 text-[9px]" style={{ color: 'var(--text-dim)' }}>
                            {room.host.elo}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {room.guest?.name || (
                          <span style={{ color: 'var(--text-dim)' }}>Waiting…</span>
                        )}
                        {room.guest?.elo && (
                          <span className="ml-1 text-[9px]" style={{ color: 'var(--text-dim)' }}>
                            {room.guest.elo}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>
                        {room.moves}
                      </td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--text-dim)' }}>
                        {room.timeControl || '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{
                            background: room.status === 'active' ? 'rgba(16,185,129,0.12)' : 'rgba(139,92,246,0.12)',
                            color: room.status === 'active' ? '#10b981' : '#8b5cf6',
                          }}
                        >
                          {room.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Live Events Feed */}
        <div
          className="rounded-2xl border overflow-hidden flex flex-col"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        >
          <div
            className="flex items-center gap-2 px-4 py-3 border-b shrink-0"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <Activity className="w-4 h-4" style={{ color: '#10b981' }} />
            <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
              Live Events
            </span>
            <LiveDot />
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
            {!events.length ? (
              <div className="py-8 text-center text-xs" style={{ color: 'var(--text-dim)' }}>
                Waiting for events…
              </div>
            ) : (
              events.map((e, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 px-4 py-2.5"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                    style={{
                      background: e.type?.includes('Game')
                        ? '#6366f1'
                        : e.type?.includes('Status')
                        ? '#f59e0b'
                        : '#10b981',
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {formatEventType(e.type)}
                    </div>
                    {e.data && (
                      <div
                        className="text-[10px] mt-0.5 truncate"
                        style={{ color: 'var(--text-dim)' }}
                      >
                        {formatEventData(e.data)}
                      </div>
                    )}
                  </div>
                  <div className="text-[9px] shrink-0" style={{ color: 'var(--text-dim)' }}>
                    {new Date(e.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Active AI Sessions */}
      {aiGames?.length > 0 && (
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        >
          <div
            className="flex items-center gap-2 px-4 py-3 border-b"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <Cpu className="w-4 h-4" style={{ color: '#6366f1' }} />
            <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
              Active AI Sessions
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Player', 'Opponent', 'Started'].map(h => (
                    <th
                      key={h}
                      className="px-4 py-2 text-left font-bold uppercase tracking-wider"
                      style={{ color: 'var(--text-dim)', fontSize: '9px' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {aiGames.map((g, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--text-primary)' }}>
                      {g.userName || 'Unknown'}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>
                      {g.opponent || 'Stockfish'}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--text-dim)' }}>
                      {new Date(g.startedAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function UsersTab({ users, total, page, pages, searchQuery, onSearch, onPageChange, onToggleStatus, currentUserId }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1" style={{ minWidth: 200, maxWidth: 320 }}>
          <Search
            className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-dim)' }}
          />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={searchQuery}
            onChange={e => onSearch(e.target.value)}
            className="input pl-9 text-xs w-full"
          />
        </div>
        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
          {total.toLocaleString()} users
        </span>
      </div>

      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  background: 'var(--bg-elevated)',
                }}
              >
                {['Player', 'Email', 'ELO', 'Games', 'Win%', 'Status', 'Joined', 'Action'].map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left font-bold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: 'var(--text-dim)', fontSize: '9px' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr
                  key={u._id}
                  className="transition-colors hover:bg-white/[0.01]"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0"
                        style={{
                          background: 'linear-gradient(135deg, var(--accent), #059669)',
                          color: '#fff',
                        }}
                      >
                        {u.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="font-bold" style={{ color: 'var(--text-primary)' }}>
                          {u.name}
                          {u.isAdmin && (
                            <span
                              className="ml-1 text-[8px] px-1 py-0.5 rounded font-black"
                              style={{ background: 'rgba(220,38,38,0.15)', color: '#dc2626' }}
                            >
                              ADMIN
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                    {u.email}
                  </td>
                  <td
                    className="px-4 py-3 font-mono font-bold"
                    style={{ color: 'var(--accent)' }}
                  >
                    {u.stats?.eloRating || 1200}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                    {u.stats?.totalGames || 0}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      style={{
                        color: (u.stats?.winRate || 0) >= 50 ? '#10b981' : 'var(--text-secondary)',
                        fontWeight: 700,
                      }}
                    >
                      {(u.stats?.winRate || 0).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                      style={{
                        background:
                          (u.accountStatus || 'active') === 'active'
                            ? 'rgba(16,185,129,0.12)'
                            : 'rgba(239,68,68,0.12)',
                        color:
                          (u.accountStatus || 'active') === 'active' ? '#10b981' : '#ef4444',
                        border: `1px solid ${
                          (u.accountStatus || 'active') === 'active'
                            ? 'rgba(16,185,129,0.2)'
                            : 'rgba(239,68,68,0.2)'
                        }`,
                      }}
                    >
                      {u.accountStatus || 'active'}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3 whitespace-nowrap"
                    style={{ color: 'var(--text-dim)' }}
                  >
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {String(u._id) !== String(currentUserId) && (
                      <button
                        onClick={() => onToggleStatus(u._id, u.accountStatus || 'active')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all hover:scale-105"
                        style={{
                          background:
                            (u.accountStatus || 'active') === 'suspended'
                              ? 'rgba(16,185,129,0.12)'
                              : 'rgba(239,68,68,0.1)',
                          color:
                            (u.accountStatus || 'active') === 'suspended'
                              ? '#10b981'
                              : '#ef4444',
                          border: `1px solid ${
                            (u.accountStatus || 'active') === 'suspended'
                              ? 'rgba(16,185,129,0.2)'
                              : 'rgba(239,68,68,0.2)'
                          }`,
                        }}
                      >
                        {(u.accountStatus || 'active') === 'suspended' ? (
                          <>
                            <CheckCircle className="w-3 h-3" /> Activate
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" /> Suspend
                          </>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center" style={{ color: 'var(--text-dim)' }}>
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3 border-t"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
              Page {page} of {pages}
            </span>
            <div className="flex gap-1">
              <button
                disabled={page === 1}
                onClick={() => onPageChange(page - 1)}
                className="btn btn-sm px-3 py-1 text-[10px] disabled:opacity-30"
              >
                Prev
              </button>
              <button
                disabled={page >= pages}
                onClick={() => onPageChange(page + 1)}
                className="btn btn-sm px-3 py-1 text-[10px] disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GamesTab({ games, onRefresh }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
          Last {games.length} games across platform
        </span>
        <button
          onClick={onRefresh}
          className="btn btn-sm flex items-center gap-1.5 px-3 py-1.5 text-[11px]"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  background: 'var(--bg-elevated)',
                }}
              >
                {['Player', 'vs Opponent', 'Mode', 'Result', 'Accuracy', 'Moves', 'Date'].map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left font-bold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: 'var(--text-dim)', fontSize: '9px' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {games.map(g => (
                <tr
                  key={g._id}
                  className="transition-colors hover:bg-white/[0.01]"
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                      >
                        {g.userId?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {g.userId?.name || 'Unknown'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                    {g.opponent?.name || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                      style={{
                        background:
                          g.gameMode === 'ai'
                            ? 'rgba(99,102,241,0.12)'
                            : g.gameMode === 'multiplayer'
                            ? 'rgba(245,158,11,0.12)'
                            : 'rgba(16,185,129,0.12)',
                        color:
                          g.gameMode === 'ai'
                            ? '#6366f1'
                            : g.gameMode === 'multiplayer'
                            ? '#f59e0b'
                            : '#10b981',
                      }}
                    >
                      {(g.gameMode || 'ai').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="font-bold"
                      style={{
                        color:
                          g.result === 'win'
                            ? '#10b981'
                            : g.result === 'loss'
                            ? '#ef4444'
                            : '#f59e0b',
                      }}
                    >
                      {g.result?.toUpperCase() || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {g.analysis?.totalAccuracy != null
                        ? `${g.analysis.totalAccuracy}%`
                        : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                    {g.moves?.length || 0}
                  </td>
                  <td
                    className="px-4 py-3 whitespace-nowrap"
                    style={{ color: 'var(--text-dim)' }}
                  >
                    {g.gameDate ? new Date(g.gameDate).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
              {!games.length && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center" style={{ color: 'var(--text-dim)' }}>
                    No games yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SystemTab({ stats }) {
  if (!stats) return null;
  const { memory, mongodb, uptime, ollama, live } = stats;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Server */}
        <div
          className="rounded-2xl border p-5"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-4 h-4" style={{ color: '#10b981' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Server
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--text-dim)' }}>Status</span>
              <span className="flex items-center gap-1.5 text-[10px] font-bold" style={{ color: '#10b981' }}>
                <LiveDot /> Online
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--text-dim)' }}>Uptime</span>
              <span className="text-[11px] font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                {formatUptime(uptime)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--text-dim)' }}>Connections</span>
              <span className="text-[11px] font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                {live.onlineUsers}
              </span>
            </div>
          </div>
        </div>

        {/* MongoDB */}
        <div
          className="rounded-2xl border p-5"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Database
              className="w-4 h-4"
              style={{ color: mongodb === 'connected' ? '#10b981' : '#ef4444' }}
            />
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              MongoDB
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--text-dim)' }}>Connection</span>
              <span
                className="flex items-center gap-1.5 text-[10px] font-bold"
                style={{ color: mongodb === 'connected' ? '#10b981' : '#ef4444' }}
              >
                <LiveDot color={mongodb === 'connected' ? '#10b981' : '#ef4444'} />
                {mongodb}
              </span>
            </div>
          </div>
        </div>

        {/* Memory */}
        <div
          className="rounded-2xl border p-5"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-4 h-4" style={{ color: '#6366f1' }} />
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Memory
            </span>
          </div>
          <div className="space-y-3">
            {[
              { label: 'RSS', value: `${memory?.rss} MB` },
              { label: 'Heap Used', value: `${memory?.heapUsed} MB` },
              { label: 'Heap Total', value: `${memory?.heapTotal} MB` },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                  {item.label}
                </span>
                <span
                  className="text-[11px] font-bold font-mono"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ollama */}
      <div
        className="rounded-2xl border p-5"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="w-4 h-4" style={{ color: '#8b5cf6' }} />
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            AI Commentary — Ollama
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span
              className="text-[10px] uppercase font-bold tracking-wider"
              style={{ color: 'var(--text-dim)' }}
            >
              Model
            </span>
            <div
              className="text-sm font-bold font-mono mt-1"
              style={{ color: 'var(--text-primary)' }}
            >
              {ollama?.model || 'llama3.2:1b'}
            </div>
          </div>
          <div>
            <span
              className="text-[10px] uppercase font-bold tracking-wider"
              style={{ color: 'var(--text-dim)' }}
            >
              Endpoint
            </span>
            <div
              className="text-xs font-mono mt-1 break-all"
              style={{ color: 'var(--text-secondary)' }}
            >
              {ollama?.baseURL || 'http://localhost:11434/v1'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main AdminPanel ───────────────────────────────────────────────────────────

export default function AdminPanel({ onExitAdmin }) {
  const { token, user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPages, setUserPages] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const [recentGames, setRecentGames] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const eventsRef = useRef([]);
  const socketRef = useRef(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setStats(await res.json());
        setLastRefresh(new Date());
        setLoading(false);
      }
    } catch (_) {}
  }, [token]);

  const fetchUsers = useCallback(async (page = 1, search = '') => {
    try {
      const res = await fetch(
        `/api/admin/users?page=${page}&search=${encodeURIComponent(search)}&limit=15`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setUserTotal(data.total);
        setUserPages(data.pages);
      }
    } catch (_) {}
  }, [token]);

  const fetchRecentGames = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/games/recent', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRecentGames(data.games);
      }
    } catch (_) {}
  }, [token]);

  // Socket for live admin events
  useEffect(() => {
    const socket = io('/', { auth: { token } });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('adminJoin'));
    socket.on('adminEvent', event => {
      const updated = [event, ...eventsRef.current].slice(0, 100);
      eventsRef.current = updated;
      setEvents([...updated]);
      fetchStats();
    });
    return () => socket.disconnect();
  }, [token, fetchStats]);

  // Initial load + 5s polling for stats
  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchRecentGames();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchUsers, fetchRecentGames]);

  // Debounced user search
  useEffect(() => {
    const t = setTimeout(() => {
      setUserPage(1);
      fetchUsers(1, searchQuery);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, fetchUsers]);

  async function toggleUserStatus(userId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchUsers(userPage, searchQuery);
        fetchStats();
      }
    } catch (_) {}
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'games', label: 'Games', icon: Trophy },
    { id: 'system', label: 'System', icon: Server },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 flex items-center gap-3 px-5 py-3 border-b"
        style={{
          background: 'rgba(5,8,12,0.97)',
          borderColor: 'var(--border-color)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
        >
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
            Admin Panel
          </div>
          <div className="text-[10px] font-medium" style={{ color: 'var(--text-dim)' }}>
            ChessLegends Dashboard
          </div>
        </div>
        <div
          className="flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-full text-[10px] font-bold"
          style={{
            background: 'rgba(220,38,38,0.12)',
            color: '#dc2626',
            border: '1px solid rgba(220,38,38,0.2)',
          }}
        >
          <LiveDot color="#dc2626" />
          LIVE
        </div>

        <div className="ml-auto flex items-center gap-2">
          {lastRefresh && (
            <span className="text-[10px] hidden sm:block" style={{ color: 'var(--text-dim)' }}>
              {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchStats}
            className="btn btn-ghost btn-sm p-2 rounded-xl"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
          </button>
          {onExitAdmin && (
            <button
              onClick={onExitAdmin}
              className="btn btn-sm px-3 py-1.5 rounded-xl text-[11px] font-bold"
              style={{
                background: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              Exit Admin
            </button>
          )}
          <button
            onClick={logout}
            className="btn btn-ghost btn-sm p-2 rounded-xl"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" style={{ color: 'var(--text-dim)' }} />
          </button>
        </div>
      </header>

      {/* Tab nav */}
      <div
        className="flex gap-1 px-5 py-2.5 border-b overflow-x-auto shrink-0"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => {
              setActiveTab(t.id);
              if (t.id === 'games') fetchRecentGames();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all"
            style={{
              background: activeTab === t.id ? 'var(--bg-elevated)' : 'transparent',
              color: activeTab === t.id ? 'var(--text-primary)' : 'var(--text-dim)',
              border: `1px solid ${activeTab === t.id ? 'var(--border-color)' : 'transparent'}`,
            }}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{ background: 'rgba(220,38,38,0.1)' }}
              >
                <Shield className="w-5 h-5" style={{ color: '#dc2626' }} />
              </div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                Loading admin data…
              </p>
            </div>
          </div>
        ) : (
          <div className="p-5 max-w-[1400px] mx-auto">
            {activeTab === 'overview' && (
              <OverviewTab stats={stats} events={events} />
            )}
            {activeTab === 'users' && (
              <UsersTab
                users={users}
                total={userTotal}
                page={userPage}
                pages={userPages}
                searchQuery={searchQuery}
                onSearch={setSearchQuery}
                onPageChange={p => { setUserPage(p); fetchUsers(p, searchQuery); }}
                onToggleStatus={toggleUserStatus}
                currentUserId={user?.id}
              />
            )}
            {activeTab === 'games' && (
              <GamesTab games={recentGames} onRefresh={fetchRecentGames} />
            )}
            {activeTab === 'system' && <SystemTab stats={stats} />}
          </div>
        )}
      </div>
    </div>
  );
}
