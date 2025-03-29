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
        const p1Socket = io.sockets.sockets.get(room.p1.socketId);
        const p2Socket = io.sockets.sockets.get(room.p2.socketId);

        if (p1Socket?.request?.user && p2Socket?.request?.user) {
          const update = { $set: { 'rpsStats.lastPlayed': new Date() } };

          if (winner === 'draw') {
            await User.updateMany({ _id: { $in: [p1Socket.request.user._id, p2Socket.request.user._id] } }, { $inc: { 'rpsStats.draws': 1 }, ...update });
          } else if (winner === 'p1') {
            await User.findByIdAndUpdate(p1Socket.request.user._id, { $inc: { 'rpsStats.wins': 1 }, ...update });
            await User.findByIdAndUpdate(p2Socket.request.user._id, { $inc: { 'rpsStats.losses': 1 }, ...update });
          } else {
            await User.findByIdAndUpdate(p2Socket.request.user._id, { $inc: { 'rpsStats.wins': 1 }, ...update });
            await User.findByIdAndUpdate(p1Socket.request.user._id, { $inc: { 'rpsStats.losses': 1 }, ...update });
          }
        }
      } catch (err) {
        console.error('Stats update error:', err);
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
