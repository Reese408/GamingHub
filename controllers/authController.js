const passport = require('passport');
const User = require('../models/userModel');

// Passport Local Strategy for authentication
passport.use(new (require('passport-local').Strategy)(
    {
        usernameField: 'username', // Field name for username in the form
        passwordField: 'password' // Field name for password in the form
    },
    async (username, password, done) => {
        try {
            const user = await User.findOne({ username });
            if (!user) {
                return done(null, false, { message: 'User not found' });
            }

            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                return done(null, false, { message: 'Invalid credentials' });
            }

            return done(null, user); // Successful login
        } catch (err) {
            return done(err);
        }
    }
));

// Serialize and Deserialize User
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

// Sign Up
exports.signup = async (req, res) => {
    const { email, username, password } = req.body;

    try {
        // Check if email or username already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: 'Email or username already in use' });
        }

        // Create a new user
        const newUser = new User({ email, username, password });
        await newUser.save();

        // Log the user in after signup
        req.login(newUser, (err) => {
            if (err) {
                return res.status(500).json({ message: 'Error logging in after signup' });
            }
            return res.redirect('/profile'); // Redirect to profile after successful signup
        });
    } catch (err) {
        res.status(500).json({ message: 'Error signing up', error: err.message });
    }
};

// Login
exports.login = (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.status(400).json({ message: info.message });
        }

        req.login(user, (err) => {
            if (err) {
                return next(err);
            }
            return res.redirect('/profile'); // Redirect to profile after successful login
        });
    })(req, res, next);
};

// Logout
exports.logout = (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ message: 'Error logging out' });
        }
        res.redirect('/'); // Redirect to homepage after logout
    });
};