const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const flash = require('connect-flash');
const User = require('./models/userModel');
const authRoutes = require('./routes/authRoutes');
const storeRoutes = require('./routes/storeRoutes');

// Initialize the app
const app = express();

// MongoDB Connection
const dbURI = 'mongodb+srv://Reese:Giantsus-2005@cluster0.9g6dv.mongodb.net/node-prac?retryWrites=true&w=majority&tls=true';
mongoose.connect(dbURI)
    .then(() => {
        console.log('Connected to MongoDB');
        app.listen(3000, () => console.log('Server running on port 3000'));
    })
    .catch((err) => {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);  // Exit the process if the database connection fails
    });

app.set('view engine', 'ejs');

// Middleware & Static Files
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Session Middleware
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 60 * 60 * 1000, // 1 hour session duration
        httpOnly: true,          // Prevent client-side JavaScript access
        secure: process.env.NODE_ENV === 'production' // HTTPS in production
    }
}));

// Flash Messages Middleware
app.use(flash());  // Enables flash messages

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Import Passport configuration
require('./config/passport');  // Handles Passport Local Strategy, serialize, deserialize

// Routes
app.use(authRoutes);  // Authentication routes
app.use(storeRoutes); // Store routes

// Homepage Route
app.get('/', (req, res) => {
    res.render('homepage', { title: 'Home', user: req.user });
});

// Chess game route
app.get('/chess', (req, res) => {
    res.render('chess', { title: 'Chess', user: req.user });
});

// Profile Page (Logged-in users)
app.get('/profile', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');  // Redirect to login if not authenticated
    }
    res.render('profile', { title: 'Profile', user: req.user });
});

// Store Page
app.get('/store', (req, res) => {
    res.render('store', { title: 'Store', user: req.user });
});

// Friends Page
app.get('/friends', (req, res) => {
    res.render('friends', { title: 'Friends', user: req.user });
});

// Logout Route
app.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/login');  // Redirect to login after logout
    });
});

// Sign-up Route
app.get('/signup', (req, res) => {
    res.render('signup', {
        title: 'Sign Up',
        user: req.user,
        messages: req.flash('error')
    });
});

app.post('/signup', async (req, res) => {
    const { email, username, password } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            req.flash('error', 'Email is already in use');
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

// Login Route
app.get('/login', (req, res) => {
    res.render('login', {
        title: 'Login',
        user: req.user,
        messages: req.flash('error')
    });
});

app.post('/login', passport.authenticate('local', {
    successRedirect: '/',  // Redirect to homepage after successful login
    failureRedirect: '/login',  // Redirect to login page if authentication fails
    failureFlash: true  // Flash error messages if login fails
}));

// 404 Page - Should always be the last route
app.use((req, res) => {
    res.status(404).render('404', { title: '404 Not Found', user: req.user });
});
