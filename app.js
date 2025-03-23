const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
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

// Ensure the uploads directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Uploads directory created:', uploadsDir);
}

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

// Middleware to make flash messages available in all views
app.use((req, res, next) => {
    res.locals.flash = req.flash();  // Make flash messages available in views
    next();
});

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
        return res.redirect('/login');
    }

    // Fetch the logged-in user with populated friends
    User.findById(req.user._id)
        .populate('friends', 'username') // Populate the 'friends' field with usernames
        .then(loggedInUser => {
            // Fetch all users excluding the logged-in user
            User.find({ _id: { $ne: req.user._id } })
                .then(users => {
                    res.render('profile', {
                        title: 'Profile',
                        user: loggedInUser, // Pass the logged-in user with populated friends
                        users: users,        // All other users
                        currentUserId: req.user._id.toString(),  // Pass the logged-in user's ID
                        isCurrentUser: true // This is the logged-in user's profile
                    });
                })
                .catch(err => {
                    console.error(err);
                    res.status(500).send('Error fetching users');
                });
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Error fetching logged-in user');
        });
});

// Route to view another user's profile
app.get('/profile/:userId', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }

    const userId = req.params.userId;

    // Fetch the user's data
    User.findById(userId)
        .populate('friends', 'username') // Populate friends if needed
        .then(user => {
            if (!user) {
                return res.status(404).send('User not found');
            }

            // Render the profile page with the user's data
            res.render('profile', {
                title: `${user.username}'s Profile`,
                user: user, // The user whose profile is being viewed
                currentUserId: req.user._id.toString(), // Logged-in user's ID
                isCurrentUser: req.user._id.toString() === userId // Check if it's the logged-in user's profile
            });
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Error fetching user profile');
        });
});

// Store Page
app.get('/store', (req, res) => {
    res.render('store', { title: 'Store', user: req.user });
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

// Profile Update Routes
// Update Bio Route
app.post('/update-bio', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }

    const { bio } = req.body;  // Get new bio from the form

    User.findByIdAndUpdate(req.user._id, { bio: bio }, { new: true })
        .then(user => {
            res.redirect('/profile');  // Redirect to profile after update
        })
        .catch(err => {
            console.error(err);
            res.status(500).send("Error updating bio");
        });
});

// Profile Picture Upload Setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');  // Save to the 'uploads' folder
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);  // Unique filename
    }
});
const upload = multer({ storage: storage });

// Profile Picture Upload Route
app.post('/upload-profile-picture', upload.single('profilePicture'), (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }

    const profilePicture = '/uploads/' + req.file.filename;  // Path to the uploaded image

    User.findByIdAndUpdate(req.user._id, { profilePicture: profilePicture }, { new: true })
        .then(user => {
            res.redirect('/profile');  // Redirect to profile after upload
        })
        .catch(err => {
            console.error(err);
            res.status(500).send("Error uploading profile picture");
        });
});

// Add Friend Route
app.post('/add-friend', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }

    const { friendId } = req.body;

    User.findById(friendId)
        .then(friend => {
            if (!friend) {
                return res.status(404).send('User not found');
            }

            req.user.friends.push(friendId);
            friend.friends.push(req.user._id);

            return Promise.all([
                req.user.save(),
                friend.save()
            ]);
        })
        .then(() => {
            res.redirect('/profile');
        })
        .catch(err => {
            console.error(err);
            res.status(500).send("Error adding friend");
        });
});

// Remove Friend Route
app.post('/remove-friend', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }

    const { friendId } = req.body;

    User.findById(friendId)
        .then(friend => {
            if (!friend) {
                return res.status(404).send('User not found');
            }

            req.user.friends.pull(friendId);
            friend.friends.pull(req.user._id);

            return Promise.all([
                req.user.save(),
                friend.save()
            ]);
        })
        .then(() => {
            res.redirect('/profile');
        })
        .catch(err => {
            console.error(err);
            res.status(500).send("Error removing friend");
        });
});

// 404 Page - Should always be the last route
app.use((req, res) => {
    res.status(404).render('404', { title: '404 Not Found', user: req.user });
});