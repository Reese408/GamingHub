// leaderboardRouter.js
const express = require('express');
const router = express.Router();
const User = require('../models/userModel'); // Assuming User model contains wins and losses fields

// Leaderboard Route
router.get('/leaderboard', async (req, res) => {
    try {
        // Fetch users sorted by wins in descending order
        const users = await User.find()
            .sort({ wins: -1 })  // Sort by wins in descending order
            .select('username wins losses profilePicture')  // Fetch required fields
            .limit(10);  // Limit to top 10 players (adjust as needed)

        res.render('leaderboard', { users });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching leaderboard');
    }
});

module.exports = router;
