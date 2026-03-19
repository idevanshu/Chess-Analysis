import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServer } from 'http';
import { Server } from 'socket.io';
import User from './models/User.js';
import Game from './models/Game.js';
import Performance from './models/Performance.js';
import GameRoom from './models/GameRoom.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:5173',
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

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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

// ===== AUTH ROUTES =====

// Signup
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
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, jwtSecret, { expiresIn: '7d' });
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
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user profile - fetch fresh data from DB (no caching)
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

// DEBUG: Check user stats
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

// Save game
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

// Get game history
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

// Get performance stats
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

// Helper function to calculate accuracy
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

// ===== CHAT WITH GEMINI =====

// Chat stream endpoint
app.post('/api/chat', async (req, res) => {
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in .env' });
  }

  const { messages, systemInstruction } = req.body;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemInstruction,
    });

    let history = messages.slice(0, -1).map(m => ({
      role: m.role,
      parts: [{ text: m.parts[0].text }],
    }));

    // Gemini requires the first message to be from the 'user'
    while (history.length > 0 && history[0].role === 'model') {
      history.shift();
    }

    // Group consecutive messages by role to prevent API crashes
    let formattedHistory = [];
    for (const m of history) {
      if (formattedHistory.length > 0 && formattedHistory[formattedHistory.length - 1].role === m.role) {
        formattedHistory[formattedHistory.length - 1].parts[0].text += '\n\n' + m.parts[0].text;
      } else {
        formattedHistory.push(m);
      }
    }

    const chat = model.startChat({
      history: formattedHistory,
      generationConfig: {
        temperature: 0.85,
        maxOutputTokens: 256,
      }
    });

    const result = await chat.sendMessageStream(messages[messages.length - 1].parts[0].text);

    // Setup SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
    }
    
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== MULTIPLAYER ROOM ROUTES =====

// Create a new game room
app.post('/api/rooms/create', verifyToken, async (req, res) => {
  try {
    const roomCode = GameRoom.schema.statics.generateRoomCode();
    
    const gameRoom = new GameRoom({
      roomCode,
      host: req.userId,
      hostColor: 'w'
    });
    
    await gameRoom.save();
    
    res.json({ 
      roomCode, 
      roomId: gameRoom._id,
      shareUrl: `http://localhost:5173/join?room=${roomCode}`
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Join a game room
app.post('/api/rooms/join', verifyToken, async (req, res) => {
  try {
    const { roomCode } = req.body;
    
    const gameRoom = await GameRoom.findOne({ roomCode });
    if (!gameRoom) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (gameRoom.guest) {
      return res.status(400).json({ error: 'Room is full' });
    }
    
    if (gameRoom.host.toString() === req.userId) {
      return res.status(400).json({ error: 'Cannot join your own room' });
    }
    
    gameRoom.guest = req.userId;
    gameRoom.guestColor = gameRoom.hostColor === 'w' ? 'b' : 'w';
    gameRoom.status = 'active';
    
    await gameRoom.save();
    
    res.json({ 
      roomId: gameRoom._id,
      roomCode,
      host: gameRoom.host,
      hostColor: gameRoom.hostColor,
      guestColor: gameRoom.guestColor,
      status: gameRoom.status
    });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get room details
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

// Make a move in a room
app.post('/api/rooms/:roomCode/move', verifyToken, async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { move, fen, san } = req.body;
    
    const gameRoom = await GameRoom.findOne({ roomCode });
    if (!gameRoom) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (gameRoom.status !== 'active') {
      return res.status(400).json({ error: 'Game is not active' });
    }
    
    gameRoom.moves.push({
      moveNumber: gameRoom.moves.length + 1,
      san: san,
      fen: fen,
      madeBy: req.userId,
      timestamp: new Date()
    });
    
    gameRoom.currentFen = fen;
    
    await gameRoom.save();
    
    // Emit move to opponent via Socket.io
    io.to(roomCode).emit('opponentMove', {
      move,
      fen,
      san,
      madeBy: req.userId
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Make move error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's active rooms
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

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join a room
  socket.on('joinRoom', (roomCode) => {
    socket.join(roomCode);
    console.log(`Socket ${socket.id} joined room ${roomCode}`);
    io.to(roomCode).emit('userJoined', { message: 'Opponent has joined' });
  });

  // Make move
  socket.on('makeMove', (data) => {
    const { roomCode, move, fen, san } = data;
    socket.to(roomCode).emit('opponentMove', {
      move,
      fen,
      san,
      timestamp: new Date()
    });
  });

  // Resign
  socket.on('resign', (roomCode) => {
    io.to(roomCode).emit('gameEnded', { result: 'opponent_resigned' });
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start server
httpServer.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
