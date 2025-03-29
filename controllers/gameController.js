const User = require('../models/userModel');
const rooms = {};

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Helper function to generate room IDs
    const makeid = (length = 6) => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    };

    // Create game handler
    socket.on('createGame', () => {
      try {
        const roomUniqueId = makeid(6);
        rooms[roomUniqueId] = {
          p1: { socketId: socket.id, choice: null, ready: false },
          p2: { socketId: null, choice: null, ready: false },
          status: 'waiting',
        };

        socket.join(roomUniqueId);
        socket.emit('newGame', { roomUniqueId });
        console.log(`Game created: ${roomUniqueId}`);
      } catch (err) {
        console.error('Game creation error:', err);
        socket.emit('error', { message: 'Failed to create game' });
      }
    });

    // Join game handler
    socket.on('joinGame', (data) => {
      try {
        const room = rooms[data.roomUniqueId];
        if (!room) return socket.emit('error', { message: 'Room not found' });
        if (room.p2.socketId) return socket.emit('error', { message: 'Room is full' });

        room.p2.socketId = socket.id;
        room.status = 'ready';
        socket.join(data.roomUniqueId);

        // Notify both players
        io.to(room.p1.socketId).emit('playersConnected');
        io.to(room.p2.socketId).emit('playersConnected');
        io.to(room.p1.socketId).emit('enableChoice');

        console.log(`Player joined: ${data.roomUniqueId}`);
      } catch (err) {
        console.error('Join game error:', err);
        socket.emit('error', { message: 'Failed to join game' });
      }
    });

    // Player choice handler
    socket.on('playerChoice', (data) => {
      try {
        const room = rooms[data.roomUniqueId];
        if (!room || room.status !== 'ready') return;

        // Determine which player is making the choice
        const player = socket.id === room.p1.socketId ? 'p1' : 'p2';
        room[player].choice = data.rpsValue;
        room[player].ready = true;

        console.log(`Player ${player} chose ${data.rpsValue}`);

        // If both players have chosen
        if (room.p1.ready && room.p2.ready) {
          const winner = determineWinner(room.p1.choice, room.p2.choice);
          io.to(data.roomUniqueId).emit('revealChoices', {
            player1Choice: room.p1.choice,
            player2Choice: room.p2.choice,
          });

          setTimeout(() => {
            io.to(data.roomUniqueId).emit('gameResult', { winner });
            updateStats(room, winner);
            room.status = 'completed';
          }, 1000);
        } else {
          // Enable choice for the other player
          const otherPlayer = player === 'p1' ? 'p2' : 'p1';
          io.to(room[otherPlayer].socketId).emit('enableChoice');
        }
      } catch (err) {
        console.error('Choice error:', err);
        socket.emit('error', { message: 'Failed to process choice' });
      }
    });

    // Play again handler
    socket.on('playAgain', (data) => {
      const room = rooms[data.roomUniqueId];
      if (!room) return;

      // Reset choices
      room.p1.choice = null;
      room.p2.choice = null;
      room.p1.ready = false;
      room.p2.ready = false;
      room.status = 'ready';

      // Alternate who goes first
      const starter = Math.random() > 0.5 ? 'p1' : 'p2';
      io.to(room[starter].socketId).emit('enableChoice');
      io.to(data.roomUniqueId).emit('resetForNewRound');

      console.log(`New round in room: ${data.roomUniqueId}`);
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      for (const roomId in rooms) {
        const room = rooms[roomId];
        if (room.p1.socketId === socket.id || room.p2.socketId === socket.id) {
          const otherPlayer = room.p1.socketId === socket.id ? room.p2.socketId : room.p1.socketId;
          if (otherPlayer) {
            io.to(otherPlayer).emit('opponentDisconnected');
          }
          delete rooms[roomId];
          break;
        }
      }
    });

    // Helper function to determine winner
    function determineWinner(p1Choice, p2Choice) {
      if (p1Choice === p2Choice) return 'draw';
      if ((p1Choice === 'Rock' && p2Choice === 'Scissors') || (p1Choice === 'Paper' && p2Choice === 'Rock') || (p1Choice === 'Scissors' && p2Choice === 'Paper')) return 'p1';
      return 'p2';
    }

    // Helper function to update stats
    async function updateStats(room, winner) {
      try {
        console.log(`[DEBUG] Starting stats update for room ${Object.keys(room)[0]}, winner: ${winner}`);

        const p1Socket = io.sockets.sockets.get(room.p1.socketId);
        const p2Socket = io.sockets.sockets.get(room.p2.socketId);

        console.log(`[DEBUG] Socket objects - p1: ${!!p1Socket}, p2: ${!!p2Socket}`);
        console.log(`[DEBUG] Session data - p1: ${p1Socket?.request?.session?.passport?.user}, p2: ${p2Socket?.request?.session?.passport?.user}`);

        if (p1Socket?.request?.session?.passport?.user && p2Socket?.request?.session?.passport?.user) {
          const p1UserId = p1Socket.request.session.passport.user;
          const p2UserId = p2Socket.request.session.passport.user;

          console.log(`[DEBUG] User IDs - p1: ${p1UserId}, p2: ${p2UserId}`);

          const update = { $set: { 'rpsStats.lastPlayed': new Date() } };

          if (winner === 'draw') {
            console.log('[DEBUG] Updating stats for a draw');
            await User.updateMany({ _id: { $in: [p1UserId, p2UserId] } }, { $inc: { 'rpsStats.draws': 1 }, ...update });
          } else if (winner === 'p1') {
            console.log('[DEBUG] Updating stats - p1 wins');
            await User.findByIdAndUpdate(p1UserId, { $inc: { 'rpsStats.wins': 1 }, ...update });
            await User.findByIdAndUpdate(p2UserId, { $inc: { 'rpsStats.losses': 1 }, ...update });
          } else {
            console.log('[DEBUG] Updating stats - p2 wins');
            await User.findByIdAndUpdate(p2UserId, { $inc: { 'rpsStats.wins': 1 }, ...update });
            await User.findByIdAndUpdate(p1UserId, { $inc: { 'rpsStats.losses': 1 }, ...update });
          }

          console.log('[DEBUG] Stats update completed successfully');
        } else {
          console.log('[DEBUG] Skipping stats update - missing user session data');
        }
      } catch (err) {
        console.error('[ERROR] Stats update failed:', err);
      }
    }
  });

  return {
    renderRps: (req, res) => res.render('rps', { title: 'Rock Paper Scissors', user: req.user }),
    renderClicker: (req, res) =>
      res.render('clicker', {
        title: 'Clicker Game',
        user: req.user,
        funds: req.user?.funds || 0,
      }),
    renderChess: (req, res) => res.render('chess', { title: 'Chess', user: req.user }),
  };
};
