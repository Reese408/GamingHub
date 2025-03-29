const express = require('express');
const router = express.Router();
const gameStateController = require('../controllers/gameStateController');
const User = require('../models/userModel'); // Add User model
const { ensureAuthenticated } = require('../config/auth');

// Existing game state routes (unchanged)
router.get('/', ensureAuthenticated, gameStateController.getGameState);
router.post('/save', ensureAuthenticated, gameStateController.saveGameState);
router.post('/reset', ensureAuthenticated, gameStateController.resetGameState);

// NEW RPS Stats Routes
router.get('/rps-stats', ensureAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('wins losses');
    res.status(200).json({
      wins: user.wins || 0,
      losses: user.losses || 0,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching RPS stats', error: err.message });
  }
});

// Optional: Route to manually update stats (though Socket.IO handles this automatically)
router.post('/update-rps-stats', ensureAuthenticated, async (req, res) => {
  try {
    const { result } = req.body; // 'win' or 'loss'
    const update = result === 'win' ? { $inc: { wins: 1 } } : { $inc: { losses: 1 } };

    await User.findByIdAndUpdate(req.user._id, update);
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Error updating stats', error: err.message });
  }
});

module.exports = router;
