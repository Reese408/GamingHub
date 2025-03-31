require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

// Initialize app and servers
const app = express();
const server = http.createServer(app);

// Configuration
const PORT = process.env.PORT || 3002;
const dbURI = process.env.MONGODB_URI || 'mongodb+srv://Reese:Giantsus-2005@cluster0.9g6dv.mongodb.net/node-prac?retryWrites=true&w=majority&tls=true';

// Trust proxy for production
app.set('trust proxy', 1);

// Session Configuration
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: dbURI, 
    collectionName: 'sessions',
    ttl: 24 * 60 * 60 // 1 day
  }),
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
});

// Middleware
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


// Set up session middleware **before** initializing passport
app.use(sessionMiddleware);
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// Ensure user is available for views
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.messages = req.flash();
  next();
});

// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Initialize Socket.IO Setup after session middleware
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.CLIENT_URL 
      : ['http://localhost:3001', 'http://127.0.0.1:3001'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});
io.engine.use(sessionMiddleware);
// Initialize Socket.IO Handlers
const { initSockets } = require('./controllers/gameController');
initSockets(io); // Initialize sockets immediately after defining middleware

// Database Connection
mongoose.connect(dbURI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });

// Routes
app.use('/', require('./routes/authRoutes'));
app.use('/store', require('./routes/storeRoutes'));
app.use('/profile', require('./routes/profileRoutes'));
app.use('/game-state', require('./routes/gameStateRoutes'));
app.use('/leaderboard', require('./routes/leaderboardRoute'));
app.use('/clicker', require('./routes/clickerRoutes'));

// Game Routes
const { renderRps, renderClicker, renderChess, renderSnake } = require('./controllers/gameController');
app.get('/rps', renderRps);
app.get('/clicker', renderClicker);
app.get('/chess', renderChess);
app.get('/snake', renderSnake);

// Main Routes
app.get('/', (req, res) => {
  res.render('homepage', { 
    title: 'Home',
    user: req.user || null
  });
});

app.get('/about', (req, res) => {
  res.render('about', { 
    title: 'About Us',
    user: req.user || null
  });
});

// Error Handlers
app.use((req, res, next) => {
  res.status(404).render('404', { 
    title: 'Page Not Found',
    user: req.user || null
  });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).render('error', { 
    title: 'Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!',
    user: req.user || null
  });
});

// Start Server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
