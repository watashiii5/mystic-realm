const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3001;
const clientDir = path.join(__dirname, '..', '..', 'client');
const dataFile = path.join(__dirname, '..', 'data.json');

const app = express();
app.use(cors());
app.use(express.static(clientDir));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('*', (req, res) => res.sendFile(path.join(clientDir, 'index.html')));

const G = require('./game.js');
const { TILE_SIZE, MAP_COLS, MAP_ROWS, SPELLS, CLASS_STARTING_SPELLS, MONSTERS, ZONE_DEFS, getZoneMap, isWalkable, getEdgeZone, getSpawnTile, getStats, xpToLevel, rollLoot, applyItemStats, getItemEffects } = G;

const gameState = { players: {}, monsters: {}, projectiles: [], groundItems: {}, nextId: 1, nextMonsterId: 1, nextItemId: 1 };

const SAVE_INTERVAL = 60000;
const MONSTER_RESPAWN = 15000;
const TICK_RATE = 20;
const TICK_MS = 1000 / TICK_RATE;
const PROJECTILE_SPEED = 5;
const ATTACK_COOLDOWN = 800;

function saveAll() {
  const data = {};
  for (const id in gameState.players) {
    const p = gameState.players[id];
    data[id] = { name: p.name, class: p.class, level: p.level, xp: p.xp, spells: p.spells, inventory: p.inventory, equipped: p.equipped };
  }
  try { fs.writeFileSync(dataFile, JSON.stringify(data)); } catch (e) {}
}

function loadAll() {
  try {
    const raw = fs.readFileSync(dataFile, 'utf8');
    return JSON.parse(raw);
  } catch (e) { return {}; }
}

function spawnMonsters(zone) {
  const def = ZONE_DEFS[zone];
  if (!def) return;
  const key = `zone_${zone}`;
  if (gameState.monsters[key] && gameState.monsters[key].length > 0) return;
  gameState.monsters[key] = [];
  const count = zone === 'tower' ? 8 : 5 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const mk = def.monsters[Math.floor(Math.random() * def.monsters.length)];
    if (mk === 'boss' && gameState.monsters[key].some(m => m.key === 'boss')) continue;
    const m = G.createMonsterInstance(zone, mk, gameState.nextMonsterId++);
    if (m) gameState.monsters[key].push(m);
  }
}

function getMonstersInZone(zone) {
  return gameState.monsters[`zone_${zone}`] || [];
}

function addProjectile(ownerId, zone, spellKey, fromX, fromY, toX, toY) {
  const spell = SPELLS[spellKey];
  if (!spell) return;
  const id = gameState.nextId++;
  const dx = toX - fromX, dy = toY - fromY;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  gameState.projectiles.push({
    id, ownerId, zone, spellKey,
    x: fromX, y: fromY,
    vx: (dx / dist) * PROJECTILE_SPEED,
    vy: (dy / dist) * PROJECTILE_SPEED,
    distance: 0, maxDistance: Math.min(dist, 200),
    dmg: spell.dmg, radius: spell.radius || 4,
    aoe: spell.aoe || false,
    color: spell.color,
    effects: spell,
  });
}

function createPlayer(id, data) {
  const saved = loadAll()[id];
  const pclass = saved?.class || data.class || 'mage';
  const pname = saved?.name || data.name || `Adventurer ${id}`;
  const stats = getStats(pclass, saved?.level || 1);
  const spawn = getSpawnTile('meadow');
  const p = {
    id, name: pname, class: pclass,
    zone: 'meadow', x: spawn.x, y: spawn.y,
    hp: stats.maxHp, maxHp: stats.maxHp,
    mp: stats.maxMp, maxMp: stats.maxMp,
    atk: stats.atk, def: stats.def, spd: stats.spd,
    level: saved?.level || 1, xp: saved?.xp || 0,
    direction: 'down', moving: false, alive: true,
    spells: saved?.spells || [...(CLASS_STARTING_SPELLS[pclass] || ['magic_bolt'])],
    inventory: saved?.inventory || [],
    equipped: saved?.equipped || { weapon: null, armor: null, accessory: null },
    lastAttack: 0, targetId: null,
  };
  applyEquipment(p);
  p.xpInfo = xpToLevel(p.xp);
  p.hp = stats.maxHp;
  p.mp = stats.maxMp;
  return p;
}

function applyEquipment(p) {
  let s = getStats(p.class, p.level);
  for (const slot in p.equipped) {
    if (p.equipped[slot]) s = applyItemStats(s, p.equipped[slot]);
  }
  p.maxHp = s.maxHp;
  p.maxMp = s.maxMp;
  p.atk = s.atk;
  p.def = s.def;
  if (p.hp > p.maxHp) p.hp = p.maxHp;
  if (p.mp > p.maxMp) p.mp = p.maxMp;
}

function giveXP(player, amount) {
  player.xp += amount;
  const result = xpToLevel(player.xp);
  if (result.level > player.level) {
    player.level = result.level;
    applyEquipment(player);
    player.hp = player.maxHp;
    player.mp = player.maxMp;
    return { leveledUp: true, newLevel: result.level };
  }
  player.xpInfo = result;
  return { leveledUp: false };
}

function monsterAI(zone, monsters, players) {
  const now = Date.now();
  for (const m of monsters) {
    if (!m.alive) continue;
    const pInZone = players.filter(p => p.zone === zone && p.alive);
    if (pInZone.length === 0) continue;

    let closest = null, minDist = Infinity;
    for (const p of pInZone) {
      const d = Math.hypot(p.x - m.x, p.y - m.y);
      if (d < minDist) { minDist = d; closest = p; }
    }

    if (closest && minDist < m.aggro) {
      const dx = closest.x - m.x, dy = closest.y - m.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist > 24) {
        m.x += (dx / dist) * m.speed * (TICK_MS / 1000);
        m.y += (dy / dist) * m.speed * (TICK_MS / 1000);
      }
      m.target = closest.id;
      if (dist < 100 && now - m.lastAttack > ATTACK_COOLDOWN) {
        m.lastAttack = now;
        const hit = Math.max(1, m.atk - closest.def);
        if (m.ranged) {
          addProjectile(-m.id, zone, 'magic_bolt', m.x, m.y, closest.x, closest.y);
        } else {
          closest.hp -= hit;
          io.to('zone_' + zone).emit('combat_event', { type: 'damage', targetType: 'player', targetId: closest.id, amount: hit, x: closest.x, y: closest.y });
          if (closest.hp <= 0) {
            closest.hp = 0; closest.alive = false;
            io.to('zone_' + zone).emit('player_died', { id: closest.id });
          }
        }
      }
    } else {
      m.moveTimer -= TICK_MS;
      if (m.moveTimer <= 0) {
        m.moveDir += (Math.random() - 0.5) * 2;
        m.moveTimer = 1000 + Math.random() * 2000;
      }
      m.x += Math.cos(m.moveDir) * m.speed * 0.3 * (TICK_MS / 1000);
      m.y += Math.sin(m.moveDir) * m.speed * 0.3 * (TICK_MS / 1000);
      const map = getZoneMap(zone);
      const tx = Math.floor(m.x / TILE_SIZE);
      const ty = Math.floor(m.y / TILE_SIZE);
      if (ty < 1 || ty >= MAP_ROWS - 1 || tx < 1 || tx >= MAP_COLS - 1) {
        m.moveDir += Math.PI;
      }
      m.x = Math.max(TILE_SIZE, Math.min(m.x, (MAP_COLS - 1) * TILE_SIZE));
      m.y = Math.max(TILE_SIZE, Math.min(m.y, (MAP_ROWS - 1) * TILE_SIZE));
    }
  }
}

function checkProjectiles(zone, monsters, players) {
  const now = Date.now();
  for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
    const p = gameState.projectiles[i];
    if (p.zone !== zone) continue;

    p.x += p.vx; p.y += p.vy;
    p.distance += Math.hypot(p.vx, p.vy);

    if (p.distance > p.maxDistance) {
      gameState.projectiles.splice(i, 1);
      continue;
    }

    if (p.ownerId > 0) {
      for (const m of monsters) {
        if (!m.alive) continue;
        if (Math.hypot(m.x - p.x, m.y - p.y) < 20) {
          const dmg = Math.max(1, Math.floor(p.dmg || 10) - m.def);
          m.hp -= dmg;
          io.to('zone_' + zone).emit('combat_event', { type: 'damage', targetType: 'monster', targetId: m.id, amount: dmg, x: m.x, y: m.y });
          if (m.hp <= 0) {
            m.hp = 0; m.alive = false;
            const owner = players.find(pl => pl.id === p.ownerId);
            if (owner) {
              const xpResult = giveXP(owner, m.xp);
              io.to('zone_' + zone).emit('monster_died', { monsterId: m.id, playerId: owner.id, x: m.x, y: m.y, xp: m.xp, leveledUp: xpResult.leveledUp, newLevel: xpResult.newLevel, xp: owner.xp });
              const loot = rollLoot(zone);
              if (loot) {
                const li = { id: gameState.nextItemId++, zone, x: m.x + (Math.random() - 0.5) * 20, y: m.y + (Math.random() - 0.5) * 20, ...loot };
                if (!gameState.groundItems[zone]) gameState.groundItems[zone] = [];
                gameState.groundItems[zone].push(li);
                io.to('zone_' + zone).emit('item_spawned', li);
              }
            }
          }
          gameState.projectiles.splice(i, 1);
          break;
        }
      }
    }

    if (p.ownerId < 0) {
      for (const pl of players) {
        if (!pl.alive) continue;
        if (Math.hypot(pl.x - p.x, pl.y - p.y) < 20) {
          const dmg = Math.max(1, Math.floor(p.dmg || 10) - pl.def);
          pl.hp -= dmg;
          io.to('zone_' + zone).emit('combat_event', { type: 'damage', targetType: 'player', targetId: pl.id, amount: dmg, x: pl.x, y: pl.y });
          if (pl.hp <= 0) { pl.hp = 0; pl.alive = false; io.to('zone_' + zone).emit('player_died', { id: pl.id }); }
          gameState.projectiles.splice(i, 1);
          break;
        }
      }
    }
  }
}

function gameLoop() {
  for (const zone in ZONE_DEFS) {
    const monsters = getMonstersInZone(zone);
    const players = Object.values(gameState.players);
    monsterAI(zone, monsters, players);
    checkProjectiles(zone, monsters, players);

    for (let i = monsters.length - 1; i >= 0; i--) {
      if (!monsters[i].alive && Date.now() - monsters[i].lastAttack > MONSTER_RESPAWN) {
        const mk = ZONE_DEFS[zone].monsters[Math.floor(Math.random() * ZONE_DEFS[zone].monsters.length)];
        const nm = G.createMonsterInstance(zone, mk, gameState.nextMonsterId++);
        if (nm) monsters[i] = nm;
      }
    }

    const room = io.sockets.adapter.rooms.get('zone_' + zone);
    if (room && room.size > 0) {
      io.to('zone_' + zone).emit('state_update', {
        players: players.filter(p => p.zone === zone).map(p => ({
          id: p.id, name: p.name, class: p.class,
          x: p.x, y: p.y, hp: p.hp, maxHp: p.maxHp,
          mp: p.mp, maxMp: p.maxMp,
          level: p.level, alive: p.alive,
          direction: p.direction, moving: p.moving,
          xp: p.xp,
        })),
        monsters: monsters.map(m => ({
          id: m.id, key: m.key, name: m.name,
          x: m.x, y: m.y, hp: m.hp, maxHp: m.maxHp,
          color: m.color, alive: m.alive, boss: m.boss || false,
        })),
        projectiles: gameState.projectiles.filter(p => p.zone === zone).map(p => ({
          id: p.id, x: p.x, y: p.y, color: p.color, spellKey: p.spellKey,
        })),
        groundItems: (gameState.groundItems[zone] || []).map(i => ({
          id: i.id, x: i.x, y: i.y, name: i.name || 'Unknown',
        })),
      });
    }
  }
}

io.on('connection', (socket) => {
  const id = gameState.nextId++;
  let player = null;
  let currentZone = 'meadow';

  socket.join('zone_' + currentZone);

  socket.on('request_map', () => {
    const map = getZoneMap(currentZone);
    socket.emit('map_data', { map, zone: currentZone, mapWidth: MAP_COLS, mapHeight: MAP_ROWS, tileSize: TILE_SIZE, zoneDef: ZONE_DEFS[currentZone] });
    spawnMonsters(currentZone);
    const monsters = getMonstersInZone(currentZone);
    socket.emit('monster_list', monsters.filter(m => m.alive).map(m => ({ id: m.id, key: m.key, name: m.name, x: m.x, y: m.y, hp: m.hp, maxHp: m.maxHp, color: m.color, alive: m.alive, boss: m.boss || false })));
    const items = gameState.groundItems[currentZone] || [];
    if (items.length > 0) socket.emit('ground_items', items.map(i => ({ id: i.id, x: i.x, y: i.y, name: i.name })));
  });

  socket.on('join', (data) => {
    player = createPlayer(id, data);
    gameState.players[id] = player;
    socket.emit('you_joined', { id, player: serializePlayer(player) });
    io.to('zone_' + currentZone).emit('player_joined', { id, player: serializePlayer(player) });
    socket.to('zone_' + currentZone).emit('chat_message', { name: 'System', text: `${player.name} has entered the realm.`, color: '#ffcc00' });
  });

  socket.on('move', (data) => {
    if (!player) return;
    const tileX = Math.floor(data.x / TILE_SIZE);
    const tileY = Math.floor(data.y / TILE_SIZE);
    if (isWalkable(player.zone, tileX, tileY)) { player.x = data.x; player.y = data.y; }
    player.direction = data.direction || player.direction;
    player.moving = data.moving !== undefined ? data.moving : player.moving;

    const edge = getEdgeZone(player.zone, tileX, tileY);
    if (edge && edge !== currentZone) {
      currentZone = edge;
      player.zone = edge;
      const spawn = getSpawnTile(edge);
      player.x = spawn.x; player.y = spawn.y;
      socket.leaveAll();
      socket.join('zone_' + edge);
      const map = getZoneMap(edge);
      spawnMonsters(edge);
      socket.emit('zone_changed', { zone: edge, map, mapWidth: MAP_COLS, mapHeight: MAP_ROWS, tileSize: TILE_SIZE, zoneDef: ZONE_DEFS[edge] });
      const monsters = getMonstersInZone(edge);
      socket.emit('monster_list', monsters.filter(m => m.alive).map(m => ({ id: m.id, key: m.key, name: m.name, x: m.x, y: m.y, hp: m.hp, maxHp: m.maxHp, color: m.color, alive: m.alive, boss: m.boss || false })));
      const items = gameState.groundItems[edge] || [];
      if (items.length > 0) socket.emit('ground_items', items.map(i => ({ id: i.id, x: i.x, y: i.y, name: i.name })));
      socket.emit('chat_message', { name: 'System', text: `You enter the ${ZONE_DEFS[edge].name}`, color: '#ffcc00' });
    }
  });

  socket.on('cast_spell', (data) => {
    if (!player || !player.alive) return;
    const spell = SPELLS[data.spell];
    if (!spell) return;
    if (!player.spells.includes(data.spell)) return;
    const now = Date.now();
    if (now - player.lastAttack < ATTACK_COOLDOWN) return;
    if (player.mp < spell.cost) return;

    player.lastAttack = now;
    player.mp -= spell.cost;

    if (spell.dmg < 0) {
      player.hp = Math.min(player.maxHp, player.hp - spell.dmg);
      io.to('zone_' + currentZone).emit('combat_event', { type: 'heal', targetType: 'player', targetId: id, amount: -spell.dmg, x: player.x, y: player.y });
      return;
    }

    if (spell.blink) {
      const angle = { up: -Math.PI/2, down: Math.PI/2, left: Math.PI, right: 0 }[player.direction] || 0;
      let nx = player.x + Math.cos(angle) * spell.blink;
      let ny = player.y + Math.sin(angle) * spell.blink;
      const tx = Math.floor(nx / TILE_SIZE);
      const ty = Math.floor(ny / TILE_SIZE);
      if (isWalkable(player.zone, tx, ty)) { player.x = nx; player.y = ny; }
    }

    if (spell.summon) {
      addProjectile(id, currentZone, data.spell, player.x, player.y, data.toX || player.x, data.toY || player.y);
    }

    if (spell.wall) {
      // wall placement - not implemented yet
    }

    if (!spell.blink && !spell.summon && spell.dmg >= 0) {
      addProjectile(id, currentZone, data.spell, player.x, player.y, data.toX || player.x + 50, data.toY || player.y);
    }

    if (spell.aoe && spell.radius > 20) {
      for (const m of getMonstersInZone(currentZone)) {
        if (!m.alive) continue;
        if (Math.hypot(m.x - player.x, m.y - player.y) < spell.radius) {
          const dmg = Math.max(1, Math.floor(spell.dmg) - m.def);
          m.hp -= dmg;
          io.to('zone_' + currentZone).emit('combat_event', { type: 'damage', targetType: 'monster', targetId: m.id, amount: dmg, x: m.x, y: m.y });
          if (m.hp <= 0) {
            m.hp = 0; m.alive = false;
            const xpResult = giveXP(player, m.xp);
            io.to('zone_' + currentZone).emit('monster_died', { monsterId: m.id, playerId: id, x: m.x, y: m.y, xp: m.xp, leveledUp: xpResult.leveledUp, newLevel: xpResult.newLevel, xp: player.xp });
            const loot = rollLoot(currentZone);
            if (loot) {
              const li = { id: gameState.nextItemId++, zone: currentZone, x: m.x + (Math.random() - 0.5) * 20, y: m.y + (Math.random() - 0.5) * 20, ...loot };
              if (!gameState.groundItems[currentZone]) gameState.groundItems[currentZone] = [];
              gameState.groundItems[currentZone].push(li);
              io.to('zone_' + currentZone).emit('item_spawned', li);
            }
          }
        }
      }
    }
  });

  socket.on('pickup_item', (data) => {
    if (!player) return;
    const items = gameState.groundItems[currentZone] || [];
    const idx = items.findIndex(i => i.id === data.itemId);
    if (idx === -1) return;
    const item = items[idx];
    if (Math.hypot(player.x - item.x, player.y - item.y) > 40) return;
    items.splice(idx, 1);
    if (item.type === 'scroll') {
      if (!player.spells.includes(item.spell)) {
        player.spells.push(item.spell);
        socket.emit('chat_message', { name: 'System', text: `Learned spell: ${SPELLS[item.spell]?.name || item.spell}!`, color: '#44ff44' });
      }
    } else {
      player.inventory.push(item.itemKey);
      socket.emit('chat_message', { name: 'System', text: `Picked up: ${item.name}`, color: '#44ff44' });
    }
    socket.emit('inventory_update', { inventory: player.inventory, spells: player.spells });
    io.to('zone_' + currentZone).emit('item_removed', { itemId: data.itemId });
  });

  socket.on('equip_item', (data) => {
    if (!player) return;
    const idx = player.inventory.indexOf(data.itemKey);
    if (idx === -1) return;
    const itemData = G.ITEMS[data.itemKey];
    if (!itemData) return;
    const slot = itemData.type;
    if (slot !== 'weapon' && slot !== 'armor' && slot !== 'accessory') return;
    if (player.equipped[slot]) player.inventory.push(player.equipped[slot]);
    player.equipped[slot] = data.itemKey;
    player.inventory.splice(idx, 1);
    applyEquipment(player);
    socket.emit('inventory_update', { inventory: player.inventory, spells: player.spells, equipped: player.equipped });
    socket.emit('stat_update', { hp: player.hp, maxHp: player.maxHp, mp: player.mp, maxMp: player.maxMp, atk: player.atk, def: player.def });
  });

  socket.on('use_item', (data) => {
    if (!player) return;
    const idx = player.inventory.indexOf(data.itemKey);
    if (idx === -1) return;
    const itemData = G.ITEMS[data.itemKey];
    if (!itemData) return;
    if (itemData.type !== 'consumable') return;
    player.inventory.splice(idx, 1);
    if (itemData.stats.heal) player.hp = Math.min(player.maxHp, player.hp + itemData.stats.heal);
    if (itemData.stats.mana) player.mp = Math.min(player.maxMp, player.mp + itemData.stats.mana);
    socket.emit('inventory_update', { inventory: player.inventory, spells: player.spells });
    socket.emit('stat_update', { hp: player.hp, maxHp: player.maxHp, mp: player.mp, maxMp: player.maxMp });
  });

  socket.on('respawn', () => {
    if (!player || player.alive) return;
    const spawn = getSpawnTile('meadow');
    player.x = spawn.x; player.y = spawn.y;
    player.zone = 'meadow';
    player.hp = player.maxHp;
    player.mp = player.maxMp;
    player.alive = true;
    currentZone = 'meadow';
    socket.leaveAll();
    socket.join('zone_meadow');
    const map = getZoneMap('meadow');
    socket.emit('zone_changed', { zone: 'meadow', map, mapWidth: MAP_COLS, mapHeight: MAP_ROWS, tileSize: TILE_SIZE, zoneDef: ZONE_DEFS.meadow });
    spawnMonsters('meadow');
    const monsters = getMonstersInZone('meadow');
    socket.emit('monster_list', monsters.filter(m => m.alive).map(m => ({ id: m.id, key: m.key, name: m.name, x: m.x, y: m.y, hp: m.hp, maxHp: m.maxHp, color: m.color, alive: m.alive, boss: m.boss || false })));
    socket.emit('chat_message', { name: 'System', text: 'You have respawned in the Meadow.', color: '#ffcc00' });
  });

  socket.on('chat_message', (data) => {
    if (!player) return;
    io.to('zone_' + currentZone).emit('chat_message', { name: player.name, text: data.text, color: '#ffffff' });
  });

  socket.on('disconnect', () => {
    if (player) {
      io.to('zone_' + currentZone).emit('player_left', { id });
      io.to('zone_' + currentZone).emit('chat_message', { name: 'System', text: `${player.name} has left the realm.`, color: '#ffcc00' });
      saveAll();
      delete gameState.players[id];
    }
  });
});

function serializePlayer(p) {
  return { id: p.id, name: p.name, class: p.class, x: p.x, y: p.y, hp: p.hp, maxHp: p.maxHp, mp: p.mp, maxMp: p.maxMp, level: p.level, alive: p.alive, direction: p.direction, moving: p.moving, xp: p.xp };
}

setInterval(gameLoop, TICK_MS);
setInterval(saveAll, SAVE_INTERVAL);

server.listen(PORT, () => console.log(`Mystic Realm server running on port ${PORT}`));
