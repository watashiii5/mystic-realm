const TILE_SIZE = 32;
const COLS = 20;
const ROWS = 15;
const SPEED = 160;
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
    this.progressMonstersKilled = 0;
    this.zonesVisited = { meadow: true };
    this.chatPool = [];
    this.questShown = false;
    this.levelUpText = null;
    this.levelUpTimer = 0;
    this.facingDir = 'down';
    this.walkBob = 0;
    this.walkCycle = 0;
    this.displayHp = 100;
    this.displayMp = 50;
    this.displayXp = 0;
    this.chatBg = null;
    this.chatAnims = [];
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
        } else if (event.key === 'Escape') {
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
      if (this.selectedSpell) {
        this.network.emit('cast_spell', {
          spell: this.selectedSpell,
          toX: Math.round(pointer.x),
          toY: Math.round(pointer.y),
        });
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

    self.network.on('su', (data) => {
      if (!self.myId) return;
      self.updateOtherPlayers(data.p);
      self.updateMonsters(data.m);
      self.updateProjectiles(data.pr);
      if (data.gi) self.updateGroundItems(data.gi);
      const me = data.p && data.p.find(p => p.id === self.myId);
      if (me) {
        self.myStats.hp = me.h;
        self.myStats.maxHp = me.mh;
        self.myStats.mp = me.m;
        self.myStats.maxMp = me.mm;
        self.myStats.level = me.l;
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
      if (data.zoneDef?.lore) self.showZoneLore(data.zoneDef.name || data.zone, data.zoneDef.lore, data.zoneDef.color || '#88ccff');
    });

    self.network.on('monster_list', (monsters) => {
      self.clearMonsters();
      if (monsters) for (const m of monsters) self.addMonsterSprite(m);
    });

    self.network.on('monster_died', (data) => {
      if (data.lv) self.showLevelUp(data.nl);
      const ms = self.monsterSprites[data.mid];
      if (ms) {
        for (let i = 0; i < 5; i++) {
          const px = data.x + (Math.random() - 0.5) * 20;
          const py = data.y + (Math.random() - 0.5) * 20;
          const colors = ['#ff4444', '#ff8844', '#ffff44', '#ffcc00', '#ffffff'];
          const pt = self.add.text(px, py, ['*', '.', 'o', '+', '!'][Math.random() * 5 | 0], { fontSize: '10px', fontFamily: 'monospace', color: colors[Math.random() * colors.length | 0] }).setOrigin(0.5).setDepth(100);
          self.tweens.add({ targets: pt, x: px + (Math.random() - 0.5) * 30, y: py - 20 - Math.random() * 20, alpha: 0, duration: 500 + Math.random() * 300, onComplete: () => pt.destroy() });
        }
        self.tweens.add({ targets: [ms.sprite, ms.hpBar, ms.nameText], alpha: 0, duration: 400, onComplete: () => {
          if (self.monsterSprites[data.mid]) {
            self.monsterSprites[data.mid].sprite.destroy();
            self.monsterSprites[data.mid].hpBar.destroy();
            if (self.monsterSprites[data.mid].nameText) self.monsterSprites[data.mid].nameText.destroy();
            delete self.monsterSprites[data.mid];
          }
        }});
      }
      self.showDamageNumber(data.x, data.y, '+' + data.xp + ' XP', '#ffcc00');
      if (self.xpBar) self.updateXPBar(data.xpe || self.myStats.xp);
      self.progressMonstersKilled = data.mk || 0;
      if (self.progressText) self.updateProgressText();
    });

    self.network.on('player_died', (data) => {
      if (data.id === self.myId) {
        self.dead = true;
        if (self.playerSprite) {
          self.playerSprite.setAlpha(0.3);
          for (let i = 0; i < 6; i++) {
            const px = self.playerSprite.x + (Math.random() - 0.5) * 20;
            const py = self.playerSprite.y + (Math.random() - 0.5) * 20;
            const pt = self.add.text(px, py, ['*', 'x', '+', '!'][Math.random() * 4 | 0], { fontSize: '12px', fontFamily: 'monospace', color: '#ff4444' }).setOrigin(0.5).setDepth(100);
            self.tweens.add({ targets: pt, x: px + (Math.random() - 0.5) * 40, y: py - 30 - Math.random() * 20, alpha: 0, duration: 800, onComplete: () => pt.destroy() });
          }
        }
        self.cameras.main.shake(200, 0.008);
        self.addChatMessage('System', 'You died! Press R to respawn.', '#ff4444');
      }
    });

    self.network.on('combat_event', (data) => {
      if (data.t === 'damage') {
        const color = data.ty === 'player' ? '#ff4444' : '#ffffff';
        self.showDamageNumber(data.x, data.y, '-' + data.a, color);
        if (data.ty === 'player' && data.ti === self.myId) {
          self.cameras.main.shake(100, 0.005);
          if (self.playerSprite) {
            self.playerSprite.setTint(0xff4444);
            self.time.delayedCall(150, () => { if (self.playerSprite && !self.dead) self.playerSprite.clearTint(); });
          }
        }
        if (data.ty === 'monster' && self.monsterSprites[data.ti]) {
          const ms = self.monsterSprites[data.ti];
          ms.sprite.setTint(0xffffff);
          self.time.delayedCall(80, () => { if (ms && ms.sprite) ms.sprite.clearTint(); });
          for (let i = 0; i < 3; i++) {
            const px = data.x + (Math.random() - 0.5) * 16;
            const py = data.y + (Math.random() - 0.5) * 16;
            const pt = self.add.text(px, py, '*', { fontSize: '8px', fontFamily: 'monospace', color: '#ffff88' }).setOrigin(0.5).setDepth(100);
            self.tweens.add({ targets: pt, y: py - 20, alpha: 0, duration: 400, onComplete: () => pt.destroy() });
          }
        }
      } else if (data.t === 'heal') {
        self.showDamageNumber(data.x, data.y, '+' + data.a, '#44ff44');
        if (self.playerSprite) {
          self.playerSprite.setTint(0x44ff44);
          self.time.delayedCall(200, () => { if (self.playerSprite && !self.dead) self.playerSprite.clearTint(); });
        }
      }
      if (data.ty === 'player' && data.ti === self.myId) self.updateHUD();
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
      if (data.mh !== undefined) self.myStats.maxHp = data.mh;
      if (data.mp !== undefined) self.myStats.mp = data.mp;
      if (data.mm !== undefined) self.myStats.maxMp = data.mm;
      if (data.atk !== undefined) self.myStats.atk = data.atk;
      if (data.def !== undefined) self.myStats.def = data.def;
      self.updateHUD();
    });

    self.network.on('progress_update', (data) => {
      if (data.zonesVisited) self.zonesVisited = data.zonesVisited;
      if (data.monstersKilled !== undefined) self.progressMonstersKilled = data.monstersKilled;
      if (self.progressText) self.updateProgressText();
    });

    self.network.on('chat_message', (data) => {
      self.addChatMessage(data.n || data.name, data.t || data.text, data.c || data.color);
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
    this.facingDir = 'down';
    this.walkBob = 0;
    this.walkCycle = 0;
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

    this.targetInfo = this.add.text(320, 460, '', { fontSize: '10px', fontFamily: 'monospace', color: '#ffffff', stroke: '#000000', strokeThickness: 2, wordWrap: { width: 300 } }).setOrigin(0.5).setDepth(50);

    this.progressText = this.add.text(320, 16, '', { fontSize: '10px', fontFamily: 'monospace', color: '#aaaaaa', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5, 0).setDepth(50);
    this.updateProgressText();

    this.questText = this.add.text(480, 36, '', { fontSize: '9px', fontFamily: 'monospace', color: '#ffcc00', stroke: '#000000', strokeThickness: 1, lineSpacing: 2, wordWrap: { width: 150 } }).setDepth(50).setAlpha(0.8);

    this.zoneLoreText = null;
    this.zoneLoreTimer = 0;

    this.updateHUD();
  }

  updateHUD() {
    if (!this.hpBar) return;

    this.displayHp += (this.myStats.hp - this.displayHp) * 0.15;
    this.displayMp += (this.myStats.mp - this.displayMp) * 0.15;

    const hpW = 120 * Math.max(0, this.displayHp / this.myStats.maxHp);
    this.hpBar.clear();
    this.hpBar.fillStyle(0xcc3333); this.hpBar.fillRect(10, 24, Math.max(0, hpW), 10);
    if (hpW > 4) {
      this.hpBar.fillStyle(0xff5555); this.hpBar.fillRect(10, 24, Math.max(0, hpW - 2), 4);
    }
    this.hpText.setText(Math.ceil(this.displayHp) + '/' + this.myStats.maxHp);

    const mpW = 120 * Math.max(0, this.displayMp / this.myStats.maxMp);
    this.mpBar.clear();
    this.mpBar.fillStyle(0x3333cc); this.mpBar.fillRect(10, 38, Math.max(0, mpW), 10);
    if (mpW > 4) {
      this.mpBar.fillStyle(0x5555ff); this.mpBar.fillRect(10, 38, Math.max(0, mpW - 2), 4);
    }
    this.mpText.setText(Math.ceil(this.displayMp) + '/' + this.myStats.maxMp);

    this.lvlText.setText('Lv.' + this.myStats.level);
    this.atkDefText.setText('ATK:' + this.myStats.atk + ' DEF:' + this.myStats.def);
  }

  updateXPBar(xp) {
    if (!this.xpBar || !this.myStats) return;
    this.displayXp += ((xp || 0) - this.displayXp) * 0.1;
    const needed = Math.floor(100 * Math.pow(1.3, this.myStats.level - 1));
    const w = 120 * Math.min(1, Math.max(0, this.displayXp / needed));
    this.xpBar.clear();
    this.xpBar.fillStyle(0x44cc44); this.xpBar.fillRect(10, 52, Math.max(0, w), 8);
    if (w > 4) {
      this.xpBar.fillStyle(0x66ff66); this.xpBar.fillRect(10, 52, Math.max(0, w - 2), 3);
    }
  }

  createSpellBar() {
    this.spellBarContainer.removeAll(true);
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRect(60, 418, 520, 52);
    this.spellBarContainer.add(bg);

    this.spellSlots = [];
    for (let i = 0; i < 5; i++) {
      const slotBg = this.add.graphics();
      slotBg.fillStyle(0x333333); slotBg.fillRect(70 + i * 102, 424, 96, 40);
      slotBg.lineStyle(1, 0x666666); slotBg.strokeRect(70 + i * 102, 424, 96, 40);
      this.spellBarContainer.add(slotBg);

      const keyText = this.add.text(74 + i * 102, 426, (i + 1) + '.', { fontSize: '10px', fontFamily: 'monospace', color: '#888888' });
      this.spellBarContainer.add(keyText);

      const spellName = this.add.text(90 + i * 102, 426, '', { fontSize: '11px', fontFamily: 'monospace', color: '#ffffff' });
      this.spellBarContainer.add(spellName);

      const spellCost = this.add.text(90 + i * 102, 440, '', { fontSize: '9px', fontFamily: 'monospace', color: '#8888ff' });
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
        slot.highlight.strokeRect(70 + i * 102, 424, 96, 40);
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
    const texKey = 'player_' + (playerData.c || playerData.class || 'mage');
    const sprite = this.add.image(playerData.x, playerData.y, texKey).setDepth(10);
    const nameText = this.add.text(0, -20, playerData.n || playerData.name, { fontSize: '10px', fontFamily: 'monospace', color: '#ffffff', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5);
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
        pObj.sprite.setAlpha((pData.a !== undefined ? pData.a : pData.alive) ? 1 : 0.3);
        pObj.hpBar.clear();
        const ch = pData.h !== undefined ? pData.h : pData.hp;
        const cmh = pData.mh !== undefined ? pData.mh : pData.maxHp;
        if (ch < cmh) {
          const bw = 20;
          pObj.hpBar.fillStyle(0x000000, 0.6);
          pObj.hpBar.fillRect(pData.x - bw/2, pData.y - 24, bw, 3);
          pObj.hpBar.fillStyle(0xcc3333);
          pObj.hpBar.fillRect(pData.x - bw/2, pData.y - 24, bw * (ch / cmh), 3);
        }
        pObj.hpBar.setDepth(11);
      }
    }
  }

  addMonsterSprite(m) {
    if (!m || !m.id || this.monsterSprites[m.id]) return;
    const key = m.k || m.key;
    const name = m.n || m.name;
    const color = m.c !== undefined ? m.c : (m.color !== undefined ? m.color : 0xff0000);
    const boss = m.b !== undefined ? m.b : (m.boss || false);
    const hp = m.h !== undefined ? m.h : m.hp;
    const maxHp = m.mh !== undefined ? m.mh : m.maxHp;
    const g = this.add.graphics();
    this.drawMonsterShape(g, key, color, boss);
    g.setPosition(m.x, m.y).setDepth(8);

    const hpBar = this.add.graphics().setDepth(9);

    const nameText = boss ? this.add.text(m.x, m.y - 20, name, { fontSize: '10px', fontFamily: 'monospace', color: '#ffcc00', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5).setDepth(9) : null;

    const bSize = boss ? 40 : (key === 'treant' || key === 'golem' ? 32 : 24);
    const clickZone = this.add.zone(m.x, m.y, bSize, bSize).setInteractive().setDepth(8);
    const mid = m.id;
    clickZone.on('pointerdown', () => {
      this.targetMonster = mid;
      this.selectedSpell = null;
      this.updateSpellBar();
    });

    this.monsterSprites[m.id] = { sprite: g, hpBar, nameText, clickZone, boss, maxHp };
    this.updateMonsterHP(m.id, hp, maxHp);
  }

  drawMonsterShape(g, key, color, boss) {
    if (boss) {
      g.fillStyle(color); g.fillCircle(0, 0, 14);
      g.fillStyle(0xffcc00); g.lineStyle(2, 0xffcc00); g.strokeCircle(0, 0, 16);
      g.fillStyle(0xffcc00); g.fillRect(-4, -18, 8, 4); g.fillRect(-6, -16, 12, 3);
      return;
    }
    switch (key) {
      case 'slime':
        g.fillStyle(color); g.fillEllipse(0, 2, 14, 10);
        g.fillStyle(0x000000); g.fillCircle(-3, 0, 1.5); g.fillCircle(3, 0, 1.5);
        break;
      case 'rabbit':
        g.fillStyle(color); g.fillEllipse(0, 2, 10, 12);
        g.fillStyle(color); g.fillEllipse(-3, -8, 4, 8); g.fillEllipse(3, -8, 4, 8);
        g.fillStyle(0x000000); g.fillCircle(-2, 0, 1); g.fillCircle(2, 0, 1);
        break;
      case 'sprite':
        g.fillStyle(color, 0.7); g.fillCircle(0, 0, 8);
        g.fillStyle(0xffffff, 0.4); g.fillCircle(-2, -2, 3);
        g.lineStyle(1, color); g.lineBetween(-8, 0, 8, 0);
        g.lineBetween(0, -8, 0, 8);
        break;
      case 'wolf':
        g.fillStyle(color); g.fillTriangle(-8, 6, 8, 6, 0, -8);
        g.fillStyle(0x000000); g.fillCircle(-3, -2, 1.5); g.fillCircle(3, -2, 1.5);
        break;
      case 'treant':
        g.fillStyle(0x5a3a1a); g.fillRect(-3, 0, 6, 12);
        g.fillStyle(color); g.fillCircle(0, -4, 8);
        g.fillStyle(0x3a7a1a); g.fillRect(-8, -2, 3, 6); g.fillRect(5, -2, 3, 6);
        g.fillStyle(0x000000); g.fillCircle(-2, -6, 1); g.fillCircle(2, -6, 1);
        break;
      case 'spider':
        g.fillStyle(color); g.fillCircle(0, 0, 6);
        g.lineStyle(1, color); g.lineBetween(-2, -2, -8, -6); g.lineBetween(2, -2, 8, -6);
        g.lineBetween(-2, 2, -8, 6); g.lineBetween(2, 2, 8, 6);
        g.lineBetween(-2, 0, -7, 2); g.lineBetween(2, 0, 7, 2);
        g.fillStyle(0xff0000, 0.8); g.fillCircle(-2, -1, 1.5); g.fillCircle(2, -1, 1.5);
        break;
      case 'bat':
        g.fillStyle(color); g.fillTriangle(-8, 4, 8, 4, 0, -8);
        g.fillStyle(color); g.fillTriangle(-8, 4, -2, -2, -4, 6);
        g.fillStyle(color); g.fillTriangle(8, 4, 2, -2, 4, 6);
        g.fillStyle(0xff0000, 0.8); g.fillCircle(-1, -2, 1); g.fillCircle(1, -2, 1);
        break;
      case 'skeleton':
        g.fillStyle(color); g.fillRect(-2, -6, 4, 8);
        g.fillStyle(color); g.fillCircle(0, -8, 4);
        g.lineStyle(1.5, color); g.lineBetween(-4, -3, -8, 4); g.lineBetween(4, -3, 8, 4);
        g.lineBetween(-2, 2, -5, 8); g.lineBetween(2, 2, 5, 8);
        g.fillStyle(0x000000); g.fillCircle(-1.5, -9, 1); g.fillCircle(1.5, -9, 1);
        break;
      case 'crystal':
        g.fillStyle(color); g.fillTriangle(0, -8, -6, 4, 6, 4);
        g.fillStyle(color, 0.6); g.fillTriangle(0, -4, -3, 4, 3, 4);
        g.fillStyle(0xffffff, 0.4); g.fillRect(-1, -6, 2, 4);
        break;
      case 'golem':
        g.fillStyle(color); g.fillRect(-6, -4, 12, 12);
        g.fillStyle(color); g.fillRect(-8, 8, 3, 4); g.fillRect(5, 8, 3, 4);
        g.fillStyle(0x000000); g.fillCircle(-2, 0, 1.5); g.fillCircle(2, 0, 1.5);
        g.fillStyle(0x444422); g.fillRect(-3, 4, 6, 2);
        break;
      case 'phantom':
        g.fillStyle(color, 0.6); g.fillTriangle(-8, 6, 8, 6, 0, -10);
        g.fillStyle(color, 0.3); g.fillTriangle(-6, 8, 6, 8, 0, 0);
        g.fillStyle(0xffffff, 0.3); g.fillCircle(-2, -3, 2); g.fillCircle(2, -3, 2);
        break;
      case 'wraith':
        g.fillStyle(color); g.fillEllipse(0, 2, 12, 14);
        g.fillStyle(0x000000); g.fillCircle(-3, -1, 1.5); g.fillCircle(3, -1, 1.5);
        g.fillStyle(0xff0000, 0.5); g.fillCircle(-3, -1, 0.8); g.fillCircle(3, -1, 0.8);
        g.fillStyle(color, 0.3); g.fillTriangle(-8, 6, 8, 6, 0, 12);
        break;
      default:
        g.fillStyle(color); g.fillCircle(0, 0, 8);
        g.fillStyle(0x000000); g.fillCircle(-2, -1, 1.5); g.fillCircle(2, -1, 1.5);
    }
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
        const alive = m.a !== undefined ? m.a : m.alive;
        const hp = m.h !== undefined ? m.h : m.hp;
        const maxHp = m.mh !== undefined ? m.mh : m.maxHp;
        const name = m.n || m.name || '';
        const boss = m.b !== undefined ? m.b : (m.boss || false);
        ms.sprite.setPosition(m.x, m.y);
        ms.sprite.setAlpha(alive ? 1 : 0);
        if (ms.nameText) ms.nameText.setPosition(m.x, m.y - 20);
        if (ms.clickZone) ms.clickZone.setPosition(m.x, m.y);
        if (!alive) {
          if (ms.nameText) ms.nameText.setAlpha(0);
          continue;
        }
        this.updateMonsterHP(m.id, hp, maxHp);
        if (this.targetMonster === m.id) {
          const pct = Math.floor((hp / maxHp) * 100);
          this.targetInfo.setText(name + ' - HP: ' + hp + '/' + maxHp + ' (' + pct + '%)');
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
        const glow = this.add.graphics().setDepth(11);
        glow.fillStyle(col, 0.2);
        glow.fillCircle(0, 0, 12);
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
        ps = { sprite: g, glow };
        this.projectileSprites[p.id] = ps;
      }
      ps.sprite.setPosition(p.x, p.y);
      if (ps.glow) ps.glow.setPosition(p.x, p.y);
    }
    for (const id in this.projectileSprites) {
      if (!activeIds.has(parseInt(id))) {
        this.projectileSprites[id].sprite.destroy();
        if (this.projectileSprites[id].glow) this.projectileSprites[id].glow.destroy();
        delete this.projectileSprites[id];
      }
    }
  }

  clearProjectiles() {
    for (const id in this.projectileSprites) {
      this.projectileSprites[id].sprite.destroy();
      if (this.projectileSprites[id].glow) this.projectileSprites[id].glow.destroy();
    }
    this.projectileSprites = {};
  }

  addGroundItemSprite(item) {
    if (this.groundItemSprites[item.id]) return;
    const g = this.add.graphics().setDepth(5);
    const iname = (item.n || item.name || '').toLowerCase();
    let col = 0xffcc00;
    if (iname.includes('health') || item.k === 'health_pot') col = 0xff4444;
    else if (iname.includes('mana') || item.k === 'mana_pot') col = 0x4444ff;
    else if (iname.includes('forest')) col = 0x44aa44;
    else if (iname.includes('crystal')) col = 0xaa66ff;
    else if (iname.includes('ancient')) col = 0xff8800;
    else if (iname.includes('legendary') || iname.includes('aether')) col = 0xffcc00;
    else if (iname.includes('scroll')) col = 0x88ddff;
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
    for (let i = 0; i < this.damageTexts.length; i++) {
      const dt = this.damageTexts[i];
      if (dt.alpha <= 0 || dt.y < -50) {
        dt.setText(text); dt.setPosition(x, y - 10);
        dt.setStyle({ fontSize: '12px', fontFamily: 'monospace', color: color || '#ffffff', stroke: '#000000', strokeThickness: 3 });
        dt.setAlpha(1); dt.setScale(1);
        dt.targetY = y - 40;
        return;
      }
    }
    const t = this.add.text(x, y - 10, text, { fontSize: '12px', fontFamily: 'monospace', color: color || '#ffffff', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5).setDepth(100);
    t.targetY = y - 40;
    this.damageTexts.push(t);
  }

  showLevelUp(level) {
    this.addChatMessage('System', 'LEVEL UP! You are now level ' + level + '!', '#ffcc00');
    this.cameras.main.shake(300, 0.01);
    this.cameras.main.flash(500, 255, 255, 200);
    const t = this.add.text(320, 200, 'LEVEL UP!\nLevel ' + level, { fontSize: '24px', fontFamily: 'monospace', color: '#ffcc00', stroke: '#000000', strokeThickness: 4, align: 'center' }).setOrigin(0.5).setDepth(200);
    this.tweens.add({
      targets: t, scaleX: 1.8, scaleY: 1.8, alpha: 0, duration: 2000,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const px = 320 + Math.cos(a) * 40;
      const py = 200 + Math.sin(a) * 40;
      const pt = this.add.text(px, py, '+', { fontSize: '14px', fontFamily: 'monospace', color: '#ffcc00' }).setOrigin(0.5).setDepth(200);
      this.tweens.add({
        targets: pt, x: px + Math.cos(a) * 60, y: py + Math.sin(a) * 60, alpha: 0, duration: 1000,
        onComplete: () => pt.destroy(),
      });
    }
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
    g.fillStyle(0x000000, 0.88);
    g.fillRect(30, 20, 580, 440);
    g.lineStyle(2, 0xffcc00);
    g.strokeRect(30, 20, 580, 440);
    this.inventoryElements.push(g);

    const title = this.add.text(320, 28, 'INVENTORY', { fontSize: '14px', fontFamily: 'monospace', color: '#ffcc00' }).setOrigin(0.5).setDepth(150);
    this.inventoryElements.push(title);

    const equipTitle = this.add.text(50, 44, 'Equipment:', { fontSize: '11px', fontFamily: 'monospace', color: '#8888ff' }).setDepth(150);
    this.inventoryElements.push(equipTitle);

    const slots = ['weapon', 'armor', 'accessory'];
    const slotLabels = ['Weapon:', 'Armor:', 'Acc:'];
    for (let i = 0; i < 3; i++) {
      const label = this.add.text(50, 62 + i * 18, slotLabels[i], { fontSize: '10px', fontFamily: 'monospace', color: '#cccccc' }).setDepth(150);
      this.inventoryElements.push(label);
      const eq = this.equipped[slots[i]];
      const val = eq ? (eq.length > 16 ? eq.slice(0, 16) + '..' : eq) : '(empty)';
      const eText = this.add.text(120, 62 + i * 18, val, { fontSize: '10px', fontFamily: 'monospace', color: '#ffffff', wordWrap: { width: 200 } }).setDepth(150);
      this.inventoryElements.push(eText);
    }

    const invTitle = this.add.text(50, 120, 'Items (' + Math.min(this.inventory.length, 20) + '):', { fontSize: '11px', fontFamily: 'monospace', color: '#88ff88' }).setDepth(150);
    this.inventoryElements.push(invTitle);

    const maxShow = Math.min(this.inventory.length, 20);
    const itemsPerRow = 3;
    for (let i = 0; i < maxShow; i++) {
      const itemKey = this.inventory[i];
      const col = i % itemsPerRow;
      const row = Math.floor(i / itemsPerRow);
      const ix = 50 + col * 175;
      const iy = 140 + row * 32;

      const bg = this.add.graphics().setDepth(150);
      bg.fillStyle(0x444444); bg.fillRect(ix, iy, 165, 26);
      bg.lineStyle(1, 0x666666); bg.strokeRect(ix, iy, 165, 26);
      this.inventoryElements.push(bg);

      const shortKey = itemKey.length > 14 ? itemKey.slice(0, 14) + '..' : itemKey;
      const iText = this.add.text(ix + 4, iy + 1, shortKey, { fontSize: '9px', fontFamily: 'monospace', color: '#ffffff' }).setDepth(150);
      this.inventoryElements.push(iText);

      const useBg = this.add.graphics().setDepth(151);
      useBg.fillStyle(0x335533); useBg.fillRect(ix + 2, iy + 14, 50, 10);
      useBg.setInteractive(new Phaser.Geom.Rectangle(ix + 2, iy + 14, 50, 10), Phaser.Geom.Rectangle.Contains);
      const iid = i;
      useBg.on('pointerdown', () => { this.network.emit('use_item', { itemKey: this.inventory[iid] }); this.showInventory(); });
      this.inventoryElements.push(useBg);

      const useText = this.add.text(ix + 27, iy + 15, 'Use', { fontSize: '8px', fontFamily: 'monospace', color: '#88ff88' }).setOrigin(0.5).setDepth(152);
      this.inventoryElements.push(useText);

      const eqBg = this.add.graphics().setDepth(151);
      eqBg.fillStyle(0x333355); eqBg.fillRect(ix + 56, iy + 14, 50, 10);
      eqBg.setInteractive(new Phaser.Geom.Rectangle(ix + 56, iy + 14, 50, 10), Phaser.Geom.Rectangle.Contains);
      const iid2 = i;
      eqBg.on('pointerdown', () => { this.network.emit('equip_item', { itemKey: this.inventory[iid2] }); this.showInventory(); });
      this.inventoryElements.push(eqBg);

      const eqText = this.add.text(ix + 81, iy + 15, 'Equip', { fontSize: '8px', fontFamily: 'monospace', color: '#8888ff' }).setOrigin(0.5).setDepth(152);
      this.inventoryElements.push(eqText);
    }
  }

  hideInventory() {
    this.inventoryElements.forEach(e => e.destroy());
    this.inventoryElements = [];
  }

  showChatInput() {
    this.chatInputBg = this.add.graphics().setDepth(200);
    this.chatInputBg.fillStyle(0x000000, 0.85);
    this.chatInputBg.fillRect(4, 396, 480, 62);
    this.chatInputBg.lineStyle(1, 0x88ccff, 0.3);
    this.chatInputBg.strokeRect(4, 396, 480, 62);
    this.chatInputBg.fillStyle(0x88ccff, 0.1);
    this.chatInputBg.fillRect(4, 430, 480, 26);
    this.chatInputBg.setAlpha(0);
    this.tweens.add({ targets: this.chatInputBg, alpha: 1, duration: 150 });
    this.chatInputText = this.add.text(10, 434, '> ' + this.chatInput + '_', { fontSize: '13px', fontFamily: 'monospace', color: '#ffffff' }).setDepth(200);
    this.chatInputText.setAlpha(0);
    this.tweens.add({ targets: this.chatInputText, alpha: 1, duration: 150 });
    const hint = this.add.text(10, 402, 'Enter to send | Esc to cancel', { fontSize: '9px', fontFamily: 'monospace', color: '#666666' }).setDepth(200);
    this.chatInputHint = hint;
  }

  hideChatInput() {
    if (this.chatInputBg) this.chatInputBg.destroy();
    if (this.chatInputText) this.chatInputText.destroy();
    if (this.chatInputHint) this.chatInputHint.destroy();
    this.chatInputBg = null;
    this.chatInputText = null;
    this.chatInputHint = null;
  }

  updateChatInput() {
    if (this.chatInputText) {
      this.chatInputText.setText('> ' + this.chatInput + '_');
    }
  }

  addChatMessage(name, text, color) {
    const maxMsg = 6;
    const isSys = name === 'System';
    const displayName = isSys ? '' : (name.length > 12 ? name.slice(0, 12) + '..' : name + ':');
    const displayText = text.length > 60 ? text.slice(0, 60) + '..' : text;
    const entry = { text: isSys ? '> ' + displayText : displayName + ' ' + displayText, time: Date.now(), sys: isSys, color: color || (isSys ? '#88ccff' : '#cccccc'), y: 430, alpha: 1 };
    this.chatMessages.push(entry);
    while (this.chatMessages.length > maxMsg) this.chatMessages.shift();
    this.renderChatHistory();
  }

  renderChatHistory() {
    const now = Date.now();
    const chatW = 480;
    const baseY = 370;
    const lineH = 15;

    let visCount = 0;
    for (let i = 0; i < this.chatMessages.length; i++) {
      const msg = this.chatMessages[i];
      if (msg.sys) {
        const elapsed = now - msg.time;
        if (elapsed > 10000) msg.alpha = Math.max(0, 1 - (elapsed - 10000) / 2000);
      }
      if (msg.alpha > 0) visCount++;
    }

    if (!this.chatBg) {
      this.chatBg = this.add.graphics().setDepth(149);
    }
    this.chatBg.clear();
    if (visCount > 0) {
      const bgH = Math.min(visCount, 6) * lineH + 8;
      this.chatBg.fillStyle(0x000000, 0.45);
      this.chatBg.fillRect(4, baseY - 4, chatW, bgH);
      this.chatBg.fillStyle(0xffffff, 0.06);
      this.chatBg.fillRect(4, baseY - 4, chatW, 1);
    }

    let idx = 0;
    for (let i = 0; i < this.chatMessages.length; i++) {
      const msg = this.chatMessages[i];
      if (msg.alpha <= 0) continue;

      let t = this.chatPool[idx];
      if (!t) {
        t = this.add.text(10, 0, '', { fontSize: '11px', fontFamily: 'monospace', wordWrap: { width: chatW - 12 } }).setDepth(150);
        this.chatPool.push(t);
      }

      const targetY = baseY + idx * lineH;
      if (msg.y === undefined) msg.y = 430;
      if (msg.y > targetY) msg.y = Math.max(targetY, msg.y - 2.5);

      t.setText(msg.text);
      t.setPosition(10, msg.y);
      t.setStyle({ color: msg.color, stroke: '#000000', strokeThickness: 2 });
      t.setAlpha(msg.alpha);
      t.setVisible(true);
      idx++;
    }
    for (let i = idx; i < this.chatPool.length; i++) {
      this.chatPool[i].setVisible(false);
    }
  }

  update(time, delta) {
    if (!this.playerSprite || this.isChatting || this.showingInventory) return;

    if (this.dead) return;

    let dx = 0;
    let dy = 0;
    let direction = this.facingDir;

    if (this.keys.A.isDown || this.keys.LEFT.isDown) { dx = -1; direction = 'left'; }
    else if (this.keys.D.isDown || this.keys.RIGHT.isDown) { dx = 1; direction = 'right'; }

    if (this.keys.W.isDown || this.keys.UP.isDown) { dy = -1; direction = 'up'; }
    else if (this.keys.S.isDown || this.keys.DOWN.isDown) { dy = 1; direction = 'down'; }

    const moving = dx !== 0 || dy !== 0;

    this.playerSprite.y -= Math.sin(this.walkCycle) * 1.5;

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

      this.walkCycle += dt * 12;
    } else {
      this.walkCycle = 0;
    }

    this.playerSprite.y += Math.sin(this.walkCycle) * 1.5;

    if (direction !== this.facingDir || moving) {
      this.facingDir = direction;
      const baseKey = 'player_' + this.playerClass;
      if (direction === 'up') {
        this.playerSprite.setTexture(baseKey + '_back');
        this.playerSprite.setScale(1, 1);
      } else {
        this.playerSprite.setTexture(baseKey);
        this.playerSprite.setScale(direction === 'left' ? -1 : 1, 1);
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

    this.renderChatHistory();
    this.pulseTime = (this.pulseTime || 0) + delta;

    for (let i = this.damageTexts.length - 1; i >= 0; i--) {
      const dt = this.damageTexts[i];
      if (dt.alpha <= 0) continue;
      dt.y += (dt.targetY - dt.y) * 0.05;
      dt.alpha -= delta * 0.001 * 1.2;
      if (dt.alpha <= 0) { dt.alpha = 0; }
    }

    if (this.selectedSpell && this.spellSlots) {
      const pulse = 0.6 + Math.sin(this.pulseTime * 0.005) * 0.4;
      for (let i = 0; i < 5; i++) {
        const slot = this.spellSlots[i];
        if (slot.key === this.selectedSpell) {
          slot.highlight.clear();
          slot.highlight.lineStyle(2, Phaser.Display.Color.GetColor(Math.floor(255 * pulse), Math.floor(200 * pulse), 0));
          slot.highlight.strokeRect(70 + i * 102, 424, 96, 40);
        }
      }
    }
  }

  updateProgressText() {
    if (!this.progressText) return;
    this.progressText.setText('Kills: ' + (this.progressMonstersKilled || 0) + ' | Lv.' + (this.myStats?.level || 1));
    this.updateQuestText();
  }

  updateQuestText() {
    if (!this.questText) return;
    const zones = ['meadow', 'forest', 'caves', 'ruins', 'tower'];
    const names = ['Meadow', 'Forest', 'Caves', 'Ruins', 'Tower'];
    const levels = ['1-5', '5-10', '10-15', '15-20', '20+'];
    const lines = ['GOAL:', 'Explore all 5 zones +'];
    for (let i = 0; i < 5; i++) {
      const visited = this.zonesVisited && this.zonesVisited[zones[i]];
      const icon = visited ? '[+]' : '[ ]';
      const color = visited ? '#88ff88' : '#666666';
      lines.push(icon + ' ' + names[i] + ' (Lv' + levels[i] + ')');
    }
    lines.push('');
    lines.push('Defeat the Aether Lord');
    lines.push('in the Tower!');
    this.questText.setText(lines.join('\n'));
  }

  showZoneLore(zoneName, lore, color) {
    if (this.zoneLoreText) this.zoneLoreText.destroy();
    const shortLore = lore.length > 100 ? lore.slice(0, 97) + '...' : lore;
    this.zoneLoreText = this.add.text(320, 110, zoneName + '\n' + shortLore, {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: color || '#88ccff',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center',
      lineSpacing: 4,
      wordWrap: { width: 350 },
    }).setOrigin(0.5).setDepth(60).setAlpha(0);

    this.tweens.add({
      targets: this.zoneLoreText,
      alpha: 1,
      duration: 400,
      yoyo: true,
      hold: 3000,
      onComplete: () => { if (this.zoneLoreText) { this.zoneLoreText.destroy(); this.zoneLoreText = null; } }
    });
  }

  showTutorial() {
    this.sendChatMessage('System', 'WASD/Arrows to move | Walk to zone edges to explore new areas', '#88ccff');
    this.sendChatMessage('System', 'Press 1-5 to select a spell, then CLICK anywhere to cast it at that spot', '#88ff88');
    this.sendChatMessage('System', 'Click monsters to target them | Click items on ground to pick up', '#88ccff');
    this.sendChatMessage('System', 'Press I for inventory (Use/Equip) | Press H for help', '#88ccff');
    this.sendChatMessage('System', 'Enter to chat | R to respawn if you die', '#88ccff');
    this.sendChatMessage('System', 'GOAL: Explore all 5 zones and defeat the Aether Lord in the Tower!', '#ffcc00');
  }

  toggleHelp() {
    if (this.showingHelp) this.hideHelp();
    else this.showHelp();
  }

  showHelp() {
    this.showingHelp = true;
    const g = this.add.graphics().setDepth(300);
    g.fillStyle(0x000000, 0.92);
    g.fillRect(10, 10, 620, 460);
    g.lineStyle(2, 0xffcc00);
    g.strokeRect(10, 10, 620, 460);
    this.helpElements.push(g);

    const lines = [
      { text: '=== CONTROLS ===', color: '#ffcc00', s: 13 },
      { text: 'WASD / Arrow Keys', color: '#ffffff', s: 11 }, { text: 'Move', color: '#888888', s: 11 },
      { text: '1 - 5', color: '#ffffff', s: 11 }, { text: 'Select spell, click to cast', color: '#888888', s: 11 },
      { text: 'Click monster', color: '#ffffff', s: 11 }, { text: 'Target it (see info below)', color: '#888888', s: 11 },
      { text: 'Click item', color: '#ffffff', s: 11 }, { text: 'Pick up from ground', color: '#888888', s: 11 },
      { text: 'I', color: '#ffffff', s: 11 }, { text: 'Inventory (Use/Equip items)', color: '#888888', s: 11 },
      { text: 'Enter', color: '#ffffff', s: 11 }, { text: 'Chat', color: '#888888', s: 11 },
      { text: 'R', color: '#ffffff', s: 11 }, { text: 'Respawn when dead', color: '#888888', s: 11 },
      { text: 'H / Esc', color: '#ffffff', s: 11 }, { text: 'Close this help', color: '#888888', s: 11 },
      { text: '', color: '#ffffff', s: 11 },
      { text: '=== GAMEPLAY ===', color: '#ffcc00', s: 13 },
      { text: 'Kill monsters -> XP -> Level up -> Grow stronger', color: '#aaaaaa', s: 11 },
      { text: 'Collect loot, equip gear, use potions', color: '#aaaaaa', s: 11 },
      { text: '5 zones: Meadow > Forest > Caves > Ruins > Tower', color: '#aaaaaa', s: 11 },
      { text: 'Final goal: Defeat the Aether Lord in the Tower!', color: '#ffcc00', s: 11 },
      { text: '', color: '#ffffff', s: 11 },
      { text: 'Solo adventure (multiplayer optional)', color: '#88ccff', s: 11 },
    ];

    let y = 22;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const t = this.add.text(320, y, l.text, { fontSize: l.s + 'px', fontFamily: 'monospace', color: l.color }).setOrigin(0.5, 0).setDepth(301);
      this.helpElements.push(t);
      y += (l.text === '' ? 8 : l.s > 12 ? 22 : 16);
      if (y > 440) break;
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
