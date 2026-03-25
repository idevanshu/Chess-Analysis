/**
 * Game Model
 * Stores completed chess game data including moves, analysis, and results
 */

import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Game metadata
  gameMode: {
    type: String,
    enum: ['ai', 'local', 'multiplayer'],
    default: 'ai'
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'expert'],
    default: 'medium'
  },
  
  // Opponent information
  opponent: {
    name: {
      type: String,
      required: true
    },
    type: { type: String, enum: ['ai', 'human', 'stockfish'], default: 'ai' },
    elo: { type: Number, default: 1200 }
  },
  
  opponentElo: {
    type: Number,
    required: true
  },
  
  // Game state
  playerColor: {
    type: String,
    enum: ['w', 'b'],
    required: true
  },
  result: {
    type: String,
    enum: ['win', 'loss', 'draw'],
    required: true,
    index: true
  },
  resultDetails: {
    type: String,
    enum: ['checkmate', 'resignation', 'stalemate', 'timeout', 'threefold-repetition', 'insufficient-material', 'fifty-move-rule', 'stopped'],
    default: 'stopped'
  },
  
  // Game moves
  moves: [{
    moveNumber: Number,
    san: String,
    fen: String,
    color: { type: String, enum: ['w', 'b'] },
    accuracy: { type: Number, min: 0, max: 100 },
    moveType: {
      type: String,
      enum: ['blunder', 'tactical', 'strategic', 'best'],
      default: 'strategic'
    },
    timeSpent: { type: Number, default: 0 }, // in ms
    evaluation: {
      before: Number,
      after: Number,
      difference: Number
    },
    captured: String // piece captured
  }],
  
  // Opening information
  openingName: { type: String, default: 'Unknown Opening' },
  openingEco: String,
  
  // Game duration and timing
  duration: { type: Number, default: 0 }, // in seconds
  totalTime: { type: Number, default: 0 }, // total time spent
  averageMoveTime: { type: Number, default: 0 }, // in ms
  
  // Analysis and statistics
  analysis: {
    totalAccuracy: { type: Number, min: 0, max: 100, default: 0 },
    blunderCount: { type: Number, default: 0, min: 0 },
    blunderLocations: [Number], // move numbers where blunders occurred
    tacticalCount: { type: Number, default: 0, min: 0 },
    bestMoveCount: { type: Number, default: 0, min: 0 },
    strategicCount: { type: Number, default: 0, min: 0 },
    tacticalOpportunities: { type: Number, default: 0, min: 0 },
    missedTacticalOpportunities: [Number],
    topMistakes: [
      {
        moveNumber: Number,
        mistake: String,
        eval: Number
      }
    ],
    keyMoments: [
      {
        moveNumber: Number,
        description: String,
        evaluation: Number
      }
    ]
  },
  
  // ELO and rating
  playerEloChange: { type: Number, default: 0 },
  playerEloAfter: { type: Number, default: 0 },
  opponentEloChange: { type: Number, default: 0 },
  
  // Date and timestamps
  gameDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  startTime: Date,
  endTime: Date,
  
  // PGN and notation
  pgn: String,
  
  // Notes and comments
  notes: String,
  playerNotes: String,
  
  // Rating and feedback
  rating: { type: Number, min: 1, max: 5 },
  
  // Archived/Flagged status
  isArchived: { type: Boolean, default: false },
  isFlagged: { type: Boolean, default: false }
  
}, { timestamps: true });

// Indexes for performance
gameSchema.index({ userId: 1, gameDate: -1 });
gameSchema.index({ userId: 1, result: 1 });
gameSchema.index({ gameDate: -1 });
gameSchema.index({ 'analysis.totalAccuracy': -1 });

// Virtual getter for full game duration in minutes
gameSchema.virtual('durationMinutes').get(function() {
  return Math.round(this.duration / 60);
});

export default mongoose.model('Game', gameSchema);
