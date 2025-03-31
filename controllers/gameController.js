const User = require('../models/userModel');
// HTTP Route Handlers
exports.renderRps = (req, res) => {
  try {
    res.render('rps', { 
      title: 'Rock Paper Scissors',
      user: req.user || null,
      messages: req.flash()
    });
  } catch (err) {
    console.error('RPS render error:', err);
    req.flash('error', 'Failed to load RPS game');
    res.redirect('/');
  }
};

exports.renderClicker = (req, res) => {
  try {
    res.render('clicker', { 
      title: 'Clicker Game', 
      user: req.user || null,
      messages: req.flash()
    });
  } catch (err) {
    console.error('Clicker render error:', err);
    req.flash('error', 'Failed to load Clicker game');
    res.redirect('/');
  }
};

exports.renderChess = (req, res) => {
  try {
    res.render('chess', { 
      title: 'Chess',
      user: req.user || null,
      messages: req.flash()
    });
  } catch (err) {
    console.error('Chess render error:', err);
    req.flash('error', 'Failed to load Chess game');
    res.redirect('/');
  }
};

exports.renderSnake = async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      req.flash('error', 'You must be logged in to play the game.');
      return res.redirect('/login');
    }

    // Fetch user with populated data
    const user = await User.findById(req.user._id)
      .populate('profileItems.itemId');

    const backgroundImage = user.equippedItems?.background || '';

    res.render('snake', { 
      title: 'Snake Game',
      user: req.user || null,
      backgroundImage, // Pass the background to the view
      messages: req.flash()
    });
  } catch(err) {
    console.error('Snake render error:', err);
    req.flash('error', 'Failed to load Snake game');
    res.redirect('/');
  }
};

// Socket.IO Game Logic
exports.initSockets = (io) => {
  const activeGames = new Map(); // Store active games

  io.use((socket, next) => {
    // Authenticate socket connection by checking if user is logged in
    if (socket.request.session && socket.request.session.passport?.user) {
      return next(); // Proceed with connection
    }
    next(new Error('Unauthorized')); // Deny connection if not authenticated
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    // RPS Game Handlers
    socket.on('join-rps', (gameId) => {
      // Join the RPS room for the given gameId
      socket.join(`rps-${gameId}`);
      console.log(`Socket ${socket.id} joined room rps-${gameId}`);
      // Further game logic can be added here...
    });

    // Clicker Game Handlers
    socket.on('clicker-update', (data) => {
      // Broadcast clicker update to opponent in the same room
      socket.to(`clicker-${data.room}`).emit('opponent-click', data);
    });

    // Chess Game Handlers
    socket.on('chess-move', (move) => {
      // Send chess move to opponent in the same game room
      socket.to(`chess-${move.gameId}`).emit('opponent-move', move);
    });

    // Handle user disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
      // Clean up or notify players about disconnection, if necessary
      // You can remove the player from active games if needed
      activeGames.forEach((game, gameId) => {
        // If the game was still active and the player was part of it, remove them
        if (game.players.includes(socket.id)) {
          game.players = game.players.filter(player => player !== socket.id);
          console.log(`Player ${socket.id} removed from game ${gameId}`);
        }
      });
    });
  });

  return {
    notifyPlayer: (userId, message) => {
      // Send a notification to a specific player
      io.to(`user-${userId}`).emit('notification', message);
    }
  };
};
