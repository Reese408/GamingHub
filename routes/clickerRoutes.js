const express = require('express');
const router = express.Router();
const GameState = require('../models/clickerModel');

// Fetch game state
router.get('/game-state', async (req, res) => {
  try {
    let gameState = await GameState.findOne({ userId: req.user._id });
    if (!gameState) {
      gameState = new GameState({ userId: req.user._id });
      await gameState.save();
    }
    res.json(gameState);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Handle meteor clicks
router.post('/click', async (req, res) => {
  try {
    const gameState = await GameState.findOne({ userId: req.user._id });
    gameState.currentScore += gameState.clickMultiplier;
    await gameState.save();
    res.json(gameState);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Handle upgrades
router.post('/upgrade', async (req, res) => {
  const { upgradeType } = req.body;
  try {
    const gameState = await GameState.findOne({ userId: req.user._id });
    // Logic for handling upgrades (e.g., Click Power, Research Lab, etc.)
    await gameState.save();
    res.json(gameState);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
