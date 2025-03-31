const express = require('express');
const router = express.Router();
const GameState = require('../models/gameStateModel');
const { ensureAuthenticated } = require('../config/auth');

// Render clicker game page
router.get('/', async (req, res) => {
  try {
    const gameState = await GameState.findOne({ userId: req.user?._id });
    const funds = gameState ? gameState.currentScore : 0;

    res.render('clicker', {
      title: 'Clicker Game',
      user: req.user || null,
      funds,
      messages: req.flash(),
    });
  } catch (err) {
    console.error('Error fetching clicker game state:', err);
    req.flash('error', 'Failed to load the clicker game');
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load the clicker game.',
      user: req.user || null,
    });
  }
});

// Get current game state
router.get('/game-state', ensureAuthenticated, async (req, res) => {
  try {
    let gameState = await GameState.findOne({ userId: req.user._id });

    if (!gameState) {
      gameState = new GameState({ userId: req.user._id });
      await gameState.save();
    }

    res.status(200).json(gameState);
  } catch (err) {
    console.error('Error fetching game state:', err);
    res.status(500).json({
      error: 'Server error',
      message: err.message,
    });
  }
});

// Handle meteor clicks
router.post('/click', ensureAuthenticated, async (req, res) => {
  try {
    let gameState = await GameState.findOne({ userId: req.user._id });

    if (!gameState) {
      gameState = new GameState({ userId: req.user._id });
    }

    gameState.currentScore += gameState.clickMultiplier;
    await gameState.save();

    res.status(200).json({
      currentScore: gameState.currentScore,
      clickMultiplier: gameState.clickMultiplier,
    });
  } catch (err) {
    console.error('Error handling click:', err);
    res.status(500).json({
      error: 'Server error',
      message: err.message,
    });
  }
});

// Handle upgrades
router.post('/upgrade', ensureAuthenticated, async (req, res) => {
  const { upgradeType } = req.body;

  try {
    let gameState = await GameState.findOne({ userId: req.user._id });

    if (!gameState) {
      gameState = new GameState({ userId: req.user._id });
    }

    let success = false;
    let message = '';

    switch (upgradeType) {
      case 'clickPower':
        if (gameState.currentScore >= gameState.clickPowerUpgradeCost) {
          gameState.currentScore -= gameState.clickPowerUpgradeCost;
          gameState.clickMultiplier *= 2;
          gameState.clickPowerUpgradeCost = Math.round(gameState.clickPowerUpgradeCost * 1.5);
          gameState.clickPowerUpgradeLevel++;
          success = true;
        } else {
          message = 'Not enough funds for Click Power upgrade';
        }
        break;

      case 'researchLab':
        if (gameState.currentScore >= gameState.labUpgradeCost) {
          gameState.currentScore -= gameState.labUpgradeCost;
          gameState.labMultiplier *= 2;
          gameState.labUpgradeCost = Math.round(gameState.labUpgradeCost * 1.5);
          gameState.labUpgradeLevel++;
          success = true;
        } else {
          message = 'Not enough funds for Research Lab upgrade';
        }
        break;

      case 'scientist':
        if (gameState.currentScore >= gameState.scientistUpgradeCost && gameState.scientistUpgradeLevel < 20) {
          gameState.currentScore -= gameState.scientistUpgradeCost;
          gameState.scientistSeconds = Math.max(0.5, gameState.scientistSeconds - 0.5);
          gameState.scientistUpgradeCost = Math.round(gameState.scientistUpgradeCost * 1.5);
          gameState.scientistUpgradeLevel++;
          success = true;
        } else {
          message = 'Not enough funds or max level reached for Scientist upgrade';
        }
        break;

      case 'shipFleet':
        if (gameState.currentScore >= gameState.shipFleetUpgradeCost) {
          gameState.currentScore -= gameState.shipFleetUpgradeCost;
          gameState.shipFleetMultiplier *= 2;
          gameState.shipFleetUpgradeCost = Math.round(gameState.shipFleetUpgradeCost * 1.5);
          gameState.shipFleetUpgradeLevel++;
          success = true;
        } else {
          message = 'Not enough funds for Ship Fleet upgrade';
        }
        break;

      case 'satellite':
        if (gameState.currentScore >= gameState.satelliteUpgradeCost && gameState.satelliteUpgradeLevel < 20) {
          gameState.currentScore -= gameState.satelliteUpgradeCost;
          gameState.satelliteSeconds = Math.max(0.5, gameState.satelliteSeconds - 0.5);
          gameState.satelliteUpgradeCost = Math.round(gameState.satelliteUpgradeCost * 1.5);
          gameState.satelliteUpgradeLevel++;
          success = true;
        } else {
          message = 'Not enough funds or max level reached for Satellite upgrade';
        }
        break;

      default:
        message = 'Invalid upgrade type';
    }

    if (success) {
      await gameState.save();
      res.status(200).json(gameState);
    } else {
      res.status(400).json({ message });
    }
  } catch (err) {
    console.error('Error handling upgrade:', err);
    res.status(500).json({
      error: 'Server error',
      message: err.message,
    });
  }
});

module.exports = router;
