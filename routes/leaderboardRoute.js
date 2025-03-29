// routes/leaderboardRoute.js
const express = require('express');
const router = express.Router();
const User = require('../models/userModel');

// Remove '/leaderboard' from the route path since it will be mounted with this prefix
router.get('/', async (req, res) => {
    try {
        const users = await User.find()
            .sort({ wins: -1 })
            .select('username wins losses profilePicture')
            .limit(10);

        res.render('leaderboard', { 
            title: 'Leaderboard',
            users,
            user: req.user || null,  // Pass current user for template
            messages: req.flash() 
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Error loading leaderboard');
        res.redirect('/');
    }
});

module.exports = router;