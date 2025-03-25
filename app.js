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

// Initialize app and servers
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Game state management
const rooms = {};

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
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Clean up empty rooms
    for (const room in rooms) {
      if (io.sockets.adapter.rooms.get(room)?.size === 0) {
        delete rooms[room];
      }
    }
  });

  // Create new game room
  socket.on('createGame', () => {
    const roomUniqueId = makeid(6);
    rooms[roomUniqueId] = {
      p1Choice: null,
      p2Choice: null,
      p1Ready: false,
      p2Ready: false,
    };
    socket.join(roomUniqueId);
    socket.emit('newGame', { roomUniqueId: roomUniqueId });
    console.log(`Game created: ${roomUniqueId}`);
  });

  // Join existing game room
  socket.on('joinGame', (data) => {
    if (!rooms[data.roomUniqueId]) {
      return socket.emit('error', { message: 'Room not found' });
    }
    if (io.sockets.adapter.rooms.get(data.roomUniqueId)?.size >= 2) {
      return socket.emit('error', { message: 'Room is full' });
    }

    socket.join(data.roomUniqueId);
    io.to(data.roomUniqueId).emit('playersConnected');
    console.log(`Player joined: ${data.roomUniqueId}`);
  });

  // Handle player choices
  socket.on('playerChoice', (data) => {
    const room = rooms[data.roomUniqueId];
    if (!room) return;

    const players = Array.from(io.sockets.adapter.rooms.get(data.roomUniqueId) || []);
    const isPlayer1 = players[0] === socket.id;
    const choiceKey = isPlayer1 ? 'p1Choice' : 'p2Choice';
    const readyKey = isPlayer1 ? 'p1Ready' : 'p2Ready';

    // Store choice and mark player as ready
    room[choiceKey] = data.rpsValue;
    room[readyKey] = true;
    console.log(`Player ${isPlayer1 ? '1' : '2'} chose ${data.rpsValue}`);

    // If player 1 just made their choice, enable player 2's UI
    if (isPlayer1 && room.p1Choice !== null) {
      io.to(data.roomUniqueId).emit('enableChoice');
    }

    // Only proceed when both players are ready
    if (room.p1Ready && room.p2Ready) {
      // Reveal choices to both players simultaneously
      io.to(data.roomUniqueId).emit('revealChoices', {
        player1Choice: room.p1Choice,
        player2Choice: room.p2Choice,
      });

      // Determine winner after brief delay
      setTimeout(() => {
        declareWinner(data.roomUniqueId);
      }, 1000);
    }
  });

  // Handle play again request
  socket.on('playAgain', (data) => {
    const room = rooms[data.roomUniqueId];
    if (room) {
      // Reset choices for both players
      room.p1Choice = null;
      room.p2Choice = null;
      room.p1Ready = false;
      room.p2Ready = false;

      // Notify both players to reset their UI
      io.to(data.roomUniqueId).emit('resetForNewRound');
      console.log(`New round started in room: ${data.roomUniqueId}`);
    }
  });

  // Handle leave game request
  socket.on('leaveGame', (data) => {
    socket.leave(data.roomUniqueId);
    console.log(`Player left room: ${data.roomUniqueId}`);
  });

  function declareWinner(roomId) {
    const { p1Choice, p2Choice } = rooms[roomId];
    let winner = null;

    if (p1Choice === p2Choice) {
      winner = 'draw';
    } else if ((p1Choice === 'Rock' && p2Choice === 'Scissor') || 
               (p1Choice === 'Paper' && p2Choice === 'Rock') || 
               (p1Choice === 'Scissor' && p2Choice === 'Paper')) {
      winner = 'p1';
    } else {
      winner = 'p2';
    }

    console.log(`Game result in ${roomId}: ${winner}`);
    io.to(roomId).emit('gameResult', { winner });
  }
});

// Utility function for generating room IDs
function makeid(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
}

// Routes
app.use(authRoutes);
app.use('/store', storeRoutes);
app.use(profileRoutes);

// Main route
app.get('/', (req, res) => {
  res.render('homepage', { title: 'Home' });
});

// About route
app.get('/about', (req, res) => {
  res.render('about', { title: 'About Us' });
});

// Game routes
app.get('/rps', (req, res) => {
  res.render('rps', { title: 'Rock Paper Scissors' });
});

app.get('/clicker', (req, res) => {
  res.render('Clicker', { title: 'Clicker Game', funds: 0 });
});

app.get('/chess', (req, res) => {
  res.render('chess', { title: 'Chess' });
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
