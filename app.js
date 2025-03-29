require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');
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
const gameStateRoutes = require(path.join(__dirname, 'routes', 'gameStateRoutes'));
const gameController = require('./controllers/gameController');

// Initialize app and servers
const app = express();
const server = http.createServer(app);

// Configuration
const PORT = process.env.PORT || 3000;
const dbURI = process.env.MONGODB_URI || 'mongodb+srv://Reese:Giantsus-2005@cluster0.9g6dv.mongodb.net/node-prac?retryWrites=true&w=majority&tls=true';

// Trust proxy for production environments
app.set('trust proxy', 1);

// Session Middleware with MongoStore
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: dbURI,
    collectionName: 'sessions',
  }),
  cookie: {
    maxAge: 60 * 60 * 1000, // 1 hour
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  },
});

// Configure Socket.IO with proper settings
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  perMessageDeflate: {
    threshold: 1024,
    zlibDeflateOptions: {
      chunkSize: 16 * 1024,
    },
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// MongoDB Connection
mongoose
  .connect(dbURI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB Connection Error:', err));

// Ensure uploads directory exists
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

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : 'http://localhost:3000');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// Serve uploads folder
app.use('/uploads', express.static(uploadsDir));

// Session and authentication
app.use(sessionMiddleware);
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
require('./config/passport');

// Make user available to views
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
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Socket.IO Authentication
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// Socket.IO Connection Handling
io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  socket.on('disconnect', (reason) => {
    console.log('Disconnected:', socket.id, 'Reason:', reason);
  });
});

// Initialize Game Controller
const gameHandlers = gameController(io);

// Routes
app.use(authRoutes);
app.use('/store', storeRoutes);
app.use(profileRoutes);
app.use('/api/game-state', gameStateRoutes);
app.get('/rps', gameHandlers.renderRps);
app.get('/clicker', gameHandlers.renderClicker);
app.get('/chess', gameHandlers.renderChess);
app.get('/', (req, res) => res.render('homepage', { title: 'Home' }));
app.get('/about', (req, res) => res.render('about', { title: 'About Us' }));

// Error Handlers
app.use((req, res) => res.status(404).render('404', { title: 'Not Found' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  req.flash('error', err.message || 'Something went wrong!');
  res.redirect('/');
});

// Start server
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
