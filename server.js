/**
 * Chess Legends Backend Server
 * Express + Socket.IO server for multiplayer chess with analytics
 * 
 * Features:
 * - JWT authentication
 * - MongoDB database integration
 * - Real-time multiplayer via Socket.IO
 * - OpenAI-powered chat commentary
 * - Prometheus metrics endpoint
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import OpenAI from 'openai';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Chess } from 'chess.js';
import promClient from 'prom-client';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';
import Game from './models/Game.js';
import Performance from './models/Performance.js';
import GameRoom from './models/GameRoom.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const port = process.env.PORT || 3001;

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chess-legends')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// ===== PROMETHEUS METRICS SETUP =====
const metricsRegister = new promClient.Registry();
metricsRegister.setDefaultLabels({ app: 'chess-legends' });
promClient.collectDefaultMetrics({ register: metricsRegister });

// ── Custom metrics ──

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [metricsRegister],
});

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [metricsRegister],
});

const wsConnectionsActive = new promClient.Gauge({
  name: 'ws_connections_active',
  help: 'Number of active WebSocket connections',
  registers: [metricsRegister],
});

const wsEventsTotal = new promClient.Counter({
  name: 'ws_events_total',
  help: 'Total WebSocket events processed',
  labelNames: ['event'],
  registers: [metricsRegister],
});

const gamesPlayedTotal = new promClient.Counter({
  name: 'games_played_total',
  help: 'Total games completed',
  labelNames: ['mode', 'result'],
  registers: [metricsRegister],
});

const activeRoomsGauge = new promClient.Gauge({
  name: 'multiplayer_rooms_active',
  help: 'Number of active multiplayer rooms',
  registers: [metricsRegister],
});

const movesProcessedTotal = new promClient.Counter({
  name: 'moves_processed_total',
  help: 'Total chess moves processed (validated)',
  labelNames: ['source'],
  registers: [metricsRegister],
});

const authAttemptsTotal = new promClient.Counter({
  name: 'auth_attempts_total',
  help: 'Authentication attempts',
  labelNames: ['type', 'result'],
  registers: [metricsRegister],
});

const llmRequestDuration = new promClient.Histogram({
  name: 'llm_request_duration_seconds',
  help: 'Duration of OpenAI LLM calls',
  buckets: [0.5, 1, 2, 5, 10, 20],
  registers: [metricsRegister],
});

const mongoConnectionState = new promClient.Gauge({
  name: 'mongodb_connection_state',
  help: 'MongoDB connection state (0=disconnected, 1=connected, 2=connecting, 3=disconnecting)',
  registers: [metricsRegister],
});

// ── HTTP Metrics Middleware (excludes /metrics and /health endpoints) ──
app.use((req, res, next) => {
  if (req.path === '/metrics' || req.path === '/health' || req.path === '/ready') {
    return next();
  }
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const route = req.route?.path || req.path;
    const labels = { method: req.method, route, status_code: res.statusCode };
    end(labels);
    httpRequestsTotal.inc(labels);
  });
  next();
});

// ── Health check endpoint ──
app.get('/health', async (req, res) => {
  const mongoState = mongoose.connection.readyState;
  const mongoOk = mongoState === 1;

  const checks = {
    status: mongoOk ? 'healthy' : 'degraded',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    checks: {
      mongodb: {
        status: mongoOk ? 'up' : 'down',
        state: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoState] || 'unknown',
      },
      socketio: {
        status: 'up',
        connections: io.engine?.clientsCount || 0,
      },
      openai: {
        status: process.env.OPENAI_API_KEY ? 'configured' : 'missing_api_key',
        model: OPENAI_MODEL,
      },
    },
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
    },
  };

  res.status(mongoOk ? 200 : 503).json(checks);
});

// ── Readiness probe (for k8s / load balancers) ──
app.get('/ready', async (req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  if (mongoOk) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready', reason: 'MongoDB not connected' });
  }
});

// ── OpenMetrics / Prometheus scrape endpoint ──
app.get('/metrics', async (req, res) => {
  // Update point-in-time gauges before scrape
  mongoConnectionState.set(mongoose.connection.readyState);
  wsConnectionsActive.set(io.engine?.clientsCount || 0);

  try {
    const activeRooms = await GameRoom.countDocuments({ status: 'active' }).catch(() => 0);
    activeRoomsGauge.set(activeRooms);
  } catch (e) { /* ignore */ }

  res.set('Content-Type', metricsRegister.contentType);
  res.end(await metricsRegister.metrics());
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, jwtSecret);
    req.userId = decoded.id;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ===== AUTHENTICATION ROUTES =====

/**
 * POST /api/auth/signup
 * Create a new user account
 */
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, passwordConfirm, name } = req.body;
    
    if (password !== passwordConfirm) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const user = new User({ email, password, name, avatar: name[0].toUpperCase() });
    await user.save();

    const token = jwt.sign({ id: user._id }, jwtSecret, { expiresIn: '7d' });
    authAttemptsTotal.inc({ type: 'signup', result: 'success' });
    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        stats: user.stats
      }
    });
  } catch (error) {
    authAttemptsTotal.inc({ type: 'signup', result: 'error' });
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      authAttemptsTotal.inc({ type: 'login', result: 'invalid' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, jwtSecret, { expiresIn: '7d' });
    authAttemptsTotal.inc({ type: 'login', result: 'success' });
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        stats: user.stats
      }
    });
  } catch (error) {
    authAttemptsTotal.inc({ type: 'login', result: 'error' });
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth/profile
 * Fetch authenticated user's profile with fresh data from database
 */
app.get('/api/auth/profile', verifyToken, async (req, res) => {
  try {
    // Force fresh read from database, bypass any caching
    const user = await User.findById(req.userId).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    console.log('Profile endpoint returning stats:', {
      totalGames: user.stats?.totalGames,
      wins: user.stats?.wins,
      winRate: user.stats?.winRate,
      averageAccuracy: user.moveAnalysis?.averageAccuracy
    });
    
    res.json({ 
      user: { 
        id: user._id, 
        email: user.email, 
        name: user.name,
        avatar: user.avatar,
        stats: user.stats,
        moveAnalysis: user.moveAnalysis,
        createdAt: user.createdAt 
      } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/debug/user-stats
 * Debug endpoint to check user statistics and raw data
 */
app.get('/api/debug/user-stats', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const games = await Game.countDocuments({ userId: req.userId });
    
    res.json({
      userId: user._id,
      name: user.name,
      email: user.email,
      stats: user.stats,
      moveAnalysis: user.moveAnalysis,
      gameCount: games,
      _raw_stats: JSON.parse(JSON.stringify(user.stats)), // Force stringify/parse to see raw data
      _raw_moveAnalysis: JSON.parse(JSON.stringify(user.moveAnalysis))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== GAME TRACKING ROUTES =====

/**
 * POST /api/games/save
 * Save completed game and update user statistics
 */
app.post('/api/games/save', verifyToken, async (req, res) => {
  try {
    console.log('=== GAME SAVE ENDPOINT ===');
    const { 
      opponent, 
      opponentElo, 
      playerColor, 
      result, 
      moves, 
      duration, 
      openingName,
      gameMode = 'ai',
      difficulty = 'medium',
      resultDetails = 'stopped'
    } = req.body;
    
    console.log('Request data:', { opponent, opponentElo, playerColor, result, movesCount: moves?.length, duration, gameMode, difficulty });
    
    if (!moves || moves.length === 0) {
      return res.status(400).json({ error: 'No moves provided' });
    }

    const gameAccuracy = calculateAccuracy(moves);
    console.log('Game accuracy:', gameAccuracy);
    
    // Count move types
    const blunderCount = moves.filter(m => m.moveType === 'blunder').length;
    const tacticalCount = moves.filter(m => m.moveType === 'tactical').length;
    const strategicCount = moves.filter(m => m.moveType === 'strategic').length;
    const bestCount = moves.filter(m => m.moveType === 'best').length;
    
    const game = new Game({
      userId: req.userId,
      gameMode,
      difficulty,
      opponent: {
        name: opponent,
        type: gameMode === 'ai' ? 'stockfish' : 'human',
        elo: opponentElo
      },
      opponentElo,
      playerColor,
      result,
      resultDetails,
      moves,
      duration,
      openingName: openingName || 'Unknown Opening',
      gameDate: new Date(),
      startTime: new Date(),
      endTime: new Date(),
      analysis: {
        totalAccuracy: gameAccuracy,
        blunderCount,
        tacticalCount,
        bestMoveCount: bestCount,
        strategicCount,
        tacticalOpportunities: tacticalCount + blunderCount
      }
    });

    await game.save();
    gamesPlayedTotal.inc({ mode: gameMode, result: result || 'unknown' });
    console.log('Game saved to database');

    // Get fresh user data
    const user = await User.findById(req.userId);
    if (!user) {
      throw new Error('User not found');
    }

    console.log('Current user stats before update:', user.stats);

    // Ensure stats object exists and has all fields
    if (!user.stats) {
      user.stats = {
        totalGames: 0, wins: 0, losses: 0, draws: 0,
        totalMoves: 0, avgMoveTime: 0, winRate: 0,
        favoriteOpponent: null, eloRating: 1200
      };
    }

    if (!user.moveAnalysis) {
      user.moveAnalysis = {
        tacticalMoves: 0, strategicMoves: 0,
        blunders: 0, bestMoves: 0, averageAccuracy: 0
      };
    }

    // Update stats
    user.stats.totalGames = (user.stats.totalGames || 0) + 1;
    user.stats.totalMoves = (user.stats.totalMoves || 0) + moves.length;

    if (result === 'win') {
      user.stats.wins = (user.stats.wins || 0) + 1;
      // Update win streak
      user.currentWinStreak = (user.currentWinStreak || 0) + 1;
      user.currentLossStreak = 0;
      // Update best win streak
      if (user.currentWinStreak > user.bestWinStreak) {
        user.bestWinStreak = user.currentWinStreak;
      }
    } else if (result === 'loss') {
      user.stats.losses = (user.stats.losses || 0) + 1;
      // Update loss streak
      user.currentLossStreak = (user.currentLossStreak || 0) + 1;
      user.currentWinStreak = 0;
    } else if (result === 'draw') {
      user.stats.draws = (user.stats.draws || 0) + 1;
      // Draws don't affect streaks
    }

    // Calculate win rate SAFELY
    const totalGames = user.stats.totalGames;
    if (totalGames > 0) {
      const winPercentage = (user.stats.wins / totalGames) * 100;
      user.stats.winRate = Math.round(winPercentage);
      console.log(`Calculating win rate: ${user.stats.wins} wins / ${totalGames} games = ${winPercentage}% = ${user.stats.winRate}%`);
    } else {
      user.stats.winRate = 0;
    }
    user.stats.favoriteOpponent = opponent;

    // Update move analysis (using move type counts from lines 203-206)
    user.moveAnalysis.blunders = (user.moveAnalysis.blunders || 0) + blunderCount;
    user.moveAnalysis.tacticalMoves = (user.moveAnalysis.tacticalMoves || 0) + tacticalCount;
    user.moveAnalysis.strategicMoves = (user.moveAnalysis.strategicMoves || 0) + strategicCount;
    user.moveAnalysis.bestMoves = (user.moveAnalysis.bestMoves || 0) + bestCount;

    // Calculate average accuracy - with detailed logging
    console.log('Calculating accuracy for game with', moves.length, 'moves');
    console.log('Move accuracies:', moves.map(m => ({ san: m.san, accuracy: m.accuracy })));
    
    if (user.stats.totalGames === 1) {
      user.moveAnalysis.averageAccuracy = gameAccuracy;
      console.log('First game - setting average accuracy to:', gameAccuracy);
    } else {
      const allGames = await Game.find({ userId: req.userId });
      const allAccuracies = allGames
        .filter(g => g.analysis && g.analysis.totalAccuracy !== undefined)
        .map(g => g.analysis.totalAccuracy);
      allAccuracies.push(gameAccuracy);
      
      const avgAccuracy = Math.round(
        allAccuracies.reduce((sum, acc) => sum + acc, 0) / (allAccuracies.length || 1)
      );
      user.moveAnalysis.averageAccuracy = avgAccuracy;
      console.log('Multiple games - prior games accuracies:', allGames.map(g => g.analysis?.totalAccuracy), 'new accuracy:', gameAccuracy, 'average:', avgAccuracy);
    }

    if (!user.gameHistory) {
      user.gameHistory = [];
    }
    user.gameHistory.push(game._id);
    
    // Keep recent games list (last 10 games)
    if (!user.recentGames) {
      user.recentGames = [];
    }
    user.recentGames.unshift(game._id); // Add to beginning
    if (user.recentGames.length > 10) {
      user.recentGames.pop(); // Remove oldest if > 10
    }
    
    // Update last game played
    user.lastGamePlayed = new Date();

    // Force Mongoose to recognize changes
    user.markModified('stats');
    user.markModified('moveAnalysis');
    user.markModified('gameHistory');
    user.markModified('recentGames');

    const savedUser = await user.save();
    
    console.log('User stats after update:', {
      totalGames: savedUser.stats.totalGames,
      wins: savedUser.stats.wins,
      losses: savedUser.stats.losses,
      draws: savedUser.stats.draws,
      winRate: savedUser.stats.winRate,
      averageAccuracy: savedUser.moveAnalysis.averageAccuracy,
      blunders: savedUser.moveAnalysis.blunders,
      tactical: savedUser.moveAnalysis.tacticalMoves,
      strategic: savedUser.moveAnalysis.strategicMoves,
      best: savedUser.moveAnalysis.bestMoves
    });

    // CRITICAL: Also use updateOne as backup to ensure the update is persisted
    await User.updateOne(
      { _id: req.userId },
      {
        $set: {
          'stats.totalGames': savedUser.stats.totalGames,
          'stats.wins': savedUser.stats.wins,
          'stats.losses': savedUser.stats.losses,
          'stats.draws': savedUser.stats.draws,
          'stats.totalMoves': savedUser.stats.totalMoves,
          'stats.winRate': savedUser.stats.winRate,
          'stats.favoriteOpponent': savedUser.stats.favoriteOpponent,
          'moveAnalysis.blunders': savedUser.moveAnalysis.blunders,
          'moveAnalysis.tacticalMoves': savedUser.moveAnalysis.tacticalMoves,
          'moveAnalysis.strategicMoves': savedUser.moveAnalysis.strategicMoves,
          'moveAnalysis.bestMoves': savedUser.moveAnalysis.bestMoves,
          'moveAnalysis.averageAccuracy': savedUser.moveAnalysis.averageAccuracy,
          'currentWinStreak': savedUser.currentWinStreak || 0,
          'bestWinStreak': savedUser.bestWinStreak || 0,
          'currentLossStreak': savedUser.currentLossStreak || 0,
          'lastGamePlayed': new Date()
        }
      }
    );
    
    console.log('Backup update with $set operator completed');

    // Update or create performance stats
    let performance = await Performance.findOne({ userId: req.userId });
    if (!performance) {
      performance = new Performance({
        userId: req.userId,
        moveTypeDistribution: {
          blunders: 0,
          tactical: 0,
          strategic: 0,
          best: 0
        }
      });
    }

    // Ensure moveTypeDistribution exists
    if (!performance.moveTypeDistribution) {
      performance.moveTypeDistribution = {
        blunders: 0, tactical: 0, strategic: 0, best: 0
      };
    }

    performance.moveTypeDistribution.blunders = (performance.moveTypeDistribution.blunders || 0) + blunderCount;
    performance.moveTypeDistribution.tactical = (performance.moveTypeDistribution.tactical || 0) + tacticalCount;
    performance.moveTypeDistribution.strategic = (performance.moveTypeDistribution.strategic || 0) + strategicCount;
    performance.moveTypeDistribution.best = (performance.moveTypeDistribution.best || 0) + bestCount;

    performance.markModified('moveTypeDistribution');
    await performance.save();

    console.log('=== GAME SAVE COMPLETE ===');

    // Re-fetch user to ensure we're returning the latest saved data
    const updatedUser = await User.findById(req.userId);
    
    res.json({
      success: true,
      game,
      userStats: updatedUser.stats,
      moveAnalysis: updatedUser.moveAnalysis,
      message: 'Game saved and stats updated'
    });

  } catch (error) {
    console.error('Game save error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/games/history
 * Retrieve user's recent game history
 */
app.get('/api/games/history', verifyToken, async (req, res) => {
  try {
    const games = await Game.find({ userId: req.userId })
      .sort({ gameDate: -1 })
      .limit(50);
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/stats/performance
 * Retrieve user's performance analytics
 */
app.get('/api/stats/performance', verifyToken, async (req, res) => {
  try {
    const performance = await Performance.findOne({ userId: req.userId });
    if (!performance) {
      return res.status(404).json({ error: 'Performance data not found' });
    }
    res.json(performance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/comprehensive
 * Get comprehensive analytics including stats, moves, opponents, and trends
 */
app.get('/api/analytics/comprehensive', verifyToken, async (req, res) => {
  try {
    // Fetch all games for this user
    const games = await Game.find({ userId: req.userId }).sort({ gameDate: -1 });
    
    console.log(`[Analytics] Found ${games.length} games for user ${req.userId}`);
    
    if (!games || games.length === 0) {
      console.log('[Analytics] No games found, returning empty stats');
      return res.json({
        stats: {
          totalGames: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          winRate: 0,
          averageAccuracy: 0,
          averageElo: 1200,
          totalMoves: 0,
          currentWinStreak: 0,
          bestWinStreak: 0
        },
        moves: {
          blunders: 0,
          tactical: 0,
          strategic: 0,
          bestMoves: 0,
          totalMoves: 0,
          tacticalAccuracy: 0
        },
        opponents: {},
        colors: {
          asWhite: { games: 0, wins: 0, losses: 0, draws: 0, winRate: 0, avgAccuracy: 0 },
          asBlack: { games: 0, wins: 0, losses: 0, draws: 0, winRate: 0, avgAccuracy: 0 }
        },
        trends: { accuracyTrend: [], resultTrend: [], dates: [] },
        openings: {}
      });
    }

    // Process games data locally
    const analytics = processAnalytics(games);
    
    console.log('[Analytics] Calculated stats:', {
      totalGames: analytics.stats.totalGames,
      wins: analytics.stats.wins,
      losses: analytics.stats.losses,
      winRate: analytics.stats.winRate,
      avgAccuracy: analytics.stats.averageAccuracy
    });
    
    res.json(analytics);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Process raw game data into structured analytics
 * @param {Array} games - Array of game documents
 * @returns {object} - Processed analytics object
 */
function processAnalytics(games) {
  console.log('[processAnalytics] Starting analysis of', games.length, 'games');
  
  // First game check
  if (games.length > 0) {
    console.log('[processAnalytics] First game structure:', {
      result: games[0].result,
      resultType: typeof games[0].result,
      accuracy: games[0].analysis?.totalAccuracy,
      movesCount: games[0].moves?.length,
      opponent: games[0].opponent
    });
  }

  const stats = {
    totalGames: games.length,
    wins: 0,
    losses: 0,
    draws: 0,
    winRate: 0,
    averageAccuracy: 0,
    averageElo: 1200,
    totalMoves: 0,
    currentWinStreak: 0,
    bestWinStreak: 0
  };

  let totalAccuracy = 0;
  let accuracyCount = 0;
  let currentStreak = 0;
  let bestStreak = 0;

  const moves = {
    blunders: 0,
    tactical: 0,
    strategic: 0,
    bestMoves: 0,
    totalMoves: 0,
    tacticalAccuracy: 0
  };

  const opponents = {};
  const colorStats = {
    asWhite: { games: 0, wins: 0, losses: 0, draws: 0, totalAccuracy: 0 },
    asBlack: { games: 0, wins: 0, losses: 0, draws: 0, totalAccuracy: 0 }
  };

  const openings = {};
  const accuracyTrend = [];

  // Process each game
  for (const game of games) {
    const result = (game.result || 'draw').toLowerCase();
    
    // Map result to stats fields (win->wins, loss->losses, draw->draws)
    if (result === 'win') {
      stats.wins++;
    } else if (result === 'loss') {
      stats.losses++;
    } else if (result === 'draw') {
      stats.draws++;
    }

    // Win streak tracking
    if (result === 'win') {
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }

    // Accuracy - use analysis.totalAccuracy (can be 0)
    let gameAccuracy = 0;
    if (game.analysis && game.analysis.totalAccuracy !== undefined) {
      gameAccuracy = game.analysis.totalAccuracy;
    } else if (game.accuracy !== undefined) {
      // Fallback to top-level accuracy field
      gameAccuracy = game.accuracy;
    }
    
    if (gameAccuracy >= 0) {
      totalAccuracy += gameAccuracy;
      accuracyCount++;
      accuracyTrend.push(gameAccuracy);
    }

    // Total moves
    const gameMoves = game.moves || [];
    stats.totalMoves += gameMoves.length;

    // Move classification
    for (const move of gameMoves) {
      const moveType = (move.moveType || 'strategic').toLowerCase();
      if (moveType === 'blunder') {
        moves.blunders++;
      } else if (moveType === 'tactical') {
        moves.tactical++;
      } else if (moveType === 'strategic') {
        moves.strategic++;
      } else if (moveType === 'best') {
        moves.bestMoves++;
      } else {
        moves.strategic++;
      }
      moves.totalMoves++;
    }

    // Opponent stats
    const opponentName = typeof game.opponent === 'string' ? game.opponent : (game.opponent?.name || 'Unknown');
    if (!opponents[opponentName]) {
      opponents[opponentName] = { wins: 0, losses: 0, draws: 0, games: 0, totalAccuracy: 0 };
    }
    if (result === 'win') {
      opponents[opponentName].wins++;
    } else if (result === 'loss') {
      opponents[opponentName].losses++;
    } else if (result === 'draw') {
      opponents[opponentName].draws++;
    }
    opponents[opponentName].games++;
    opponents[opponentName].totalAccuracy += gameAccuracy;

    // Color stats
    const color = game.playerColor === 'w' ? 'asWhite' : 'asBlack';
    colorStats[color].games++;
    if (result === 'win') {
      colorStats[color].wins++;
    } else if (result === 'loss') {
      colorStats[color].losses++;
    } else if (result === 'draw') {
      colorStats[color].draws++;
    }
    colorStats[color].totalAccuracy += gameAccuracy;

    // Opening stats
    const opening = game.openingName || 'Unknown';
    if (!openings[opening]) {
      openings[opening] = { wins: 0, losses: 0, draws: 0, games: 0, totalAccuracy: 0 };
    }
    if (result === 'win') {
      openings[opening].wins++;
    } else if (result === 'loss') {
      openings[opening].losses++;
    } else if (result === 'draw') {
      openings[opening].draws++;
    }
    openings[opening].games++;
    openings[opening].totalAccuracy += gameAccuracy;
  }

  // Calculate final stats
  stats.winRate = stats.totalGames > 0 ? Math.round((stats.wins / stats.totalGames) * 100) : 0;
  stats.averageAccuracy = accuracyCount > 0 ? Math.round(totalAccuracy / accuracyCount) : 0;
  stats.currentWinStreak = currentStreak;
  stats.bestWinStreak = bestStreak;

  // Calculate move accuracy
  moves.tacticalAccuracy = moves.totalMoves > 0 ? Math.round((moves.tactical / moves.totalMoves) * 100) : 0;

  // Calculate opponent win rates
  for (const opponent in opponents) {
    const opp = opponents[opponent];
    opp.winRate = opp.games > 0 ? Math.round((opp.wins / opp.games) * 100) : 0;
    opp.avgAccuracy = opp.games > 0 ? Math.round(opp.totalAccuracy / opp.games) : 0;
    delete opp.totalAccuracy;
  }

  // Calculate color win rates
  for (const color in colorStats) {
    const cols = colorStats[color];
    cols.winRate = cols.games > 0 ? Math.round((cols.wins / cols.games) * 100) : 0;
    cols.avgAccuracy = cols.games > 0 ? Math.round(cols.totalAccuracy / cols.games) : 0;
    delete cols.totalAccuracy;
  }

  // Calculate opening win rates
  for (const opening in openings) {
    const op = openings[opening];
    op.winRate = op.games > 0 ? Math.round((op.wins / op.games) * 100) : 0;
    op.avgAccuracy = op.games > 0 ? Math.round(op.totalAccuracy / op.games) : 0;
    delete op.totalAccuracy;
  }

  console.log('[processAnalytics] Final stats:', {
    totalGames: stats.totalGames,
    wins: stats.wins,
    losses: stats.losses,
    draws: stats.draws,
    winRate: stats.winRate,
    avgAccuracy: stats.averageAccuracy,
    totalMoves: stats.totalMoves
  });

  return {
    stats,
    moves,
    opponents,
    colors: colorStats,
    trends: { accuracyTrend: accuracyTrend.slice(-10), dates: games.slice(-10).map(g => g.gameDate) },
    openings
  };
}

/**
 * Calculate game accuracy based on move analysis
 * @param {Array} moves - Array of moves with accuracy and moveType
 * @returns {number} - Average accuracy percentage
 */
function calculateAccuracy(moves) {
  if (moves.length === 0) return 0;
  
  const accuracies = moves.map(m => m.accuracy || 0).filter(a => a > 0);
  
  // If no valid accuracies found, assign reasonable defaults based on move type
  if (accuracies.length === 0) {
    const defaultAccuracies = moves.map(m => {
      if (m.moveType === 'best') return 100;
      if (m.moveType === 'tactical') return 85;
      if (m.moveType === 'strategic') return 75;
      if (m.moveType === 'blunder') return 25;
      return 75; // default
    });
    return Math.round(defaultAccuracies.reduce((sum, a) => sum + a, 0) / defaultAccuracies.length);
  }
  
  // If we have some accuracies, use them
  const totalAccuracy = accuracies.reduce((sum, m) => sum + m, 0);
  return Math.round(totalAccuracy / accuracies.length);
}

// ===== OPENAI CHAT ENDPOINT =====

/**
 * POST /api/chat
 * Stream AI commentary responses via OpenAI ChatGPT
 * Converts client format to OpenAI format and streams response as SSE
 */
app.post('/api/chat', async (req, res) => {
  const llmTimer = llmRequestDuration.startTimer();
  const { messages, systemInstruction } = req.body;

  try {
    // Build OpenAI message array from the client's Gemini-style format
    const openaiMessages = [];

    // System prompt
    if (systemInstruction) {
      openaiMessages.push({ role: 'system', content: systemInstruction });
    }

    // Chat history + latest message
    for (const m of messages) {
      openaiMessages.push({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: m.parts[0].text,
      });
    }

    // Call OpenAI streaming API
    const stream = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: openaiMessages,
      stream: true,
      temperature: 1.0,
      max_tokens: 256,
    });

    // Setup SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Stream OpenAI response as SSE to the client
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
      }
      if (chunk.choices[0]?.finish_reason) {
        res.write('data: [DONE]\n\n');
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
    llmTimer();

  } catch (error) {
    llmTimer();
    console.error('OpenAI API Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.end();
    }
  }
});

// ===== MULTIPLAYER ROOM ROUTES =====

/**
 * POST /api/rooms/create
 * Create a new multiplayer game room and return room code
 */
app.post('/api/rooms/create', verifyToken, async (req, res) => {
  try {
    const { timeControl, colorPreference } = req.body || {};

    // Clean up any old waiting/completed rooms by this host first
    await GameRoom.deleteMany({
      host: req.userId,
      status: { $in: ['waiting', 'completed', 'aborted'] }
    });

    // Determine host color based on preference
    let hostColor = 'w';
    if (colorPreference === 'b') hostColor = 'b';
    else if (colorPreference === 'random') hostColor = Math.random() < 0.5 ? 'w' : 'b';

    // Generate a unique room code (retry if collision)
    let roomCode, saved = false;
    for (let i = 0; i < 5; i++) {
      roomCode = GameRoom.schema.statics.generateRoomCode();
      // Remove any stale room with this code
      await GameRoom.deleteOne({ roomCode });
      try {
        const roomData = {
          roomCode,
          host: req.userId,
          hostColor,
          guestColor: hostColor === 'w' ? 'b' : 'w',
        };
        // Set time control if provided
        if (timeControl && timeControl.initialTime) {
          roomData.timeControl = {
            initialTime: timeControl.initialTime,
            increment: timeControl.increment || 0,
            format: timeControl.format || 'rapid',
            label: timeControl.label || `${Math.floor(timeControl.initialTime / 60)}+${timeControl.increment || 0}`
          };
          roomData.whiteTime = timeControl.initialTime;
          roomData.blackTime = timeControl.initialTime;
        }
        const gameRoom = new GameRoom(roomData);
        await gameRoom.save();
        saved = true;
        break;
      } catch (e) {
        if (e.code !== 11000) throw e; // only retry on duplicate key
      }
    }

    if (!saved) {
      return res.status(500).json({ error: 'Could not create room, try again' });
    }

    res.json({ roomCode });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/rooms/join
 * Join an existing game room by room code
 */
app.post('/api/rooms/join', verifyToken, async (req, res) => {
  try {
    const { roomCode } = req.body;

    const gameRoom = await GameRoom.findOne({ roomCode });
    if (!gameRoom) {
      return res.status(404).json({ error: 'Room not found. Ask your friend for a new link.' });
    }

    if (gameRoom.host.toString() === req.userId) {
      return res.status(400).json({ error: 'Cannot join your own room' });
    }

    // If room is completed or already has a different guest, it's stale
    if (gameRoom.status === 'completed') {
      return res.status(400).json({ error: 'This game already ended. Ask your friend to create a new one.' });
    }

    // If guest already set and it's a different user, room is full
    if (gameRoom.guest && gameRoom.guest.toString() !== req.userId) {
      return res.status(400).json({ error: 'Room is full. Ask your friend to create a new game.' });
    }

    // Allow re-joining if you're already the guest (reconnect)
    if (!gameRoom.guest) {
      gameRoom.guest = req.userId;
      gameRoom.guestColor = gameRoom.hostColor === 'w' ? 'b' : 'w';
      gameRoom.status = 'active';
      await gameRoom.save();
    }

    const hostUser = await User.findById(gameRoom.host, 'name avatar stats');

    res.json({
      roomId: gameRoom._id,
      roomCode,
      host: { id: gameRoom.host, name: hostUser?.name || 'Host', avatar: hostUser?.avatar || '?', elo: hostUser?.stats?.eloRating || 1200 },
      hostColor: gameRoom.hostColor,
      guestColor: gameRoom.guestColor,
      status: gameRoom.status,
      timeControl: gameRoom.timeControl || null
    });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/rooms/:roomCode
 * Get details of a specific game room
 */
app.get('/api/rooms/:roomCode', verifyToken, async (req, res) => {
  try {
    const { roomCode } = req.params;
    
    const gameRoom = await GameRoom.findOne({ roomCode })
      .populate('host', 'name email avatar stats')
      .populate('guest', 'name email avatar stats');
    
    if (!gameRoom) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    res.json({
      roomCode: gameRoom.roomCode,
      roomId: gameRoom._id,
      host: gameRoom.host,
      guest: gameRoom.guest,
      status: gameRoom.status,
      hostColor: gameRoom.hostColor,
      guestColor: gameRoom.guestColor,
      currentFen: gameRoom.currentFen,
      moves: gameRoom.moves,
      result: gameRoom.result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/rooms/:roomCode/move
 * Make a move in a room (REST fallback - moves primarily go through Socket.IO)
 */
app.post('/api/rooms/:roomCode/move', verifyToken, async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { san } = req.body;

    const gameRoom = await GameRoom.findOne({ roomCode });
    if (!gameRoom) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (gameRoom.status !== 'active') {
      return res.status(400).json({ error: 'Game is not active' });
    }

    // Server-side validation with chess.js
    const chess = new Chess(gameRoom.currentFen);
    let moveObj;
    try {
      moveObj = chess.move(san);
    } catch (e) {
      return res.status(400).json({ error: 'Illegal move' });
    }
    if (!moveObj) {
      return res.status(400).json({ error: 'Illegal move' });
    }

    gameRoom.moves.push({
      moveNumber: gameRoom.moves.length + 1,
      san: moveObj.san,
      fen: chess.fen(),
      madeBy: req.userId,
      timestamp: new Date()
    });
    gameRoom.currentFen = chess.fen();
    await gameRoom.save();

    res.json({ success: true, fen: chess.fen() });
  } catch (error) {
    console.error('Make move error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/rooms/list/active
 * Get list of user's active rooms (as host or guest)
 */
app.get('/api/rooms/list/active', verifyToken, async (req, res) => {
  try {
    const rooms = await GameRoom.find({
      $or: [
        { host: req.userId },
        { guest: req.userId }
      ],
      status: { $in: ['waiting', 'active'] }
    })
    .populate('host', 'name avatar')
    .populate('guest', 'name avatar')
    .sort({ createdAt: -1 });
    
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== SOCKET.IO EVENT HANDLERS =====

// Map socket IDs to user/room information for disconnect handling
const socketUserMap = new Map();

// Socket.IO middleware - authenticate connections via JWT
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    // Allow unauthenticated connections but mark them
    socket.userId = null;
    return next();
  }
  try {
    const decoded = jwt.verify(token, jwtSecret);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    socket.userId = null;
    next();
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id, 'userId:', socket.userId);
  wsConnectionsActive.inc();
  wsEventsTotal.inc({ event: 'connection' });

  /**
   * Handle room join request
   * Syncs game state to joining player and notifies existing players
   */
  socket.on('joinRoom', async (roomCode) => {
    if (!roomCode) return;
    socket.join(roomCode);

    // Track this socket's room for disconnect handling
    socketUserMap.set(socket.id, { userId: socket.userId, roomCode });

    console.log(`Socket ${socket.id} (user ${socket.userId}) joined room ${roomCode}`);

    // Send current board state to the joiner (handles late joins / reconnects)
    try {
      const room = await GameRoom.findOne({ roomCode });
      if (room) {
        // Calculate current remaining times if game is active and timed
        let whiteTime = room.whiteTime;
        let blackTime = room.blackTime;
        if (room.status === 'active' && room.lastMoveTimestamp && room.timeControl?.initialTime) {
          const elapsed = (Date.now() - room.lastMoveTimestamp.getTime()) / 1000;
          const chess = new Chess(room.currentFen);
          if (chess.turn() === 'w') whiteTime = Math.max(0, (whiteTime || 0) - elapsed);
          else blackTime = Math.max(0, (blackTime || 0) - elapsed);
        }
        socket.emit('gameSync', {
          fen: room.currentFen,
          moves: room.moves.map(m => m.san),
          status: room.status,
          hostColor: room.hostColor,
          guestColor: room.guestColor,
          timeControl: room.timeControl || null,
          whiteTime,
          blackTime,
          chat: (room.chat || []).map(c => ({ name: c.name, message: c.message, timestamp: c.timestamp })),
        });
      }
    } catch (e) {
      console.error('gameSync error:', e);
    }

    // Notify the room that someone joined (include name for UI)
    try {
      const joiner = await User.findById(socket.userId, 'name avatar');
      socket.to(roomCode).emit('userJoined', {
        message: 'Opponent has joined',
        userId: socket.userId,
        name: joiner?.name || 'Opponent',
        avatar: joiner?.avatar || '?'
      });
    } catch (e) {
      socket.to(roomCode).emit('userJoined', {
        message: 'Opponent has joined',
        userId: socket.userId,
        name: 'Opponent',
        avatar: '?'
      });
    }

    // Notify the joiner if opponent is already in the room
    // (fixes: guest joining never knew host was already connected)
    try {
      const socketsInRoom = await io.in(roomCode).fetchSockets();
      const otherSockets = socketsInRoom.filter(s => s.id !== socket.id && s.userId);
      if (otherSockets.length > 0) {
        const opponentSocket = otherSockets[0];
        const opponent = await User.findById(opponentSocket.userId, 'name avatar');
        socket.emit('userJoined', {
          message: 'Opponent is online',
          userId: opponentSocket.userId,
          name: opponent?.name || 'Opponent',
          avatar: opponent?.avatar || '?'
        });
      }
    } catch (e) {
      console.error('Error checking room sockets for opponent:', e);
    }
  });

  /**
   * Handle validated move submission
   * Server validates move legality, updates room state, broadcasts to opponent
   */
  socket.on('makeMove', async (data) => {
    const { roomCode, san } = data;
    if (!roomCode || !san) return;

    try {
      const room = await GameRoom.findOne({ roomCode });
      if (!room || room.status !== 'active') {
        socket.emit('moveError', { error: 'Game is not active' });
        return;
      }

      // Determine whose turn it is from the FEN
      const chess = new Chess(room.currentFen);
      const turnColor = chess.turn(); // 'w' or 'b'

      // Check if the socket user is the correct player for this turn
      const isHost = socket.userId && room.host.toString() === socket.userId;
      const isGuest = socket.userId && room.guest && room.guest.toString() === socket.userId;

      if (!isHost && !isGuest) {
        socket.emit('moveError', { error: 'You are not a player in this game' });
        return;
      }

      const playerColor = isHost ? room.hostColor : room.guestColor;
      if (playerColor !== turnColor) {
        socket.emit('moveError', { error: 'Not your turn' });
        return;
      }

      // Validate the move with chess.js
      let moveObj;
      try {
        moveObj = chess.move(san);
      } catch (e) {
        socket.emit('moveError', { error: 'Illegal move' });
        return;
      }

      if (!moveObj) {
        socket.emit('moveError', { error: 'Illegal move' });
        return;
      }

      const newFen = chess.fen();
      const now = new Date();

      // Update server-tracked time
      let whiteTime = room.whiteTime;
      let blackTime = room.blackTime;
      if (room.timeControl?.initialTime) {
        if (room.lastMoveTimestamp && room.moves.length > 0) {
          const elapsed = (now.getTime() - room.lastMoveTimestamp.getTime()) / 1000;
          if (turnColor === 'w') {
            whiteTime = Math.max(0, (whiteTime || 0) - elapsed);
            whiteTime += (room.timeControl.increment || 0);
          } else {
            blackTime = Math.max(0, (blackTime || 0) - elapsed);
            blackTime += (room.timeControl.increment || 0);
          }
        }
        room.whiteTime = whiteTime;
        room.blackTime = blackTime;
        room.lastMoveTimestamp = now;

        // Check for timeout
        if (whiteTime <= 0 || blackTime <= 0) {
          room.status = 'completed';
          room.result = whiteTime <= 0
            ? (room.hostColor === 'w' ? 'guestWin' : 'hostWin')
            : (room.hostColor === 'b' ? 'guestWin' : 'hostWin');
          room.endTime = now;
        }
      }
      // First move starts the clock
      if (room.moves.length === 0 && room.timeControl?.initialTime) {
        room.lastMoveTimestamp = now;
      }

      // Clear any pending draw offer on move
      if (room.drawOffer?.status === 'pending') {
        room.drawOffer = { offeredBy: null, status: 'none' };
      }

      // Save to DB
      room.moves.push({
        moveNumber: room.moves.length + 1,
        san: moveObj.san,
        fen: newFen,
        madeBy: socket.userId,
        timestamp: now
      });
      room.currentFen = newFen;

      // Check for game over
      if (chess.isCheckmate()) {
        room.status = 'completed';
        room.result = playerColor === room.hostColor ? 'hostWin' : 'guestWin';
        room.endTime = now;
      } else if (chess.isDraw()) {
        room.status = 'completed';
        room.result = 'draw';
        room.endTime = now;
      }

      await room.save();

      // Broadcast the validated move to the opponent
      movesProcessedTotal.inc({ source: 'socket' });
      wsEventsTotal.inc({ event: 'makeMove' });
      socket.to(roomCode).emit('opponentMove', {
        san: moveObj.san,
        fen: newFen,
        timestamp: now,
        whiteTime,
        blackTime,
      });

      // Confirm move to the sender
      socket.emit('moveConfirmed', { san: moveObj.san, fen: newFen, whiteTime, blackTime });

      // If game ended, notify both players
      if (room.status === 'completed') {
        const reason = chess.isCheckmate() ? 'checkmate' : (whiteTime <= 0 || blackTime <= 0) ? 'timeout' : 'draw';
        io.to(roomCode).emit('gameEnded', {
          result: room.result,
          reason,
          whiteTime,
          blackTime,
        });
      }
    } catch (e) {
      console.error('makeMove error:', e);
      socket.emit('moveError', { error: 'Server error' });
    }
  });

  /**
   * Handle player resignation
   */
  socket.on('resign', async (roomCode) => {
    if (!roomCode) return;

    try {
      const room = await GameRoom.findOne({ roomCode });
      if (room && room.status === 'active') {
        const isHost = socket.userId && room.host.toString() === socket.userId;
        room.status = 'completed';
        room.result = isHost ? 'guestWin' : 'hostWin';
        room.endTime = new Date();
        await room.save();
      }
    } catch (e) {
      console.error('resign DB error:', e);
    }

    socket.to(roomCode).emit('gameEnded', { result: 'opponent_resigned' });
  });

  /**
   * Handle draw offer submission
   */
  socket.on('offerDraw', async (roomCode) => {
    if (!roomCode || !socket.userId) return;
    try {
      const room = await GameRoom.findOne({ roomCode });
      if (!room || room.status !== 'active') return;
      const isHost = room.host.toString() === socket.userId;
      const isGuest = room.guest && room.guest.toString() === socket.userId;
      if (!isHost && !isGuest) return;
      // Can't offer draw if one is already pending
      if (room.drawOffer?.status === 'pending') return;
      room.drawOffer = { offeredBy: socket.userId, status: 'pending' };
      await room.save();
      const user = await User.findById(socket.userId, 'name');
      socket.to(roomCode).emit('drawOffered', { by: user?.name || 'Opponent' });
    } catch (e) {
      console.error('offerDraw error:', e);
    }
  });

  /**
   * Handle draw offer response
   */
  socket.on('respondDraw', async ({ roomCode, accept }) => {
    if (!roomCode || !socket.userId) return;
    try {
      const room = await GameRoom.findOne({ roomCode });
      if (!room || room.status !== 'active' || room.drawOffer?.status !== 'pending') return;
      // Can't respond to own offer
      if (room.drawOffer.offeredBy?.toString() === socket.userId) return;

      if (accept) {
        room.drawOffer.status = 'accepted';
        room.status = 'completed';
        room.result = 'draw';
        room.endTime = new Date();
        await room.save();
        io.to(roomCode).emit('gameEnded', { result: 'draw', reason: 'agreement' });
      } else {
        room.drawOffer = { offeredBy: null, status: 'none' };
        await room.save();
        socket.to(roomCode).emit('drawDeclined');
      }
    } catch (e) {
      console.error('respondDraw error:', e);
    }
  });

  /**
   * Handle game abort request (only allowed before 2 moves)
   */
  socket.on('abortGame', async (roomCode) => {
    if (!roomCode || !socket.userId) return;
    try {
      const room = await GameRoom.findOne({ roomCode });
      if (!room || room.status !== 'active') return;
      const isHost = room.host.toString() === socket.userId;
      const isGuest = room.guest && room.guest.toString() === socket.userId;
      if (!isHost && !isGuest) return;
      // Only allow abort if < 2 moves
      if (room.moves.length >= 2) {
        socket.emit('abortError', { error: 'Cannot abort after 2 moves. Resign instead.' });
        return;
      }
      room.status = 'aborted';
      room.result = 'aborted';
      room.endTime = new Date();
      await room.save();
      io.to(roomCode).emit('gameAborted', { message: 'Game aborted' });
    } catch (e) {
      console.error('abortGame error:', e);
    }
  });

  /**
   * Handle in-game chat message
   */
  socket.on('chatMessage', async ({ roomCode, message }) => {
    if (!roomCode || !socket.userId || !message?.trim()) return;
    try {
      const room = await GameRoom.findOne({ roomCode });
      if (!room) return;
      const isHost = room.host.toString() === socket.userId;
      const isGuest = room.guest && room.guest.toString() === socket.userId;
      if (!isHost && !isGuest) return;
      const user = await User.findById(socket.userId, 'name');
      const chatEntry = {
        userId: socket.userId,
        name: user?.name || 'Player',
        message: message.trim().substring(0, 200), // limit message length
        timestamp: new Date()
      };
      room.chat.push(chatEntry);
      await room.save();
      // Broadcast to everyone in room (including sender)
      io.to(roomCode).emit('chatMessage', chatEntry);
    } catch (e) {
      console.error('chatMessage error:', e);
    }
  });

  /**
   * Handle rematch offer
   * Creates new room with swapped colors if both players accept
   */
  socket.on('offerRematch', async (roomCode) => {
    if (!roomCode || !socket.userId) return;
    try {
      const room = await GameRoom.findOne({ roomCode });
      if (!room || room.status !== 'completed') return;
      const isHost = room.host.toString() === socket.userId;
      const isGuest = room.guest && room.guest.toString() === socket.userId;
      if (!isHost && !isGuest) return;

      // If rematch already offered by same user, ignore
      if (room.rematchOfferedBy?.toString() === socket.userId) return;

      // If opponent already offered rematch, auto-accept (create room)
      if (room.rematchOfferedBy && room.rematchOfferedBy.toString() !== socket.userId) {
        // Both want rematch — create new room with swapped colors
        let newRoomCode;
        for (let i = 0; i < 5; i++) {
          newRoomCode = GameRoom.schema.statics.generateRoomCode();
          await GameRoom.deleteOne({ roomCode: newRoomCode });
          try {
            const newRoom = new GameRoom({
              roomCode: newRoomCode,
              host: room.host,
              guest: room.guest,
              hostColor: room.guestColor, // swap colors
              guestColor: room.hostColor,
              status: 'active',
              timeControl: room.timeControl,
              whiteTime: room.timeControl?.initialTime || null,
              blackTime: room.timeControl?.initialTime || null,
            });
            await newRoom.save();
            room.rematchRoomCode = newRoomCode;
            await room.save();
            io.to(roomCode).emit('rematchCreated', { roomCode: newRoomCode, timeControl: room.timeControl });
            break;
          } catch (e) {
            if (e.code !== 11000) throw e;
          }
        }
        return;
      }

      // First rematch offer
      room.rematchOfferedBy = socket.userId;
      await room.save();
      const user = await User.findById(socket.userId, 'name');
      socket.to(roomCode).emit('rematchOffered', { by: user?.name || 'Opponent' });
    } catch (e) {
      console.error('offerRematch error:', e);
    }
  });

  /**
   * Handle rematch decline
   */
  socket.on('declineRematch', async (roomCode) => {
    if (!roomCode || !socket.userId) return;
    try {
      const room = await GameRoom.findOne({ roomCode });
      if (!room) return;
      room.rematchOfferedBy = null;
      await room.save();
      socket.to(roomCode).emit('rematchDeclined');
    } catch (e) {
      console.error('declineRematch error:', e);
    }
  });

  /**
   * Handle takeback request
   */
  socket.on('takebackRequest', async (roomCode) => {
    if (!roomCode || !socket.userId) return;
    try {
      const room = await GameRoom.findOne({ roomCode });
      if (!room || room.status !== 'active' || room.moves.length === 0) return;
      const isHost = room.host.toString() === socket.userId;
      const isGuest = room.guest && room.guest.toString() === socket.userId;
      if (!isHost && !isGuest) return;
      if (room.takebackRequest?.status === 'pending') return;
      room.takebackRequest = { requestedBy: socket.userId, status: 'pending' };
      await room.save();
      const user = await User.findById(socket.userId, 'name');
      socket.to(roomCode).emit('takebackRequested', { by: user?.name || 'Opponent' });
    } catch (e) {
      console.error('takebackRequest error:', e);
    }
  });

  /**
   * Handle takeback request response
   */
  socket.on('respondTakeback', async ({ roomCode, accept }) => {
    if (!roomCode || !socket.userId) return;
    try {
      const room = await GameRoom.findOne({ roomCode });
      if (!room || room.status !== 'active' || room.takebackRequest?.status !== 'pending') return;
      if (room.takebackRequest.requestedBy?.toString() === socket.userId) return;

      if (accept && room.moves.length > 0) {
        // Undo the last move
        room.moves.pop();
        const lastFen = room.moves.length > 0
          ? room.moves[room.moves.length - 1].fen
          : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        room.currentFen = lastFen;
        room.takebackRequest = { requestedBy: null, status: 'none' };
        await room.save();
        io.to(roomCode).emit('takebackAccepted', { fen: lastFen, moves: room.moves.map(m => m.san) });
      } else {
        room.takebackRequest = { requestedBy: null, status: 'none' };
        await room.save();
        socket.to(roomCode).emit('takebackDeclined');
      }
    } catch (e) {
      console.error('respondTakeback error:', e);
    }
  });

  /**
   * Handle client disconnection
   * Notifies opponent and cleans up socket mappings
   */
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    wsConnectionsActive.dec();
    wsEventsTotal.inc({ event: 'disconnect' });

    const info = socketUserMap.get(socket.id);
    if (info?.roomCode) {
      // Notify the room that the opponent disconnected
      socket.to(info.roomCode).emit('opponentDisconnected', {
        userId: info.userId,
        message: 'Opponent disconnected'
      });
    }
    socketUserMap.delete(socket.id);
  });
});

// Serve static frontend files (production build)
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// SPA fallback — serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start server
httpServer.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
