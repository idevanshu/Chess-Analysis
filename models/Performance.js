import mongoose from 'mongoose';

const performanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  monthlyStats: [{
    month: Date,
    gamesPlayed: Number,
    wins: Number,
    losses: Number,
    draws: Number,
    avgAccuracy: Number,
    bestWin: String,
    worstLoss: String
  }],
  performanceByOpponent: {
    type: Map,
    of: {
      gamesPlayed: Number,
      wins: Number,
      losses: Number,
      draws: Number,
      winRate: Number,
      avgAccuracy: Number
    }
  },
  moveTypeDistribution: {
    blunders: { type: Number, default: 0 },
    tactical: { type: Number, default: 0 },
    strategic: { type: Number, default: 0 },
    best: { type: Number, default: 0 }
  },
  openingStats: [{
    name: String,
    eco: String,
    gamesPlayed: Number,
    wins: Number,
    losses: Number,
    draws: Number,
    avgAccuracy: Number
  }],
  timeStats: {
    avgMoveTime: Number,
    fastestMove: Number,
    slowestMove: Number,
    totalTimePlayed: Number // in minutes
  },
  streaks: {
    currentWinStreak: Number,
    bestWinStreak: Number,
    currentLossStreak: Number
  },
  trends: {
    accuracyTrend: [Number], // Last 10 games accuracy
    eloTrend: [Number],       // Last 10 games elo
    winRateTrend: [Number]    // Last 10 games win rate
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

export default mongoose.model('Performance', performanceSchema);
