import express from 'express';
import http from 'http';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Server as SocketIOServer } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server);

app.use('/static', express.static(join(__dirname, 'static')));
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

const players = {};
const enemies = {};
generateEnemies();

io.on('connection', (socket) => {
    console.log(`Player [${socket.id}] connected`);

    players[socket.id] = {
        rotation: 0,
        x: 30,
        y: 30,
        playerId: socket.id,
        color: getRandomColor(),
    };

    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', players[socket.id]);

    socket.emit('newEnemies', enemies);
    socket.broadcast.emit('newEnemies', enemies);

    socket.on('disconnect', () => {
        console.log(`Player [${socket.id}] disconnected`);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });

    socket.on('playerMovement', (movementData) => {
        players[socket.id].x = movementData.x;
        players[socket.id].y = movementData.y;
        players[socket.id].rotation = movementData.rotation;

        socket.broadcast.emit('playerMoved', players[socket.id]);
    });

    socket.on('rotateSword', () => {
        socket.broadcast.emit('playerRotated', { playerId: socket.id });
    });
});

function getRandomColor() {
    return '0x' + Math.floor(Math.random() * 16777215).toString(16);
}

function generateEnemies() {
    const numberOfEnemies = 10;
    for (let i = 0; i < numberOfEnemies; i++) {
        const { x, y } = generateRandomPosition();
        enemies[`enemy${i}`] = { x, y };
    }
}

function generateRandomPosition() {
    const x = Math.random() * 800;
    const y = Math.random() * 400;
    return { x, y };
}

const PORT = 5000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
});
