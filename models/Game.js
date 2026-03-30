import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

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
    timeSpent: { type: Number, default: 0 },
    evaluation: {
      before: Number,
      after: Number,
      difference: Number
    },
    captured: String
  }],

  openingName: { type: String, default: 'Unknown Opening' },
  openingEco: String,

  duration: { type: Number, default: 0 },
  totalTime: { type: Number, default: 0 },
  averageMoveTime: { type: Number, default: 0 },

  analysis: {
    totalAccuracy: { type: Number, min: 0, max: 100, default: 0 },
    blunderCount: { type: Number, default: 0, min: 0 },
    blunderLocations: [Number],
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

  playerEloChange: { type: Number, default: 0 },
  playerEloAfter: { type: Number, default: 0 },
  opponentEloChange: { type: Number, default: 0 },

  gameDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  startTime: Date,
  endTime: Date,

  pgn: String,

  notes: String,
  playerNotes: String,

  rating: { type: Number, min: 1, max: 5 },

  isArchived: { type: Boolean, default: false },
  isFlagged: { type: Boolean, default: false }

}, { timestamps: true });

gameSchema.index({ userId: 1, gameDate: -1 });
gameSchema.index({ userId: 1, result: 1 });
gameSchema.index({ gameDate: -1 });
gameSchema.index({ 'analysis.totalAccuracy': -1 });

gameSchema.virtual('durationMinutes').get(function() {
  return Math.round(this.duration / 60);
});

export default mongoose.model('Game', gameSchema);
