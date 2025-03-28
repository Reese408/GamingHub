const GameState = require('../models/gameStateModel');
const User = require('../models/userModel');

exports.getGameState = async (req, res) => {
  try {
    let gameState = await GameState.findOne({ userId: req.user._id });

    if (!gameState) {
      gameState = new GameState({ userId: req.user._id });
      await gameState.save();
    }

    res.status(200).json(gameState);
  } catch (err) {
    res.status(500).json({ message: 'Error loading game', error: err.message });
  }
};

exports.saveGameState = async (req, res) => {
  try {
    const updatedState = await GameState.findOneAndUpdate({ userId: req.user._id }, { $set: req.body }, { new: true, upsert: true });
    res.status(200).json(updatedState);
  } catch (err) {
    res.status(500).json({ message: 'Error saving game', error: err.message });
  }
};

exports.resetGameState = async (req, res) => {
  try {
    await GameState.deleteOne({ userId: req.user._id });
    const newState = new GameState({ userId: req.user._id });
    await newState.save();
    res.status(200).json(newState);
  } catch (err) {
    res.status(500).json({ message: 'Error resetting game', error: err.message });
  }
};
