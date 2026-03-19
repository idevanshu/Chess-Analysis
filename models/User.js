import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    default: '👤'
  },
  
  // Account metadata
  accountStatus: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  lastLogin: Date,
  lastGamePlayed: Date,
  subscription: {
    type: { type: String, default: 'free' },
    startDate: Date,
    endDate: Date
  },
  
  // Game statistics
  stats: {
    totalGames: { type: Number, default: 0, min: 0 },
    wins: { type: Number, default: 0, min: 0 },
    losses: { type: Number, default: 0, min: 0 },
    draws: { type: Number, default: 0, min: 0 },
    totalMoves: { type: Number, default: 0, min: 0 },
    avgMoveTime: { type: Number, default: 0, min: 0 },
    winRate: { type: Number, default: 0, min: 0, max: 100 }, // percentage 0-100
    favoriteOpponent: String,
    eloRating: { type: Number, default: 1200, min: 0 },
    peakEloRating: { type: Number, default: 1200, min: 0 },
    peakEloDate: Date
  },
  
  // Move analysis and performance
  moveAnalysis: {
    tacticalMoves: { type: Number, default: 0, min: 0 },
    strategicMoves: { type: Number, default: 0, min: 0 },
    blunders: { type: Number, default: 0, min: 0 },
    bestMoves: { type: Number, default: 0, min: 0 },
    averageAccuracy: { type: Number, default: 0, min: 0, max: 100 }, // percentage
    tacticalAccuracy: { type: Number, default: 0, min: 0, max: 100 }
  },
  
  // Win streaks
  currentWinStreak: { type: Number, default: 0, min: 0 },
  bestWinStreak: { type: Number, default: 0, min: 0 },
  currentLossStreak: { type: Number, default: 0, min: 0 },
  
  // Game preferences
  preferences: {
    gameMode: { type: String, enum: ['ai', 'local', 'multiplayer'], default: 'ai' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'expert'], default: 'medium' },
    timeControl: { type: Number, default: 300 }, // seconds per side
    notifications: { type: Boolean, default: true },
    showAnalysis: { type: Boolean, default: true }
  },
  
  // Opening preparation
  preferredOpenings: [
    {
      name: String,
      eco: String,
      gamesPlayed: { type: Number, default: 0 },
      winRate: { type: Number, default: 0 }
    }
  ],
  
  // Game history reference
  gameHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game'
  }],
  
  // Recently played games (for quick access)
  recentGames: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game'
  }],
  
  createdAt: {
    type: Date,
    default: Date.now
  }
  
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err) {
    return next(err);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Virtual for password confirmation (not stored)
userSchema.virtual('passwordConfirm')
  .get(function() { return this._passwordConfirm; })
  .set(function(value) { this._passwordConfirm = value; });

// Index for frequently queried fields
userSchema.index({ email: 1 });
userSchema.index({ 'stats.eloRating': -1 });
userSchema.index({ lastGamePlayed: -1 });

export default mongoose.model('User', userSchema);
