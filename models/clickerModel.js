const mongoose = require('mongoose');

const gameStateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  currentScore: { type: Number, default: 0 },
  clickMultiplier: { type: Number, default: 1 },
  clickPowerUpgradeLevel: { type: Number, default: 1 },
  clickPowerUpgradeCost: { type: Number, default: 100 },
  labUpgradeLevel: { type: Number, default: 1 },
  labUpgradeCost: { type: Number, default: 1000 },
  labMultiplier: { type: Number, default: 2.5 },
  labIntervalTimer: { type: Number, default: 10001 },
  scientistUpgradeLevel: { type: Number, default: 1 },
  scientistUpgradeCost: { type: Number, default: 10000 },
  scientistSeconds: { type: Number, default: 10 },
  shipFleetUpgradeLevel: { type: Number, default: 1 },
  shipFleetUpgradeCost: { type: Number, default: 50000 },
  satelliteUpgradeLevel: { type: Number, default: 1 },
  satelliteUpgradeCost: { type: Number, default: 100000 },
  satelliteSeconds: { type: Number, default: 10 },
  shipFleetIntervalTimer: { type: Number, default: 10001 },
  shipFleetMultiplier: { type: Number, default: 50 },
});

// Check if model already exists before defining it
module.exports = mongoose.models.GameState || mongoose.model('GameState', gameStateSchema);