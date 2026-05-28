# Mystic Realm

A top-down 2D fantasy RPG playable in the browser. Built with Phaser 3 and Node.js/Socket.io.

## Overview

Mystic Realm is a solo (or multiplayer) adventure where you pick a class, fight monsters across 5 zones, collect loot, and battle the final boss.

**Goal:** Explore all 5 zones and defeat the Aether Lord in the Tower.

**Play online:** [https://mystic-realm.onrender.com/](https://mystic-realm.onrender.com/)

## Quick Start

```bash
# Server
cd server
npm install
node src/index.js

# Client — serve with any static HTTP server, e.g.
cd client
npx http-server -c-1 -p 8080
```

Open `http://localhost:8080` in a browser.

## Game Features

### 3 Classes
- **Mage** — Balanced HP/MP, versatile starter spells (bolt + heal)
- **Sorcerer** — Low HP, high MP, powerful AoE (fireball, meteor)
- **Druid** — High HP, sustain, support (ice shard, poison, wolf summon)

### 5 Zones (in order)
| Zone | Level Range | Theme |
|------|-------------|-------|
| Meadow | 1–5 | Green fields, slimes and bats |
| Forest | 5–10 | Dark woods, wolves and spiders |
| Caves | 10–15 | Underground, golems and wyrms |
| Ruins | 15–20 | Ancient ruins, ghosts and cultists |
| Tower | 20+ | Final challenge, Aether Lord boss |

### Combat
- WASD/Arrow keys to move
- 1–5 to select a spell slot, click to cast at cursor
- Click a monster to target it (see its HP/name below)
- Monsters chase, melee, and use projectile attacks

### Loot & Inventory
- Monsters drop items on death (click to pick up)
- Press `I` to open inventory: Use potions, Equip weapons/armor/accessories
- Gear boosts ATK, DEF, MaxHP

### Progression
- Killing monsters gives XP; leveling up increases stats
- Each zone has a recommended level range
- Walk to zone edges to transition to the next area
- Zone lore popup appears on first entry

## Controls

| Key | Action |
|-----|--------|
| W/A/S/D or Arrows | Move |
| 1–5 | Select spell |
| Click (spell selected) | Cast spell at cursor |
| Click monster | Target |
| Click ground item | Pick up |
| I | Toggle inventory |
| Enter | Chat |
| R | Respawn |
| H / Escape | Help / Close help |

## Project Structure

```
mystic-realm/
├── client/                  # Browser frontend
│   ├── index.html           # Entry page, CDN scripts
│   └── src/
│       └── scenes/
│           ├── BootScene.js        # Texture generation (tiles, sprites)
│           ├── CharCreateScene.js  # Class picker UI
│           └── GameScene.js        # Main game logic (input, rendering, UI)
├── server/                  # Node.js backend
│   └── src/
│       ├── index.js         # Express + Socket.io server, combat loop, AI, persistence
│       └── game.js          # Game data (items, spells, monsters, loot tables, zones, formulas)
└── README.md
```

### Architecture

**Server** (`server/src/index.js`):
- Runs a 50ms game tick loop per zone
- Handles socket connections, player state, monster AI, combat, loot, zone transitions
- Saves player data to `server/data.json` (name-keyed)
- Sends incremental state updates to clients (delta compression via short field names)

**Client** (`client/src/scenes/GameScene.js`):
- Phaser 3 scene with 640×480 viewport (20×15 tiles at 32px), scaled via `Phaser.Scale.FIT`
- Listens for server state updates, renders map/monsters/projectiles/items
- Input handling: keyboard movement, click targeting, spell casting, inventory management
- HUD: HP/MP/XP bars, spell bar, chat, target info, quest/goal panel, help overlay

### Network Protocol

All socket messages use short field names to minimize bandwidth:
- `su` = state_update, `p` = players, `m` = monsters, `pr` = projectiles, `gi` = ground items
- Player data: `i`=id, `n`=name, `x`/`y`, `cl`=class, `lv`=level, `hp`/`mhp`
- Monster data: `i`=id, `k`=key, `x`/`y`, `hp`/`mhp`, `tz`=type, `ag`=aggro
- Projectiles: `i`=id, `x`/`y`, `d`=dx/dy, `ow`=ownerType

### Server-Side Combat

- Monsters tick state machine: idle → chase (aggro range) → attack
- Melee monsters deal damage on contact when cooldown expires
- Ranged monsters fire projectiles (negative ownerId `-m.id` = damages players)
- Max 3 monsters can attack the same player simultaneously
- Monsters respawn on a timer when zone is below cap; new monsters get fresh IDs

### Performance Notes

- Monsters idle in empty zones are skipped each tick
- Uses squared distance for proximity checks (avoids `Math.sqrt`)
- Projectile arrays reuse a single batch-delete pass per tick
- Ground items are capped at 50 per zone
- Chat on client uses object pooling (reuses text objects instead of destroy/recreate)
- Font sizes are kept small (9–13px) to fit the 640×480 viewport

### Customization

To modify game balance, edit `server/src/game.js`:
- `MONSTERS` — HP, ATK, DEF, attack cooldown, loot tables, aggro range
- `ITEMS` — Equipment stats, potion healing values, sell prices
- `SPELLS` — Damage, effects, class availability
- `ZONES` — Map layout, edge transitions, level ranges, lore text
- `calcStats(level)` — XP requirements, stat growth

### Adding Custom Assets

All textures are procedurally generated in `client/src/scenes/BootScene.js` using Phaser's Graphics API.

**To replace with image files:**

1. Place your sprite sheets in `client/assets/`
2. In `BootScene.js`, load them in a `preload()` method:
   ```js
   preload() {
     this.load.image('player_mage', 'assets/mage.png');
     this.load.spritesheet('player_mage_walk', 'assets/mage_walk.png', { frameWidth: 32, frameHeight: 32 });
   }
   ```
3. Remove the corresponding `make(...)` call
4. In `GameScene.js`, use the loaded texture key instead of `'player_' + class`

**Tile map:** 20×15 grid (640×480). Tile values 0–12:
- `0` = Grass (walkable)
- `1` = Tree (obstacle)
- `2` = Water (obstacle)
- `3` = Stone wall (obstacle)
- `4` = Path (walkable)
- `5–8` = Zone edges (walkable)
- `9` = Cave floor (obstacle)
- `10` = Ruins floor (obstacle)
- `11` = Ruins wall (obstacle)
- `12` = Tower floor (obstacle)

Edit zone maps in `server/src/game.js` → `getZoneMap()`.

**Player sprites:** 32×32 px. Add `_back` variant for up-facing animation (e.g., `player_mage_back`).

**Monster sprites:** Currently drawn as colored circles via Graphics. Replace by loading textures and using `this.add.image()` in `addMonsterSprite()` (`GameScene.js:525`).

### Deployment

Deploy to Render:
1. Create a Node.js web service pointing at `server/src/index.js`
2. Build command: `cd server && npm install`
3. Start command: `cd server && node src/index.js`
4. Update `client/src/scenes/GameScene.js` SERVER_URL to your Render URL
5. Serve client via any static host (Render static site, Netlify, GitHub Pages)
