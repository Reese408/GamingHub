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
          p1Choice: null,
          p2Choice: null,
          p1Ready: false,
          p2Ready: false,
          sockets: [socket.id],
          players: [],
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
        if (!rooms[data.roomUniqueId]) {
          return socket.emit('error', { message: 'Room not found' });
        }
        if (rooms[data.roomUniqueId].sockets.length >= 2) {
          return socket.emit('error', { message: 'Room is full' });
        }

        rooms[data.roomUniqueId].sockets.push(socket.id);
        socket.join(data.roomUniqueId);
        io.to(data.roomUniqueId).emit('playersConnected');
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
        if (!room) return;

        const players = Array.from(io.sockets.adapter.rooms.get(data.roomUniqueId) || []);
        const isPlayer1 = players[0] === socket.id;
        const choiceKey = isPlayer1 ? 'p1Choice' : 'p2Choice';
        const readyKey = isPlayer1 ? 'p1Ready' : 'p2Ready';

        room[choiceKey] = data.rpsValue;
        room[readyKey] = true;
        console.log(`Player ${isPlayer1 ? '1' : '2'} chose ${data.rpsValue}`);

        if (isPlayer1) {
          io.to(data.roomUniqueId).emit('enableChoice');
        }

        if (room.p1Ready && room.p2Ready) {
          io.to(data.roomUniqueId).emit('revealChoices', {
            player1Choice: room.p1Choice,
            player2Choice: room.p2Choice,
          });

          setTimeout(() => {
            declareWinner(data.roomUniqueId);
          }, 1000);
        }
      } catch (err) {
        console.error('Choice error:', err);
        socket.emit('error', { message: 'Failed to process choice' });
      }
    });

    // Play again handler
    socket.on('playAgain', (data) => {
      const room = rooms[data.roomUniqueId];
      if (room) {
        room.p1Choice = null;
        room.p2Choice = null;
        room.p1Ready = false;
        room.p2Ready = false;
        io.to(data.roomUniqueId).emit('resetForNewRound');
        console.log(`New round started in room: ${data.roomUniqueId}`);
      }
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      for (const room in rooms) {
        if (io.sockets.adapter.rooms.get(room)?.size === 0) {
          delete rooms[room];
        }
      }
    });

    // Winner determination
    function declareWinner(roomId) {
      const room = rooms[roomId];
      if (!room) return;

      const { p1Choice, p2Choice } = room;
      let winner = null;

      if (p1Choice === p2Choice) {
        winner = 'draw';
      } else if ((p1Choice === 'Rock' && p2Choice === 'Scissors') || (p1Choice === 'Paper' && p2Choice === 'Rock') || (p1Choice === 'Scissors' && p2Choice === 'Paper')) {
        winner = 'p1';
      } else {
        winner = 'p2';
      }

      console.log(`Game result in ${roomId}: ${winner}`);
      io.to(roomId).emit('gameResult', { winner });

      // Optional: Add database update for stats here
    }
  });

  return {
    renderRps: (req, res) =>
      res.render('rps', {
        title: 'Rock Paper Scissors',
        user: req.user,
      }),
    renderClicker: (req, res) =>
      res.render('clicker', {
        title: 'Clicker Game',
        user: req.user,
      }),
    renderChess: (req, res) =>
      res.render('chess', {
        title: 'Chess',
        user: req.user,
      }),
  };
};
