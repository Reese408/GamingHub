const express = require('express');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const router = express.Router();

// Passport Local Strategy for authentication
passport.use(new (require('passport-local').Strategy)(
    {
        usernameField: 'username', // Field name for username in the form
        passwordField: 'password' // Field name for password in the form
    },
    async (username, password, done) => {
        try {
            // Check if the user exists by username or email
            const user = await User.findOne({
                $or: [{ username }, { email: username }]
            });

            if (!user) {
                console.log('User not found');
                return done(null, false, { message: 'User not found' });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                console.log('Invalid credentials');
                return done(null, false, { message: 'Invalid credentials' });
            }

            return done(null, user); // Successful login
        } catch (err) {
            console.error('Error during authentication:', err);
            return done(err);
        }
    }
));

// Serialize user into the session
passport.serializeUser((user, done) => {
    done(null, user.id); // Store the user's ID in the session
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id); // Retrieve the user by ID
        done(null, user); // Attach the user object to req.user
    } catch (err) {
        done(err);
    }
});

// Sign Up Route (GET)
router.get('/signup', (req, res) => {
    res.render('signup', { title: 'Sign Up', messages: req.flash('error') });
});

// Sign Up Route (POST)
router.post('/signup', async (req, res) => {
    const { email, username, password } = req.body;

    try {
        // Check if the email or username already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            req.flash('error', 'Email or username already in use');
            return res.redirect('/signup');
        }

        const newUser = new User({ email, username, password });
        await newUser.save();

        // After signup, log the user in
        req.login(newUser, (err) => {
            if (err) {
                req.flash('error', 'Signup failed');
                return res.redirect('/signup');
            }
            req.flash('success', 'Welcome! You have successfully signed up.');
            res.redirect('/');  // Redirect to homepage after successful signup
        });
    } catch (err) {
        req.flash('error', 'Something went wrong, please try again.');
        res.redirect('/signup');
    }
});

// Login Route (GET)
router.get('/login', (req, res) => {
    res.render('login', { title: 'Log In', messages: req.flash('error') });
});

// Login Route (POST) with Passport Authentication
router.post('/login', passport.authenticate('local', {
    successRedirect: '/',  // Redirect to homepage on successful login
    failureRedirect: '/login',  // Redirect back to login page if authentication fails
    failureFlash: true  // Enable flash messages on failure
}));

// Profile Route (GET) for logged-in users
router.get('/profile', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');  // Redirect to login page if user is not authenticated
    }
    res.render('profile', { user: req.user });  // Render profile page with user details
});

// Logout Route (GET)
router.get('/logout', (req, res, next) => {
    req.logout((err) => {  // Logout the user
        if (err) {
            return next(err);  // Call next(err) only if there's an error
        }
        res.redirect('/');  // Redirect to homepage after logging out
    });
});

module.exports = router;