document.addEventListener('DOMContentLoaded', () => {
  const socket = io();
  let roomUniqueId = null;
  let isPlayer1 = false;
  let gameActive = false;

  // DOM elements
  const elements = {
    initialScreen: document.getElementById('initial'),
    gamePlayScreen: document.getElementById('gamePlay'),
    waitingArea: document.getElementById('waitingArea'),
    gameArea: document.getElementById('gameArea'),
    winnerArea: document.getElementById('winnerArea'),
    roomCodeInput: document.getElementById('roomUniqueId'),
    player1ChoiceDiv: document.getElementById('player1Choice'),
    player2ChoiceDiv: document.getElementById('player2Choice'),
  };

  // Show screen helper function
  function showScreen(screen) {
    elements.initialScreen.style.display = 'none';
    elements.gamePlayScreen.style.display = 'block';
    elements.waitingArea.style.display = screen === 'waiting' ? 'block' : 'none';
    elements.gameArea.style.display = screen === 'game' ? 'flex' : 'none';
  }

  // Game functions
  window.createGame = () => {
    if (gameActive) return;
    gameActive = true;
    isPlayer1 = true;
    socket.emit('createGame');
    showScreen('waiting');
  };

  window.joinGame = () => {
    if (gameActive) return;
    roomUniqueId = elements.roomCodeInput.value.trim();
    if (!roomUniqueId) return alert('Please enter a game code');

    gameActive = true;
    isPlayer1 = false;
    socket.emit('joinGame', { roomUniqueId });
    showScreen('waiting');
  };

  window.sendChoice = (choice) => {
    if (!gameActive || !roomUniqueId) return;
    socket.emit('playerChoice', {
      rpsValue: choice,
      roomUniqueId: roomUniqueId,
    });
    displayPlayerChoice(choice);
  };

  // Socket event handlers
  socket.on('newGame', (data) => {
    roomUniqueId = data.roomUniqueId;
    showScreen('waiting');
    elements.waitingArea.innerHTML = `
      <h3>Game Code: ${roomUniqueId}</h3>
      <button onclick="copyCode()" class="btn btn-primary">Copy Code</button>
      <p>Waiting for opponent to join...</p>
    `;
  });

  socket.on('playersConnected', () => {
    showScreen('game');
    resetChoices();
  });

  socket.on('revealChoices', (data) => {
    if (isPlayer1) {
      displayOpponentChoice(data.player2Choice);
    } else {
      displayOpponentChoice(data.player1Choice);
    }
  });

  socket.on('gameResult', (data) => {
    displayResult(data.winner);
  });

  socket.on('resetForNewRound', () => {
    resetChoices();
    if (isPlayer1) {
      elements.player1ChoiceDiv.innerHTML = `
        <button class="rps-btn rock" onclick="sendChoice('Rock')"></button>
        <button class="rps-btn paper" onclick="sendChoice('Paper')"></button>
        <button class="rps-btn scissor" onclick="sendChoice('Scissor')"></button>
      `;
    } else {
      elements.player1ChoiceDiv.innerHTML = '<p>Waiting for opponent...</p>';
    }
    elements.player2ChoiceDiv.innerHTML = '<p>Waiting for opponent...</p>';
    elements.winnerArea.innerHTML = '';
  });

  socket.on('error', (error) => {
    alert(`Game error: ${error.message}`);
    resetGame();
  });

  socket.on('enableChoice', () => {
    if (!isPlayer1) {
      elements.player1ChoiceDiv.innerHTML = `
        <button class="rps-btn rock" onclick="sendChoice('Rock')"></button>
        <button class="rps-btn paper" onclick="sendChoice('Paper')"></button>
        <button class="rps-btn scissor" onclick="sendChoice('Scissor')"></button>
      `;
    }
  });

  // UI functions
  function displayPlayerChoice(choice) {
    elements.player1ChoiceDiv.innerHTML = `
      <button class="rps-btn ${choice.toLowerCase()}" disabled></button>
    `;
    document.querySelectorAll('.rps-btn').forEach((btn) => {
      btn.disabled = true;
    });
  }

  function displayOpponentChoice(choice) {
    elements.player2ChoiceDiv.innerHTML = `
      <button class="rps-btn ${choice.toLowerCase()}"></button>
    `;
  }

  function displayResult(winner) {
    let message = '';
    if (winner === 'draw') {
      message = "It's a draw!";
    } else if ((winner === 'p1' && isPlayer1) || (winner === 'p2' && !isPlayer1)) {
      message = 'You win!';
    } else {
      message = 'You lose!';
    }

    elements.winnerArea.innerHTML = `
      <h2>${message}</h2>
      <div class="d-flex justify-content-center mt-3">
        <button class="btn btn-primary me-2" onclick="playAgain()">Play Again</button>
        <button class="btn btn-secondary" onclick="returnToMenu()">Main Menu</button>
      </div>
    `;
  }

  function resetChoices() {
    if (isPlayer1) {
      elements.player1ChoiceDiv.innerHTML = `
        <button class="rps-btn rock" onclick="sendChoice('Rock')"></button>
        <button class="rps-btn paper" onclick="sendChoice('Paper')"></button>
        <button class="rps-btn scissor" onclick="sendChoice('Scissor')"></button>
      `;
    }
    elements.player2ChoiceDiv.innerHTML = '<p>Waiting for opponent...</p>';
    elements.winnerArea.innerHTML = '';
  }

  function resetGame() {
    gameActive = false;
    roomUniqueId = null;
    elements.initialScreen.style.display = 'block';
    elements.gamePlayScreen.style.display = 'none';
  }

  window.playAgain = () => {
    if (!roomUniqueId) return;
    socket.emit('playAgain', { roomUniqueId });
  };

  window.returnToMenu = () => {
    socket.emit('leaveGame', { roomUniqueId });
    resetGame();
  };

  window.copyCode = () => {
    navigator.clipboard
      .writeText(roomUniqueId)
      .then(() => alert('Game code copied!'))
      .catch((err) => console.error('Copy failed:', err));
  };

  // Initialize UI
  elements.gamePlayScreen.style.display = 'none';
  elements.waitingArea.style.display = 'none';
  elements.gameArea.style.display = 'none';
});
