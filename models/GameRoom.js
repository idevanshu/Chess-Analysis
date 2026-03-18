import mongoose from 'mongoose';

const gameRoomSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    unique: true,
    required: true,
    uppercase: true
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  guest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'completed'],
    default: 'waiting'
  },
  hostColor: {
    type: String,
    enum: ['w', 'b'],
    default: 'w'
  },
  guestColor: {
    type: String,
    enum: ['w', 'b'],
    default: 'b'
  },
  moves: [{
    moveNumber: Number,
    san: String,
    fen: String,
    madeBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: Date
  }],
  currentFen: {
    type: String,
    default: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  },
  result: {
    type: String,
    enum: ['pending', 'hostWin', 'guestWin', 'draw', 'abandoned'],
    default: 'pending'
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: Date,
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    index: { expires: 0 } // Auto-delete after expiry
  }
}, { timestamps: true });

// Generate room code
gameRoomSchema.statics.generateRoomCode = function() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export default mongoose.model('GameRoom', gameRoomSchema);
