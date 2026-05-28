const TILE_SIZE = 32;
const COLS = 20;
const ROWS = 15;
const SPEED = 120;
const MOVE_THROTTLE = 50;
const TILE_TEXTURES = ['tile_0', 'tile_1', 'tile_2', 'tile_3', 'tile_4', 'tile_5', 'tile_6', 'tile_7', 'tile_8', 'tile_9', 'tile_10', 'tile_11', 'tile_12'];

const SPELL_BAR_COLORS = {
  magic_bolt: 0x88ccff, heal: 0x44ff44, fireball: 0xff4400,
  ice_shard: 0x44ccff, stone_wall: 0x886644, gale: 0xccffcc,
  flame_wave: 0xff6600, summon_wolf: 0xcc8844, teleport: 0xcc44ff,
  meteor: 0xff4400, frost_nova: 0x88ddff, poison_cloud: 0x66ff66,
};

const SPELL_NAMES = {
  magic_bolt: 'Bolt', heal: 'Heal', fireball: 'Fire',
  ice_shard: 'Ice', stone_wall: 'Wall', gale: 'Gale',
  flame_wave: 'FlameW', summon_wolf: 'Wolf', teleport: 'TP',
  meteor: 'Meteor', frost_nova: 'Nova', poison_cloud: 'Poison',
};

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init(data) {
    this.playerName = data.name || 'Adventurer';
    this.playerClass = data.class || 'mage';
    this.myId = null;
    this.mapData = null;
    this.currentZone = 'meadow';
    this.tileSprites = [];
    this.playerSprite = null;
    this.otherPlayers = {};
    this.monsterSprites = {};
    this.projectileSprites = {};
    this.groundItemSprites = {};
    this.keys = {};
    this.lastMoveSent = 0;
    this.chatMessages = [];
    this.chatInput = '';
    this.isChatting = false;
    this.chatTexts = [];
    this.network = null;
    this.myStats = { hp: 100, maxHp: 100, mp: 50, maxMp: 50, atk: 10, def: 5, level: 1 };
    this.spells = [];
    this.inventory = [];
    this.equipped = {};
    this.selectedSpell = null;
    this.targetMonster = null;
    this.showingInventory = false;
    this.inventoryElements = [];
    this.dead = false;
    this.damageTexts = [];
    this.levelUpText = null;
    this.levelUpTimer = 0;
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a1a2e');

    this.keys = {
      W: this.input.keyboard.addKey('W'), A: this.input.keyboard.addKey('A'),
      S: this.input.keyboard.addKey('S'), D: this.input.keyboard.addKey('D'),
      UP: this.input.keyboard.addKey('UP'), DOWN: this.input.keyboard.addKey('DOWN'),
      LEFT: this.input.keyboard.addKey('LEFT'), RIGHT: this.input.keyboard.addKey('RIGHT'),
      ONE: this.input.keyboard.addKey('ONE'), TWO: this.input.keyboard.addKey('TWO'),
      THREE: this.input.keyboard.addKey('THREE'), FOUR: this.input.keyboard.addKey('FOUR'),
      FIVE: this.input.keyboard.addKey('FIVE'),
      I: this.input.keyboard.addKey('I'),
      F: this.input.keyboard.addKey('F'),
      R: this.input.keyboard.addKey('R'),
    };

    this.network = new Network();
    this.setupNetwork();
    this.network.connect();

    this.showingHelp = false;
    this.helpElements = [];

    this.input.keyboard.on('keydown', (event) => {
      if (event.key === 'h' || event.key === 'H') { this.toggleHelp(); event.stopPropagation(); return; }

      if (this.showingHelp) {
        if (event.key === 'h' || event.key === 'H' || event.key === 'Escape') { this.toggleHelp(); event.stopPropagation(); }
        return;
      }

      if (this.isChatting) {
        if (event.key === 'Enter') {
          if (this.chatInput.length > 0 && this.network) {
            this.network.emit('chat_message', { text: this.chatInput });
          }
          this.isChatting = false;
          this.hideChatInput();
        } else if (event.key === 'Backspace') {
          this.chatInput = this.chatInput.slice(0, -1);
          this.updateChatInput();
        } else if (event.key.length === 1 && this.chatInput.length < 80) {
          this.chatInput += event.key;
          this.updateChatInput();
        }
        event.stopPropagation();
        return;
      }

      if (event.key === 'Enter') {
        this.isChatting = true;
        this.chatInput = '';
        this.showChatInput();
        event.stopPropagation();
        return;
      }

      if (event.key === '1') { this.selectSpell(0); event.stopPropagation(); return; }
      if (event.key === '2') { this.selectSpell(1); event.stopPropagation(); return; }
      if (event.key === '3') { this.selectSpell(2); event.stopPropagation(); return; }
      if (event.key === '4') { this.selectSpell(3); event.stopPropagation(); return; }
      if (event.key === '5') { this.selectSpell(4); event.stopPropagation(); return; }
      if (event.key === 'i' || event.key === 'I') { this.toggleInventory(); event.stopPropagation(); return; }
      if (event.key === 'r' || event.key === 'R') { this.respawn(); event.stopPropagation(); return; }
    });

    this.input.on('pointerdown', (pointer) => {
      if (this.isChatting || this.showingInventory) return;
      if (this.selectedSpell && this.myStats.mp >= 20) {
        this.network.emit('cast_spell', {
          spell: this.selectedSpell,
          toX: Math.round(pointer.x),
          toY: Math.round(pointer.y),
        });
        this.selectedSpell = null;
        this.updateSpellBar();
      }
    });

    this.input.on('pointermove', (pointer) => {
      if (this.showingInventory && this.dragItem) {
        this.dragItem.sprite.setPosition(pointer.x, pointer.y);
      }
    });

    this.input.on('pointerup', (pointer) => {
      if (this.dragItem) {
        this.dragItem.sprite.destroy();
        this.dragItem = null;
        this.showInventory();
      }
    });
  }

  setupNetwork() {
    const self = this;

    self.network.on('map_data', (data) => {
      self.currentZone = data.zone;
      self.mapData = data.map;
      self.renderMap();
      self.network.emit('join', { name: self.playerName, class: self.playerClass });
    });

    let tutorialShown = false;

    self.network.on('you_joined', (data) => {
      self.myId = data.id;
      self.myStats = data.player;
      self.createPlayer();
      self.createHUD();
      self.createSpellBar();
      if (self.myStats.xp !== undefined) self.updateXPBar(self.myStats.xp);
      if (!tutorialShown) {
        tutorialShown = true;
        self.showTutorial();
      }
    });

    self.network.on('player_joined', (data) => {
      if (data.id === self.myId) return;
      self.addOtherPlayer(data.id, data.player);
    });

    self.network.on('player_left', (data) => {
      self.removeOtherPlayer(data.id);
    });

    self.network.on('state_update', (data) => {
      if (!self.myId) return;
      self.updateOtherPlayers(data.players);
      self.updateMonsters(data.monsters);
      self.updateProjectiles(data.projectiles);
      if (data.groundItems) self.updateGroundItems(data.groundItems);
      const me = data.players && data.players.find(p => p.id === self.myId);
      if (me) {
        self.myStats.hp = me.hp;
        self.myStats.maxHp = me.maxHp;
        self.myStats.mp = me.mp;
        self.myStats.maxMp = me.maxMp;
        self.myStats.level = me.level;
        self.myStats.xp = me.xp;
        self.updateHUD();
        self.updateXPBar(me.xp);
      }
    });

    self.network.on('zone_changed', (data) => {
      self.currentZone = data.zone;
      self.mapData = data.map;
      self.renderMap();
      self.clearMonsters();
      self.clearProjectiles();
      self.clearGroundItems();
      self.targetMonster = null;
      self.zoneLabel = data.zoneDef?.name || data.zone;
      if (self.zoneText) self.zoneText.setText(self.zoneLabel);
    });

    self.network.on('monster_list', (monsters) => {
      self.clearMonsters();
      if (monsters) {
        for (const m of monsters) self.addMonsterSprite(m);
      }
    });

    self.network.on('monster_died', (data) => {
      if (data.leveledUp) self.showLevelUp(data.newLevel);
      const ms = self.monsterSprites[data.monsterId];
      if (ms) {
        this.tweens.add({ targets: [ms.sprite, ms.hpBar, ms.nameText], alpha: 0, duration: 500, onComplete: () => {
          if (self.monsterSprites[data.monsterId]) {
            self.monsterSprites[data.monsterId].sprite.destroy();
            self.monsterSprites[data.monsterId].hpBar.destroy();
            if (self.monsterSprites[data.monsterId].nameText) self.monsterSprites[data.monsterId].nameText.destroy();
            delete self.monsterSprites[data.monsterId];
          }
        }});
      }
      self.showDamageNumber(data.x, data.y, '+' + data.xp + ' XP', '#ffcc00');
      if (self.hudXpBar) self.updateXPBar(data.xp || self.myStats.xp);
    });

    self.network.on('player_died', (data) => {
      if (data.id === self.myId) {
        self.dead = true;
        if (self.playerSprite) self.playerSprite.setAlpha(0.3);
        self.addChatMessage('System', 'You died! Press R to respawn.', '#ff4444');
      }
    });

    self.network.on('combat_event', (data) => {
      if (data.type === 'damage') {
        const color = data.targetType === 'player' ? '#ff4444' : '#ffffff';
        self.showDamageNumber(data.x, data.y, '-' + data.amount, color);
      } else if (data.type === 'heal') {
        self.showDamageNumber(data.x, data.y, '+' + data.amount, '#44ff44');
      }
      if (data.targetType === 'player' && data.targetId === self.myId) {
        self.updateHUD();
      }
    });

    self.network.on('item_spawned', (data) => {
      self.addGroundItemSprite(data);
    });

    self.network.on('item_removed', (data) => {
      const gs = self.groundItemSprites[data.itemId];
      if (gs) { gs.destroy(); delete self.groundItemSprites[data.itemId]; }
    });

    self.network.on('ground_items', (items) => {
      self.updateGroundItems(items);
    });

    self.network.on('inventory_update', (data) => {
      self.inventory = data.inventory || [];
      self.spells = data.spells || [];
      if (data.equipped) self.equipped = data.equipped;
      self.updateSpellBar();
      if (self.showingInventory) self.showInventory();
    });

    self.network.on('stat_update', (data) => {
      if (data.hp !== undefined) self.myStats.hp = data.hp;
      if (data.maxHp !== undefined) self.myStats.maxHp = data.maxHp;
      if (data.mp !== undefined) self.myStats.mp = data.mp;
      if (data.maxMp !== undefined) self.myStats.maxMp = data.maxMp;
      if (data.atk !== undefined) self.myStats.atk = data.atk;
      if (data.def !== undefined) self.myStats.def = data.def;
      self.updateHUD();
    });

    self.network.on('chat_message', (data) => {
      self.addChatMessage(data.name, data.text, data.color);
    });

    const waitInterval = setInterval(() => {
      if (self.network && self.network.connected) {
        clearInterval(waitInterval);
        self.network.emit('request_map');
      }
    }, 100);
  }

  renderMap() {
    this.tileSprites.forEach(s => s.destroy());
    this.tileSprites = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const tileType = this.mapData[y]?.[x] ?? 0;
        const texKey = TILE_TEXTURES[tileType] || 'tile_0';
        const sprite = this.add.image(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, texKey);
        this.tileSprites.push(sprite);
      }
    }
  }

  createPlayer() {
    const texKey = 'player_' + this.playerClass;
    const spawnX = 5 * TILE_SIZE + TILE_SIZE / 2;
    const spawnY = 7 * TILE_SIZE + TILE_SIZE / 2;
    this.playerSprite = this.add.image(spawnX, spawnY, texKey).setDepth(10);
  }

  createHUD() {
    this.hudContainer = this.add.container(0, 0).setDepth(50);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.6);
    g.fillRect(4, 4, 180, 72);
    this.hudContainer.add(g);

    const clsLabel = this.playerClass.charAt(0).toUpperCase() + this.playerClass.slice(1);
    this.nameLabel = this.add.text(10, 8, this.playerName + ' (' + clsLabel + ')', { fontSize: '12px', fontFamily: 'monospace', color: '#ffcc00' });
    this.hudContainer.add(this.nameLabel);

    this.hpBarBg = this.add.graphics();
    this.hpBarBg.fillStyle(0x333333); this.hpBarBg.fillRect(10, 24, 120, 10);
    this.hudContainer.add(this.hpBarBg);
    this.hpBar = this.add.graphics();
    this.hudContainer.add(this.hpBar);

    this.mpBarBg = this.add.graphics();
    this.mpBarBg.fillStyle(0x333333); this.mpBarBg.fillRect(10, 38, 120, 10);
    this.hudContainer.add(this.mpBarBg);
    this.mpBar = this.add.graphics();
    this.hudContainer.add(this.mpBar);

    this.xpBarBg = this.add.graphics();
    this.xpBarBg.fillStyle(0x333333); this.xpBarBg.fillRect(10, 52, 120, 8);
    this.hudContainer.add(this.xpBarBg);
    this.xpBar = this.add.graphics();
    this.hudContainer.add(this.xpBar);

    this.hpText = this.add.text(134, 24, '', { fontSize: '9px', fontFamily: 'monospace', color: '#ffffff' });
    this.hudContainer.add(this.hpText);
    this.mpText = this.add.text(134, 38, '', { fontSize: '9px', fontFamily: 'monospace', color: '#ffffff' });
    this.hudContainer.add(this.mpText);

    this.lvlText = this.add.text(10, 62, 'Lv.1', { fontSize: '9px', fontFamily: 'monospace', color: '#aaaaaa' });
    this.hudContainer.add(this.lvlText);

    this.atkDefText = this.add.text(60, 62, 'ATK:10 DEF:5', { fontSize: '9px', fontFamily: 'monospace', color: '#aaaaaa' });
    this.hudContainer.add(this.atkDefText);

    this.zoneText = this.add.text(320, 4, 'Meadow', { fontSize: '12px', fontFamily: 'monospace', color: '#88ccff', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5, 0).setDepth(50);
    this.spellBarContainer = this.add.container(0, 0).setDepth(50);

    this.targetInfo = this.add.text(320, 460, '', { fontSize: '10px', fontFamily: 'monospace', color: '#ffffff', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5).setDepth(50);

    this.updateHUD();
  }

  updateHUD() {
    if (!this.hpBar) return;
    const hpW = 120 * (this.myStats.hp / this.myStats.maxHp);
    this.hpBar.clear();
    this.hpBar.fillStyle(0xcc3333); this.hpBar.fillRect(10, 24, Math.max(0, hpW), 10);
    this.hpText.setText(this.myStats.hp + '/' + this.myStats.maxHp);

    const mpW = 120 * (this.myStats.mp / this.myStats.maxMp);
    this.mpBar.clear();
    this.mpBar.fillStyle(0x3333cc); this.mpBar.fillRect(10, 38, Math.max(0, mpW), 10);
    this.mpText.setText(this.myStats.mp + '/' + this.myStats.maxMp);

    this.lvlText.setText('Lv.' + this.myStats.level);
    this.atkDefText.setText('ATK:' + this.myStats.atk + ' DEF:' + this.myStats.def);
  }

  updateXPBar(xp) {
    if (!this.xpBar || !this.myStats) return;
    const needed = Math.floor(100 * Math.pow(1.3, this.myStats.level - 1));
    const current = xp || 0;
    const w = 120 * Math.min(1, current / needed);
    this.xpBar.clear();
    this.xpBar.fillStyle(0x44cc44); this.xpBar.fillRect(10, 52, Math.max(0, w), 8);
  }

  createSpellBar() {
    this.spellBarContainer.removeAll(true);
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRect(60, 400, 520, 56);
    this.spellBarContainer.add(bg);

    this.spellSlots = [];
    for (let i = 0; i < 5; i++) {
      const slotBg = this.add.graphics();
      slotBg.fillStyle(0x333333); slotBg.fillRect(70 + i * 102, 406, 96, 44);
      slotBg.lineStyle(1, 0x666666); slotBg.strokeRect(70 + i * 102, 406, 96, 44);
      this.spellBarContainer.add(slotBg);

      const keyText = this.add.text(74 + i * 102, 408, (i + 1) + '.', { fontSize: '10px', fontFamily: 'monospace', color: '#888888' });
      this.spellBarContainer.add(keyText);

      const spellName = this.add.text(90 + i * 102, 408, '', { fontSize: '11px', fontFamily: 'monospace', color: '#ffffff' });
      this.spellBarContainer.add(spellName);

      const spellCost = this.add.text(90 + i * 102, 422, '', { fontSize: '9px', fontFamily: 'monospace', color: '#8888ff' });
      this.spellBarContainer.add(spellCost);

      const highlight = this.add.graphics();
      this.spellBarContainer.add(highlight);

      this.spellSlots.push({ bg: slotBg, name: spellName, cost: spellCost, highlight, key: null });
    }
    this.updateSpellBar();
  }

  updateSpellBar() {
    if (!this.spellSlots) return;
    for (let i = 0; i < 5; i++) {
      const slot = this.spellSlots[i];
      const spellKey = this.spells[i];
      if (spellKey) {
        const names = { magic_bolt: 'Bolt', heal: 'Heal', fireball: 'Fire', ice_shard: 'Ice', stone_wall: 'Wall', gale: 'Gale', flame_wave: 'FlameW', summon_wolf: 'Wolf', teleport: 'TP', meteor: 'Meteor', frost_nova: 'Nova', poison_cloud: 'Poison' };
        slot.name.setText(names[spellKey] || spellKey);
        slot.cost.setText('MP:5');
        slot.key = spellKey;
      } else {
        slot.name.setText('--');
        slot.cost.setText('');
        slot.key = null;
      }
      slot.highlight.clear();
      if (slot.key === this.selectedSpell) {
        slot.highlight.lineStyle(2, 0xffcc00);
        slot.highlight.strokeRect(70 + i * 102, 406, 96, 44);
      }
    }
  }

  selectSpell(idx) {
    if (idx >= 0 && idx < this.spells.length) {
      this.selectedSpell = this.selectedSpell === this.spells[idx] ? null : this.spells[idx];
      this.updateSpellBar();
      if (this.selectedSpell) {
        this.addChatMessage('System', 'Selected: ' + this.selectedSpell + ' - Click to cast!', '#88ccff');
      }
    }
  }

  addOtherPlayer(id, playerData) {
    if (this.otherPlayers[id]) return;
    const texKey = 'player_' + (playerData.class || 'mage');
    const sprite = this.add.image(playerData.x, playerData.y, texKey).setDepth(10);
    const nameText = this.add.text(0, -20, playerData.name, { fontSize: '10px', fontFamily: 'monospace', color: '#ffffff', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5);
    const hpBar = this.add.graphics();
    this.otherPlayers[id] = { sprite, nameText, hpBar };
  }

  removeOtherPlayer(id) {
    const p = this.otherPlayers[id];
    if (p) { p.sprite.destroy(); p.nameText.destroy(); p.hpBar.destroy(); delete this.otherPlayers[id]; }
  }

  updateOtherPlayers(players) {
    if (!players) return;
    for (const pData of players) {
      if (pData.id === this.myId) {
        if (this.playerSprite) {
          this.playerSprite.setPosition(pData.x, pData.y);
        }
        continue;
      }
      let pObj = this.otherPlayers[pData.id];
      if (!pObj && pData.id) {
        this.addOtherPlayer(pData.id, pData);
        pObj = this.otherPlayers[pData.id];
      }
      if (pObj) {
        pObj.sprite.setPosition(pData.x, pData.y);
        pObj.nameText.setPosition(pData.x, pData.y - 20);
        pObj.sprite.setAlpha(pData.alive ? 1 : 0.3);
        pObj.hpBar.clear();
        if (pData.hp < pData.maxHp) {
          const bw = 20;
          pObj.hpBar.fillStyle(0x000000, 0.6);
          pObj.hpBar.fillRect(pData.x - bw/2, pData.y - 24, bw, 3);
          pObj.hpBar.fillStyle(0xcc3333);
          pObj.hpBar.fillRect(pData.x - bw/2, pData.y - 24, bw * (pData.hp / pData.maxHp), 3);
        }
        pObj.hpBar.setDepth(11);
      }
    }
  }

  addMonsterSprite(m) {
    if (!m || !m.id || this.monsterSprites[m.id]) return;
    const g = this.add.graphics();
    const col = m.color || 0xff0000;
    g.fillStyle(col);
    if (m.boss) {
      g.fillCircle(0, 0, 14);
      g.fillStyle(0xffcc00);
      g.lineStyle(2, 0xffcc00);
      g.strokeCircle(0, 0, 16);
    } else if (m.key === 'sprite' || m.key === 'bat' || m.key === 'phantom') {
      g.fillTriangle(-8, 8, 8, 8, 0, -8);
    } else {
      g.fillCircle(0, 0, 8);
    }
    g.setPosition(m.x, m.y).setDepth(8);

    const hpBar = this.add.graphics().setDepth(9);

    const nameText = m.boss ? this.add.text(m.x, m.y - 20, m.name, { fontSize: '10px', fontFamily: 'monospace', color: '#ffcc00', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5).setDepth(9) : null;

    const clickZone = this.add.zone(m.x, m.y, m.boss ? 40 : 24, m.boss ? 40 : 24).setInteractive().setDepth(8);
    const mid = m.id;
    clickZone.on('pointerdown', () => {
      this.targetMonster = mid;
      this.selectedSpell = null;
      this.updateSpellBar();
    });

    this.monsterSprites[m.id] = { sprite: g, hpBar, nameText, clickZone, boss: m.boss || false, maxHp: m.maxHp };
    this.updateMonsterHP(m.id, m.hp, m.maxHp);
  }

  updateMonsters(monsters) {
    if (!monsters) return;
    const aliveIds = new Set();
    for (const m of monsters) {
      aliveIds.add(m.id);
      let ms = this.monsterSprites[m.id];
      if (!ms) {
        this.addMonsterSprite(m);
        ms = this.monsterSprites[m.id];
      }
      if (ms) {
        ms.sprite.setPosition(m.x, m.y);
        ms.sprite.setAlpha(m.alive ? 1 : 0);
        if (ms.nameText) ms.nameText.setPosition(m.x, m.y - 20);
        if (ms.clickZone) ms.clickZone.setPosition(m.x, m.y);
        if (!m.alive) {
          if (ms.nameText) ms.nameText.setAlpha(0);
          continue;
        }
        this.updateMonsterHP(m.id, m.hp, m.maxHp, m.boss || false);
        if (this.targetMonster === m.id) {
          const pct = Math.floor((m.hp / m.maxHp) * 100);
          this.targetInfo.setText(m.name + ' - HP: ' + m.hp + '/' + m.maxHp + ' (' + pct + '%)');
        }
      }
    }
    for (const id in this.monsterSprites) {
      if (!aliveIds.has(parseInt(id))) {
        this.monsterSprites[id].sprite.destroy();
        this.monsterSprites[id].hpBar.destroy();
        if (this.monsterSprites[id].nameText) this.monsterSprites[id].nameText.destroy();
        if (this.monsterSprites[id].clickZone) this.monsterSprites[id].clickZone.destroy();
        delete this.monsterSprites[id];
      }
    }
    if (!aliveIds.has(this.targetMonster)) {
      this.targetMonster = null;
      this.targetInfo.setText('');
    }
  }

  updateMonsterHP(id, hp, maxHp) {
    const ms = this.monsterSprites[id];
    if (!ms) return;
    ms.hpBar.clear();
    const m = { hp, maxHp };
    const bw = ms.boss ? 36 : 20;
    const x = ms.sprite.x;
    const y = ms.sprite.y - (ms.boss ? 26 : 14);
    ms.hpBar.fillStyle(0x000000, 0.6);
    ms.hpBar.fillRect(x - bw/2, y, bw, 3);
    ms.hpBar.fillStyle(ms.boss ? 0xffcc00 : 0xcc3333);
    ms.hpBar.fillRect(x - bw/2, y, bw * (hp / maxHp), 3);
  }

  clearMonsters() {
    for (const id in this.monsterSprites) {
      this.monsterSprites[id].sprite.destroy();
      this.monsterSprites[id].hpBar.destroy();
      if (this.monsterSprites[id].nameText) this.monsterSprites[id].nameText.destroy();
      if (this.monsterSprites[id].clickZone) this.monsterSprites[id].clickZone.destroy();
    }
    this.monsterSprites = {};
    this.targetMonster = null;
    if (this.targetInfo) this.targetInfo.setText('');
  }

  updateProjectiles(projectiles) {
    if (!projectiles) return;
    const activeIds = new Set();
    for (const p of projectiles) {
      activeIds.add(p.id);
      let ps = this.projectileSprites[p.id];
      if (!ps) {
        const g = this.add.graphics().setDepth(12);
        const col = p.color || 0xffffff;
        g.fillStyle(col);
        if (p.spellKey === 'fireball') {
          g.fillCircle(0, 0, 6);
          g.fillStyle(0xffff00); g.fillCircle(-2, -2, 2);
        } else if (p.spellKey === 'meteor') {
          g.fillCircle(0, 0, 8);
          g.fillStyle(0xff6600); g.fillCircle(2, 2, 4);
        } else {
          g.fillCircle(0, 0, 4);
        }
        ps = { sprite: g };
        this.projectileSprites[p.id] = ps;
      }
      ps.sprite.setPosition(p.x, p.y);
    }
    for (const id in this.projectileSprites) {
      if (!activeIds.has(parseInt(id))) {
        this.projectileSprites[id].sprite.destroy();
        delete this.projectileSprites[id];
      }
    }
  }

  clearProjectiles() {
    for (const id in this.projectileSprites) {
      this.projectileSprites[id].sprite.destroy();
    }
    this.projectileSprites = {};
  }

  addGroundItemSprite(item) {
    if (this.groundItemSprites[item.id]) return;
    const g = this.add.graphics().setDepth(5);
    const gems = { health_pot: 0xff4444, mana_pot: 0x4444ff, starter_robe: 0x886644, wooden_staff: 0x886644, starter_ring: 0xffcc00, forest_staff: 0x44aa44, leaf_cloak: 0x44aa66, vine_ring: 0x44aa44, crystal_staff: 0xaa66ff, crystal_robe: 0x8866cc, crystal_ring: 0xaa66ff, ancient_staff: 0xff8800, ancient_robe: 0xcc6600, soul_ring: 0xff4444, legendary_staff: 0xffcc00, legendary_robe: 0xffcc88, boss_ring: 0xffaa00 };
    const col = item.name && item.name.includes('Potion') ? (item.name.includes('Health') ? 0xff4444 : 0x4444ff) : 0xffcc00;
    g.fillStyle(col);
    g.fillCircle(0, 0, 4);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(-1, -1, 2);
    g.setPosition(item.x, item.y);

    const clickZone = this.add.zone(item.x, item.y, 16, 16).setInteractive().setDepth(5);
    const iid = item.id;
    clickZone.on('pointerdown', () => {
      this.network.emit('pickup_item', { itemId: iid });
    });

    const pulse = this.tweens.add({
      targets: g,
      alpha: { from: 0.6, to: 1 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    this.groundItemSprites[item.id] = { sprite: g, zone: clickZone, pulse };
  }

  updateGroundItems(items) {
    if (!items) return;
    const activeIds = new Set();
    for (const item of items) {
      activeIds.add(item.id);
      if (!this.groundItemSprites[item.id]) {
        this.addGroundItemSprite(item);
      }
    }
    for (const id in this.groundItemSprites) {
      if (!activeIds.has(parseInt(id))) {
        this.groundItemSprites[id].sprite.destroy();
        this.groundItemSprites[id].zone.destroy();
        if (this.groundItemSprites[id].pulse) this.groundItemSprites[id].pulse.stop();
        delete this.groundItemSprites[id];
      }
    }
  }

  clearGroundItems() {
    for (const id in this.groundItemSprites) {
      this.groundItemSprites[id].sprite.destroy();
      this.groundItemSprites[id].zone.destroy();
      if (this.groundItemSprites[id].pulse) this.groundItemSprites[id].pulse.stop();
    }
    this.groundItemSprites = {};
  }

  showDamageNumber(x, y, text, color) {
    const t = this.add.text(x, y - 10, text, { fontSize: '12px', fontFamily: 'monospace', color: color || '#ffffff', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5).setDepth(100);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 800, onComplete: () => t.destroy() });
  }

  showLevelUp(level) {
    this.addChatMessage('System', 'LEVEL UP! You are now level ' + level + '!', '#ffcc00');
    const t = this.add.text(320, 200, 'LEVEL UP!\nLevel ' + level, { fontSize: '24px', fontFamily: 'monospace', color: '#ffcc00', stroke: '#000000', strokeThickness: 4, align: 'center' }).setOrigin(0.5).setDepth(200);
    this.tweens.add({ targets: t, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 2000, onComplete: () => t.destroy() });
  }

  respawn() {
    if (this.dead) {
      this.dead = false;
      this.network.emit('respawn');
      if (this.playerSprite) this.playerSprite.setAlpha(1);
    }
  }

  toggleInventory() {
    this.showingInventory = !this.showingInventory;
    if (this.showingInventory) this.showInventory();
    else this.hideInventory();
  }

  showInventory() {
    this.hideInventory();
    const g = this.add.graphics().setDepth(150);
    g.fillStyle(0x000000, 0.85);
    g.fillRect(120, 40, 400, 320);
    g.lineStyle(2, 0xffcc00);
    g.strokeRect(120, 40, 400, 320);
    this.inventoryElements.push(g);

    const title = this.add.text(320, 48, 'INVENTORY', { fontSize: '14px', fontFamily: 'monospace', color: '#ffcc00' }).setOrigin(0.5).setDepth(150);
    this.inventoryElements.push(title);

    const equipTitle = this.add.text(200, 64, 'Equipment:', { fontSize: '11px', fontFamily: 'monospace', color: '#8888ff' }).setDepth(150);
    this.inventoryElements.push(equipTitle);

    const slots = ['weapon', 'armor', 'accessory'];
    const slotLabels = ['Weapon:', 'Armor:', 'Acc:'];
    for (let i = 0; i < 3; i++) {
      const label = this.add.text(160, 80 + i * 18, slotLabels[i], { fontSize: '10px', fontFamily: 'monospace', color: '#cccccc' }).setDepth(150);
      this.inventoryElements.push(label);
      const eq = this.equipped[slots[i]];
      const val = eq || '(empty)';
      const eText = this.add.text(220, 80 + i * 18, val, { fontSize: '10px', fontFamily: 'monospace', color: '#ffffff' }).setDepth(150);
      this.inventoryElements.push(eText);
    }

    const invTitle = this.add.text(200, 140, 'Items (' + this.inventory.length + '):', { fontSize: '11px', fontFamily: 'monospace', color: '#88ff88' }).setDepth(150);
    this.inventoryElements.push(invTitle);

    const itemsPerRow = 4;
    for (let i = 0; i < this.inventory.length; i++) {
      const itemKey = this.inventory[i];
      const col = i % itemsPerRow;
      const row = Math.floor(i / itemsPerRow);
      const ix = 140 + col * 90;
      const iy = 158 + row * 36;

      const bg = this.add.graphics().setDepth(150);
      bg.fillStyle(0x444444); bg.fillRect(ix, iy, 80, 28);
      bg.lineStyle(1, 0x666666); bg.strokeRect(ix, iy, 80, 28);
      this.inventoryElements.push(bg);

      const iText = this.add.text(ix + 4, iy + 2, itemKey, { fontSize: '9px', fontFamily: 'monospace', color: '#ffffff' }).setDepth(150);
      this.inventoryElements.push(iText);

      const useBg = this.add.graphics().setDepth(151);
      useBg.fillStyle(0x335533); useBg.fillRect(ix + 2, iy + 16, 36, 10);
      useBg.setInteractive(new Phaser.Geom.Rectangle(ix + 2, iy + 16, 36, 10), Phaser.Geom.Rectangle.Contains);
      const iid = i;
      useBg.on('pointerdown', () => { this.network.emit('use_item', { itemKey: this.inventory[iid] }); this.showInventory(); });
      this.inventoryElements.push(useBg);

      const useText = this.add.text(ix + 20, iy + 17, 'Use', { fontSize: '8px', fontFamily: 'monospace', color: '#88ff88' }).setOrigin(0.5).setDepth(152);
      this.inventoryElements.push(useText);

      const eqBg = this.add.graphics().setDepth(151);
      eqBg.fillStyle(0x333355); eqBg.fillRect(ix + 42, iy + 16, 36, 10);
      eqBg.setInteractive(new Phaser.Geom.Rectangle(ix + 42, iy + 16, 36, 10), Phaser.Geom.Rectangle.Contains);
      const iid2 = i;
      eqBg.on('pointerdown', () => { this.network.emit('equip_item', { itemKey: this.inventory[iid2] }); this.showInventory(); });
      this.inventoryElements.push(eqBg);

      const eqText = this.add.text(ix + 60, iy + 17, 'Equip', { fontSize: '8px', fontFamily: 'monospace', color: '#8888ff' }).setOrigin(0.5).setDepth(152);
      this.inventoryElements.push(eqText);
    }
  }

  hideInventory() {
    this.inventoryElements.forEach(e => e.destroy());
    this.inventoryElements = [];
  }

  showChatInput() {
    this.chatInputBg = this.add.graphics().setDepth(200);
    this.chatInputBg.fillStyle(0x000000, 0.8);
    this.chatInputBg.fillRect(4, 440, 632, 36);
    this.chatInputText = this.add.text(10, 446, '> ' + this.chatInput + '_', { fontSize: '14px', fontFamily: 'monospace', color: '#ffffff' }).setDepth(200);
  }

  hideChatInput() {
    if (this.chatInputBg) this.chatInputBg.destroy();
    if (this.chatInputText) this.chatInputText.destroy();
    this.chatInputBg = null;
    this.chatInputText = null;
  }

  updateChatInput() {
    if (this.chatInputText) {
      this.chatInputText.setText('> ' + this.chatInput + '_');
    }
  }

  addChatMessage(name, text, color) {
    const maxMsg = 8;
    const msg = name + ': ' + text;
    this.chatMessages.push(msg);
    if (this.chatMessages.length > maxMsg) this.chatMessages.shift();
    this.renderChatHistory();
  }

  renderChatHistory() {
    this.chatTexts.forEach(t => t.destroy());
    this.chatTexts = [];
    const startY = 400;
    for (let i = 0; i < this.chatMessages.length; i++) {
      const t = this.add.text(10, startY + i * 16, this.chatMessages[i], { fontSize: '12px', fontFamily: 'monospace', color: '#cccccc', stroke: '#000000', strokeThickness: 2 }).setDepth(150);
      this.chatTexts.push(t);
    }
  }

  update(time, delta) {
    if (!this.playerSprite || this.isChatting || this.showingInventory) return;

    if (this.dead) return;

    let dx = 0;
    let dy = 0;
    let direction = 'down';

    if (this.keys.A.isDown || this.keys.LEFT.isDown) { dx = -1; direction = 'left'; }
    else if (this.keys.D.isDown || this.keys.RIGHT.isDown) { dx = 1; direction = 'right'; }

    if (this.keys.W.isDown || this.keys.UP.isDown) { dy = -1; direction = 'up'; }
    else if (this.keys.S.isDown || this.keys.DOWN.isDown) { dy = 1; direction = 'down'; }

    const moving = dx !== 0 || dy !== 0;

    if (moving) {
      if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

      const dt = delta / 1000;
      let newX = this.playerSprite.x + dx * SPEED * dt;
      let newY = this.playerSprite.y + dy * SPEED * dt;

      const margin = 16;
      newX = Phaser.Math.Clamp(newX, margin, COLS * TILE_SIZE - margin);
      newY = Phaser.Math.Clamp(newY, margin, ROWS * TILE_SIZE - margin);

      const tileX = Math.floor(newX / TILE_SIZE);
      const tileY = Math.floor(newY / TILE_SIZE);

      if (this.mapData && this.mapData[tileY] && this.mapData[tileY][tileX] !== undefined) {
        const tile = this.mapData[tileY][tileX];
        if (tile === 0 || tile === 4 || tile === 5 || tile === 6 || tile === 7 || tile === 8) {
          this.playerSprite.x = newX;
          this.playerSprite.y = newY;
        }
      }
    }

    if (time - this.lastMoveSent > MOVE_THROTTLE && this.network) {
      this.network.emit('move', {
        x: Math.round(this.playerSprite.x),
        y: Math.round(this.playerSprite.y),
        direction: direction,
        moving: moving,
        zone: this.currentZone,
      });
      this.lastMoveSent = time;
    }

    if (this.targetMonster && this.monsterSprites[this.targetMonster]) {
      const ms = this.monsterSprites[this.targetMonster];
      if (ms.nameText) {
        this.targetInfo.setPosition(ms.sprite.x, ms.sprite.y + 24);
      }
    }
  }

  showTutorial() {
    this.sendChatMessage('System', 'WASD/Arrows to move  |  Walk to zone edges to explore new areas', '#88ccff');
    this.sendChatMessage('System', 'Press 1-5 to select a spell, then click to cast', '#88ccff');
    this.sendChatMessage('System', 'Click monsters to target them  |  Click items to pick up', '#88ccff');
    this.sendChatMessage('System', 'Press I for inventory (Use/Equip)  |  Press H for help', '#88ccff');
    this.sendChatMessage('System', 'Enter to chat  |  R to respawn if you die', '#88ccff');
    this.sendChatMessage('System', 'Explore all 5 zones and defeat the Aether Lord in the Tower!', '#ffcc00');
  }

  toggleHelp() {
    if (this.showingHelp) this.hideHelp();
    else this.showHelp();
  }

  showHelp() {
    this.showingHelp = true;
    const g = this.add.graphics().setDepth(300);
    g.fillStyle(0x000000, 0.9);
    g.fillRect(40, 20, 560, 440);
    g.lineStyle(2, 0xffcc00);
    g.strokeRect(40, 20, 560, 440);
    this.helpElements.push(g);

    const lines = [
      { text: '=== CONTROLS ===', color: '#ffcc00', size: '14px' },
      { text: 'WASD / Arrow Keys  -  Move', color: '#ffffff', size: '12px' },
      { text: '1 - 5  -  Select spell slot', color: '#ffffff', size: '12px' },
      { text: 'Click  -  Cast selected spell at mouse', color: '#ffffff', size: '12px' },
      { text: 'Click monster  -  Target it', color: '#ffffff', size: '12px' },
      { text: 'Click item on ground  -  Pick it up', color: '#ffffff', size: '12px' },
      { text: 'I  -  Toggle inventory (Use/Equip items)', color: '#ffffff', size: '12px' },
      { text: 'Enter  -  Chat', color: '#ffffff', size: '12px' },
      { text: 'R  -  Respawn (when dead)', color: '#ffffff', size: '12px' },
      { text: 'H / Escape  -  Close this help', color: '#ffffff', size: '12px' },
      { text: '', color: '#ffffff', size: '12px' },
      { text: '=== GAMEPLAY ===', color: '#ffcc00', size: '14px' },
      { text: 'Kill monsters to earn XP and level up', color: '#aaaaaa', size: '12px' },
      { text: 'Collect loot from monster kills', color: '#aaaaaa', size: '12px' },
      { text: 'Equip weapons/armor/accessories to grow stronger', color: '#aaaaaa', size: '12px' },
      { text: 'Use potions to restore HP/MP', color: '#aaaaaa', size: '12px' },
      { text: 'Explore 5 zones: Meadow -> Forest -> Caves -> Ruins -> Tower', color: '#aaaaaa', size: '12px' },
      { text: 'Defeat the Aether Lord boss in the Tower!', color: '#ffcc00', size: '12px' },
      { text: '', color: '#ffffff', size: '12px' },
      { text: 'This is a solo adventure. Multiplayer is optional!', color: '#88ccff', size: '12px' },
    ];

    const startY = 40;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const t = this.add.text(320, startY + 20 + i * 20, l.text, {
        fontSize: l.size,
        fontFamily: 'monospace',
        color: l.color,
      }).setOrigin(0.5, 0).setDepth(301);
      this.helpElements.push(t);
    }
  }

  hideHelp() {
    this.showingHelp = false;
    this.helpElements.forEach(e => e.destroy());
    this.helpElements = [];
  }

  sendChatMessage(name, text, color) {
    this.addChatMessage(name, text, color);
  }
}
