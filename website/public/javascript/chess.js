document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('chessboard');
    const turnIndicator = document.getElementById('turn-indicator');
    const size = 8;
    const pieceEmojis = {
        'wK': '👑', 'bK': '♚',
        'wQ': '♕', 'bQ': '♛',
        'wR': '♖', 'bR': '♜',
        'wB': '♗', 'bB': '♝',
        'wN': '♘', 'bN': '♞',
        'wP': '♙', 'bP': '♟'
    };
    const boardState = Array(size).fill().map(() => Array(size).fill(null));
    let currentTurn = 'w';
    let selectedSquare = null;

    function initBoard() {
        board.innerHTML = '';
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const square = document.createElement('div');
                square.className = `square ${(row + col) % 2 === 0 ? 'white' : 'black'}`;
                square.dataset.row = row;
                square.dataset.col = col;
                square.removeEventListener('click', onSquareClick);
                square.removeEventListener('mouseover', onSquareHover);
                square.removeEventListener('mouseout', onSquareHoverOut);
                square.addEventListener('click', onSquareClick);
                square.addEventListener('mouseover', onSquareHover);
                square.addEventListener('mouseout', onSquareHoverOut);
                board.appendChild(square);
            }
        }
        setInitialPositions();
        updateTurnIndicator();
    }

    function setInitialPositions() {
        const initialPositions = [
            ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR'],
            ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
            ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR']
        ];
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const piece = initialPositions[row][col];
                if (piece) {
                    boardState[row][col] = piece;
                    updateSquare(row, col, piece);
                }
            }
        }
    }

    function updateSquare(row, col, piece) {
        const square = document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
        square.textContent = piece ? pieceEmojis[piece] : '';
    }

    function updateTurnIndicator() {
        turnIndicator.textContent = currentTurn === 'w' ? "White's Turn" : "Black's Turn";
        turnIndicator.style.color = currentTurn === 'w' ? 'white' : 'black';
        turnIndicator.style.backgroundColor = currentTurn === 'w' ? 'black' : 'white';
    }

    function onSquareClick(event) {
        const square = event.currentTarget;
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);

        if (selectedSquare) {
            const fromRow = selectedSquare.row;
            const fromCol = selectedSquare.col;
            if (isValidMove(fromRow, fromCol, row, col)) {
                animateMove(fromRow, fromCol, row, col);
                boardState[row][col] = boardState[fromRow][fromCol];
                boardState[fromRow][fromCol] = null;
                updateSquare(fromRow, fromCol, null);
                updateSquare(row, col, boardState[row][col]);
                currentTurn = currentTurn === 'w' ? 'b' : 'w';
                selectedSquare = null;
                updateTurnIndicator();
                clearHighlights();
                checkGameOver();
            } else {
                clearHighlights();
                highlightInvalidMove(row, col);
            }
        } else {
            if (boardState[row][col] && boardState[row][col][0] === currentTurn) {
                selectedSquare = { row, col };
                highlightValidMoves(row, col);
            }
        }
    }

    function onSquareHover(event) {
        const square = event.currentTarget;
        if (!selectedSquare) {
            square.classList.add('hover');
        }
    }

    function onSquareHoverOut(event) {
        const square = event.currentTarget;
        square.classList.remove('hover');
    }

    function highlightValidMoves(row, col) {
        const piece = boardState[row][col];
        if (!piece) return;

        switch (piece[1]) {
            case 'P':
                highlightPawnMoves(row, col);
                break;
            case 'R':
                highlightRookMoves(row, col);
                break;
            case 'N':
                highlightKnightMoves(row, col);
                break;
            case 'B':
                highlightBishopMoves(row, col);
                break;
            case 'Q':
                highlightQueenMoves(row, col);
                break;
            case 'K':
                highlightKingMoves(row, col);
                break;
        }
    }

    function highlightPawnMoves(row, col) {
        const piece = boardState[row][col];
        const direction = piece[0] === 'w' ? 1 : -1;
        const startRow = piece[0] === 'w' ? 1 : 6;
        const nextRow = row + direction;

        if (!boardState[nextRow][col]) {
            addValidMove(nextRow, col);
            if (row === startRow && !boardState[nextRow + direction][col]) {
                addValidMove(nextRow + direction, col);
            }
        }

        if (col > 0 && boardState[nextRow][col - 1] && boardState[nextRow][col - 1][0] !== piece[0]) {
            addValidMove(nextRow, col - 1);
        }
        if (col < size - 1 && boardState[nextRow][col + 1] && boardState[nextRow][col + 1][0] !== piece[0]) {
            addValidMove(nextRow, col + 1);
        }
    }

    function addValidMove(row, col) {
        const square = document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
        square.classList.add('valid-move');
    }

    function highlightRookMoves(row, col) {
        highlightLinearMoves(row, col, 'R');
    }

    function highlightKnightMoves(row, col) {
        const directions = [
            [-2, -1], [-2, 1], [2, -1], [2, 1], 
            [-1, -2], [-1, 2], [1, -2], [1, 2]
        ];

        directions.forEach(([dx, dy]) => {
            const newRow = row + dx;
            const newCol = col + dy;
            if (isWithinBounds(newRow, newCol)) {
                const targetPiece = boardState[newRow][newCol];
                if (!targetPiece || targetPiece[0] !== boardState[row][col][0]) {
                    addValidMove(newRow, newCol);
                }
            }
        });
    }

    function highlightBishopMoves(row, col) {
        highlightDiagonalMoves(row, col, 'B');
    }

    function highlightQueenMoves(row, col) {
        highlightLinearMoves(row, col, 'Q');
        highlightDiagonalMoves(row, col, 'Q');
    }

    function highlightKingMoves(row, col) {
        const directions = [
            [-1, -1], [-1, 0], [-1, 1], [0, -1],
            [0, 1], [1, -1], [1, 0], [1, 1]
        ];

        directions.forEach(([dx, dy]) => {
            const newRow = row + dx;
            const newCol = col + dy;
            if (isWithinBounds(newRow, newCol)) {
                const targetPiece = boardState[newRow][newCol];
                if (!targetPiece || targetPiece[0] !== boardState[row][col][0]) {
                    addValidMove(newRow, newCol);
                }
            }
        });
    }

    function highlightLinearMoves(row, col, pieceType) {
        const directions = [
            [1, 0], [-1, 0], [0, 1], [0, -1]
        ];

        directions.forEach(([dx, dy]) => {
            let newRow = row;
            let newCol = col;
            while (true) {
                newRow += dx;
                newCol += dy;
                if (!isWithinBounds(newRow, newCol)) break;
                const targetPiece = boardState[newRow][newCol];
                if (targetPiece) {
                    if (targetPiece[0] !== boardState[row][col][0]) {
                        addValidMove(newRow, newCol);
                    }
                    break;
                }
                addValidMove(newRow, newCol);
            }
        });
    }

    function highlightDiagonalMoves(row, col, pieceType) {
        const directions = [
            [-1, -1], [-1, 1], [1, -1], [1, 1]
        ];

        directions.forEach(([dx, dy]) => {
            let newRow = row;
            let newCol = col;
            while (true) {
                newRow += dx;
                newCol += dy;
                if (!isWithinBounds(newRow, newCol)) break;
                const targetPiece = boardState[newRow][newCol];
                if (targetPiece) {
                    if (targetPiece[0] !== boardState[row][col][0]) {
                        addValidMove(newRow, newCol);
                    }
                    break;
                }
                addValidMove(newRow, newCol);
            }
        });
    }

    function isWithinBounds(row, col) {
        return row >= 0 && row < size && col >= 0 && col < size;
    }

    function clearHighlights() {
        const validMoves = document.querySelectorAll('.valid-move');
        validMoves.forEach(square => {
            square.classList.remove('valid-move');
        });
    }

    function highlightInvalidMove(row, col) {
        const square = document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
        square.classList.add('invalid-move');
    }

    function isValidMove(fromRow, fromCol, toRow, toCol) {
        const piece = boardState[fromRow][fromCol];
        if (!piece) return false;

        switch (piece[1]) {
            case 'P':
                return isValidPawnMove(fromRow, fromCol, toRow, toCol, piece);
            case 'R':
                return isValidRookMove(fromRow, fromCol, toRow, toCol);
            case 'N':
                return isValidKnightMove(fromRow, fromCol, toRow, toCol);
            case 'B':
                return isValidBishopMove(fromRow, fromCol, toRow, toCol);
            case 'Q':
                return isValidQueenMove(fromRow, fromCol, toRow, toCol);
            case 'K':
                return isValidKingMove(fromRow, fromCol, toRow, toCol);
            default:
                return false;
        }
    }

    function isValidPawnMove(fromRow, fromCol, toRow, toCol, piece) {
        const direction = piece[0] === 'w' ? 1 : -1;
        const startRow = piece[0] === 'w' ? 1 : 6;
        if (fromCol === toCol && !boardState[toRow][toCol]) {
            return (toRow === fromRow + direction || (fromRow === startRow && toRow === fromRow + 2 * direction));
        }
        if (Math.abs(fromCol - toCol) === 1 && toRow === fromRow + direction && boardState[toRow][toCol] && boardState[toRow][toCol][0] !== piece[0]) {
            return true;
        }
        return false;
    }

    function isValidRookMove(fromRow, fromCol, toRow, toCol) {
        if (fromRow !== toRow && fromCol !== toCol) return false;
        if (fromRow === toRow) {
            let startCol = Math.min(fromCol, toCol) + 1;
            let endCol = Math.max(fromCol, toCol);
            for (let col = startCol; col < endCol; col++) {
                if (boardState[fromRow][col]) return false;
            }
        } else {
            let startRow = Math.min(fromRow, toRow) + 1;
            let endRow = Math.max(fromRow, toRow);
            for (let row = startRow; row < endRow; row++) {
                if (boardState[row][fromCol]) return false;
            }
        }
        return true;
    }

    function isValidKnightMove(fromRow, fromCol, toRow, toCol) {
        const dx = Math.abs(fromRow - toRow);
        const dy = Math.abs(fromCol - toCol);
        return dx === 2 && dy === 1 || dx === 1 && dy === 2;
    }

    function isValidBishopMove(fromRow, fromCol, toRow, toCol) {
        if (Math.abs(fromRow - toRow) !== Math.abs(fromCol - toCol)) return false;
        const rowStep = toRow > fromRow ? 1 : -1;
        const colStep = toCol > fromCol ? 1 : -1;
        let row = fromRow + rowStep;
        let col = fromCol + colStep;
        while (row !== toRow && col !== toCol) {
            if (boardState[row][col]) return false;
            row += rowStep;
            col += colStep;
        }
        return true;
    }

    function isValidQueenMove(fromRow, fromCol, toRow, toCol) {
        return isValidRookMove(fromRow, fromCol, toRow, toCol) || isValidBishopMove(fromRow, fromCol, toRow, toCol);
    }

    function isValidKingMove(fromRow, fromCol, toRow, toCol) {
        const dx = Math.abs(fromRow - toRow);
        const dy = Math.abs(fromCol - toCol);
        return dx <= 1 && dy <= 1;
    }

    function animateMove(fromRow, fromCol, toRow, toCol) {
        const fromSquare = document.querySelector(`.square[data-row="${fromRow}"][data-col="${fromCol}"]`);
        const toSquare = document.querySelector(`.square[data-row="${toRow}"][data-col="${toCol}"]`);
        const piece = fromSquare.textContent;
        
        // Add piece to destination square
        toSquare.textContent = piece;
        
        // Clear the original square
        fromSquare.textContent = '';
    
        // Add a CSS class to animate the move
        toSquare.classList.add('move-animation');
        setTimeout(() => {
            toSquare.classList.remove('move-animation');
        }, 500); // The duration of the animation (in milliseconds)
    }

    function checkGameOver() {
        if (isCheckmate('w')) {
            showWinner('b');
        } else if (isCheckmate('b')) {
            showWinner('w');
        }
    }

    function isCheckmate(color) {
        const kingPosition = findKing(color);
        if (isKingInCheck(kingPosition.row, kingPosition.col, color)) {
            return !canMoveKingOutOfCheck(kingPosition.row, kingPosition.col, color);
        }
        return false;
    }

    function findKing(color) {
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (boardState[row][col] === `${color}K`) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    function isKingInCheck(row, col, color) {
        // Implement logic to check if the king is in check
        // This will involve checking all the opponent's pieces for their attack patterns
        return false; // Simplified here
    }

    function canMoveKingOutOfCheck(row, col, color) {
        // Implement logic to check if the king can move out of check
        return false; // Simplified here
    }

    function showWinner(winnerColor) {
        const winnerText = document.getElementById('winner-text');
        const winnerIndicator = document.getElementById('winner-indicator');
        
        winnerText.textContent = winnerColor === 'w' ? "White wins!" : "Black wins!";
        winnerIndicator.style.display = 'block';  // Show the winner indicator
    }

    initBoard();
});
