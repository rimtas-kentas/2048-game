const socket = io();
const gameContainer = document.querySelector('.game-container');
const gridContainer = document.querySelector('.grid-container');
const scoreContainers = document.querySelectorAll('.score-container');
const bestContainers = document.querySelectorAll('.best-container');
const gameMessage = document.querySelector('.game-message');
const restartButton = document.querySelector('.restart-button');
const playerNameInput = document.getElementById('playerName');
const createRoomButton = document.getElementById('createRoom');
const joinRoomButton = document.getElementById('joinRoom');
const roomCodeInput = document.getElementById('roomCode');
const settingsBtn = document.getElementById('settingsBtn');
const tutorialBtn = document.getElementById('tutorialBtn');
const tutorialOverlay = document.querySelector('.tutorial-overlay');
const tutorialContent = document.querySelector('.tutorial-content');
const closeTutorialBtn = document.querySelector('.close-tutorial');
const settingsMenu = document.querySelector('.settings-menu');
const saveControlsBtn = document.getElementById('saveControls');
const playPauseBtn = document.getElementById('playPauseBtn');
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');
const gameMusic = document.getElementById('gameMusic');

// Tutorial functionality
tutorialBtn.addEventListener('click', () => {
    tutorialOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
});

closeTutorialBtn.addEventListener('click', () => {
    tutorialOverlay.style.display = 'none';
    document.body.style.overflow = 'auto';
});

// Close tutorial when clicking outside
tutorialOverlay.addEventListener('click', (e) => {
    if (e.target === tutorialOverlay) {
        tutorialOverlay.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
});

let playerNumber = null;
let roomCode = null;
let customControls = {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight'
};

// Initialize music
let isPlaying = false;
gameMusic.volume = 0.1; // Start with 10% volume

// Settings menu toggle
settingsBtn.addEventListener('click', () => {
    settingsMenu.style.display = settingsMenu.style.display === 'block' ? 'none' : 'block';
});

// Save custom controls
saveControlsBtn.addEventListener('click', () => {
    customControls = {
        up: document.getElementById('upKey').value,
        down: document.getElementById('downKey').value,
        left: document.getElementById('leftKey').value,
        right: document.getElementById('rightKey').value
    };
    localStorage.setItem('customControls', JSON.stringify(customControls));
    settingsMenu.style.display = 'none';
});

// Load saved controls
const savedControls = localStorage.getItem('customControls');
if (savedControls) {
    customControls = JSON.parse(savedControls);
    document.getElementById('upKey').value = customControls.up;
    document.getElementById('downKey').value = customControls.down;
    document.getElementById('leftKey').value = customControls.left;
    document.getElementById('rightKey').value = customControls.right;
}

// Music controls
playPauseBtn.addEventListener('click', () => {
    if (isPlaying) {
        gameMusic.pause();
        playPauseBtn.textContent = 'Play';
    } else {
        gameMusic.play();
        playPauseBtn.textContent = 'Pause';
    }
    isPlaying = !isPlaying;
});

volumeSlider.addEventListener('input', (e) => {
    const value = e.target.value;
    gameMusic.volume = value / 100;
    volumeValue.textContent = `${value}%`;
});

// Handle keyboard input
document.addEventListener('keydown', (e) => {
    if (!playerNumber || !roomCode) return;
    
    let direction;
    if (e.key === customControls.up) direction = 'up';
    else if (e.key === customControls.down) direction = 'down';
    else if (e.key === customControls.left) direction = 'left';
    else if (e.key === customControls.right) direction = 'right';
    
    if (direction) {
        socket.emit('move', {
            roomCode,
            playerNumber,
            direction
        });
    }
});

// Initialize socket connection
socket.on('connect', () => {
    console.log('Connected to server');
});

// Handle room creation
createRoomButton.addEventListener('click', () => {
    const playerName = playerNameInput.value.trim();
    if (!playerName) return;
    
    socket.emit('createRoom', playerName);
});

// Handle room joining
joinRoomButton.addEventListener('click', () => {
    const playerName = playerNameInput.value.trim();
    const roomCode = roomCodeInput.value.trim();
    if (!playerName || !roomCode) return;
    
    socket.emit('joinRoom', { roomCode, playerName });
});

// Update grid display
function updateGrid(grid, playerNumber) {
    const tiles = document.querySelectorAll('.tile');
    tiles.forEach(tile => tile.remove());
    
    grid.forEach((row, x) => {
        row.forEach((value, y) => {
            if (value !== 0) {
                const tile = document.createElement('div');
                tile.className = `tile tile-${value}`;
                tile.textContent = value;
                tile.style.transform = `translate(${y * 125}px, ${x * 125}px)`;
                gridContainer.appendChild(tile);
            }
        });
    });
}

// Handle room state updates
socket.on('roomState', (room) => {
    if (playerNumber === null) return;
    
    const player = room.players[playerNumber - 1];
    const opponent = room.players[playerNumber === 1 ? 1 : 0];
    
    // Update scores
    scoreContainers[0].textContent = player.score;
    scoreContainers[1].textContent = opponent.score;
    
    // Update grids
    updateGrid(player.grid, playerNumber);
    
    // Update turn indicator
    const turnIndicator = document.createElement('div');
    turnIndicator.className = 'turn-indicator';
    turnIndicator.textContent = `Player ${room.turn + 1}'s turn`;
    gameMessage.querySelector('p').textContent = '';
    gameMessage.appendChild(turnIndicator);
    gameMessage.style.display = 'block';
});

// Handle game over
socket.on('gameOver', (winner) => {
    gameMessage.querySelector('p').textContent = `Player ${winner} wins!`;
    gameMessage.style.display = 'block';
});

// Handle room creation response
socket.on('roomCreated', (data) => {
    roomCode = data.roomCode;
    playerNumber = data.playerNumber;
    console.log(`Created room ${roomCode}, player ${playerNumber}`);
});

// Handle room joining response
socket.on('roomJoined', (data) => {
    roomCode = data.roomCode;
    playerNumber = data.playerNumber;
    console.log(`Joined room ${roomCode}, player ${playerNumber}`);
});

// Handle join failure
socket.on('joinFailed', (reason) => {
    alert(reason);
});

// Handle restart
restartButton.addEventListener('click', () => {
    if (roomCode && playerNumber) {
        socket.emit('restart', { roomCode, playerNumber });
    }
});

// Add animations
document.addEventListener('keydown', (e) => {
    if (!playerNumber || !roomCode) return;
    
    // Add animation class to tiles when moving
    const tiles = document.querySelectorAll('.tile');
    tiles.forEach(tile => {
        tile.classList.add('move-animation');
        setTimeout(() => tile.classList.remove('move-animation'), 300);
    });
});

// Add sound effects
function playSound() {
    const sound = new Audio('sound-effect.mp3');
    sound.volume = 0.5;
    sound.play();
}

let grid = [];
let score = 0;
let bestScore = localStorage.getItem('2048_best_score') || 0;

function initGame() {
    score = 0;
    scoreContainers[0].textContent = score;
    bestContainers[0].textContent = bestScore;
    
    // Initialize 4x4 grid
    grid = Array(4).fill().map(() => Array(4).fill(0));
    
    // Add two initial tiles
    addRandomTile();
    addRandomTile();
    
    // Update the grid display
    updateGrid(grid, 1);
}

function addRandomTile() {
    const emptyCells = [];
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            if (grid[i][j] === 0) {
                emptyCells.push({ x: i, y: j });
            }
        }
    }
    
    if (emptyCells.length === 0) return;
    
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    grid[randomCell.x][randomCell.y] = Math.random() < 0.9 ? 2 : 4;
}

function moveTiles(direction) {
    let moved = false;
    let newGrid = [...grid.map(row => [...row])];
    let mergeSound = false;
    
    switch(direction) {
        case 'up':
            newGrid = rotateGrid(newGrid, 3);
            break;
        case 'down':
            newGrid = rotateGrid(newGrid, 1);
            break;
        case 'left':
            newGrid = rotateGrid(newGrid, 2);
            break;
    }
    
    // Move tiles in the direction
    for (let i = 0; i < 4; i++) {
        let row = newGrid[i];
        let newRow = [];
        let lastValue = 0;
        
        // Process each row
        for (let j = 0; j < 4; j++) {
            if (row[j] !== 0) {
                if (row[j] === lastValue) {
                    newRow[newRow.length - 1] *= 2;
                    score += newRow[newRow.length - 1];
                    lastValue = 0;
                    moved = true;
                    mergeSound = true;
                } else {
                    newRow.push(row[j]);
                    lastValue = row[j];
                }
            }
        }
        
        // Fill remaining spaces with 0
        while (newRow.length < 4) {
            newRow.push(0);
        }
        
        newGrid[i] = newRow;
    }
    
    // Rotate back to original orientation
    switch(direction) {
        case 'up':
            newGrid = rotateGrid(newGrid, 1);
            break;
        case 'down':
            newGrid = rotateGrid(newGrid, 3);
            break;
        case 'left':
            newGrid = rotateGrid(newGrid, 2);
            break;
    }
    
    if (moved) {
        // Add animations
        const tiles = document.querySelectorAll('.tile');
        tiles.forEach(tile => {
            tile.classList.add('move-animation');
            setTimeout(() => tile.classList.remove('move-animation'), 300);
        });
        
        // Play sound effects
        if (mergeSound) {
            const mergeAudio = new Audio('sounds/tile-merge.mp3');
            mergeAudio.volume = 0.5;
            mergeAudio.play();
        }
        
        grid = newGrid;
        addRandomTile();
        updateGrid();
        updateScore();
        checkGameOver();
    }
}

function rotateGrid(grid, times) {
    for (let i = 0; i < times; i++) {
        grid = grid[0].map((_, colIndex) => grid.map(row => row[colIndex])).reverse();
    }
    return grid;
}

function updateScore() {
    scoreContainer.textContent = score;
    if (score > bestScore) {
        bestScore = score;
        bestContainer.textContent = score;
        localStorage.setItem('2048_best_score', score);
    }
}

function checkGameOver() {
    if (isGameOver()) {
        gameMessage.querySelector('p').textContent = 'Game Over!';
        gameMessage.style.display = 'block';
    }
}

function isGameOver() {
    // Check if there are any empty cells
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            if (grid[i][j] === 0) return false;
        }
    }
    
    // Check if any adjacent cells can be merged
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            const value = grid[i][j];
            if ((i < 3 && grid[i + 1][j] === value) ||
                (j < 3 && grid[i][j + 1] === value)) {
                return false;
            }
        }
    }
    
    return true;
}

// Event Listeners
restartButton.addEventListener('click', initGame);

document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'ArrowUp':
            moveTiles('up');
            break;
        case 'ArrowDown':
            moveTiles('down');
            break;
        case 'ArrowLeft':
            moveTiles('left');
            break;
        case 'ArrowRight':
            moveTiles('right');
            break;
    }
});

// Initialize the game
initGame();
