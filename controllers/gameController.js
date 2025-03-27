// controllers/gameController.js

const rooms = {};

exports.socketLogic = (socket) => {
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

  // Utility function for generating room IDs
  function makeid(length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  }
};

// Game Render Logic
exports.renderRps = (req, res) => {
  res.render('rps', { title: 'Rock Paper Scissors' });
};

exports.renderClicker = (req, res) => {
  res.render('Clicker', { title: 'Clicker Game', funds: 0 });
};

exports.renderChess = (req, res) => {
  res.render('chess', { title: 'Chess' });
};
