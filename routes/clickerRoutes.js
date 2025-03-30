const express = require('express');
const router = express.Router();
const GameState = require('../models/clickerModel');

// ✅ New route to render the clicker game page
router.get('/', async (req, res) => {
  try {
      const gameState = await GameState.findOne({ userId: req.user?._id }); // Avoid crashing if user is null
      const funds = gameState ? gameState.currentScore : 0;  // Default to 0 if no gameState

      res.render('clicker', { title: 'Clicker Game', user: req.user || null, funds });
  } catch (err) {
      console.error("Error fetching clicker game state:", err);
      res.status(500).render('error', { title: 'Error', message: 'Failed to load the clicker game.' });
  }
});
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
