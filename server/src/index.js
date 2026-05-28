const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const PORT = process.env.PORT || 3001;

const path = require('path');
const clientDir = path.join(__dirname, '..', '..', 'client');

const app = express();
app.use(cors());
app.use(express.static(clientDir));
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('*', (req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

const gameState = {
  players: {},
  nextId: 1,
  zones: ['meadow', 'forest', 'caves', 'ruins', 'tower'],
};

const TICK_RATE = 20;
const TICK_INTERVAL = 1000 / TICK_RATE;

const MAP_WIDTH = 20;
const MAP_HEIGHT = 15;
const TILE_SIZE = 32;

const meadowMap = [
  [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
  [3,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,1,0,0,0,0,4,4,4,0,0,0,0,1,0,0,0,3],
  [3,0,0,0,0,0,0,0,4,0,4,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,4,0,4,0,0,0,0,0,0,0,0,3],
  [3,1,0,0,0,2,2,2,4,0,4,2,2,2,0,0,0,0,1,3],
  [3,0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0,0,0,3],
  [3,0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0,0,0,3],
  [3,0,0,0,0,2,2,2,4,0,4,2,2,2,0,0,0,1,0,3],
  [3,0,0,0,0,0,0,0,4,0,4,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,4,4,4,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
];

const zoneMaps = {
  meadow: meadowMap,
};

function isWalkable(zone, tileX, tileY) {
  const map = zoneMaps[zone];
  if (!map) return false;
  if (tileY < 0 || tileY >= map.length) return false;
  if (tileX < 0 || tileX >= map[0].length) return false;
  const tile = map[tileY][tileX];
  return tile === 0 || tile === 4;
}

function findSpawn(zone) {
  const map = zoneMaps[zone];
  if (!map) return { x: 5 * TILE_SIZE, y: 5 * TILE_SIZE };
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      if (map[y][x] === 0) {
        return { x: x * TILE_SIZE + TILE_SIZE / 2, y: y * TILE_SIZE + TILE_SIZE / 2 };
      }
    }
  }
  return { x: 5 * TILE_SIZE, y: 5 * TILE_SIZE };
}

function createPlayer(id, name, characterClass) {
  const spawn = findSpawn('meadow');
  return {
    id,
    name: name || `Adventurer ${id}`,
    class: characterClass || 'mage',
    zone: 'meadow',
    x: spawn.x,
    y: spawn.y,
    hp: 100,
    maxHp: 100,
    mp: 50,
    maxMp: 50,
    level: 1,
    xp: 0,
    xpToNext: 100,
    direction: 'down',
    moving: false,
  };
}

function gameLoop() {
  io.emit('state_update', {
    players: gameState.players,
  });
}

setInterval(gameLoop, TICK_INTERVAL);

io.on('connection', (socket) => {
  const id = gameState.nextId++;
  console.log(`Player ${id} connected (socket: ${socket.id})`);

  socket.on('request_map', () => {
    socket.emit('map_data', {
      map: meadowMap,
      mapWidth: MAP_WIDTH,
      mapHeight: MAP_HEIGHT,
      tileSize: TILE_SIZE,
    });
  });

  socket.on('join', (data) => {
    const player = createPlayer(id, data.name, data.class);
    gameState.players[id] = player;
    socket.emit('you_joined', { id });
    io.emit('player_joined', { id, player });
    socket.broadcast.emit('chat_message', {
      name: 'System',
      text: `${player.name} has entered the realm.`,
      color: '#ffcc00',
    });
  });

  socket.on('move', (data) => {
    const player = gameState.players[id];
    if (!player) return;

    if (player.zone !== data.zone) {
      player.zone = data.zone;
    }

    const tileX = Math.floor(data.x / TILE_SIZE);
    const tileY = Math.floor(data.y / TILE_SIZE);

    if (isWalkable(player.zone, tileX, tileY)) {
      player.x = data.x;
      player.y = data.y;
    }

    player.direction = data.direction || player.direction;
    player.moving = data.moving !== undefined ? data.moving : player.moving;
  });

  socket.on('chat_message', (data) => {
    const player = gameState.players[id];
    if (!player) return;
    const name = player.name;
    io.emit('chat_message', {
      name,
      text: data.text,
      color: '#ffffff',
    });
  });

  socket.on('disconnect', () => {
    const player = gameState.players[id];
    if (player) {
      io.emit('chat_message', {
        name: 'System',
        text: `${player.name} has left the realm.`,
        color: '#ffcc00',
      });
      io.emit('player_left', { id });
      delete gameState.players[id];
      console.log(`Player ${id} disconnected`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Mystic Realm server running on port ${PORT}`);
});
