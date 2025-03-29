// HTTP Route Handlers
exports.renderRps = (req, res) => {
  try {
    res.render('games/rps', { 
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
    res.render('games/clicker', { 
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
    res.render('games/chess', { 
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

// Socket.IO Game Logic
exports.initSockets = (io) => {
  const activeGames = new Map();

  io.use((socket, next) => {
    // Authenticate socket connection
    if (socket.request.session.passport?.user) {
      return next();
    }
    next(new Error('Unauthorized'));
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    // RPS Game Handlers
    socket.on('join-rps', (gameId) => {
      socket.join(`rps-${gameId}`);
      // Additional game logic...
    });

    // Clicker Game Handlers
    socket.on('clicker-update', (data) => {
      socket.to(`clicker-${data.room}`).emit('opponent-click', data);
    });

    // Chess Game Handlers
    socket.on('chess-move', (move) => {
      socket.to(`chess-${move.gameId}`).emit('opponent-move', move);
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
      // Clean up game state...
    });
  });

  return {
    notifyPlayer: (userId, message) => {
      io.to(`user-${userId}`).emit('notification', message);
    }
  };
};