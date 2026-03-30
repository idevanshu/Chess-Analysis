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

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chess-legends')
  .then(() => {})
  .catch(() => {});

app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-nano';
const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const metricsRegister = new promClient.Registry();
metricsRegister.setDefaultLabels({ app: 'chess-legends' });
promClient.collectDefaultMetrics({ register: metricsRegister });

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

app.get('/ready', async (req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  if (mongoOk) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready', reason: 'MongoDB not connected' });
  }
});

app.get('/metrics', async (req, res) => {
  mongoConnectionState.set(mongoose.connection.readyState);
  wsConnectionsActive.set(io.engine?.clientsCount || 0);

  try {
    const activeRooms = await GameRoom.countDocuments({ status: 'active' }).catch(() => 0);
    activeRoomsGauge.set(activeRooms);
  } catch (e) { /* ignore */ }

  res.set('Content-Type', metricsRegister.contentType);
  res.end(await metricsRegister.metrics());
});

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
    res.status(500).json({ error: error.message });
  }
});

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
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

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

app.post('/api/games/save', verifyToken, async (req, res) => {
  try {
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

    if (!moves || moves.length === 0) {
      return res.status(400).json({ error: 'No moves provided' });
    }

    const gameAccuracy = calculateAccuracy(moves);
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

    const user = await User.findById(req.userId);
    if (!user) {
      throw new Error('User not found');
    }

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

    user.stats.totalGames = (user.stats.totalGames || 0) + 1;
    user.stats.totalMoves = (user.stats.totalMoves || 0) + moves.length;

    if (result === 'win') {
      user.stats.wins = (user.stats.wins || 0) + 1;
      user.currentWinStreak = (user.currentWinStreak || 0) + 1;
      user.currentLossStreak = 0;
      if (user.currentWinStreak > user.bestWinStreak) {
        user.bestWinStreak = user.currentWinStreak;
      }
    } else if (result === 'loss') {
      user.stats.losses = (user.stats.losses || 0) + 1;
      user.currentLossStreak = (user.currentLossStreak || 0) + 1;
      user.currentWinStreak = 0;
    } else if (result === 'draw') {
      user.stats.draws = (user.stats.draws || 0) + 1;
    }

    const totalGames = user.stats.totalGames;
    if (totalGames > 0) {
      user.stats.winRate = Math.round((user.stats.wins / totalGames) * 100);
    } else {
      user.stats.winRate = 0;
    }
    user.stats.favoriteOpponent = opponent;

    user.moveAnalysis.blunders = (user.moveAnalysis.blunders || 0) + blunderCount;
    user.moveAnalysis.tacticalMoves = (user.moveAnalysis.tacticalMoves || 0) + tacticalCount;
    user.moveAnalysis.strategicMoves = (user.moveAnalysis.strategicMoves || 0) + strategicCount;
    user.moveAnalysis.bestMoves = (user.moveAnalysis.bestMoves || 0) + bestCount;

    if (user.stats.totalGames === 1) {
      user.moveAnalysis.averageAccuracy = gameAccuracy;
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
    }

    if (!user.gameHistory) {
      user.gameHistory = [];
    }
    user.gameHistory.push(game._id);

    if (!user.recentGames) {
      user.recentGames = [];
    }
    user.recentGames.unshift(game._id);
    if (user.recentGames.length > 10) {
      user.recentGames.pop();
    }

    user.lastGamePlayed = new Date();

    user.markModified('stats');
    user.markModified('moveAnalysis');
    user.markModified('gameHistory');
    user.markModified('recentGames');

    const savedUser = await user.save();

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

    const updatedUser = await User.findById(req.userId);

    res.json({
      success: true,
      game,
      userStats: updatedUser.stats,
      moveAnalysis: updatedUser.moveAnalysis,
      message: 'Game saved and stats updated'
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

app.get('/api/analytics/comprehensive', verifyToken, async (req, res) => {
  try {
    const games = await Game.find({ userId: req.userId }).sort({ gameDate: -1 });

    if (!games || games.length === 0) {
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

    const analytics = processAnalytics(games);
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function processAnalytics(games) {
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

  for (const game of games) {
    const result = (game.result || 'draw').toLowerCase();

    if (result === 'win') {
      stats.wins++;
    } else if (result === 'loss') {
      stats.losses++;
    } else if (result === 'draw') {
      stats.draws++;
    }

    if (result === 'win') {
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }

    let gameAccuracy = 0;
    if (game.analysis && game.analysis.totalAccuracy !== undefined) {
      gameAccuracy = game.analysis.totalAccuracy;
    } else if (game.accuracy !== undefined) {
      gameAccuracy = game.accuracy;
    }

    if (gameAccuracy >= 0) {
      totalAccuracy += gameAccuracy;
      accuracyCount++;
      accuracyTrend.push(gameAccuracy);
    }

    const gameMoves = game.moves || [];
    stats.totalMoves += gameMoves.length;

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

  stats.winRate = stats.totalGames > 0 ? Math.round((stats.wins / stats.totalGames) * 100) : 0;
  stats.averageAccuracy = accuracyCount > 0 ? Math.round(totalAccuracy / accuracyCount) : 0;
  stats.currentWinStreak = currentStreak;
  stats.bestWinStreak = bestStreak;

  moves.tacticalAccuracy = moves.totalMoves > 0 ? Math.round((moves.tactical / moves.totalMoves) * 100) : 0;

  for (const opponent in opponents) {
    const opp = opponents[opponent];
    opp.winRate = opp.games > 0 ? Math.round((opp.wins / opp.games) * 100) : 0;
    opp.avgAccuracy = opp.games > 0 ? Math.round(opp.totalAccuracy / opp.games) : 0;
    delete opp.totalAccuracy;
  }

  for (const color in colorStats) {
    const cols = colorStats[color];
    cols.winRate = cols.games > 0 ? Math.round((cols.wins / cols.games) * 100) : 0;
    cols.avgAccuracy = cols.games > 0 ? Math.round(cols.totalAccuracy / cols.games) : 0;
    delete cols.totalAccuracy;
  }

  for (const opening in openings) {
    const op = openings[opening];
    op.winRate = op.games > 0 ? Math.round((op.wins / op.games) * 100) : 0;
    op.avgAccuracy = op.games > 0 ? Math.round(op.totalAccuracy / op.games) : 0;
    delete op.totalAccuracy;
  }

  return {
    stats,
    moves,
    opponents,
    colors: colorStats,
    trends: { accuracyTrend: accuracyTrend.slice(-10), dates: games.slice(-10).map(g => g.gameDate) },
    openings
  };
}

function calculateAccuracy(moves) {
  if (moves.length === 0) return 0;

  const accuracies = moves.map(m => m.accuracy || 0).filter(a => a > 0);

  if (accuracies.length === 0) {
    const defaultAccuracies = moves.map(m => {
      if (m.moveType === 'best') return 100;
      if (m.moveType === 'tactical') return 85;
      if (m.moveType === 'strategic') return 75;
      if (m.moveType === 'blunder') return 25;
      return 75;
    });
    return Math.round(defaultAccuracies.reduce((sum, a) => sum + a, 0) / defaultAccuracies.length);
  }

  const totalAccuracy = accuracies.reduce((sum, m) => sum + m, 0);
  return Math.round(totalAccuracy / accuracies.length);
}

app.post('/api/chat', async (req, res) => {
  const llmTimer = llmRequestDuration.startTimer();
  const { messages, systemInstruction } = req.body;

  try {
    const openaiMessages = [];

    if (systemInstruction) {
      openaiMessages.push({ role: 'system', content: systemInstruction });
    }

    for (const m of messages) {
      openaiMessages.push({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: m.parts[0].text,
      });
    }

    const stream = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: openaiMessages,
      stream: true,
      temperature: 1.0,
      max_completion_tokens: 2048,
    });
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

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
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.end();
    }
  }
});

app.post('/api/rooms/create', verifyToken, async (req, res) => {
  try {
    const { timeControl, colorPreference } = req.body || {};

    await GameRoom.deleteMany({
      host: req.userId,
      status: { $in: ['waiting', 'completed', 'aborted'] }
    });

    let hostColor = 'w';
    if (colorPreference === 'b') hostColor = 'b';
    else if (colorPreference === 'random') hostColor = Math.random() < 0.5 ? 'w' : 'b';

    let roomCode, saved = false;
    for (let i = 0; i < 5; i++) {
      roomCode = GameRoom.schema.statics.generateRoomCode();
      await GameRoom.deleteOne({ roomCode });
      try {
        const roomData = {
          roomCode,
          host: req.userId,
          hostColor,
          guestColor: hostColor === 'w' ? 'b' : 'w',
        };
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
        if (e.code !== 11000) throw e;
      }
    }

    if (!saved) {
      return res.status(500).json({ error: 'Could not create room, try again' });
    }

    res.json({ roomCode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

    if (gameRoom.status === 'completed') {
      return res.status(400).json({ error: 'This game already ended. Ask your friend to create a new one.' });
    }

    if (gameRoom.guest && gameRoom.guest.toString() !== req.userId) {
      return res.status(400).json({ error: 'Room is full. Ask your friend to create a new game.' });
    }

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
    res.status(500).json({ error: error.message });
  }
});

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
    res.status(500).json({ error: error.message });
  }
});

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

const socketUserMap = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
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
  wsConnectionsActive.inc();
  wsEventsTotal.inc({ event: 'connection' });

  socket.on('joinRoom', async (roomCode) => {
    if (!roomCode) return;
    socket.join(roomCode);

    socketUserMap.set(socket.id, { userId: socket.userId, roomCode });

    try {
      const room = await GameRoom.findOne({ roomCode });
      if (room) {
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
    }

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
    }
  });

  socket.on('makeMove', async (data) => {
    const { roomCode, san } = data;
    if (!roomCode || !san) return;

    try {
      const room = await GameRoom.findOne({ roomCode });
      if (!room || room.status !== 'active') {
        socket.emit('moveError', { error: 'Game is not active' });
        return;
      }

      const chess = new Chess(room.currentFen);
      const turnColor = chess.turn();

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

        if (whiteTime <= 0 || blackTime <= 0) {
          room.status = 'completed';
          room.result = whiteTime <= 0
            ? (room.hostColor === 'w' ? 'guestWin' : 'hostWin')
            : (room.hostColor === 'b' ? 'guestWin' : 'hostWin');
          room.endTime = now;
        }
      }
      if (room.moves.length === 0 && room.timeControl?.initialTime) {
        room.lastMoveTimestamp = now;
      }

      if (room.drawOffer?.status === 'pending') {
        room.drawOffer = { offeredBy: null, status: 'none' };
      }

      room.moves.push({
        moveNumber: room.moves.length + 1,
        san: moveObj.san,
        fen: newFen,
        madeBy: socket.userId,
        timestamp: now
      });
      room.currentFen = newFen;

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

      movesProcessedTotal.inc({ source: 'socket' });
      wsEventsTotal.inc({ event: 'makeMove' });
      socket.to(roomCode).emit('opponentMove', {
        san: moveObj.san,
        fen: newFen,
        timestamp: now,
        whiteTime,
        blackTime,
      });

      socket.emit('moveConfirmed', { san: moveObj.san, fen: newFen, whiteTime, blackTime });

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
      socket.emit('moveError', { error: 'Server error' });
    }
  });

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
    }

    socket.to(roomCode).emit('gameEnded', { result: 'opponent_resigned' });
  });

  socket.on('offerDraw', async (roomCode) => {
    if (!roomCode || !socket.userId) return;
    try {
      const room = await GameRoom.findOne({ roomCode });
      if (!room || room.status !== 'active') return;
      const isHost = room.host.toString() === socket.userId;
      const isGuest = room.guest && room.guest.toString() === socket.userId;
      if (!isHost && !isGuest) return;
      if (room.drawOffer?.status === 'pending') return;
      room.drawOffer = { offeredBy: socket.userId, status: 'pending' };
      await room.save();
      const user = await User.findById(socket.userId, 'name');
      socket.to(roomCode).emit('drawOffered', { by: user?.name || 'Opponent' });
    } catch (e) {
    }
  });

  socket.on('respondDraw', async ({ roomCode, accept }) => {
    if (!roomCode || !socket.userId) return;
    try {
      const room = await GameRoom.findOne({ roomCode });
      if (!room || room.status !== 'active' || room.drawOffer?.status !== 'pending') return;
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
    }
  });

  socket.on('abortGame', async (roomCode) => {
    if (!roomCode || !socket.userId) return;
    try {
      const room = await GameRoom.findOne({ roomCode });
      if (!room || room.status !== 'active') return;
      const isHost = room.host.toString() === socket.userId;
      const isGuest = room.guest && room.guest.toString() === socket.userId;
      if (!isHost && !isGuest) return;
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
    }
  });

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
        message: message.trim().substring(0, 200),
        timestamp: new Date()
      };
      room.chat.push(chatEntry);
      await room.save();
      io.to(roomCode).emit('chatMessage', chatEntry);
    } catch (e) {
    }
  });

  socket.on('offerRematch', async (roomCode) => {
    if (!roomCode || !socket.userId) return;
    try {
      const room = await GameRoom.findOne({ roomCode });
      if (!room || room.status !== 'completed') return;
      const isHost = room.host.toString() === socket.userId;
      const isGuest = room.guest && room.guest.toString() === socket.userId;
      if (!isHost && !isGuest) return;

      if (room.rematchOfferedBy?.toString() === socket.userId) return;

      if (room.rematchOfferedBy && room.rematchOfferedBy.toString() !== socket.userId) {
        let newRoomCode;
        for (let i = 0; i < 5; i++) {
          newRoomCode = GameRoom.schema.statics.generateRoomCode();
          await GameRoom.deleteOne({ roomCode: newRoomCode });
          try {
            const newRoom = new GameRoom({
              roomCode: newRoomCode,
              host: room.host,
              guest: room.guest,
              hostColor: room.guestColor,
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

      room.rematchOfferedBy = socket.userId;
      await room.save();
      const user = await User.findById(socket.userId, 'name');
      socket.to(roomCode).emit('rematchOffered', { by: user?.name || 'Opponent' });
    } catch (e) {
    }
  });

  socket.on('declineRematch', async (roomCode) => {
    if (!roomCode || !socket.userId) return;
    try {
      const room = await GameRoom.findOne({ roomCode });
      if (!room) return;
      room.rematchOfferedBy = null;
      await room.save();
      socket.to(roomCode).emit('rematchDeclined');
    } catch (e) {
    }
  });

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
    }
  });

  socket.on('respondTakeback', async ({ roomCode, accept }) => {
    if (!roomCode || !socket.userId) return;
    try {
      const room = await GameRoom.findOne({ roomCode });
      if (!room || room.status !== 'active' || room.takebackRequest?.status !== 'pending') return;
      if (room.takebackRequest.requestedBy?.toString() === socket.userId) return;

      if (accept && room.moves.length > 0) {
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
    }
  });

  socket.on('disconnect', () => {
    wsConnectionsActive.dec();
    wsEventsTotal.inc({ event: 'disconnect' });

    const info = socketUserMap.get(socket.id);
    if (info?.roomCode) {
      socket.to(info.roomCode).emit('opponentDisconnected', {
        userId: info.userId,
        message: 'Opponent disconnected'
      });
    }
    socketUserMap.delete(socket.id);
  });
});

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

httpServer.listen(port, () => {});
