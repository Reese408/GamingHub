// Select elements
const gameBoard = document.querySelector("#gameBoard");
const ctx = gameBoard.getContext("2d");
const scoreText = document.querySelector("#scoreText");
const resetBtn = document.querySelector("#resetBtn");
const pointsNotification = document.querySelector("#points-notification");
const newPointsTotal = document.querySelector("#new-points-total");

// Game settings
const gameWidth = gameBoard.width;
const gameHeight = gameBoard.height;
const snakeColor = "lightgreen";
const snakeBorder = "darkgreen";
const foodColor = "red";
const unitSize = 25;
const gameSpeed = 90; // ms between updates (lower = faster)

// Game variables
let running = false;
let xVelocity = unitSize;
let yVelocity = 0;
let foodX;
let foodY;
let score = 0;
let snake = [
    { x: unitSize * 4, y: 0 },
    { x: unitSize * 3, y: 0 },
    { x: unitSize * 2, y: 0 },
    { x: unitSize, y: 0 },
    { x: 0, y: 0 }
];

// Event listeners
window.addEventListener("keydown", changeDirection);
resetBtn.addEventListener("click", resetGame);

// Start the game
gameStart();

function gameStart() {
    running = true;
    score = 0;
    scoreText.textContent = score;
    resetBtn.style.display = "none";
    
    createFood();
    drawFood();
    nextTick();
}

async function updateUserPoints(points) {
    try {
        const response = await fetch('/profile/update-snake-points', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ points: points })
        });
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        if (data.success && pointsNotification && newPointsTotal) {
            newPointsTotal.textContent = data.newPoints;
            pointsNotification.style.display = 'block';
            setTimeout(() => {
                pointsNotification.style.display = 'none';
            }, 3000);
        }
    } catch (error) {
        console.error('Error updating points:', error);
    }
}

function nextTick() {
    if (running) {
        setTimeout(() => {
            clearBoard();
            drawFood();
            moveSnake();
            drawSnake();
            checkGameOver();
            nextTick();
        }, gameSpeed);
    } else {
        displayGameOver();
    }
}

function clearBoard() {
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.fillRect(0, 0, gameWidth, gameHeight);
}

function createFood() {
    function randomFood(min, max) {
        return Math.floor((Math.random() * (max - min) + min) / unitSize) * unitSize;
    }
    foodX = randomFood(0, gameWidth - unitSize);
    foodY = randomFood(0, gameHeight - unitSize);
    
    for (let part of snake) {
        if (part.x === foodX && part.y === foodY) {
            createFood();
            return;
        }
    }
}

function drawFood() {
    ctx.fillStyle = foodColor;
    ctx.fillRect(foodX, foodY, unitSize, unitSize);
}

function moveSnake() {
    const head = { x: snake[0].x + xVelocity, y: snake[0].y + yVelocity };
    snake.unshift(head);

    if (snake[0].x === foodX && snake[0].y === foodY) {
        score++;
        scoreText.textContent = score;
        createFood();
    } else {
        snake.pop();
    }
}

function drawSnake() {
    ctx.fillStyle = snakeColor;
    ctx.strokeStyle = snakeBorder;

    snake.forEach(part => {
        ctx.fillRect(part.x, part.y, unitSize, unitSize);
        ctx.strokeRect(part.x, part.y, unitSize, unitSize);
    });
}

function changeDirection(event) {
    const keyPressed = event.keyCode;
    const LEFT = 37, UP = 38, RIGHT = 39, DOWN = 40;

    const goingUp = yVelocity === -unitSize;
    const goingDown = yVelocity === unitSize;
    const goingRight = xVelocity === unitSize;
    const goingLeft = xVelocity === -unitSize;

    switch (true) {
        case keyPressed === LEFT && !goingRight:
            xVelocity = -unitSize;
            yVelocity = 0;
            break;
        case keyPressed === UP && !goingDown:
            xVelocity = 0;
            yVelocity = -unitSize;
            break;
        case keyPressed === RIGHT && !goingLeft:
            xVelocity = unitSize;
            yVelocity = 0;
            break;
        case keyPressed === DOWN && !goingUp:
            xVelocity = 0;
            yVelocity = unitSize;
            break;
    }
}

function checkGameOver() {
    if (snake[0].x < 0 || snake[0].x >= gameWidth || snake[0].y < 0 || snake[0].y >= gameHeight) {
        running = false;
    }

    for (let i = 1; i < snake.length; i++) {
        if (snake[i].x === snake[0].x && snake[i].y === snake[0].y) {
            running = false;
        }
    }
}

function displayGameOver() {
    ctx.font = "50px MV Boli";
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.fillText("Game Over!", gameWidth / 2, gameHeight / 2);
    
    resetBtn.style.display = "block";
    resetBtn.textContent = "Play Again?";
    resetBtn.style.backgroundColor = "lightgreen";
    resetBtn.style.color = "darkgreen";
    
    if (score > 0) {
        updateUserPoints(score);
    }
}

function resetGame() {
    score = 0;
    xVelocity = unitSize;
    yVelocity = 0;
    snake = [
        { x: unitSize * 4, y: 0 },
        { x: unitSize * 3, y: 0 },
        { x: unitSize * 2, y: 0 },
        { x: unitSize, y: 0 },
        { x: 0, y: 0 }
    ];
    gameStart();
}