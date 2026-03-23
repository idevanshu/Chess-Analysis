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
    enum: ['waiting', 'active', 'completed', 'aborted'],
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
  // Time control settings
  timeControl: {
    initialTime: { type: Number, default: null }, // seconds, null = unlimited
    increment: { type: Number, default: 0 },
    format: { type: String, default: 'unlimited' },
    label: { type: String, default: 'Unlimited' }
  },
  // Server-tracked remaining time (seconds)
  whiteTime: { type: Number, default: null },
  blackTime: { type: Number, default: null },
  lastMoveTimestamp: { type: Date, default: null },
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
    enum: ['pending', 'hostWin', 'guestWin', 'draw', 'abandoned', 'aborted'],
    default: 'pending'
  },
  // In-game chat
  chat: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
  }],
  // Draw offer tracking
  drawOffer: {
    offeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['none', 'pending', 'accepted', 'declined'], default: 'none' }
  },
  // Takeback request tracking
  takebackRequest: {
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['none', 'pending', 'accepted', 'declined'], default: 'none' }
  },
  // Rematch
  rematchRoomCode: { type: String, default: null },
  rematchOfferedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
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
