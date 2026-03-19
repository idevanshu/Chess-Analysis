import mongoose from 'mongoose';

const performanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  
  // Overall statistics
  overallStats: {
    totalGamesAnalyzed: { type: Number, default: 0 },
    averageAccuracy: { type: Number, default: 0, min: 0, max: 100 },
    averageElo: { type: Number, default: 0 },
    bestGame: {
      gameId: mongoose.Schema.Types.ObjectId,
      accuracy: Number,
      date: Date
    },
    worstGame: {
      gameId: mongoose.Schema.Types.ObjectId,
      accuracy: Number,
      date: Date
    }
  },
  
  // Monthly breakdown
  monthlyStats: [{
    month: { type: Date, required: true }, // First day of month
    year: { type: Number, required: true },
    gamesPlayed: { type: Number, default: 0, min: 0 },
    wins: { type: Number, default: 0, min: 0 },
    losses: { type: Number, default: 0, min: 0 },
    draws: { type: Number, default: 0, min: 0 },
    winRate: { type: Number, default: 0, min: 0, max: 100 },
    avgAccuracy: { type: Number, default: 0, min: 0, max: 100 },
    avgElo: { type: Number, default: 0 },
    eloGain: { type: Number, default: 0 },
    bestWin: String,
    worstLoss: String
  }],
  
  // Performance by opponent
  performanceByOpponent: {
    type: Map,
    of: {
      totalGames: { type: Number, default: 0, min: 0 },
      gamesPlayed: { type: Number, default: 0, min: 0 },
      wins: { type: Number, default: 0, min: 0 },
      losses: { type: Number, default: 0, min: 0 },
      draws: { type: Number, default: 0, min: 0 },
      winRate: { type: Number, default: 0, min: 0, max: 100 },
      avgAccuracy: { type: Number, default: 0, min: 0, max: 100 },
      avgElo: { type: Number, default: 0 }
    },
    default: new Map()
  },
  
  // Move type distribution
  moveTypeDistribution: {
    blunders: { type: Number, default: 0, min: 0 },
    tactical: { type: Number, default: 0, min: 0 },
    strategic: { type: Number, default: 0, min: 0 },
    best: { type: Number, default: 0, min: 0 }
  },
  
  // Opening statistics
  openingStats: [{
    name: { type: String, required: true },
    eco: String,
    color: { type: String, enum: ['w', 'b'], required: true },
    gamesPlayed: { type: Number, default: 0, min: 0 },
    wins: { type: Number, default: 0, min: 0 },
    losses: { type: Number, default: 0, min: 0 },
    draws: { type: Number, default: 0, min: 0 },
    winRate: { type: Number, default: 0, min: 0, max: 100 },
    avgAccuracy: { type: Number, default: 0, min: 0, max: 100 },
    avgElo: { type: Number, default: 0 }
  }],
  
  // Time-based statistics
  timeStats: {
    avgMoveTime: { type: Number, default: 0, min: 0 }, // in ms
    fastestMove: { type: Number, default: 0, min: 0 },
    slowestMove: { type: Number, default: 0, min: 0 },
    totalTimePlayed: { type: Number, default: 0, min: 0 }, // in seconds
    totalGamesTimedOut: { type: Number, default: 0, min: 0 }
  },
  
  // Win streaks and loss streaks
  streaks: {
    currentWinStreak: { type: Number, default: 0, min: 0 },
    bestWinStreak: { type: Number, default: 0, min: 0 },
    currentLossStreak: { type: Number, default: 0, min: 0 },
    bestLossStreak: { type: Number, default: 0, min: 0 }
  },
  
  // Trends over last N games
  trends: {
    accuracyTrend: [{ type: Number, min: 0, max: 100 }], // Last 10 games
    eloTrend: [Number], // Last 10 games
    winRateTrend: [{ type: Number, min: 0, max: 100 }] // Last 10 games
  },
  
  // Color-specific statistics
  colorStats: {
    asWhite: {
      games: { type: Number, default: 0, min: 0 },
      wins: { type: Number, default: 0, min: 0 },
      losses: { type: Number, default: 0, min: 0 },
      draws: { type: Number, default: 0, min: 0 },
      winRate: { type: Number, default: 0, min: 0, max: 100 },
      avgAccuracy: { type: Number, default: 0, min: 0, max: 100 }
    },
    asBlack: {
      games: { type: Number, default: 0, min: 0 },
      wins: { type: Number, default: 0, min: 0 },
      losses: { type: Number, default: 0, min: 0 },
      draws: { type: Number, default: 0, min: 0 },
      winRate: { type: Number, default: 0, min: 0, max: 100 },
      avgAccuracy: { type: Number, default: 0, min: 0, max: 100 }
    }
  },
  
  // Difficulty-specific statistics
  difficultyStats: {
    easy: {
      games: { type: Number, default: 0, min: 0 },
      wins: { type: Number, default: 0, min: 0 },
      avgAccuracy: { type: Number, default: 0, min: 0, max: 100 }
    },
    medium: {
      games: { type: Number, default: 0, min: 0 },
      wins: { type: Number, default: 0, min: 0 },
      avgAccuracy: { type: Number, default: 0, min: 0, max: 100 }
    },
    hard: {
      games: { type: Number, default: 0, min: 0 },
      wins: { type: Number, default: 0, min: 0 },
      avgAccuracy: { type: Number, default: 0, min: 0, max: 100 }
    },
    expert: {
      games: { type: Number, default: 0, min: 0 },
      wins: { type: Number, default: 0, min: 0 },
      avgAccuracy: { type: Number, default: 0, min: 0, max: 100 }
    }
  },
  
  // Last updated timestamp
  lastUpdated: {
    type: Date,
    default: Date.now
  }
  
}, { timestamps: true });

// Indexes for common queries
performanceSchema.index({ userId: 1 });
performanceSchema.index({ 'monthlyStats.month': -1 });

// Pre-save hook to update timestamp
performanceSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

export default mongoose.model('Performance', performanceSchema);
