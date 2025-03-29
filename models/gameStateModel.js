const mongoose = require('mongoose');

const gameStateSchema = new mongoose.Schema({
  // Reference to the user (required)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // Remove index: true and keep only this or the schema.index()
  },

  // Core game progress
  currentScore: { type: Number, default: 0 },
  clickMultiplier: { type: Number, default: 1 },

  // Click Power upgrades
  clickPowerUpgradeLevel: { type: Number, default: 1 },
  clickPowerUpgradeCost: { type: Number, default: 100 },

  // Research Lab system
  labUpgradeLevel: { type: Number, default: 1 },
  labUpgradeCost: { type: Number, default: 1000 },
  labMultiplier: { type: Number, default: 2.5 },

  // Scientist upgrades
  scientistUpgradeLevel: { type: Number, default: 1 },
  scientistUpgradeCost: { type: Number, default: 10000 },
  scientistSeconds: { type: Number, default: 10 },

  // Ship Fleet system
  shipFleetUpgradeLevel: { type: Number, default: 1 },
  shipFleetUpgradeCost: { type: Number, default: 50000 },
  shipFleetMultiplier: { type: Number, default: 50 },

  // Satellite upgrades
  satelliteUpgradeLevel: { type: Number, default: 1 },
  satelliteUpgradeCost: { type: Number, default: 100000 },
  satelliteSeconds: { type: Number, default: 10 },

  // Timestamps
  lastUpdated: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

// Remove either this index call OR the unique: true above
// gameStateSchema.index({ userId: 1 }, { unique: true });

// Auto-update lastUpdated timestamp on save
gameStateSchema.pre('save', function (next) {
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model('GameState', gameStateSchema);
