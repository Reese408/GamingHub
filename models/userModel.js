const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bio: { type: String, default: '' }, // Bio field
  profilePicture: { type: String, default: '/images/default.png' }, // Default profile picture
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of friends
  points: { type: Number, default: 0 }, // Points for the user
  items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'StoreItem' }], // Items the user has
  isAdmin: { type: Boolean, default: false }, // Admin flag
  // Rock Paper Scissors Game Stats
  rpsStats: {
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
    lastPlayed: { type: Date },
  },
  profileItems: [{ // Array of items the user has bought, including backgrounds
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoreItem' },
    equipped: { type: Boolean, default: false },
    obtainedAt: { type: Date, default: Date.now },
  }],
  equippedItems: { // Reference to the item the user currently has equipped
    background: { type: String, default: '' }, // Background image URL
    badge: { type: String, default: '' }, // Badge the user has equipped
    frame: { type: String, default: '' }, // Frame the user has equipped
  },
  wins: { type: Number, default: 0 }, // User's win count
  losses: { type: Number, default: 0 }, // User's loss count
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Hash password before saving the user
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Update the updatedAt field before saving
userSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Method to compare passwords during login
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Virtual property for win/loss ratio
userSchema.virtual('rpsWinRatio').get(function () {
  if (this.rpsStats.losses === 0) return this.rpsStats.wins;
  return (this.rpsStats.wins / this.rpsStats.losses).toFixed(2);
});

// Virtual property for total games played
userSchema.virtual('rpsTotalGames').get(function () {
  return this.rpsStats.wins + this.rpsStats.losses + this.rpsStats.draws;
});

const User = mongoose.model('User', userSchema);
module.exports = User;
