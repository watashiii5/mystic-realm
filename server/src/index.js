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
const { TILE_SIZE, MAP_COLS, MAP_ROWS, SPELLS, CLASS_STARTING_SPELLS, MONSTERS, ZONE_DEFS, getZoneMap, isWalkable, getEdgeZone, getSpawnTile, getStats, xpToLevel, rollLoot, applyItemStats } = G;

const ZONE_KEYS = Object.keys(ZONE_DEFS);
const SAVE_INTERVAL = 60000;
const MONSTER_RESPAWN = 15000;
const PET_STATS = { hp: 40, atk: 8, def: 3, speed: 50, aggro: 160 };
const PET_RESPAWN = 10000;
const TICK_MS = 1000 / 20;
const PROJECTILE_SPEED = 3;
const ATTACK_COOLDOWN = 1500;
const MAX_GROUND_ITEMS = 50;

const gameState = {
  players: {}, monsters: {}, projectiles: [],
  groundItems: {}, nextId: 1, nextMonsterId: 1, nextItemId: 1,
  zoneRooms: {},
  playerZoneCache: {},
  deadProjectiles: [],
  zoneMonsterKeys: {},
};
ZONE_KEYS.forEach(z => { gameState.zoneMonsterKeys[z] = 'zone_' + z; });

function saveAll() {
  const data = {};
  for (const id in gameState.players) {
    const p = gameState.players[id];
    data[p.name] = { class: p.class, level: p.level, xp: p.xp, spells: p.spells, inventory: p.inventory, equipped: p.equipped, zonesVisited: p.zonesVisited, monstersKilled: p.monstersKilled, statPoints: p.statPoints, allocatedStats: p.allocatedStats };
  }
  try { fs.writeFileSync(dataFile, JSON.stringify(data)); } catch (e) {}
}

let savedData = null;
function loadAll() {
  if (savedData) return savedData;
  try {
    savedData = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile, 'utf8')) : {};
  } catch (e) { savedData = {}; }
  return savedData;
}

function spawnMonsters(zone) {
  const def = ZONE_DEFS[zone];
  if (!def) return;
  const key = gameState.zoneMonsterKeys[zone];
  const arr = gameState.monsters[key];
  if (arr && arr.length > 0) return;
  gameState.monsters[key] = [];
  const count = zone === 'tower' ? 8 : 5 + (Math.random() * 3 | 0);
  let hasBoss = false;
  for (let i = 0; i < count; i++) {
    const mk = def.monsters[Math.random() * def.monsters.length | 0];
    if (mk === 'boss') { if (hasBoss) continue; hasBoss = true; }
    const m = G.createMonsterInstance(zone, mk, gameState.nextMonsterId++);
    if (m) gameState.monsters[key].push(m);
  }
}

function getMonstersInZone(zone) {
  return gameState.monsters[gameState.zoneMonsterKeys[zone]] || [];
}

function addProjectile(ownerId, zone, spellKey, fromX, fromY, toX, toY) {
  const spell = SPELLS[spellKey];
  if (!spell) return;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  gameState.projectiles.push({
    id: gameState.nextId++, ownerId, zone, spellKey,
    x: fromX, y: fromY,
    vx: (dx / dist) * PROJECTILE_SPEED,
    vy: (dy / dist) * PROJECTILE_SPEED,
    distance: 0, maxDistance: dist < 200 ? dist : 200,
    dmg: spell.dmg, radius: spell.radius || 4,
    color: spell.color,
  });
}

function createPlayer(id, data) {
  const saved = loadAll()[data.name];
  const pclass = saved?.class || data.class || 'mage';
  const stats = getStats(pclass, saved?.level || 1);
  const spawn = getSpawnTile('meadow');
  const p = {
    id, name: data.name, class: pclass,
    zone: 'meadow', x: spawn.x, y: spawn.y,
    hp: stats.maxHp, maxHp: stats.maxHp,
    mp: stats.maxMp, maxMp: stats.maxMp,
    atk: stats.atk, def: stats.def, spd: stats.spd,
    level: saved?.level || 1, xp: saved?.xp || 0,
    direction: 'down', moving: false, alive: true,
    spells: saved?.spells || [...(CLASS_STARTING_SPELLS[pclass] || ['magic_bolt'])],
    inventory: saved?.inventory || [],
    equipped: saved?.equipped || { weapon: null, armor: null, accessory: null },
    statPoints: saved?.statPoints || 0,
    allocatedStats: saved?.allocatedStats || { hp: 0, mp: 0, atk: 0, def: 0 },
    lastAttack: 0,
    zonesVisited: saved?.zonesVisited || { meadow: true },
    monstersKilled: saved?.monstersKilled || 0,
    progressMessages: [],
    pet: null,
    petCd: 0,
  };
  if (!saved) {
    p.inventory = ['wooden_staff', 'starter_robe', 'starter_ring'];
  }
  applyEquipment(p);
  p.hp = stats.maxHp;
  p.mp = stats.maxMp;
  return p;
}

function applyEquipment(p) {
  let s = getStats(p.class, p.level);
  for (const slot in p.equipped) {
    if (p.equipped[slot]) s = applyItemStats(s, p.equipped[slot]);
  }
  if (p.allocatedStats) {
    s.maxHp += p.allocatedStats.hp * 10;
    s.maxMp += p.allocatedStats.mp * 8;
    s.atk += p.allocatedStats.atk * 2;
    s.def += p.allocatedStats.def * 2;
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
    const gained = result.level - player.level;
    player.level = result.level;
    player.statPoints += gained * 3;
    applyEquipment(player);
    player.hp = player.maxHp;
    player.mp = player.maxMp;
    return { leveledUp: true, newLevel: result.level };
  }
  return { leveledUp: false };
}

function distSq(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  return dx * dx + dy * dy;
}

function petAI(pet, zone, monsters, players, now) {
  if (!pet || !pet.alive) return;
  let closestMonster = null, bestDsq = pet.aggro * pet.aggro;
  for (let mi = 0; mi < monsters.length; mi++) {
    const m = monsters[mi];
    if (!m.alive) continue;
    const dsq = distSq(pet.x, pet.y, m.x, m.y);
    if (dsq < bestDsq) { bestDsq = dsq; closestMonster = m; }
  }
  let owner = null;
  for (let pi = 0; pi < players.length; pi++) {
    if (players[pi].id === pet.ownerId) { owner = players[pi]; break; }
  }
  if (!owner) return;
  if (closestMonster) {
    const dist = Math.sqrt(bestDsq);
    if (dist > 24) {
      const dx = (closestMonster.x - pet.x) / dist;
      const dy = (closestMonster.y - pet.y) / dist;
      const oldX = pet.x, oldY = pet.y;
      pet.x += dx * pet.speed * 0.012;
      pet.y += dy * pet.speed * 0.012;
      if (!isWalkable(zone, (pet.x / TILE_SIZE) | 0, (pet.y / TILE_SIZE) | 0)) { pet.x = oldX; pet.y = oldY; }
    }
    if (dist < 40 && now - pet.lastAttack > ATTACK_COOLDOWN) {
      pet.lastAttack = now;
      const dmg = pet.atk - closestMonster.def > 0 ? pet.atk - closestMonster.def : 1;
      closestMonster.hp -= dmg;
      io.to('zone_' + zone).emit('combat_event', { t: 'damage', ty: 'monster', ti: closestMonster.id, a: dmg, x: closestMonster.x, y: closestMonster.y });
      if (closestMonster.hp <= 0) {
        closestMonster.hp = 0; closestMonster.alive = false; closestMonster.deathTime = Date.now();
        for (let oi = 0; oi < players.length; oi++) {
          if (players[oi].id === pet.ownerId) {
            const ownerP = players[oi];
            ownerP.monstersKilled++;
            const xpr = giveXP(ownerP, closestMonster.xp);
            io.to('zone_' + zone).emit('monster_died', { mid: closestMonster.id, pid: ownerP.id, x: closestMonster.x, y: closestMonster.y, xp: closestMonster.xp, lv: xpr.leveledUp, nl: xpr.newLevel, xpe: ownerP.xp, mk: ownerP.monstersKilled });
            const isBoss = closestMonster.boss === true;
            const loot = isBoss ? (rollLoot(zone) || rollLoot(zone)) : rollLoot(zone);
            if (loot) {
              const li = { id: gameState.nextItemId++, zone, x: closestMonster.x + (Math.random() - 0.5) * 20, y: closestMonster.y + (Math.random() - 0.5) * 20, k: loot.itemKey, n: loot.name, t: loot.type, s: loot.spell };
              if (!gameState.groundItems[zone]) gameState.groundItems[zone] = [];
              const gi = gameState.groundItems[zone];
              if (gi.length < MAX_GROUND_ITEMS) gi.push(li);
              io.to('zone_' + zone).emit('item_spawned', { id: li.id, x: li.x, y: li.y, n: li.n, k: li.k });
            }
            break;
          }
        }
      }
    }
  } else {
    const dist = Math.sqrt(distSq(pet.x, pet.y, owner.x, owner.y));
    if (dist > 48) {
      const dx = (owner.x - pet.x) / dist;
      const dy = (owner.y - pet.y) / dist;
      const oldX = pet.x, oldY = pet.y;
      pet.x += dx * pet.speed * 0.01;
      pet.y += dy * pet.speed * 0.01;
      if (!isWalkable(zone, (pet.x / TILE_SIZE) | 0, (pet.y / TILE_SIZE) | 0)) { pet.x = oldX; pet.y = oldY; }
    }
  }
}

function monsterAI(zone, monsters, players, now) {
  let pCount = 0;
  for (let i = 0; i < players.length; i++) {
    if (players[i].zone === zone && players[i].alive) { players[pCount++] = players[i]; }
  }
  if (pCount === 0) return;

  const atkCount = {};
  for (let mi = 0; mi < monsters.length; mi++) {
    const m = monsters[mi];
    if (!m.alive) continue;

    const now2 = Date.now();
    let speedMult = 1;
    let canAct = true;
    if (m.statusEffects) {
      for (let si = m.statusEffects.length - 1; si >= 0; si--) {
        const se = m.statusEffects[si];
        if (now2 - se.start > se.dur) { m.statusEffects.splice(si, 1); continue; }
        if (se.t === 'freeze') { speedMult = 0; canAct = false; }
        if (se.t === 'slow') speedMult = Math.min(speedMult, 0.5);
      }
    }

    let best = 0, bestDsq = 1e9;
    for (let pi = 0; pi < pCount; pi++) {
      const dsq = distSq(m.x, m.y, players[pi].x, players[pi].y);
      if (dsq < bestDsq) { bestDsq = dsq; best = pi; }
    }

    const closest = players[best];
    if (!closest || bestDsq > m.aggro * m.aggro) {
      const wander = m._wander !== undefined;
      if (!wander) {
        m._wander = Math.random() * 6.28;
        m._wanderT = 1000 + (Math.random() * 2000 | 0);
      }
      m._wanderT -= TICK_MS;
      if (m._wanderT <= 0) {
        m._wander += (Math.random() - 0.5) * 2;
        m._wanderT = 1000 + (Math.random() * 2000 | 0);
      }
      const spd = m.speed * 0.006 * speedMult;
      const oldX = m.x, oldY = m.y;
      m.x += Math.cos(m._wander) * spd;
      m.y += Math.sin(m._wander) * spd;
      const wtX = (m.x / TILE_SIZE) | 0;
      const wtY = (m.y / TILE_SIZE) | 0;
      if (!isWalkable(zone, wtX, wtY)) {
        m.x = oldX; m.y = oldY;
        m._wander += Math.PI;
      }
      continue;
    }

    const dist = Math.sqrt(bestDsq);
    m.target = closest.id;
    if (dist > 24 && speedMult > 0) {
      const dx = (closest.x - m.x) / dist;
      const dy = (closest.y - m.y) / dist;
      const oldX = m.x, oldY = m.y;
      m.x += dx * m.speed * 0.018 * speedMult;
      m.y += dy * m.speed * 0.018 * speedMult;
      const ctX = (m.x / TILE_SIZE) | 0;
      const ctY = (m.y / TILE_SIZE) | 0;
      if (!isWalkable(zone, ctX, ctY)) { m.x = oldX; m.y = oldY; }
    }

    if (!canAct) continue;
    const pid = closest.id;
    atkCount[pid] = (atkCount[pid] || 0) + 1;
    if (atkCount[pid] > 3 && dist < 100 && now - m.lastAttack > ATTACK_COOLDOWN) continue;
      if (dist < 100 && now - m.lastAttack > ATTACK_COOLDOWN) {
        m.lastAttack = now;
        let hit = m.atk - closest.def > 0 ? m.atk - closest.def : 1;
        if (m.boss) {
          const hpPct = m.hp / m.maxHp;
          if (hpPct < 0.5) hit = Math.floor(hit * 2);
          if (hpPct < 0.2 && now % 3 === 0) {
            io.to('zone_' + zone).emit('combat_event', { t: 'damage', ty: 'player', ti: closest.id, a: Math.floor(hit * 0.5), x: closest.x, y: closest.y });
            hit = Math.floor(hit * 1.5);
            io.to('zone_' + zone).emit('chat_message', { n: 'System', t: 'The Aether Lord unleashes a void pulse!', c: '#ff4444' });
          }
          if (hpPct < 0.3 && Math.random() < 0.15) {
            const addKey = ZONE_DEFS[zone]?.monsters[Math.random() * ZONE_DEFS[zone].monsters.length | 0];
            if (addKey && addKey !== 'boss') {
              const add = G.createMonsterInstance(zone, addKey, gameState.nextMonsterId++);
              if (add) getMonstersInZone(zone).push(add);
              io.to('zone_' + zone).emit('chat_message', { n: 'System', t: 'The Aether Lord summons minions!', c: '#ff4444' });
            }
          }
        }
        if (m.poison) {
          closest.poisonT = (closest.poisonT || 0) + m.poison * 20;
          closest.poisonDmg = (closest.poisonDmg || 0) + Math.max(1, Math.floor(hit * 0.4));
          io.to('zone_' + zone).emit('chat_message', { n: 'System', t: 'You are poisoned!', c: '#44ff44' });
        }
        if (m.lifedrain) {
          const drain = Math.floor(hit * 0.4);
          m.hp = Math.min(m.maxHp, m.hp + drain);
          hit += drain;
        }
        if (m.teleport && Math.random() < 0.35) {
          for (let ty = 2; ty < MAP_ROWS - 2; ty++) {
            for (let tx = 2; tx < MAP_COLS - 2; tx++) {
              if (isWalkable(zone, tx, ty)) {
                m.x = tx * TILE_SIZE + TILE_SIZE / 2;
                m.y = ty * TILE_SIZE + TILE_SIZE / 2;
                ty = MAP_ROWS; break;
              }
            }
          }
        }
        if (m.ranged) {
          addProjectile(-m.id, zone, 'magic_bolt', m.x, m.y, closest.x, closest.y);
        } else {
          closest.hp -= hit;
          io.to('zone_' + zone).emit('combat_event', { t: 'damage', ty: 'player', ti: pid, a: hit, x: closest.x, y: closest.y });
          if (closest.hp <= 0) { closest.hp = 0; closest.alive = false; const xpLost = penalizeDeath(closest); io.to('zone_' + zone).emit('player_died', { id: pid, xpLost }); }
        }
      }
  }
}

function checkProjectiles(zone, monsters, players) {
  const projs = gameState.projectiles;
  const toRemove = gameState.deadProjectiles;
  for (let pi = projs.length - 1; pi >= 0; pi--) {
    const p = projs[pi];
    if (p.zone !== zone) continue;

    p.x += p.vx;
    p.y += p.vy;
    p.distance += Math.sqrt(p.vx * p.vx + p.vy * p.vy);

    if (p.distance > p.maxDistance) { toRemove.push(pi); continue; }

    if (p.ownerId > 0) {
      for (let mi = 0; mi < monsters.length; mi++) {
        const m = monsters[mi];
        if (!m.alive) continue;
        if (distSq(m.x, m.y, p.x, p.y) < 400) {
          const dmg = p.dmg - m.def > 0 ? (p.dmg | 0) - m.def : 1;
          m.hp -= dmg;
          const spell = SPELLS[p.spellKey];
          if (spell && (spell.burn || spell.slow || spell.freeze || spell.poison)) {
            if (!m.statusEffects) m.statusEffects = [];
            if (spell.burn && !m.statusEffects.some(s => s.t === 'burn')) {
              m.statusEffects.push({ t: 'burn', start: Date.now(), dur: spell.burn * 1000, tick: 1000, dmg: Math.max(1, Math.floor(dmg * 0.2)) });
            }
            if (spell.slow) {
              const se = m.statusEffects.find(s => s.t === 'slow');
              if (se) se.start = Date.now(); else m.statusEffects.push({ t: 'slow', start: Date.now(), dur: spell.slow * 1000 });
            }
            if (spell.freeze) {
              const se = m.statusEffects.find(s => s.t === 'freeze');
              if (se) se.start = Date.now(); else m.statusEffects.push({ t: 'freeze', start: Date.now(), dur: spell.freeze * 1000 });
            }
            if (spell.poison && !m.statusEffects.some(s => s.t === 'poison')) {
              m.statusEffects.push({ t: 'poison', start: Date.now(), dur: spell.poison * 1000, tick: 1000, dmg: Math.max(1, Math.floor(dmg * 0.12)) });
            }
          }
          const zoneRoom = 'zone_' + zone;
          io.to(zoneRoom).emit('combat_event', { t: 'damage', ty: 'monster', ti: m.id, a: dmg, x: m.x, y: m.y });
          if (m.hp <= 0) {
            m.hp = 0; m.alive = false; m.deathTime = Date.now();
            for (let oi = 0; oi < players.length; oi++) {
              if (players[oi].id === p.ownerId) {
                const owner = players[oi];
                owner.monstersKilled++;
                const xpr = giveXP(owner, m.xp);
                io.to(zoneRoom).emit('monster_died', { mid: m.id, pid: owner.id, x: m.x, y: m.y, xp: m.xp, lv: xpr.leveledUp, nl: xpr.newLevel, xpe: owner.xp, mk: owner.monstersKilled });
                const isBoss = m.boss === true;
                const loot = isBoss ? (rollLoot(zone) || rollLoot(zone)) : rollLoot(zone);
                if (loot) {
                  const li = { id: gameState.nextItemId++, zone, x: m.x + (Math.random() - 0.5) * 20, y: m.y + (Math.random() - 0.5) * 20, k: loot.itemKey, n: loot.name, t: loot.type, s: loot.spell };
                  if (!gameState.groundItems[zone]) gameState.groundItems[zone] = [];
                  const gi = gameState.groundItems[zone];
                  if (gi.length < MAX_GROUND_ITEMS) gi.push(li);
                  io.to(zoneRoom).emit('item_spawned', { id: li.id, x: li.x, y: li.y, n: li.n, k: li.k });
                }
                break;
              }
            }
          }
          toRemove.push(pi);
          break;
        }
      }
    }

    if (p.ownerId < 0) {
      for (let pi2 = 0; pi2 < players.length; pi2++) {
        const pl = players[pi2];
        if (!pl.alive || pl.zone !== zone) continue;
        if (distSq(pl.x, pl.y, p.x, p.y) < 400) {
          const dmg = p.dmg - pl.def > 0 ? (p.dmg | 0) - pl.def : 1;
          pl.hp -= dmg;
          io.to('zone_' + zone).emit('combat_event', { t: 'damage', ty: 'player', ti: pl.id, a: dmg, x: pl.x, y: pl.y });
          if (pl.hp <= 0) { pl.hp = 0; pl.alive = false; const xpLost = penalizeDeath(pl); io.to('zone_' + zone).emit('player_died', { id: pl.id, xpLost }); }
          toRemove.push(pi);
          break;
        }
      }
    }
  }
  for (let ri = toRemove.length - 1; ri >= 0; ri--) {
    projs.splice(toRemove[ri], 1);
  }
  toRemove.length = 0;
}

const plSer = p => ({ id: p.id, n: p.name, c: p.class, x: p.x, y: p.y, h: p.hp, mh: p.maxHp, m: p.mp, mm: p.maxMp, l: p.level, a: p.alive, d: p.direction, mv: p.moving, xp: p.xp });
const monSer = m => ({ id: m.id, k: m.key, n: m.name, x: m.x, y: m.y, h: m.hp, mh: m.maxHp, c: m.color, a: m.alive, b: m.boss || false, se: m.statusEffects ? m.statusEffects.map(s => ({ t: s.t })) : [] });
const projSer = p => ({ id: p.id, x: p.x, y: p.y, c: p.color, sk: p.spellKey });

function penalizeDeath(player) {
  const xpLoss = Math.floor(player.xp * 0.1);
  player.xp = Math.max(0, player.xp - xpLoss);
  return xpLoss;
}

function gameLoop() {
  const now = Date.now();
  const allPlayers = Object.values(gameState.players);
  const playerCount = allPlayers.length;

  const zonePlayers = {};
  for (let zi = 0; zi < ZONE_KEYS.length; zi++) {
    const z = ZONE_KEYS[zi];
    zonePlayers[z] = [];
  }
  for (let pi = 0; pi < playerCount; pi++) {
    const zp = zonePlayers[allPlayers[pi].zone];
    if (zp) zp.push(allPlayers[pi]);
  }

  for (let zi = 0; zi < ZONE_KEYS.length; zi++) {
    const zone = ZONE_KEYS[zi];
    const room = io.sockets.adapter.rooms.get('zone_' + zone);
    const hasPlayers = room && room.size > 0;

    if (!hasPlayers) {
      gameState.projectiles = gameState.projectiles.filter(p => p.zone !== zone);
      continue;
    }

    const monsters = getMonstersInZone(zone);
    const zoneP = zonePlayers[zone] || [];
    monsterAI(zone, monsters, zoneP, now);
    checkProjectiles(zone, monsters, zoneP);

    for (let pi = 0; pi < zoneP.length; pi++) {
      const pl = zoneP[pi];
      if (pl.alive) {
        if (pl.pet && pl.pet.alive) petAI(pl.pet, zone, monsters, zoneP, now);
        if (pl.poisonT > 0) {
          pl.poisonT -= 1;
          if (pl.poisonT % 4 === 0) {
            const pDmg = pl.poisonDmg || 1;
            pl.hp = Math.max(0, pl.hp - pDmg);
            io.to('zone_' + zone).emit('combat_event', { t: 'damage', ty: 'player', ti: pl.id, a: pDmg, x: pl.x, y: pl.y });
            if (pl.hp <= 0) { pl.hp = 0; pl.alive = false; const xpLost = penalizeDeath(pl); io.to('zone_' + zone).emit('player_died', { id: pl.id, xpLost }); }
          }
        } else {
          pl.poisonDmg = 0;
          if (pl.hp < pl.maxHp) pl.hp = Math.min(pl.maxHp, pl.hp + pl.maxHp * 0.005);
          if (pl.mp < pl.maxMp) pl.mp = Math.min(pl.maxMp, pl.mp + pl.maxMp * 0.003);
        }
      }
    }

    for (let mi = 0; mi < monsters.length; mi++) {
      const m = monsters[mi];
      if (!m.alive) continue;
      if (m.statusEffects && m.statusEffects.length > 0) {
        for (let si = m.statusEffects.length - 1; si >= 0; si--) {
          const se = m.statusEffects[si];
          if (now - se.start > se.dur) { m.statusEffects.splice(si, 1); continue; }
          if ((se.t === 'burn' || se.t === 'poison') && se.tick) {
            if (!se._lastTick) se._lastTick = se.start;
            if (now - se._lastTick >= se.tick) {
              se._lastTick = now;
              m.hp -= se.dmg;
              io.to('zone_' + zone).emit('combat_event', { t: 'damage', ty: 'monster', ti: m.id, a: se.dmg, x: m.x, y: m.y });
              if (m.hp <= 0) {
                m.hp = 0; m.alive = false; m.deathTime = Date.now();
                io.to('zone_' + zone).emit('monster_died', { mid: m.id, pid: 0, x: m.x, y: m.y, xp: 0, lv: false, nl: 0, xpe: 0, mk: 0, boss: !!m.boss });
              }
            }
          }
        }
      }
    }

    for (let mi = monsters.length - 1; mi >= 0; mi--) {
      if (!monsters[mi].alive && now - monsters[mi].deathTime > MONSTER_RESPAWN) {
        const mk = ZONE_DEFS[zone].monsters[Math.random() * ZONE_DEFS[zone].monsters.length | 0];
        const nm = G.createMonsterInstance(zone, mk, gameState.nextMonsterId++);
        if (nm) monsters[mi] = nm;
      }
    }

    if (zoneP.length > 0 || hasPlayers) {
      const pList = [];
      for (let pi = 0; pi < zoneP.length; pi++) {
        pList.push(plSer(zoneP[pi]));
      }
      const mList = [];
      for (let mi = 0; mi < monsters.length; mi++) {
        if (monsters[mi].alive) mList.push(monSer(monsters[mi]));
      }
      const projList = [];
      const projs = gameState.projectiles;
      for (let pi = 0; pi < projs.length; pi++) {
        if (projs[pi].zone === zone) projList.push(projSer(projs[pi]));
      }
      const gi = gameState.groundItems[zone];
      const itemList = gi ? [] : null;
      if (gi) {
        for (let ii = 0; ii < gi.length; ii++) {
          itemList.push({ id: gi[ii].id, x: gi[ii].x, y: gi[ii].y, n: gi[ii].n });
        }
      }

      io.to('zone_' + zone).emit('su', { p: pList, m: mList, pr: projList, gi: itemList || [] });
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
    const mList = [];
    for (let mi = 0; mi < monsters.length; mi++) {
      if (monsters[mi].alive) mList.push(monSer(monsters[mi]));
    }
    socket.emit('monster_list', mList);
    const gi = gameState.groundItems[currentZone];
    if (gi && gi.length > 0) {
      const itemList = [];
      for (let ii = 0; ii < gi.length; ii++) itemList.push({ id: gi[ii].id, x: gi[ii].x, y: gi[ii].y, n: gi[ii].n, k: gi[ii].k || '' });
      socket.emit('ground_items', itemList);
    }
    socket.emit('progress_update', { zonesVisited: player ? player.zonesVisited : { meadow: true }, monstersKilled: player ? player.monstersKilled : 0, level: player ? player.level : 1 });
  });

  socket.on('join', (data) => {
    if (!data.name || typeof data.name !== 'string' || data.name.length < 1 || data.name.length > 16) {
      socket.emit('error_message', 'Invalid name (1-16 characters)');
      return;
    }
    const saved = loadAll()[data.name];
    player = createPlayer(id, data);
    gameState.players[id] = player;
    const sp = plSer(player);
    sp.zv = player.zonesVisited;
    sp.mk = player.monstersKilled;
    sp.sp = player.statPoints;
    sp.as = player.allocatedStats;
    socket.emit('you_joined', { id, player: sp });
    io.to('zone_' + currentZone).emit('player_joined', { id, player: sp });
    socket.emit('inventory_update', { inventory: player.inventory, spells: player.spells, equipped: player.equipped });
    if (saved) {
      player.inventory = saved.inventory || [];
      player.equipped = saved.equipped || { weapon: null, armor: null, accessory: null };
      applyEquipment(player);
      socket.emit('inventory_update', { inventory: player.inventory, spells: player.spells, equipped: player.equipped });
      socket.emit('stat_update', { hp: player.hp, mh: player.maxHp, mp: player.mp, mm: player.maxMp, atk: player.atk, def: player.def, sp: player.statPoints, as: player.allocatedStats });
    }
    socket.to('zone_' + currentZone).emit('chat_message', { n: 'System', t: player.name + ' has entered the realm.', c: '#ffcc00' });
  });

  socket.on('move', (data) => {
    if (!player) return;
    const tileX = data.x / TILE_SIZE | 0;
    const tileY = data.y / TILE_SIZE | 0;
    if (isWalkable(player.zone, tileX, tileY)) { player.x = data.x; player.y = data.y; }
    player.direction = data.direction || player.direction;
    player.moving = data.moving !== undefined ? data.moving : false;
    if (data.sprinting && player.moving && player.mp > 0) {
      player.mp = Math.max(0, player.mp - 1);
    }

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
      const zoneInfo = ZONE_DEFS[edge];
      socket.emit('zone_changed', { zone: edge, map, mapWidth: MAP_COLS, mapHeight: MAP_ROWS, tileSize: TILE_SIZE, zoneDef: zoneInfo });
      const monsters = getMonstersInZone(edge);
      const mList = [];
      for (let mi = 0; mi < monsters.length; mi++) {
        if (monsters[mi].alive) mList.push(monSer(monsters[mi]));
      }
      socket.emit('monster_list', mList);
      const gi = gameState.groundItems[edge];
      if (gi && gi.length > 0) {
        const itemList = [];
        for (let ii = 0; ii < gi.length; ii++) itemList.push({ id: gi[ii].id, x: gi[ii].x, y: gi[ii].y, n: gi[ii].n, k: gi[ii].k || '' });
        socket.emit('ground_items', itemList);
      }
      socket.emit('chat_message', { n: 'System', t: zoneInfo.lore || ('You enter the ' + zoneInfo.name), c: zoneInfo.color || '#88ccff' });
      if (!player.zonesVisited[edge]) {
        player.zonesVisited[edge] = true;
        socket.emit('progress_update', { zonesVisited: player.zonesVisited, monstersKilled: player.monstersKilled, level: player.level });
      }
    }
  });

  socket.on('cast_spell', (data) => {
    if (!player || !player.alive) return;
    const spell = SPELLS[data.spell];
    if (!spell || !player.spells.includes(data.spell)) return;
    const now = Date.now();
    if (now - player.lastAttack < ATTACK_COOLDOWN || player.mp < spell.cost) return;
    player.lastAttack = now;
    player.mp -= spell.cost;

    if (spell.dmg < 0) {
      player.hp = player.hp - spell.dmg > player.maxHp ? player.maxHp : player.hp - spell.dmg;
      io.to('zone_' + currentZone).emit('combat_event', { t: 'heal', ty: 'player', ti: id, a: -spell.dmg, x: player.x, y: player.y });
      return;
    }

    if (spell.blink) {
      const angle = { up: -1.5708, down: 1.5708, left: 3.14159, right: 0 }[player.direction] || 0;
      const nx = player.x + Math.cos(angle) * spell.blink;
      const ny = player.y + Math.sin(angle) * spell.blink;
      if (isWalkable(player.zone, nx / TILE_SIZE | 0, ny / TILE_SIZE | 0)) { player.x = nx; player.y = ny; }
    }

    const tx = data.toX || player.x + 50;
    const ty = data.toY || player.y;

    if (spell.melee && spell.radius > 0) {
      const monsters = getMonstersInZone(currentZone);
      const radSq = spell.radius * spell.radius;
      for (let mi = 0; mi < monsters.length; mi++) {
        const m = monsters[mi];
        if (!m.alive || distSq(m.x, m.y, player.x, player.y) > radSq) continue;
        const dmg = spell.dmg - m.def > 0 ? (spell.dmg | 0) - m.def : 1;
        m.hp -= dmg;
        io.to('zone_' + currentZone).emit('combat_event', { t: 'damage', ty: 'monster', ti: m.id, a: dmg, x: m.x, y: m.y });
        if (m.hp <= 0) {
          m.hp = 0; m.alive = false; m.deathTime = Date.now();
          player.monstersKilled++;
          const xpr = giveXP(player, m.xp);
          io.to('zone_' + currentZone).emit('monster_died', { mid: m.id, pid: id, x: m.x, y: m.y, xp: m.xp, lv: xpr.leveledUp, nl: xpr.newLevel, xpe: player.xp, mk: player.monstersKilled });
          const isBoss = m.boss === true;
          const loot = isBoss ? (rollLoot(currentZone) || rollLoot(currentZone)) : rollLoot(currentZone);
          if (loot) {
            const li = { id: gameState.nextItemId++, zone: currentZone, x: m.x + (Math.random() - 0.5) * 20, y: m.y + (Math.random() - 0.5) * 20, k: loot.itemKey, n: loot.name, t: loot.type, s: loot.spell };
            if (!gameState.groundItems[currentZone]) gameState.groundItems[currentZone] = [];
            const gi = gameState.groundItems[currentZone];
            if (gi.length < MAX_GROUND_ITEMS) gi.push(li);
            io.to('zone_' + currentZone).emit('item_spawned', { id: li.id, x: li.x, y: li.y, n: li.n, k: li.k });
          }
        }
      }
      const impact = { x: player.x, y: player.y, color: 0xcccccc };
      io.to('zone_' + currentZone).emit('melee_swing', impact);
    } else if (spell.summon) {
      if (!player.pet || (Date.now() - player.pet.deathTime > PET_RESPAWN)) {
        const monsterDef = MONSTERS[spell.summon];
        if (monsterDef) {
          player.pet = {
            id: -player.id, ownerId: player.id,
            x: player.x + 30, y: player.y,
            hp: PET_STATS.hp, maxHp: PET_STATS.hp,
            atk: PET_STATS.atk, def: PET_STATS.def,
            speed: PET_STATS.speed, aggro: PET_STATS.aggro,
            alive: true, deathTime: 0,
            target: null, lastAttack: 0,
          };
          io.to('zone_' + currentZone).emit('chat_message', { n: 'System', t: player.name + ' summons a wolf!', c: '#cc8844' });
        }
      }
    } else if (spell.dmg >= 0 && !spell.aoe) {
      addProjectile(id, currentZone, data.spell, player.x, player.y, tx, ty);
    }

    if (spell.aoe && spell.radius > 0) {
      const monsters = getMonstersInZone(currentZone);
      const radSq = spell.radius * spell.radius;
      for (let mi = 0; mi < monsters.length; mi++) {
        const m = monsters[mi];
        if (!m.alive || distSq(m.x, m.y, player.x, player.y) > radSq) continue;
        const dmg = spell.dmg - m.def > 0 ? (spell.dmg | 0) - m.def : 1;
        m.hp -= dmg;
        if (spell.burn || spell.slow || spell.freeze || spell.poison) {
          if (!m.statusEffects) m.statusEffects = [];
          if (spell.burn && !m.statusEffects.some(s => s.t === 'burn')) {
            m.statusEffects.push({ t: 'burn', start: Date.now(), dur: spell.burn * 1000, tick: 1000, dmg: Math.max(1, Math.floor(dmg * 0.2)) });
          }
          if (spell.slow) {
            const se = m.statusEffects.find(s => s.t === 'slow');
            if (se) se.start = Date.now(); else m.statusEffects.push({ t: 'slow', start: Date.now(), dur: spell.slow * 1000 });
          }
          if (spell.freeze) {
            const se = m.statusEffects.find(s => s.t === 'freeze');
            if (se) se.start = Date.now(); else m.statusEffects.push({ t: 'freeze', start: Date.now(), dur: spell.freeze * 1000 });
          }
          if (spell.poison && !m.statusEffects.some(s => s.t === 'poison')) {
            m.statusEffects.push({ t: 'poison', start: Date.now(), dur: spell.poison * 1000, tick: 1000, dmg: Math.max(1, Math.floor(dmg * 0.12)) });
          }
        }
        io.to('zone_' + currentZone).emit('combat_event', { t: 'damage', ty: 'monster', ti: m.id, a: dmg, x: m.x, y: m.y });
        if (m.hp <= 0) {
          m.hp = 0; m.alive = false; m.deathTime = Date.now();
          player.monstersKilled++;
          const xpr = giveXP(player, m.xp);
          io.to('zone_' + currentZone).emit('monster_died', { mid: m.id, pid: id, x: m.x, y: m.y, xp: m.xp, lv: xpr.leveledUp, nl: xpr.newLevel, xpe: player.xp, mk: player.monstersKilled });
          const isBoss = m.boss === true;
          const loot = isBoss ? (rollLoot(currentZone) || rollLoot(currentZone)) : rollLoot(currentZone);
          if (loot) {
            const li = { id: gameState.nextItemId++, zone: currentZone, x: m.x + (Math.random() - 0.5) * 20, y: m.y + (Math.random() - 0.5) * 20, k: loot.itemKey, n: loot.name, t: loot.type, s: loot.spell };
            if (!gameState.groundItems[currentZone]) gameState.groundItems[currentZone] = [];
            const gi = gameState.groundItems[currentZone];
            if (gi.length < MAX_GROUND_ITEMS) gi.push(li);
            io.to('zone_' + currentZone).emit('item_spawned', { id: li.id, x: li.x, y: li.y, n: li.n, k: li.k });
          }
        }
      }
    }
  });

  socket.on('pickup_item', (data) => {
    if (!player) return;
    const items = gameState.groundItems[currentZone];
    if (!items) return;
    for (let ii = 0; ii < items.length; ii++) {
      if (items[ii].id === data.itemId) {
        if (distSq(player.x, player.y, items[ii].x, items[ii].y) > 1600) return;
        const item = items[ii];
        items.splice(ii, 1);
        if (item.t === 'scroll') {
          if (!player.spells.includes(item.s)) {
            player.spells.push(item.s);
            socket.emit('chat_message', { n: 'System', t: 'Learned spell: ' + (SPELLS[item.s]?.name || item.s) + '!', c: '#44ff44' });
          }
        } else {
          player.inventory.push(item.k);
          socket.emit('chat_message', { n: 'System', t: 'Picked up: ' + item.n, c: '#44ff44' });
        }
        socket.emit('inventory_update', { inventory: player.inventory, spells: player.spells });
        io.to('zone_' + currentZone).emit('item_removed', { itemId: data.itemId });
        return;
      }
    }
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
    socket.emit('stat_update', { hp: player.hp, mh: player.maxHp, mp: player.mp, mm: player.maxMp, atk: player.atk, def: player.def, sp: player.statPoints, as: player.allocatedStats });
  });

  socket.on('use_item', (data) => {
    if (!player) return;
    const idx = player.inventory.indexOf(data.itemKey);
    if (idx === -1) return;
    const itemData = G.ITEMS[data.itemKey];
    if (!itemData || itemData.type !== 'consumable') return;
    player.inventory.splice(idx, 1);
    if (itemData.stats.heal) player.hp = player.hp + itemData.stats.heal > player.maxHp ? player.maxHp : player.hp + itemData.stats.heal;
    if (itemData.stats.mana) player.mp = player.mp + itemData.stats.mana > player.maxMp ? player.maxMp : player.mp + itemData.stats.mana;
    socket.emit('inventory_update', { inventory: player.inventory, spells: player.spells });
    socket.emit('stat_update', { hp: player.hp, mh: player.maxHp, mp: player.mp, mm: player.maxMp, sp: player.statPoints, as: player.allocatedStats });
  });

  socket.on('respawn', () => {
    if (!player || player.alive) return;
    const spawn = getSpawnTile('meadow');
    player.x = spawn.x; player.y = spawn.y;
    player.zone = 'meadow'; player.hp = player.maxHp; player.mp = player.maxMp; player.alive = true;
    if (player.pet && !player.pet.alive) { player.pet = null; }
    currentZone = 'meadow';
    socket.leaveAll();
    socket.join('zone_meadow');
    const map = getZoneMap('meadow');
    spawnMonsters('meadow');
    socket.emit('zone_changed', { zone: 'meadow', map, mapWidth: MAP_COLS, mapHeight: MAP_ROWS, tileSize: TILE_SIZE, zoneDef: ZONE_DEFS.meadow });
    const monsters = getMonstersInZone('meadow');
    const mList = [];
    for (let mi = 0; mi < monsters.length; mi++) { if (monsters[mi].alive) mList.push(monSer(monsters[mi])); }
    socket.emit('monster_list', mList);
    socket.emit('chat_message', { n: 'System', t: 'You have respawned in the Meadow.', c: '#ffcc00' });
  });

  socket.on('chat_message', (data) => {
    if (!player) return;
    io.to('zone_' + currentZone).emit('chat_message', { n: player.name, t: data.text, c: '#ffffff' });
  });

  socket.on('allocate_stat', (data) => {
    if (!player || player.statPoints <= 0) return;
    const stat = data.stat;
    if (!['hp', 'mp', 'atk', 'def'].includes(stat)) return;
    player.allocatedStats[stat] = (player.allocatedStats[stat] || 0) + 1;
    player.statPoints--;
    applyEquipment(player);
    socket.emit('stat_update', { hp: player.hp, mh: player.maxHp, mp: player.mp, mm: player.maxMp, atk: player.atk, def: player.def, sp: player.statPoints, as: player.allocatedStats });
  });

  socket.on('disconnect', () => {
    if (player) {
      io.to('zone_' + currentZone).emit('player_left', { id });
      io.to('zone_' + currentZone).emit('chat_message', { n: 'System', t: player.name + ' has left the realm.', c: '#ffcc00' });
      saveAll();
      delete gameState.players[id];
    }
  });
});

setInterval(gameLoop, TICK_MS);
setInterval(saveAll, SAVE_INTERVAL);

server.listen(PORT, () => console.log('Mystic Realm server running on port ' + PORT));
