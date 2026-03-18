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

// Get user profile
app.get('/api/auth/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
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

// ===== GAME TRACKING ROUTES =====

// Save game
app.post('/api/games/save', verifyToken, async (req, res) => {
  try {
    const { opponent, opponentElo, playerColor, result, moves, duration, openingName } = req.body;
    
    const game = new Game({
      userId: req.userId,
      opponent,
      opponentElo,
      playerColor,
      result,
      moves,
      duration,
      openingName,
      analysis: {
        totalAccuracy: calculateAccuracy(moves),
        bestMoveCount: moves.filter(m => m.moveType === 'best').length,
        blunderCount: moves.filter(m => m.moveType === 'blunder').length
      }
    });

    await game.save();

    // Update user stats
    const user = await User.findById(req.userId);
    user.stats.totalGames += 1;
    user.stats.totalMoves += moves.length;
    
    if (result === 'win') user.stats.wins += 1;
    if (result === 'loss') user.stats.losses += 1;
    if (result === 'draw') user.stats.draws += 1;
    
    user.stats.winRate = (user.stats.wins / user.stats.totalGames * 100).toFixed(2);
    user.stats.favoriteOpponent = opponent;

    // Update move analysis
    const blunderCount = moves.filter(m => m.moveType === 'blunder').length;
    const tacticalCount = moves.filter(m => m.moveType === 'tactical').length;
    const strategicCount = moves.filter(m => m.moveType === 'strategic').length;
    const bestCount = moves.filter(m => m.moveType === 'best').length;

    user.moveAnalysis.blunders += blunderCount;
    user.moveAnalysis.tacticalMoves += tacticalCount;
    user.moveAnalysis.strategicMoves += strategicCount;
    user.moveAnalysis.bestMoves += bestCount;
    user.moveAnalysis.averageAccuracy = game.analysis.totalAccuracy;

    user.gameHistory.push(game._id);
    await user.save();

    // Update performance stats
    let performance = await Performance.findOne({ userId: req.userId });
    if (!performance) {
      performance = new Performance({ userId: req.userId });
    }

    if (!performance.performanceByOpponent) {
      performance.performanceByOpponent = new Map();
    }

    const oppStats = performance.performanceByOpponent.get(opponent) || {
      gamesPlayed: 0, wins: 0, losses: 0, draws: 0, winRate: 0, avgAccuracy: 0
    };
    
    oppStats.gamesPlayed += 1;
    if (result === 'win') oppStats.wins += 1;
    if (result === 'loss') oppStats.losses += 1;
    if (result === 'draw') oppStats.draws += 1;
    oppStats.winRate = (oppStats.wins / oppStats.gamesPlayed * 100).toFixed(2);
    oppStats.avgAccuracy = game.analysis.totalAccuracy;

    performance.performanceByOpponent.set(opponent, oppStats);
    performance.moveTypeDistribution.blunders += blunderCount;
    performance.moveTypeDistribution.tactical += tacticalCount;
    performance.moveTypeDistribution.strategic += strategicCount;
    performance.moveTypeDistribution.best += bestCount;

    await performance.save();

    res.json({ success: true, game });
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
  const totalAccuracy = moves.reduce((sum, m) => sum + (m.accuracy || 0), 0);
  return Math.round(totalAccuracy / moves.length);
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

    const chat = model.startChat({
      history: history,
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
      hostColor: 'white'
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
    gameRoom.guestColor = gameRoom.hostColor === 'white' ? 'black' : 'white';
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
