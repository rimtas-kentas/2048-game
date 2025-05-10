const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.static(__dirname));

// Store active rooms
let rooms = new Map();

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('createRoom', (playerName) => {
        const roomCode = Math.random().toString(36).substring(2, 8);
        
        rooms.set(roomCode, {
            players: [
                { id: socket.id, name: playerName, score: 0, grid: Array(4).fill().map(() => Array(4).fill(0)) }
            ],
            turn: 0
        });

        socket.join(roomCode);
        socket.emit('roomCreated', { roomCode, playerNumber: 1 });
    });

    socket.on('joinRoom', (data) => {
        const { roomCode, playerName } = data;
        const room = rooms.get(roomCode);

        if (!room || room.players.length >= 2) {
            socket.emit('joinFailed', 'Room not available');
            return;
        }

        room.players.push({
            id: socket.id,
            name: playerName,
            score: 0,
            grid: Array(4).fill().map(() => Array(4).fill(0))
        });

        socket.join(roomCode);
        socket.emit('roomJoined', { roomCode, playerNumber: 2 });
        io.to(roomCode).emit('roomState', room);
    });

    socket.on('move', (data) => {
        const { roomCode, playerNumber, direction } = data;
        const room = rooms.get(roomCode);

        if (!room) return;

        // Only allow move if it's this player's turn
        if (room.turn !== playerNumber - 1) return;

        const player = room.players[playerNumber - 1];
        const opponent = room.players[playerNumber === 1 ? 1 : 0];

        // Process move
        const newGrid = [...player.grid.map(row => [...row])];
        let moved = false;

        // Move tiles in the direction
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

        for (let i = 0; i < 4; i++) {
            let row = newGrid[i];
            let newRow = [];
            let lastValue = 0;

            for (let j = 0; j < 4; j++) {
                if (row[j] !== 0) {
                    if (row[j] === lastValue) {
                        newRow[newRow.length - 1] *= 2;
                        player.score += newRow[newRow.length - 1];
                        lastValue = 0;
                        moved = true;
                    } else {
                        newRow.push(row[j]);
                        lastValue = row[j];
                    }
                }
            }

            while (newRow.length < 4) {
                newRow.push(0);
            }

            newGrid[i] = newRow;
        }

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
            // Add random tile
            const emptyCells = [];
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    if (newGrid[i][j] === 0) {
                        emptyCells.push({ x: i, y: j });
                    }
                }
            }

            if (emptyCells.length > 0) {
                const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
                newGrid[randomCell.x][randomCell.y] = Math.random() < 0.9 ? 2 : 4;
            }

            // Update player's grid
            player.grid = newGrid;
            
            // Check if game is over
            const isGameOver = !canMove(newGrid);
            if (isGameOver) {
                io.to(roomCode).emit('gameOver', playerNumber);
                return;
            }

            // Switch turn
            room.turn = (room.turn + 1) % 2;
            io.to(roomCode).emit('roomState', room);
        }
    });

    socket.on('disconnect', () => {
        // Remove player from room if they exist
        for (const [roomCode, room] of rooms.entries()) {
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                room.players.splice(playerIndex, 1);
                if (room.players.length === 0) {
                    rooms.delete(roomCode);
                } else {
                    io.to(roomCode).emit('roomState', room);
                }
                break;
            }
        }
    });
});

function rotateGrid(grid, times) {
    for (let i = 0; i < times; i++) {
        grid = grid[0].map((_, colIndex) => grid.map(row => row[colIndex])).reverse();
    }
    return grid;
}

function canMove(grid) {
    // Check if there are any empty cells
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            if (grid[i][j] === 0) return true;
        }
    }

    // Check if any adjacent cells can be merged
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            const value = grid[i][j];
            if ((i < 3 && grid[i + 1][j] === value) ||
                (j < 3 && grid[i][j + 1] === value)) {
                return true;
            }
        }
    }

    return false;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
