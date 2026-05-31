const TILE_SIZE = 32;
const MAP_COLS = 20;
const MAP_ROWS = 15;

const STAT_BASE = { mage: { hp: 80, mp: 100, atk: 12, def: 8, spd: 10 },
  sorcerer: { hp: 60, mp: 120, atk: 18, def: 5, spd: 12 },
  druid: { hp: 100, mp: 80, atk: 8, def: 12, spd: 8 },
  warrior: { hp: 130, mp: 40, atk: 16, def: 14, spd: 8 },
  archer: { hp: 70, mp: 90, atk: 20, def: 4, spd: 14 },
  summoner: { hp: 75, mp: 110, atk: 10, def: 6, spd: 10 } };

const STAT_PER_LEVEL = { mage: { hp: 12, mp: 14, atk: 2, def: 1.5 },
  sorcerer: { hp: 8, mp: 18, atk: 3, def: 1 },
  druid: { hp: 16, mp: 10, atk: 1.5, def: 2 },
  warrior: { hp: 20, mp: 5, atk: 3, def: 2.5 },
  archer: { hp: 10, mp: 12, atk: 3.5, def: 1 },
  summoner: { hp: 10, mp: 16, atk: 1.5, def: 1.5 } };

const SPELLS = {
  magic_bolt: { name: 'Magic Bolt', cost: 5, dmg: 10, desc: 'Basic magic projectile', speed: 300, color: 0x88ccff, radius: 4, aoe: false },
  heal: { name: 'Heal', cost: 15, dmg: -30, desc: 'Restore HP', speed: 0, color: 0x44ff44, radius: 0, aoe: false },
  fireball: { name: 'Fireball', cost: 12, dmg: 25, desc: 'Burning projectile', speed: 250, color: 0xff4400, radius: 5, aoe: false, burn: 5 },
  ice_shard: { name: 'Ice Shard', cost: 10, dmg: 18, desc: 'Slows target', speed: 280, color: 0x44ccff, radius: 4, aoe: false, slow: 3 },
  stone_wall: { name: 'Stone Wall', cost: 20, dmg: 0, desc: 'Place blocking wall', speed: 0, color: 0x886644, radius: 0, aoe: false, wall: true },
  gale: { name: 'Gale', cost: 8, dmg: 8, desc: 'Push enemies back', speed: 350, color: 0xccffcc, radius: 6, aoe: false, knockback: 60 },
  flame_wave: { name: 'Flame Wave', cost: 18, dmg: 20, desc: 'Wide arc fire', speed: 200, color: 0xff6600, radius: 8, aoe: true },
  summon_wolf: { name: 'Summon Wolf', cost: 25, dmg: 12, desc: 'Summon wolf pet', speed: 0, color: 0xcc8844, radius: 0, aoe: false, summon: 'wolf' },
  teleport: { name: 'Teleport', cost: 20, dmg: 0, desc: 'Short blink forward', speed: 0, color: 0xcc44ff, radius: 0, aoe: false, blink: 80 },
  meteor: { name: 'Meteor', cost: 30, dmg: 40, desc: 'AoE fire/earth', speed: 150, color: 0xff4400, radius: 12, aoe: true },
  frost_nova: { name: 'Frost Nova', cost: 22, dmg: 15, desc: 'Freeze nearby enemies', speed: 0, color: 0x88ddff, radius: 50, aoe: true, freeze: 2 },
  poison_cloud: { name: 'Poison Cloud', cost: 15, dmg: 12, desc: 'AoE poison DoT', speed: 0, color: 0x66ff66, radius: 40, aoe: true, poison: 6 },
  slash: { name: 'Slash', cost: 0, dmg: 12, desc: 'A swift sword strike', speed: 0, color: 0xcccccc, radius: 30, aoe: false, melee: true },
};

const CLASS_STARTING_SPELLS = {
  mage: ['magic_bolt', 'heal'],
  sorcerer: ['fireball'],
  druid: ['heal', 'summon_wolf'],
  warrior: ['slash', 'gale'],
  archer: ['magic_bolt', 'ice_shard'],
  summoner: ['magic_bolt', 'heal'],
};

const ZONE_MAPS = {};

const ZONE_ORDER = ['meadow', 'forest', 'caves', 'ruins', 'tower'];
const ZONE_LORE = {
  meadow: 'The Meadow — a peaceful starting ground. Perfect for new mages to test their spells on harmless slimes and sprites.',
  forest: 'The Whispering Forest — ancient trees murmur secrets. Darker creatures lurk here, drawn to the magic in the air.',
  caves: 'The Crystal Caves — glowing minerals illuminate winding tunnels. Something ancient stirs in the deep.',
  ruins: 'The Sunken Ruins — remnants of a fallen mage civilization. The air crackles with residual arcane energy.',
  tower: 'The Spire of Aether — a twisted tower reaching into the void. The Aether Lord awaits at the summit.',
};

const ZONE_DEFS = {
  meadow: { name: 'Meadow', levels: '1-5', color: '#88ff88', lore: ZONE_LORE.meadow, edgeMap: { right: 'forest' }, monsters: ['slime', 'rabbit', 'sprite'] },
  forest: { name: 'Forest', levels: '5-10', color: '#88cc44', lore: ZONE_LORE.forest, edgeMap: { left: 'meadow', down: 'caves' }, monsters: ['wolf', 'treant', 'spider'] },
  caves: { name: 'Caves', levels: '10-15', color: '#cc8844', lore: ZONE_LORE.caves, edgeMap: { up: 'forest', right: 'ruins' }, monsters: ['bat', 'skeleton', 'crystal'] },
  ruins: { name: 'Ruins', levels: '15-20', color: '#aa66ff', lore: ZONE_LORE.ruins, edgeMap: { left: 'caves', down: 'tower' }, monsters: ['golem', 'phantom', 'wraith'] },
  tower: { name: 'Tower', levels: '20+', color: '#ff6600', lore: ZONE_LORE.tower, edgeMap: { up: 'ruins' }, monsters: ['mage', 'elemental', 'boss'] },
};

const MONSTERS = {
  slime: { name: 'Slime', desc: 'A bouncy blob of harmless ooze.', hp: 20, atk: 2, def: 1, xp: 10, speed: 25, aggro: 80, color: 0x44cc44 },
  rabbit: { name: 'Rabbit', desc: 'A feisty magical rabbit.', hp: 15, atk: 3, def: 0, xp: 12, speed: 40, aggro: 60, color: 0xcc8844 },
  sprite: { name: 'Sprite', desc: 'A mischievous light spirit.', hp: 12, atk: 4, def: 0, xp: 15, speed: 35, aggro: 100, color: 0x88ddff, ranged: true },
  wolf: { name: 'Wolf', desc: 'A pack hunter.', hp: 35, atk: 5, def: 2, xp: 20, speed: 45, aggro: 130, color: 0x886644 },
  treant: { name: 'Treant', desc: 'An ancient awakened tree.', hp: 60, atk: 4, def: 5, xp: 25, speed: 15, aggro: 80, color: 0x44aa22 },
  spider: { name: 'Spider', desc: 'A venomous cave spinner.', hp: 25, atk: 6, def: 1, xp: 22, speed: 35, aggro: 100, color: 0x884422, poison: 3 },
  bat: { name: 'Bat', desc: 'A cave bat.', hp: 18, atk: 3, def: 0, xp: 18, speed: 50, aggro: 70, color: 0x664466 },
  skeleton: { name: 'Skeleton', desc: 'Animated bones of a fallen mage.', hp: 40, atk: 6, def: 4, xp: 28, speed: 30, aggro: 110, color: 0xcccccc },
  crystal: { name: 'Crystal', desc: 'A floating crystal that fires energy beams.', hp: 30, atk: 8, def: 3, xp: 30, speed: 20, aggro: 120, color: 0xaa66ff, ranged: true },
  golem: { name: 'Golem', desc: 'A guardian made of stone.', hp: 80, atk: 8, def: 10, xp: 40, speed: 15, aggro: 100, color: 0x888866 },
  phantom: { name: 'Phantom', desc: 'A ghostly apparition.', hp: 35, atk: 10, def: 2, xp: 45, speed: 40, aggro: 140, color: 0xccccff, teleport: true },
  wraith: { name: 'Wraith', desc: 'A soul-draining undead horror.', hp: 45, atk: 10, def: 3, xp: 42, speed: 35, aggro: 130, color: 0x664488, lifedrain: 5 },
  mage: { name: 'Dark Mage', desc: 'A corrupted mage wielding void magic.', hp: 50, atk: 12, def: 3, xp: 50, speed: 30, aggro: 130, color: 0x8844cc, ranged: true },
  elemental: { name: 'Arcane Elemental', desc: 'A being of pure arcane energy.', hp: 55, atk: 10, def: 6, xp: 55, speed: 25, aggro: 120, color: 0x44aaff, ranged: true, teleport: true },
  boss: { name: 'Aether Lord', desc: 'THE FINAL BOSS.', hp: 250, atk: 15, def: 8, xp: 200, speed: 25, aggro: 200, color: 0xffcc00, boss: true, ranged: true, teleport: true },
};

function buildZoneMap(zone) {
  const map = [];
  for (let y = 0; y < MAP_ROWS; y++) {
    map[y] = [];
    for (let x = 0; x < MAP_COLS; x++) {
      if (y === 0 || y === MAP_ROWS - 1 || x === 0 || x === MAP_COLS - 1) {
        const edge = ZONE_DEFS[zone].edgeMap;
        if (y === 0 && edge.up) map[y][x] = 5;
        else if (y === MAP_ROWS - 1 && edge.down) map[y][x] = 6;
        else if (x === 0 && edge.left) map[y][x] = 7;
        else if (x === MAP_COLS - 1 && edge.right) map[y][x] = 8;
        else map[y][x] = 3;
      } else if (zone === 'meadow') {
        map[y][x] = Math.random() < 0.08 ? 1 : Math.random() < 0.04 ? 2 : Math.random() < 0.1 ? 4 : 0;
      } else if (zone === 'forest') {
        map[y][x] = Math.random() < 0.2 ? 1 : Math.random() < 0.05 ? 2 : Math.random() < 0.08 ? 4 : 0;
      } else if (zone === 'caves') {
        map[y][x] = Math.random() < 0.1 ? 2 : Math.random() < 0.15 ? 9 : Math.random() < 0.05 ? 4 : 9;
      } else if (zone === 'ruins') {
        map[y][x] = Math.random() < 0.15 ? 10 : Math.random() < 0.1 ? 11 : Math.random() < 0.08 ? 4 : 10;
      } else if (zone === 'tower') {
        map[y][x] = Math.random() < 0.1 ? 11 : Math.random() < 0.15 ? 12 : Math.random() < 0.05 ? 4 : 12;
      }
    }
  }
  return map;
}

function getZoneMap(zone) {
  if (!ZONE_MAPS[zone]) ZONE_MAPS[zone] = buildZoneMap(zone);
  return ZONE_MAPS[zone];
}

function isWalkable(zone, tileX, tileY) {
  const map = getZoneMap(zone);
  if (tileY < 0 || tileY >= MAP_ROWS || tileX < 0 || tileX >= MAP_COLS) return false;
  const t = map[tileY][tileX];
  return t === 0 || t === 4 || t === 5 || t === 6 || t === 7 || t === 8 || t === 9 || t === 10 || t === 11 || t === 12;
}

function getEdgeZone(zone, tileX, tileY) {
  const def = ZONE_DEFS[zone];
  if (!def) return null;
  if (tileY === 0 && def.edgeMap.up) return def.edgeMap.up;
  if (tileY === MAP_ROWS - 1 && def.edgeMap.down) return def.edgeMap.down;
  if (tileX === 0 && def.edgeMap.left) return def.edgeMap.left;
  if (tileX === MAP_COLS - 1 && def.edgeMap.right) return def.edgeMap.right;
  return null;
}

function getSpawnTile(zone) {
  const map = getZoneMap(zone);
  for (let y = 2; y < MAP_ROWS - 2; y++) {
    for (let x = 2; x < MAP_COLS - 2; x++) {
      const t = map[y][x];
      if (t === 0 || t === 4 || t === 9 || t === 10 || t === 11 || t === 12) return { x: x * TILE_SIZE + TILE_SIZE / 2, y: y * TILE_SIZE + TILE_SIZE / 2 };
    }
  }
  return { x: 5 * TILE_SIZE + TILE_SIZE / 2, y: 5 * TILE_SIZE + TILE_SIZE / 2 };
}

function xpToLevel(xp) {
  let level = 1, needed = 100;
  while (xp >= needed) {
    xp -= needed;
    level++;
    needed = Math.floor(needed * 1.3);
  }
  return { level, xp, needed };
}

const CLASS_PASSIVES = {
  mage: { name: 'Arcane Surge', desc: 'Mana pool +25%' },
  sorcerer: { name: 'Destruction', desc: 'ATK +15%, Mana +10%' },
  druid: { name: 'Wild Heart', desc: 'HP +20%' },
  warrior: { name: 'Iron Will', desc: 'DEF +20%' },
  archer: { name: 'Deadeye', desc: 'ATK +15%' },
  summoner: { name: 'Soul Well', desc: 'Mana +15%' },
};

function getStats(cls, level) {
  const base = STAT_BASE[cls];
  const per = STAT_PER_LEVEL[cls];
  let s = {
    maxHp: Math.floor(base.hp + per.hp * (level - 1)),
    maxMp: Math.floor(base.mp + per.mp * (level - 1)),
    atk: Math.floor(base.atk + per.atk * (level - 1)),
    def: Math.floor(base.def + per.def * (level - 1)),
    spd: base.spd,
  };
  if (cls === 'mage') s.maxMp = Math.floor(s.maxMp * 1.25);
  if (cls === 'sorcerer') { s.atk = Math.floor(s.atk * 1.15); s.maxMp = Math.floor(s.maxMp * 1.1); }
  if (cls === 'druid') s.maxHp = Math.floor(s.maxHp * 1.2);
  if (cls === 'warrior') s.def = Math.floor(s.def * 1.2);
  if (cls === 'archer') s.atk = Math.floor(s.atk * 1.15);
  if (cls === 'summoner') s.maxMp = Math.floor(s.maxMp * 1.15);
  return s;
}

const ITEMS = {
  wooden_staff: { name: 'Wooden Staff', type: 'weapon', tier: 1, stats: { atk: 3 }, desc: 'A basic wooden staff' },
  starter_robe: { name: 'Starter Robe', type: 'armor', tier: 1, stats: { def: 2 }, desc: 'Simple cloth robe' },
  starter_ring: { name: 'Starter Ring', type: 'accessory', tier: 1, stats: { mp: 10 }, desc: 'A simple copper ring' },
  forest_staff: { name: 'Forest Staff', type: 'weapon', tier: 2, stats: { atk: 6, mp: 5 }, desc: 'Carved from living wood' },
  leaf_cloak: { name: 'Leaf Cloak', type: 'armor', tier: 2, stats: { def: 4, hp: 10 }, desc: 'Woven from enchanted leaves' },
  vine_ring: { name: 'Vine Ring', type: 'accessory', tier: 2, stats: { hp: 15 }, desc: 'Living vines coiled into a ring' },
  crystal_staff: { name: 'Crystal Staff', type: 'weapon', tier: 3, stats: { atk: 10, mp: 10 }, desc: 'Pulsing with crystal energy' },
  crystal_robe: { name: 'Crystal Robe', type: 'armor', tier: 3, stats: { def: 7, mp: 15 }, desc: 'Robes lined with crystal shards' },
  crystal_ring: { name: 'Crystal Ring', type: 'accessory', tier: 3, stats: { mp: 25 }, desc: 'A ring of pure crystal' },
  ancient_staff: { name: 'Ancient Staff', type: 'weapon', tier: 4, stats: { atk: 15, mp: 15 }, desc: 'Wielded by forgotten mages' },
  ancient_robe: { name: 'Ancient Robe', type: 'armor', tier: 4, stats: { def: 10, mp: 20 }, desc: 'Etched with ancient runes' },
  soul_ring: { name: 'Soul Ring', type: 'accessory', tier: 4, stats: { hp: 25, mp: 15 }, desc: 'Pulses with a faint heartbeat' },
  legendary_staff: { name: 'Legendary Staff', type: 'weapon', tier: 5, stats: { atk: 22, mp: 25 }, desc: 'Staff of a true archmage' },
  legendary_robe: { name: 'Legendary Robe', type: 'armor', tier: 5, stats: { def: 15, hp: 30 }, desc: 'Robes woven from starlight' },
  boss_ring: { name: 'Aether Ring', type: 'accessory', tier: 5, stats: { hp: 40, mp: 30, atk: 5 }, desc: 'The Aether Lord\'s own ring' },
  health_pot: { name: 'Health Potion', type: 'consumable', tier: 0, stats: { heal: 40 }, desc: 'Restores 40 HP' },
  mana_pot: { name: 'Mana Potion', type: 'consumable', tier: 0, stats: { mana: 30 }, desc: 'Restores 30 MP' },
  greater_health_pot: { name: 'Greater Health Potion', type: 'consumable', tier: 1, stats: { heal: 80 }, desc: 'Restores 80 HP' },
  greater_mana_pot: { name: 'Greater Mana Potion', type: 'consumable', tier: 1, stats: { mana: 60 }, desc: 'Restores 60 MP' },
};

const SPELL_SCROLLS = {
  fireball: { spell: 'fireball', tier: 2, name: 'Fireball Scroll' },
  ice_shard: { spell: 'ice_shard', tier: 2, name: 'Ice Shard Scroll' },
  stone_wall: { spell: 'stone_wall', tier: 3, name: 'Stone Wall Scroll' },
  gale: { spell: 'gale', tier: 2, name: 'Gale Scroll' },
  flame_wave: { spell: 'flame_wave', tier: 3, name: 'Flame Wave Scroll' },
  teleport: { spell: 'teleport', tier: 4, name: 'Teleport Scroll' },
  meteor: { spell: 'meteor', tier: 5, name: 'Meteor Scroll' },
  frost_nova: { spell: 'frost_nova', tier: 4, name: 'Frost Nova Scroll' },
  poison_cloud: { spell: 'poison_cloud', tier: 3, name: 'Poison Cloud Scroll' },
};

const LOOT_TABLES = {
  meadow: { items: [{ item: 'starter_robe', weight: 18 }, { item: 'wooden_staff', weight: 18 }, { item: 'starter_ring', weight: 14 }, { item: 'health_pot', weight: 30 }, { item: 'mana_pot', weight: 20 }], scrolls: null },
  forest: { items: [{ item: 'forest_staff', weight: 12 }, { item: 'leaf_cloak', weight: 16 }, { item: 'vine_ring', weight: 12 }, { item: 'health_pot', weight: 22 }, { item: 'mana_pot', weight: 18 }, { item: 'greater_health_pot', weight: 10 }, { item: 'greater_mana_pot', weight: 10 }], scrolls: ['fireball', 'ice_shard', 'gale'] },
  caves: { items: [{ item: 'crystal_staff', weight: 12 }, { item: 'crystal_robe', weight: 16 }, { item: 'crystal_ring', weight: 12 }, { item: 'greater_health_pot', weight: 20 }, { item: 'greater_mana_pot', weight: 18 }, { item: 'health_pot', weight: 12 }, { item: 'mana_pot', weight: 10 }], scrolls: ['stone_wall', 'flame_wave', 'poison_cloud'] },
  ruins: { items: [{ item: 'ancient_staff', weight: 15 }, { item: 'ancient_robe', weight: 18 }, { item: 'soul_ring', weight: 15 }, { item: 'greater_health_pot', weight: 18 }, { item: 'greater_mana_pot', weight: 16 }, { item: 'health_pot', weight: 10 }, { item: 'mana_pot', weight: 8 }], scrolls: ['teleport', 'frost_nova'] },
  tower: { items: [{ item: 'legendary_staff', weight: 18 }, { item: 'legendary_robe', weight: 20 }, { item: 'boss_ring', weight: 14 }, { item: 'greater_health_pot', weight: 18 }, { item: 'greater_mana_pot', weight: 16 }, { item: 'health_pot', weight: 8 }, { item: 'mana_pot', weight: 6 }], scrolls: ['meteor'] },
};

function rollLoot(zone) {
  const table = LOOT_TABLES[zone];
  if (!table) return null;
  const total = table.items.reduce((s, i) => s + i.weight, 0);
  let roll = Math.random() * total;
  let item = null;
  for (const entry of table.items) {
    roll -= entry.weight;
    if (roll <= 0) { item = entry.item; break; }
  }
  if (table.scrolls && Math.random() < 0.35) {
    const scrollKey = table.scrolls[Math.floor(Math.random() * table.scrolls.length)];
    return { type: 'scroll', spell: scrollKey, itemKey: scrollKey + '_scroll', name: SPELL_SCROLLS[scrollKey]?.name || 'Spell Scroll' };
  }
  if (item) return { type: 'item', itemKey: item, name: ITEMS[item]?.name || 'Unknown Item' };
  return null;
}

function getItemEffects(itemKey) {
  const item = ITEMS[itemKey];
  if (!item) return null;
  return { ...item.stats, type: item.type };
}

function applyItemStats(stats, itemKey) {
  const effects = getItemEffects(itemKey);
  if (!effects) return stats;
  const s = { ...stats };
  if (effects.atk) s.atk = (s.atk || 0) + effects.atk;
  if (effects.def) s.def = (s.def || 0) + effects.def;
  if (effects.hp) s.maxHp = (s.maxHp || 100) + effects.hp;
  if (effects.mp) s.maxMp = (s.maxMp || 50) + effects.mp;
  return s;
}

const VENDOR_ITEMS = {
  meadow: { items: [{ key: 'health_pot', price: 20 }, { key: 'mana_pot', price: 15 }], sellMult: 0.5 },
  forest: { items: [{ key: 'health_pot', price: 20 }, { key: 'mana_pot', price: 15 }, { key: 'greater_health_pot', price: 45 }, { key: 'greater_mana_pot', price: 35 }, { key: 'forest_staff', price: 80 }, { key: 'leaf_cloak', price: 60 }, { key: 'vine_ring', price: 50 }], sellMult: 0.5 },
  caves: { items: [{ key: 'greater_health_pot', price: 45 }, { key: 'greater_mana_pot', price: 35 }, { key: 'crystal_staff', price: 200 }, { key: 'crystal_robe', price: 150 }, { key: 'crystal_ring', price: 120 }], sellMult: 0.5 },
  ruins: { items: [{ key: 'greater_health_pot', price: 45 }, { key: 'greater_mana_pot', price: 35 }, { key: 'ancient_staff', price: 400 }, { key: 'ancient_robe', price: 350 }, { key: 'soul_ring', price: 300 }], sellMult: 0.5 },
  tower: { items: [{ key: 'greater_health_pot', price: 45 }, { key: 'greater_mana_pot', price: 35 }, { key: 'legendary_staff', price: 800 }, { key: 'legendary_robe', price: 700 }, { key: 'boss_ring', price: 600 }], sellMult: 0.5 },
};

function getGoldDrop(zone, isBoss) {
  const r = { meadow: [2, 5], forest: [5, 10], caves: [10, 20], ruins: [15, 30], tower: [20, 50] };
  const [min, max] = r[zone] || [1, 3];
  const base = min + (Math.random() * (max - min) | 0);
  return isBoss ? base * 3 + 10 : base;
}

function getItemSellPrice(itemKey) {
  const item = ITEMS[itemKey];
  if (!item) return 0;
  if (item.type === 'consumable') {
    if (item.stats.heal >= 80) return 22;
    if (item.stats.mana >= 60) return 17;
    if (item.stats.heal) return 10;
    if (item.stats.mana) return 7;
  }
  const tierPrices = [0, 15, 40, 100, 200, 400];
  return tierPrices[item.tier] || 0;
}

function createMonsterInstance(zone, monsterKey, id) {
  const def = MONSTERS[monsterKey];
  if (!def) return null;
  const map = getZoneMap(zone);
  const walkable = [];
  for (let y = 1; y < MAP_ROWS - 1; y++) {
    for (let x = 1; x < MAP_COLS - 1; x++) {
      if (isWalkable(zone, x, y)) walkable.push({ x: x * TILE_SIZE + TILE_SIZE / 2, y: y * TILE_SIZE + TILE_SIZE / 2 });
    }
  }
  const spawn = walkable.length > 0 ? walkable[Math.random() * walkable.length | 0] : getSpawnTile(zone);
  return {
    id, zone, key: monsterKey, name: def.name,
    hp: def.hp, maxHp: def.hp, atk: def.atk, def: def.def,
    xp: def.xp, speed: def.speed, aggro: def.aggro,
    x: spawn.x + (Math.random() - 0.5) * 32,
    y: spawn.y + (Math.random() - 0.5) * 32,
    color: def.color, ranged: def.ranged || false,
    boss: def.boss || false, alive: true,
    poison: def.poison || 0, lifedrain: def.lifedrain || 0, teleport: def.teleport || false,
    target: null, aggroTimer: 0,
    lastAttack: 0, deathTime: 0, moveDir: Math.random() * Math.PI * 2,
    moveTimer: 0,
  };
}

module.exports = {
  TILE_SIZE, MAP_COLS, MAP_ROWS,
  SPELLS, CLASS_STARTING_SPELLS, MONSTERS, ITEMS,
  ZONE_DEFS, LOOT_TABLES, SPELL_SCROLLS,
  VENDOR_ITEMS,
  getZoneMap, isWalkable, getEdgeZone, getSpawnTile,
  getStats, xpToLevel, rollLoot, applyItemStats,
  getItemEffects, createMonsterInstance, ZONE_MAPS,
  STAT_BASE, STAT_PER_LEVEL, CLASS_PASSIVES,
  getGoldDrop, getItemSellPrice,
};
