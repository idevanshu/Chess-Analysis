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
  createdAt: {
    type: Date,
    default: Date.now
  },
  stats: {
    totalGames: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
    totalMoves: { type: Number, default: 0 },
    avgMoveTime: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    favoriteOpponent: { type: String, default: null },
    eloRating: { type: Number, default: 1200 }
  },
  moveAnalysis: {
    tacticalMoves: { type: Number, default: 0 },
    strategicMoves: { type: Number, default: 0 },
    blunders: { type: Number, default: 0 },
    bestMoves: { type: Number, default: 0 },
    averageAccuracy: { type: Number, default: 0 }
  },
  preferredOpenings: [String],
  gameHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game'
  }]
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

export default mongoose.model('User', userSchema);
