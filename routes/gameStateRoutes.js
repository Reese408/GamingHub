const express = require('express');
const router = express.Router();
const gameStateController = require('../controllers/gameStateController');
const { ensureAuthenticated } = require('../config/auth');

// Get current game state
router.get('/', ensureAuthenticated, gameStateController.getGameState);

// Save game state
router.post('/save', ensureAuthenticated, gameStateController.saveGameState);

// Reset game state
router.post('/reset', ensureAuthenticated, gameStateController.resetGameState);

module.exports = router;
