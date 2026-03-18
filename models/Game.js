import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  opponent: {
    type: String,
    required: true // Name of the chess legend (Magnus, Pragg, etc.)
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
    required: true
  },
  moves: [{
    moveNumber: Number,
    san: String,
    fen: String,
    accuracy: Number, // 0-100
    moveType: {
      type: String,
      enum: ['blunder', 'tactical', 'strategic', 'best'],
      default: 'strategic'
    },
    timeSpent: Number, // in ms
    evaluation: {
      before: Number,
      after: Number
    }
  }],
  openingName: String,
  openingEco: String,
  duration: Number, // in seconds
  gameDate: {
    type: Date,
    default: Date.now
  },
  pgn: String, // Full PGN notation
  analysis: {
    totalAccuracy: Number,
    bestMoveCount: Number,
    blunderCount: Number,
    tacticalOpportunities: Number,
    topMistakes: [String]
  },
  eloChange: Number,
  notes: String
}, { timestamps: true });

export default mongoose.model('Game', gameSchema);
