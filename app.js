require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const flash = require('connect-flash');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const User = require('./models/userModel');
const authRoutes = require('./routes/authRoutes');
const storeRoutes = require('./routes/storeRoutes');
const profileRoutes = require('./routes/profileRoutes');
const gameController = require('./controllers/gameController');

// Initialize app and servers
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Configuration
const PORT = process.env.PORT || 3000;
const dbURI = process.env.MONGODB_URI || 'mongodb+srv://Reese:Giantsus-2005@cluster0.9g6dv.mongodb.net/node-prac?retryWrites=true&w=majority&tls=true';

// MongoDB Connection
mongoose.connect(dbURI)
  .then(() => {
    console.log('Connected to MongoDB');
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });

// Ensure the uploads directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Uploads directory created:', uploadsDir);
}

// Middleware & Static Files
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan('dev'));

// Serve the uploads folder as static files
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Session Middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 60 * 60 * 1000, // 1 hour session duration
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    },
  })
);

// Flash Messages Middleware
app.use(flash());

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());
require('./config/passport');

// Make user and flash messages available to all views
app.use((req, res, next) => {
  res.locals.user = req.user;
  res.locals.messages = req.flash();
  next();
});

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// File Upload Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Socket.IO Game Logic
io.on('connection', gameController.socketLogic);

// Routes
app.use(authRoutes);
app.use('/store', storeRoutes);
app.use(profileRoutes);

// Game routes
app.get('/rps', gameController.renderRps);
app.get('/clicker', gameController.renderClicker);
app.get('/chess', gameController.renderChess);

// Leaderboard Route
app.get('/leaderboard', async (req, res) => {
  try {
    const users = await User.find()
      .sort({ wins: -1 })  // Sort by wins in descending order
      .select('username wins losses profilePicture')
      .limit(10);  // Top 10 players
    res.render('leaderboard', { users });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching leaderboard');
  }
});

// Main route
app.get('/', (req, res) => {
  res.render('homepage', { title: 'Home' });
});

// About route
app.get('/about', (req, res) => {
  res.render('about', { title: 'About Us' });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).render('404', { title: 'Not Found' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  req.flash('error', err.message || 'Something went wrong!');
  res.redirect('/');
});
