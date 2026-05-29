const TILE_SIZE = 32;
const COLS = 20;
const ROWS = 15;
const SPEED = 160;
const MOVE_THROTTLE = 50;
const TILE_TEXTURES = ['tile_0', 'tile_1', 'tile_2', 'tile_3', 'tile_4', 'tile_5', 'tile_6', 'tile_7', 'tile_8', 'tile_9', 'tile_10', 'tile_11', 'tile_12'];

const ITEM_NAMES = {
  wooden_staff: 'Wooden Staff', starter_robe: 'Starter Robe', starter_ring: 'Starter Ring',
  forest_staff: 'Forest Staff', leaf_cloak: 'Leaf Cloak', vine_ring: 'Vine Ring',
  crystal_staff: 'Crystal Staff', crystal_robe: 'Crystal Robe', crystal_ring: 'Crystal Ring',
  ancient_staff: 'Ancient Staff', ancient_robe: 'Ancient Robe', soul_ring: 'Soul Ring',
  legendary_staff: 'Legendary Staff', legendary_robe: 'Legendary Robe', boss_ring: 'Aether Ring',
  health_pot: 'Health Potion', mana_pot: 'Mana Potion',
  greater_health_pot: 'Greater Health Potion', greater_mana_pot: 'Greater Mana Potion',
};

const ITEM_TIERS = {
  health_pot: 0, mana_pot: 0, greater_health_pot: 1, greater_mana_pot: 1,
  wooden_staff: 1, starter_robe: 1, starter_ring: 1,
  forest_staff: 2, leaf_cloak: 2, vine_ring: 2,
  crystal_staff: 3, crystal_robe: 3, crystal_ring: 3,
  ancient_staff: 4, ancient_robe: 4, soul_ring: 4,
  legendary_staff: 5, legendary_robe: 5, boss_ring: 5,
};
const ITEM_TYPES = {
  wooden_staff: 'weapon', starter_robe: 'armor', starter_ring: 'accessory',
  forest_staff: 'weapon', leaf_cloak: 'armor', vine_ring: 'accessory',
  crystal_staff: 'weapon', crystal_robe: 'armor', crystal_ring: 'accessory',
  ancient_staff: 'weapon', ancient_robe: 'armor', soul_ring: 'accessory',
  legendary_staff: 'weapon', legendary_robe: 'armor', boss_ring: 'accessory',
  health_pot: 'consumable', mana_pot: 'consumable',
  greater_health_pot: 'consumable', greater_mana_pot: 'consumable',
};
const RARITY_COLORS = { 0: '#aaaaaa', 1: '#ffffff', 2: '#44ff44', 3: '#44ccff', 4: '#cc44ff', 5: '#ff8800' };
const RARITY_NAMES = { 0: 'Common', 1: 'Common', 2: 'Uncommon', 3: 'Rare', 4: 'Epic', 5: 'Legendary' };
const ITEM_DESCS = {
  wooden_staff: 'A basic wooden staff', starter_robe: 'Simple cloth robe', starter_ring: 'A simple copper ring',
  forest_staff: 'Carved from living wood', leaf_cloak: 'Woven from enchanted leaves', vine_ring: 'Living vines coiled into a ring',
  crystal_staff: 'Pulsing with crystal energy', crystal_robe: 'Robes lined with crystal shards', crystal_ring: 'A ring of pure crystal',
  ancient_staff: 'Wielded by forgotten mages', ancient_robe: 'Etched with ancient runes', soul_ring: 'Pulses with a faint heartbeat',
  legendary_staff: 'Staff of a true archmage', legendary_robe: 'Robes woven from starlight', boss_ring: "The Aether Lord's own ring",
  health_pot: 'Restores 40 HP', mana_pot: 'Restores 30 MP', greater_health_pot: 'Restores 80 HP', greater_mana_pot: 'Restores 60 MP',
};
const ITEM_STATS = {
  wooden_staff: { atk: 3 }, starter_robe: { def: 2 }, starter_ring: { mp: 10 },
  forest_staff: { atk: 6, mp: 5 }, leaf_cloak: { def: 4, hp: 10 }, vine_ring: { hp: 15 },
  crystal_staff: { atk: 10, mp: 10 }, crystal_robe: { def: 7, mp: 15 }, crystal_ring: { mp: 25 },
  ancient_staff: { atk: 15, mp: 15 }, ancient_robe: { def: 10, mp: 20 }, soul_ring: { hp: 25, mp: 15 },
  legendary_staff: { atk: 22, mp: 25 }, legendary_robe: { def: 15, hp: 30 }, boss_ring: { hp: 40, mp: 30, atk: 5 },
  health_pot: { heal: 40 }, mana_pot: { mana: 30 }, greater_health_pot: { heal: 80 }, greater_mana_pot: { mana: 60 },
};

const SPELL_NAMES = {
  magic_bolt: 'Magic Bolt', heal: 'Heal', fireball: 'Fireball',
  ice_shard: 'Ice Shard', stone_wall: 'Stone Wall', gale: 'Gale',
  flame_wave: 'Flame Wave', summon_wolf: 'Summon Wolf', teleport: 'Teleport',
  meteor: 'Meteor', frost_nova: 'Frost Nova', poison_cloud: 'Poison Cloud',
  slash: 'Slash',
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
    this.otherPlayerSprites = {};
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
    const baseStats = {
      mage: { hp: 80, maxHp: 80, mp: 100, maxMp: 100, atk: 12, def: 8 },
      sorcerer: { hp: 60, maxHp: 60, mp: 120, maxMp: 120, atk: 18, def: 5 },
      druid: { hp: 100, maxHp: 100, mp: 80, maxMp: 80, atk: 8, def: 12 },
      warrior: { hp: 130, maxHp: 130, mp: 40, maxMp: 40, atk: 16, def: 14 },
      archer: { hp: 70, maxHp: 70, mp: 90, maxMp: 90, atk: 20, def: 4 },
      summoner: { hp: 75, maxHp: 75, mp: 110, maxMp: 110, atk: 10, def: 6 },
    };
    this.myStats = { ...(baseStats[this.playerClass] || baseStats.mage), level: 1, xp: 0 };
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
    this.statPoints = 0;
    this.allocatedStats = { hp: 0, mp: 0, atk: 0, def: 0 };
    this.zonesVisited = { meadow: true };
    this.chatPool = [];
    this.questShown = false;
    this.levelUpText = null;
    this.levelUpTimer = 0;
    this.facingDir = 'down';
    this.walkBob = 0;
    this.walkCycle = 0;
    this.walkFrame = 0;
    this.displayHp = this.myStats.maxHp;
    this.displayMp = this.myStats.maxMp;
    this.displayXp = 0;
    this.chatBg = null;
    this.chatAnims = [];
    this.targetRing = null;
    this.castEffects = [];
    this.equipmentAura = null;
    this.equipmentOverlay = null;
    this.lastEquippedHash = '';
    this.sprintLines = [];
    this.isSprinting = false;
    this.walkSoundTimer = 0;
    this.settingsPanel = null;
    this.minimap = null;
    this.particles = null;
    this.netStatusText = null;
    this.petSprite = null;
  }

  create() {
    this.events.on('shutdown', this.shutdown, this);
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
      SHIFT: this.input.keyboard.addKey('SHIFT'),
    };

    this.network = new Network();
    this.setupNetwork();
    this.network.connect();
    if (this.input.gamepad) this.input.gamepad.start();

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

      if (event.key === 'Escape') {
        if (this.settingsPanel) { this.settingsPanel.toggle(); }
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
        const fireSpells = ['fireball', 'meteor', 'flame_wave'];
        const iceSpells = ['ice_shard', 'frost_nova'];
        if (fireSpells.includes(this.selectedSpell)) window.soundManager.playFireCast();
        else if (iceSpells.includes(this.selectedSpell)) window.soundManager.playIceCast();
        else if (this.selectedSpell === 'heal') window.soundManager.playHeal();
        else window.soundManager.playCastSpell();
        this.network.emit('cast_spell', {
          spell: this.selectedSpell,
          toX: Math.round(pointer.x),
          toY: Math.round(pointer.y),
        });
        if (this.spellSlots) {
          for (const s of this.spellSlots) { if (s.key === this.selectedSpell) s.lastCast = Date.now(); }
        }
        if (this.playerSprite) this.playerSprite.setTint(0x88ccff);
        this.time.delayedCall(120, () => { if (this.playerSprite && !this.dead) this.playerSprite.clearTint(); });
        const castFlash = this.add.circle(this.playerSprite.x, this.playerSprite.y, 12, 0x88ccff, 0.3).setDepth(11);
        this.tweens.add({ targets: castFlash, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 300, onComplete: () => castFlash.destroy() });
        if (this.particles) this.particles.burst(this.playerSprite.x, this.playerSprite.y, 6, { color: 0x88ccff, spread: 30, speed: 40, size: 2, life: 400 });
      }
    });

    this.settingsPanel = new SettingsPanel(this);
    this.particles = new ParticleSystem(this);
    this._createNetStatus();
    window.soundManager.startAmbient();
    this.createVirtualControls();
  }

  createVirtualControls() {
    this.touch = { up: false, down: false, left: false, right: false };
    const isTouch = this.sys.game.device.input.touch;
    if (!isTouch) return;

    const btn = (label, x, y, w, h, cb) => {
      const bg = this.add.graphics().setDepth(250).setAlpha(0.4);
      bg.fillStyle(0x333333); bg.fillRoundedRect(x, y, w, h, 6);
      bg.lineStyle(1, 0x888888); bg.strokeRoundedRect(x, y, w, h, 6);
      const t = this.add.text(x + w/2, y + h/2, label, { fontSize: '16px', fontFamily: 'monospace', color: '#ffffff' }).setOrigin(0.5).setDepth(251);
      const zone = this.add.rectangle(x + w/2, y + h/2, w, h, 0xffffff, 0).setInteractive().setDepth(252);
      zone.on('pointerdown', () => cb(true));
      zone.on('pointerup', () => cb(false));
      zone.on('pointerout', () => cb(false));
    };

    btn('\u25B2', 8, 370, 40, 40, (v) => { this.touch.up = v; });
    btn('\u25BC', 8, 416, 40, 40, (v) => { this.touch.down = v; });
    btn('\u25C0', 4, 408, 32, 32, (v) => { this.touch.left = v; });
    btn('\u25B6', 52, 408, 32, 32, (v) => { this.touch.right = v; });

    btn('I', 588, 370, 44, 40, () => { if (!this.showingInventory) this.toggleInventory(); });
    btn('H', 588, 416, 44, 40, () => { if (!this.showingHelp) this.toggleHelp(); });

    for (let i = 0; i < 5; i++) {
      const sx = 64 + i * 56;
      btn('' + (i+1), sx, 440, 48, 32, () => { if (this.spells[i]) this.selectSpell(i); });
    }

    btn('R', 588, 280, 44, 32, () => { if (this.dead) this.respawn(); });
    btn('CHAT', 525, 280, 58, 32, () => {
      const msg = window.prompt('Enter chat message:');
      if (msg && msg.length > 0 && this.network) this.network.emit('chat_message', { text: msg });
    });

    this.touchSprint = false;
    btn('>>', 540, 370, 44, 32, (v) => { this.touchSprint = v; });
  }

  setupNetwork() {
    const self = this;

    self.network.on('map_data', (data) => {
      self.currentZone = data.zone;
      self.mapData = data.map;
      self.renderMap();
      if (self.minimap) self.minimap.destroy();
      self.minimap = new Minimap(self, self.mapData);
      self.network.emit('join', { name: self.playerName, class: self.playerClass });
    });

    let tutorialShown = false;

    self.network.on('you_joined', (data) => {
      self.myId = data.id;
      self.myStats = data.player;
      self.statPoints = data.player.sp || 0;
      self.allocatedStats = data.player.as || { hp: 0, mp: 0, atk: 0, def: 0 };
      if (data.player.zv) self.zonesVisited = data.player.zv;
      if (data.player.mk !== undefined) self.progressMonstersKilled = data.player.mk;
      self.createPlayer();
      self.updateEquipmentVisuals();
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
        if (me.pet) {
          if (!self.petSprite) {
            self.petSprite = self.add.circle(0, 0, 6, 0xcc8844).setDepth(10);
            self.petName = self.add.text(0, -10, 'Wolf', { fontSize: '8px', fontFamily: 'monospace', color: '#cc8844', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5).setDepth(11);
          }
          self.petSprite.setPosition(me.pet.x, me.pet.y);
          self.petName.setPosition(me.pet.x, me.pet.y - 10);
          self.petSprite.setAlpha(me.pet.hp > 0 ? 1 : 0.2);
        } else {
          if (self.petSprite) { self.petSprite.destroy(); self.petSprite = null; }
          if (self.petName) { self.petName.destroy(); self.petName = null; }
        }
      }
    });

    self.network.on('zone_changed', (data) => {
      window.soundManager.playZoneTransition();
      self.cameras.main.fadeOut(200);
      self.time.delayedCall(250, () => {
        self.currentZone = data.zone;
        self.mapData = data.map;
        self.renderMap();
        if (self.minimap) self.minimap.refreshMap(self.mapData);
        self.clearMonsters();
        self.clearProjectiles();
        self.clearGroundItems();
        self.targetMonster = null;
        if (self.petSprite) { self.petSprite.destroy(); self.petSprite = null; }
        if (self.petName) { self.petName.destroy(); self.petName = null; }
        if (self.equipmentAura) self.equipmentAura.clear();
        if (self.equipmentOverlay) self.equipmentOverlay.destroy();
        self.equipmentOverlay = null;
        self.lastEquippedHash = '';
        self.updateEquipmentVisuals();
        self.zoneLabel = (data.zoneDef?.name || data.zone) + (data.zoneDef?.levels ? ' (' + data.zoneDef.levels + ')' : '');
        if (self.zoneText) self.zoneText.setText(self.zoneLabel);
        if (data.zoneDef?.lore) self.showZoneLore(data.zoneDef.name || data.zone, data.zoneDef.lore, data.zoneDef.color || '#88ccff');
        self.cameras.main.fadeIn(200);
      });
    });

    self.network.on('monster_list', (monsters) => {
      self.clearMonsters();
      if (monsters) for (const m of monsters) self.addMonsterSprite(m);
    });

    self.network.on('monster_died', (data) => {
      if (data.lv) self.showLevelUp(data.nl);
      const isBoss = data.boss;
      if (isBoss) window.soundManager.playBossRoar();
      else window.soundManager.playMonsterDeath();
      const ms = self.monsterSprites[data.mid];
      if (ms) {
        if (self.particles) {
          self.particles.burst(data.x, data.y, isBoss ? 20 : 10, { color: 0xff4444, spread: isBoss ? 80 : 40, speed: isBoss ? 50 : 30, size: 3, life: isBoss ? 700 : 400 });
          self.particles.burst(data.x, data.y, isBoss ? 10 : 5, { color: 0xffcc00, spread: isBoss ? 60 : 30, speed: 40, size: 2, life: isBoss ? 600 : 350 });
        }
        if (isBoss) {
          const boom = self.add.circle(data.x, data.y, 8, 0xff4400, 0.5).setDepth(9);
          self.tweens.add({ targets: boom, scaleX: 6, scaleY: 6, alpha: 0, duration: 500, onComplete: () => boom.destroy() });
          self.cameras.main.shake(200, 0.01);
        }
        const deathRing = self.add.circle(data.x, data.y, 3, isBoss ? 0xff4400 : 0xffffff, 0.3).setDepth(9);
        self.tweens.add({ targets: deathRing, scaleX: 4, scaleY: 4, alpha: 0, duration: 400, onComplete: () => deathRing.destroy() });
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
        window.soundManager.playDeath();
        if (data.xpLost && data.xpLost > 0) self.addChatMessage('System', 'You lost ' + data.xpLost + ' XP!', '#ff4444');
        if (self.petSprite) { self.petSprite.destroy(); self.petSprite = null; }
        if (self.petName) { self.petName.destroy(); self.petName = null; }
        if (self.playerSprite) {
          self.playerSprite.setAlpha(0.3);
          self.playerSprite.setTint(0xff4444);
          if (self.particles) {
            self.particles.burst(self.playerSprite.x, self.playerSprite.y, 16, { color: 0xff4444, spread: 50, speed: 50, size: 3, life: 700 });
            self.particles.burst(self.playerSprite.x, self.playerSprite.y, 8, { color: 0xcc2222, spread: 40, speed: 35, size: 2, life: 500 });
          }
          const deathRing = self.add.circle(self.playerSprite.x, self.playerSprite.y, 4, 0x440000, 0.6).setDepth(9);
          self.tweens.add({ targets: deathRing, scaleX: 8, scaleY: 8, alpha: 0, duration: 600, onComplete: () => deathRing.destroy() });
        }
        self.cameras.main.shake(300, 0.012);
        const deathOverlay = self.add.rectangle(self.cameras.main.scrollX + 400, self.cameras.main.scrollY + 300, 800, 600, 0x220000, 0.4).setDepth(200);
        self.tweens.add({ targets: deathOverlay, alpha: 0, duration: 800, delay: 300, onComplete: () => deathOverlay.destroy() });
        self.addChatMessage('System', 'You died! Press R to respawn.', '#ff4444');
      }
    });

    self.network.on('combat_event', (data) => {
      if (data.t === 'damage') {
        const color = data.ty === 'player' ? '#ff4444' : '#ffffff';
        self.showDamageNumber(data.x, data.y, '-' + data.a, color);
        if (data.ty === 'player' && data.ti === self.myId) {
          self.cameras.main.shake(100, 0.005);
          window.soundManager.playHit();
          if (self.playerSprite) {
            self.playerSprite.setTint(0xff4444);
            self.time.delayedCall(150, () => { if (self.playerSprite && !self.dead) self.playerSprite.clearTint(); });
          }
        }
        if (data.ty === 'monster' && self.monsterSprites[data.ti]) {
          const ms = self.monsterSprites[data.ti];
          ms.sprite.setTint(0xffffff);
          self.time.delayedCall(80, () => { if (ms && ms.sprite) ms.sprite.clearTint(); });
          if (self.particles) self.particles.burst(data.x, data.y, 4, { color: 0xffff88, spread: 20, speed: 30, size: 2, life: 300 });
          const impact = self.add.circle(data.x, data.y, 3, 0xffffff, 0.6).setDepth(12);
          self.tweens.add({ targets: impact, scaleX: 3, scaleY: 3, alpha: 0, duration: 300, onComplete: () => impact.destroy() });
        }
      } else if (data.t === 'heal') {
        self.showDamageNumber(data.x, data.y, '+' + data.a, '#44ff44');
        window.soundManager.playHeal();
        if (self.playerSprite) {
          self.playerSprite.setTint(0x44ff44);
          self.time.delayedCall(200, () => { if (self.playerSprite && !self.dead) self.playerSprite.clearTint(); });
          if (self.particles) self.particles.burst(self.playerSprite.x, self.playerSprite.y, 8, { color: 0x44ff44, spread: 30, speed: 25, size: 2, life: 500, gravity: -10 });
        }
        const healRing = self.add.circle(data.x, data.y, 5, 0x44ff44, 0.3).setDepth(9);
        self.tweens.add({ targets: healRing, scaleX: 3, scaleY: 3, alpha: 0, duration: 400, onComplete: () => healRing.destroy() });
      }
      if (data.ty === 'player' && data.ti === self.myId) self.updateHUD();
    });

    self.network.on('melee_swing', (data) => {
      if (!self.playerSprite) return;
      window.soundManager.playHit();
      const arc = self.add.graphics().setDepth(12);
      arc.lineStyle(2, 0xcccccc, 0.8);
      arc.beginPath();
      arc.arc(self.playerSprite.x, self.playerSprite.y - 4, 18, -1.2, 1.2, false);
      arc.strokePath();
      arc.fillStyle(0xffffff, 0.3);
      arc.fillCircle(self.playerSprite.x, self.playerSprite.y - 4, 6);
      self.tweens.add({ targets: arc, alpha: 0, duration: 200, onComplete: () => arc.destroy() });
    });

    self.network.on('item_spawned', (data) => {
      self.addGroundItemSprite(data);
    });

    self.network.on('item_removed', (data) => {
      const gs = self.groundItemSprites[data.itemId];
      if (gs && gs.glow) window.soundManager.playRareItemPickup();
      else window.soundManager.playItemPickup();
      if (gs) {
        if (self.playerSprite && !self.dead) {
          const fly = self.add.circle(gs.sprite.x, gs.sprite.y, 4, gs.sprite.fillColor || 0xffffff, 0.7).setDepth(20);
          self.tweens.add({ targets: fly, x: self.playerSprite.x, y: self.playerSprite.y, scaleX: 0.2, scaleY: 0.2, alpha: 0.3, duration: 300, ease: 'Cubic.easeIn', onComplete: () => fly.destroy() });
        }
        gs.sprite.destroy(); if (gs.glow) gs.glow.destroy(); if (gs.zone) gs.zone.destroy(); if (gs.label) gs.label.destroy(); if (gs.pulse) gs.pulse.stop(); delete self.groundItemSprites[data.itemId];
      }
    });

    self.network.on('ground_items', (items) => {
      self.updateGroundItems(items);
    });

    self.network.on('inventory_update', (data) => {
      self.inventory = data.inventory || [];
      self.spells = data.spells || [];
      if (data.equipped) {
        self.equipped = data.equipped;
        self.updateEquipmentVisuals();
      }
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
      if (data.sp !== undefined) self.statPoints = data.sp;
      if (data.as !== undefined) self.allocatedStats = data.as;
      self.updateHUD();
    });

    self.network.on('progress_update', (data) => {
      if (data.zonesVisited) self.zonesVisited = data.zonesVisited;
      if (data.monstersKilled !== undefined) self.progressMonstersKilled = data.monstersKilled;
      if (self.progressText) self.updateProgressText();
    });

    self.network.on('chat_message', (data) => {
      if (data.n !== 'System') window.soundManager.playChatMessage();
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
    this.equipmentAura = this.add.graphics().setDepth(9);
    this.lastEquippedHash = '';
  }

  updateEquipmentVisuals() {
    if (!this.equipmentAura) return;
    const equippedKeys = [this.equipped.weapon, this.equipped.armor, this.equipped.accessory].filter(Boolean).sort().join(',');
    if (equippedKeys === this.lastEquippedHash) return;
    this.lastEquippedHash = equippedKeys;

    if (this.equipmentOverlay) this.equipmentOverlay.destroy();
    this.equipmentAura.clear();
    let highestTier = 0;
    for (const key of [this.equipped.weapon, this.equipped.armor, this.equipped.accessory]) {
      if (key && ITEM_TIERS[key] !== undefined) {
        highestTier = Math.max(highestTier, ITEM_TIERS[key]);
      }
    }

    const auraColors = { 1: 0xffffff, 2: 0x44ff44, 3: 0x44ccff, 4: 0xcc44ff, 5: 0xff8800 };
    const col = highestTier >= 1 ? (auraColors[highestTier] || 0xffffff) : 0;
    if (highestTier >= 1) {
      this.equipmentAura.fillStyle(col, 0.08);
      this.equipmentAura.fillCircle(0, 0, 16);
      this.equipmentAura.lineStyle(1, col, 0.25);
      this.equipmentAura.strokeCircle(0, 0, 18);

      const glowRing = this.add.graphics().setDepth(9);
      glowRing.lineStyle(2, col, 0.5);
      glowRing.strokeCircle(0, 0, 20);
      if (this.playerSprite) glowRing.setPosition(this.playerSprite.x, this.playerSprite.y);
      this.tweens.add({ targets: glowRing, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 800, onComplete: () => glowRing.destroy() });
    }

    this.equipmentOverlay = this.add.graphics().setDepth(11);
    const weapons = ['weapon_staff_basic', 'weapon_staff_fire', 'weapon_staff_frost', 'weapon_staff_arcane', 'weapon_staff_aether'];
    const armors = ['armor_robe_linen', 'armor_robe_wool', 'armor_robe_silk', 'armor_robe_enchanted', 'armor_robe_aether'];
    const accs = ['ring_copper', 'ring_silver', 'ring_gold', 'ring_crystal', 'ring_aether'];

    const overlayColors = { 1: 0xffffff, 2: 0x44ff44, 3: 0x44ccff, 4: 0xcc44ff, 5: 0xff8800 };

    if (this.equipped.weapon && weapons.includes(this.equipped.weapon)) {
      const wTier = ITEM_TIERS[this.equipped.weapon] || 1;
      const wCol = overlayColors[wTier] || 0xffffff;
      this.equipmentOverlay.lineStyle(2, wCol, 0.7);
      this.equipmentOverlay.beginPath();
      this.equipmentOverlay.moveTo(8, -8);
      this.equipmentOverlay.lineTo(18, -20);
      this.equipmentOverlay.strokePath();
      this.equipmentOverlay.fillStyle(wCol, 0.5);
      this.equipmentOverlay.fillCircle(18, -20, 2);
    }

    if (this.equipped.armor && armors.includes(this.equipped.armor)) {
      const aTier = ITEM_TIERS[this.equipped.armor] || 1;
      const aCol = overlayColors[aTier] || 0xffffff;
      this.equipmentOverlay.fillStyle(aCol, 0.15);
      this.equipmentOverlay.fillRect(-8, -5, 16, 16);
    }

    if (this.equipped.accessory && accs.includes(this.equipped.accessory)) {
      const rTier = ITEM_TIERS[this.equipped.accessory] || 1;
      const rCol = overlayColors[rTier] || 0xffffff;
      this.equipmentOverlay.fillStyle(rCol, 0.5);
      this.equipmentOverlay.fillCircle(6, 6, 2);
    }

    if (this.playerSprite) {
      this.equipmentOverlay.setPosition(this.playerSprite.x, this.playerSprite.y);
      this.equipmentAura.setPosition(this.playerSprite.x, this.playerSprite.y);
    }
  }

  createHUD() {
    this.hudContainer = this.add.container(0, 0).setDepth(50);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.6);
    g.fillRect(4, 4, 180, 82);
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

    this.hpText = this.add.text(134, 24, '', { fontSize: '10px', fontFamily: 'monospace', color: '#ffffff' });
    this.hudContainer.add(this.hpText);
    this.mpText = this.add.text(134, 38, '', { fontSize: '10px', fontFamily: 'monospace', color: '#ffffff' });
    this.hudContainer.add(this.mpText);

    this.lvlText = this.add.text(10, 62, '', { fontSize: '10px', fontFamily: 'monospace', color: '#aaaaaa' });
    this.hudContainer.add(this.lvlText);

    this.atkDefText = this.add.text(60, 62, '', { fontSize: '10px', fontFamily: 'monospace', color: '#aaaaaa' });
    this.hudContainer.add(this.atkDefText);
    this.statPointsText = this.add.text(10, 72, '', { fontSize: '10px', fontFamily: 'monospace', color: '#ffcc00', stroke: '#000000', strokeThickness: 2 });
    this.hudContainer.add(this.statPointsText);
    this.sprintText = this.add.text(140, 72, '', { fontSize: '8px', fontFamily: 'monospace', color: '#88ccff' });
    this.hudContainer.add(this.sprintText);
    this.spIndicator = this.add.text(188, 4, '', { fontSize: '14px', fontFamily: 'monospace', color: '#ffcc00', stroke: '#000000', strokeThickness: 3 }).setDepth(55);

    this.zoneText = this.add.text(320, 4, 'Meadow', { fontSize: '12px', fontFamily: 'monospace', color: '#88ccff', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5, 0).setDepth(50);
    this.spellBarContainer = this.add.container(0, 0).setDepth(50);

    this.targetInfo = this.add.text(320, 460, '', { fontSize: '10px', fontFamily: 'monospace', color: '#ffffff', stroke: '#000000', strokeThickness: 2, wordWrap: { width: 300 } }).setOrigin(0.5).setDepth(50);

    this.progressText = this.add.text(320, 16, '', { fontSize: '10px', fontFamily: 'monospace', color: '#aaaaaa', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5, 0).setDepth(50);
    this.updateProgressText();

    this.questText = this.add.text(478, 36, '', { fontSize: '10px', fontFamily: 'monospace', color: '#ffcc00', stroke: '#000000', strokeThickness: 1, lineSpacing: 3, wordWrap: { width: 155 } }).setDepth(50).setAlpha(0.85);

    this.zoneLoreText = null;
    this.zoneLoreTimer = 0;

    this.updateHUD();
  }

  updateHUD() {
    if (!this.hpBar) return;

    if (!this.myStats.maxHp || !this.myStats.maxMp) return;
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
    if (this.statPoints > 0) {
      this.statPointsText.setText('+ ' + this.statPoints + ' SP!');
      if (this.spIndicator) {
        this.spIndicator.setText('SP!');
        this.spIndicator.setAlpha(0.5 + Math.sin(Date.now() * 0.005) * 0.5);
      }
    } else {
      this.statPointsText.setText('');
      if (this.spIndicator) this.spIndicator.setText('');
    }
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

      const spellCost = this.add.text(90 + i * 102, 439, '', { fontSize: '10px', fontFamily: 'monospace', color: '#8888ff' });
      this.spellBarContainer.add(spellCost);

      const highlight = this.add.graphics();
      this.spellBarContainer.add(highlight);

      const cdBar = this.add.graphics().setAlpha(0.6);
      this.spellBarContainer.add(cdBar);

      this.spellSlots.push({ bg: slotBg, name: spellName, cost: spellCost, highlight, cdBar, key: null, lastCast: 0 });
    }
    this.updateSpellBar();
  }

  updateSpellBar() {
    if (!this.spellSlots) return;
    const costs = { magic_bolt: 5, heal: 15, fireball: 12, ice_shard: 10, stone_wall: 20, gale: 8, flame_wave: 18, summon_wolf: 25, teleport: 20, meteor: 30, frost_nova: 22, poison_cloud: 15, slash: 0 };
    for (let i = 0; i < 5; i++) {
      const slot = this.spellSlots[i];
      const spellKey = this.spells[i];
      if (spellKey) {
        slot.name.setText(SPELL_NAMES[spellKey] || spellKey);
        const cost = costs[spellKey] || 5;
        const canCast = this.myStats && this.myStats.mp >= cost;
        slot.cost.setText('MP:' + cost);
        slot.cost.setColor(canCast ? '#8888ff' : '#ff4444');
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
        this.addChatMessage('System', 'Selected: ' + (SPELL_NAMES[this.selectedSpell] || this.selectedSpell) + ' - Click to cast!', '#88ccff');
      }
    }
  }

  addOtherPlayer(id, playerData) {
    if (this.otherPlayers[id]) return;
    const texKey = 'player_' + (playerData.c || playerData.class || 'mage');
    const sprite = this.add.image(playerData.x, playerData.y, texKey).setDepth(10);
    const nameText = this.add.text(0, -20, playerData.n || playerData.name, { fontSize: '10px', fontFamily: 'monospace', color: '#ffffff', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5);
    const hpBar = this.add.graphics();
    this.otherPlayers[id] = { sprite, nameText, hpBar, walkCycle: Math.random() * Math.PI * 2, serverMoving: false };
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
        const otherDir = pData.d || 'down';
        const otherClass = pData.c || 'mage';
        pObj.sprite.setTexture(otherDir === 'up' ? 'player_' + otherClass + '_back' : 'player_' + otherClass);
        pObj.sprite.setScale(otherDir === 'left' ? -1 : 1, 1);
        pObj.serverMoving = pData.mv || false;
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
    if (boss) window.soundManager.playBossRoar();
    const maxHp = m.mh !== undefined ? m.mh : m.maxHp;
    const g = this.add.graphics();
    this.drawMonsterShape(g, key, color, boss);
    g.setPosition(m.x, m.y).setDepth(8);

    const hpBar = this.add.graphics().setDepth(9);

    const nameText = boss ? this.add.text(m.x, m.y - 20, name, { fontSize: '10px', fontFamily: 'monospace', color: '#ffcc00', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5).setDepth(9) : null;

    const bSize = boss ? 40 : (key === 'treant' || key === 'golem' ? 32 : 24);
    const clickZone = this.add.rectangle(m.x, m.y, bSize, bSize, 0xffffff, 0).setInteractive().setDepth(8);
    const mid = m.id;
    clickZone.on('pointerdown', () => {
      this.targetMonster = mid;
      this.updateSpellBar();
      this.showTargetRing(m.x, m.y);
    });

    this.monsterSprites[m.id] = { sprite: g, hpBar, nameText, clickZone, boss, maxHp };
    this.updateMonsterHP(m.id, hp, maxHp);

    g.setAlpha(0);
    this.tweens.add({ targets: g, alpha: 1, duration: 300, ease: 'Cubic.easeOut' });
    const flashRing = this.add.graphics().setDepth(9);
    flashRing.lineStyle(2, 0xffffff, 0.5);
    flashRing.strokeCircle(m.x, m.y, 16);
    this.tweens.add({ targets: flashRing, scaleX: 2, scaleY: 2, alpha: 0, duration: 400, onComplete: () => flashRing.destroy() });
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
      if (this.targetRing) { this.targetRing.destroy(); this.targetRing = null; }
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
    if (this.targetRing) { this.targetRing.destroy(); this.targetRing = null; }
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
        ps = { sprite: g, glow, trail: [], prevX: p.x, prevY: p.y, col };
        this.projectileSprites[p.id] = ps;
      }

      const dx = p.x - ps.prevX;
      const dy = p.y - ps.prevY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 4 && ps.trail) {
        const trailG = this.add.graphics().setDepth(10).setAlpha(0.4);
        trailG.fillStyle(ps.col, 0.3);
        trailG.fillCircle(0, 0, ps.col === 0xff6600 ? 5 : 3);
        trailG.setPosition(ps.prevX, ps.prevY);
        ps.trail.push(trailG);
        this.tweens.add({ targets: trailG, alpha: 0, duration: 250, onComplete: () => { trailG.destroy(); if (ps.trail) ps.trail.splice(ps.trail.indexOf(trailG), 1); } });
      }
      ps.prevX = p.x;
      ps.prevY = p.y;

      ps.sprite.setPosition(p.x, p.y);
      if (ps.glow) ps.glow.setPosition(p.x, p.y);
    }
    for (const id in this.projectileSprites) {
      if (!activeIds.has(parseInt(id))) {
        const ps = this.projectileSprites[id];
        ps.sprite.destroy();
        if (ps.glow) ps.glow.destroy();
        if (ps.trail) { for (const t of ps.trail) t.destroy(); }
        delete this.projectileSprites[id];
      }
    }
  }

  clearProjectiles() {
    for (const id in this.projectileSprites) {
      const ps = this.projectileSprites[id];
      ps.sprite.destroy();
      if (ps.glow) ps.glow.destroy();
      if (ps.trail) { for (const t of ps.trail) t.destroy(); }
    }
    this.projectileSprites = {};
  }

  getItemTexture(itemKey) {
    if (!itemKey) return 'item_artifact';
    if (itemKey.includes('_scroll')) return 'item_scroll';
    if (itemKey.includes('pot')) return 'item_potion';
    if (itemKey.includes('staff') || itemKey.includes('_wand')) return 'item_staff';
    if (itemKey.includes('robe') || itemKey.includes('cloak')) return 'item_robe';
    if (itemKey.includes('ring') || itemKey.includes('_ring')) return 'item_ring';
    if (itemKey.includes('_orb') || itemKey.includes('_crystal') || itemKey.includes('boss_')) return 'item_artifact';
    return 'item_artifact';
  }

  addGroundItemSprite(item) {
    if (this.groundItemSprites[item.id]) return;
    const itemKey = item.k || '';
    const tier = ITEM_TIERS[itemKey] !== undefined ? ITEM_TIERS[itemKey] : 1;
    const rarityCol = parseInt((RARITY_COLORS[tier] || '#ffffff').replace('#', ''), 16);
    const isScroll = itemKey.includes('_scroll');
    const texKey = this.getItemTexture(itemKey);

    const sprite = this.add.image(0, 0, texKey).setDepth(5).setPosition(item.x, item.y);
    if (tier > 0) {
      const glow = this.add.graphics().setDepth(4);
      glow.fillStyle(rarityCol, 0.12);
      glow.fillCircle(item.x, item.y, 14);
      glow.lineStyle(1, rarityCol, 0.35);
      glow.strokeCircle(item.x, item.y, 12);
      this.groundItemSprites[item.id] = { sprite, zone: null, pulse: null, label: null, glow };
    } else {
      this.groundItemSprites[item.id] = { sprite, zone: null, pulse: null, label: null, glow: null };
    }

    const clickZone = this.add.rectangle(item.x, item.y, 22, 22, 0xffffff, 0).setInteractive().setDepth(5);
    const iid = item.id;
    clickZone.on('pointerdown', () => {
      this.network.emit('pickup_item', { itemId: iid });
    });

    const displayName = isScroll ? 'Scroll' : ITEM_NAMES[itemKey] || 'Item';
    const label = this.add.text(item.x, item.y - 14, displayName, {
      fontSize: '9px', fontFamily: 'monospace', color: RARITY_COLORS[tier], stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(6).setAlpha(0.85);
    this.groundItemSprites[item.id].zone = clickZone;
    this.groundItemSprites[item.id].label = label;

    const flash = this.add.circle(item.x, item.y, 4, rarityCol, 0.5).setDepth(6);
    this.tweens.add({ targets: flash, scaleX: 4, scaleY: 4, alpha: 0, duration: 400, onComplete: () => flash.destroy() });

    const pulse = this.tweens.add({
      targets: sprite, alpha: { from: 0.7, to: 1 }, duration: 900, yoyo: true, repeat: -1,
    });
    this.groundItemSprites[item.id].pulse = pulse;
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
        const gis = this.groundItemSprites[id];
        gis.sprite.destroy();
        if (gis.glow) gis.glow.destroy();
        if (gis.zone) gis.zone.destroy();
        if (gis.label) gis.label.destroy();
        if (gis.pulse) gis.pulse.stop();
        delete this.groundItemSprites[id];
      }
    }
  }

  clearGroundItems() {
    for (const id in this.groundItemSprites) {
      const gis = this.groundItemSprites[id];
      gis.sprite.destroy();
      if (gis.glow) gis.glow.destroy();
      if (gis.zone) gis.zone.destroy();
      if (gis.label) gis.label.destroy();
      if (gis.pulse) gis.pulse.stop();
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

  showTargetRing(x, y) {
    if (this.targetRing) { this.targetRing.destroy(); this.targetRing = null; }
    this.targetRing = this.add.graphics().setDepth(7);
    const pulse = { t: 0 };
    this.tweens.add({
      targets: pulse, t: 1, duration: 600, yoyo: true, repeat: -1,
      onUpdate: () => {
        if (!this.targetRing || !this.targetMonster) return;
        const ms = this.monsterSprites[this.targetMonster];
        if (!ms) return;
        this.targetRing.clear();
        this.targetRing.lineStyle(2, 0xffcc00, 0.5 + pulse.t * 0.3);
        this.targetRing.strokeCircle(ms.sprite.x, ms.sprite.y, 14);
      },
    });
  }

  showLevelUp(level) {
    window.soundManager.playLevelUp();
    this.addChatMessage('System', 'LEVEL UP! You are now level ' + level + '!', '#ffcc00');
    this.cameras.main.shake(300, 0.01);
    this.cameras.main.flash(500, 255, 255, 200);
    const t = this.add.text(320, 200, 'LEVEL UP!\nLevel ' + level, { fontSize: '24px', fontFamily: 'monospace', color: '#ffcc00', stroke: '#000000', strokeThickness: 4, align: 'center' }).setOrigin(0.5).setDepth(200);
    this.tweens.add({
      targets: t, scaleX: 1.8, scaleY: 1.8, alpha: 0, duration: 2000,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
    if (this.particles) {
      this.particles.ring(320, 200, 0xffcc00, 12, 80, 700);
      this.particles.burst(320, 200, 15, { color: 0xffcc00, spread: 60, speed: 50, size: 3, life: 900 });
    }
  }

  respawn() {
    if (this.dead) {
      this.dead = false;
      window.soundManager.playRespawn();
      this.network.emit('respawn');
      if (this.playerSprite) {
        this.playerSprite.setAlpha(0.3);
        this.tweens.add({ targets: this.playerSprite, alpha: 1, duration: 500, ease: 'Cubic.easeOut' });
        const ring = this.add.graphics().setDepth(10);
        ring.fillStyle(0x88ff88, 0.2); ring.fillCircle(this.playerSprite.x, this.playerSprite.y, 6);
        this.tweens.add({ targets: ring, scaleX: 6, scaleY: 6, alpha: 0, duration: 600, onComplete: () => ring.destroy() });
      }
    }
  }

  toggleInventory() {
    this.showingInventory = !this.showingInventory;
    if (this.showingInventory) { window.soundManager.playInventoryOpen(); this.showInventory(); }
    else { window.soundManager.playInventoryClose(); this.hideInventory(); }
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
      const eqName = eq ? (ITEM_NAMES[eq] || eq) : '(empty)';
      const val = eqName.length > 20 ? eqName.slice(0, 20) + '..' : eqName;
      const eText = this.add.text(120, 62 + i * 18, val, { fontSize: '10px', fontFamily: 'monospace', color: '#ffffff', wordWrap: { width: 200 } }).setDepth(150);
      this.inventoryElements.push(eText);
    }

    const spSection = this.statPoints > 0;
    if (spSection) {
      const spBg = this.add.graphics().setDepth(150);
      spBg.fillStyle(0x443300, 0.6); spBg.fillRect(40, 114, 300, 38);
      spBg.lineStyle(1, 0xffcc00, 0.5); spBg.strokeRect(40, 114, 300, 38);
      this.inventoryElements.push(spBg);

      const spTitle = this.add.text(50, 116, 'SKILL POINTS: ' + this.statPoints + '  (Press I to close)', { fontSize: '11px', fontFamily: 'monospace', color: '#ffcc00' }).setDepth(150);
      this.inventoryElements.push(spTitle);
      const stats = [{k:'hp',l:'+10 HP'},{k:'mp',l:'+8 MP'},{k:'atk',l:'+2 ATK'},{k:'def',l:'+2 DEF'}];
      for (let si = 0; si < 4; si++) {
        const sx = 50 + si * 72;
        const bg = this.add.graphics().setDepth(151);
        bg.fillStyle(0x665522); bg.fillRoundedRect(sx, 130, 66, 20, 4);
        bg.lineStyle(1, 0xffcc00, 0.4); bg.strokeRoundedRect(sx, 130, 66, 20, 4);
        bg.setInteractive(new Phaser.Geom.Rectangle(sx, 130, 66, 20), Phaser.Geom.Rectangle.Contains);
        const sk = stats[si].k;
        bg.on('pointerdown', () => { this.network.emit('allocate_stat', { stat: sk }); this.showInventory(); });
        this.inventoryElements.push(bg);
        const t = this.add.text(sx + 33, 140, stats[si].l, { fontSize: '11px', fontFamily: 'monospace', color: '#ffcc00' }).setOrigin(0.5).setDepth(152);
        this.inventoryElements.push(t);
      }
    }

    const invTitle = this.add.text(50, 120 + (spSection ? 38 : 0), 'Items (' + Math.min(this.inventory.length, 20) + ')', { fontSize: '11px', fontFamily: 'monospace', color: '#88ff88' }).setDepth(150);
    this.inventoryElements.push(invTitle);

    const maxShow = Math.min(this.inventory.length, 20);
    const itemsPerRow = 3;
    const invOffset = this.statPoints > 0 ? 38 : 0;
    for (let i = 0; i < maxShow; i++) {
      const itemKey = this.inventory[i];
      const col = i % itemsPerRow;
      const row = Math.floor(i / itemsPerRow);
      const ix = 50 + col * 175;
      const iy = 140 + invOffset + row * 32;

      const itemType = ITEM_TYPES[itemKey] || '';
      const isConsumable = itemType === 'consumable';
      const isEquippable = !isConsumable && itemType !== 'scroll' && itemType !== '';

      const bg = this.add.graphics().setDepth(150);
      bg.fillStyle(0x444444); bg.fillRect(ix, iy, 165, 26);
      bg.lineStyle(1, 0x666666); bg.strokeRect(ix, iy, 165, 26);
      bg.setInteractive(new Phaser.Geom.Rectangle(ix, iy, 165, 26), Phaser.Geom.Rectangle.Contains);
      const iidItem = i;
      const tooltipData = ITEM_DESCS[itemKey] || null;
      const tooltipStats = ITEM_STATS[itemKey] || null;
      bg.on('pointerover', () => {
        if (this._itemTooltip) this._itemTooltip.destroy();
        const lines = [displayName + ' (' + (RARITY_NAMES[tier] || 'Common') + ')'];
        if (tooltipData) lines.push(tooltipData);
        if (tooltipStats) {
          const parts = [];
          if (tooltipStats.atk) parts.push('ATK+' + tooltipStats.atk);
          if (tooltipStats.def) parts.push('DEF+' + tooltipStats.def);
          if (tooltipStats.hp) parts.push('HP+' + tooltipStats.hp);
          if (tooltipStats.mp) parts.push('MP+' + tooltipStats.mp);
          if (tooltipStats.heal) parts.push('Heal ' + tooltipStats.heal);
          if (tooltipStats.mana) parts.push('Mana ' + tooltipStats.mana);
          if (parts.length) lines.push(parts.join(' | '));
        }
        const yOff = Math.min(iy, 400);
        this._itemTooltip = this.add.text(ix + 170, yOff, lines.join('\n'), {
          fontSize: '10px', fontFamily: 'monospace', color: '#ffffff',
          backgroundColor: '#000000cc', padding: { x: 4, y: 2 },
        }).setDepth(200);
      });
      bg.on('pointerout', () => {
        if (this._itemTooltip) { this._itemTooltip.destroy(); this._itemTooltip = null; }
      });
      this.inventoryElements.push(bg);


      const displayName = ITEM_NAMES[itemKey] || itemKey;
      const shortKey = displayName.length > 16 ? displayName.slice(0, 16) + '..' : displayName;
      const tier = ITEM_TIERS[itemKey] !== undefined ? ITEM_TIERS[itemKey] : 0;
      const nameColor = RARITY_COLORS[tier] || '#ffffff';
      const iText = this.add.text(ix + 4, iy + 1, shortKey, { fontSize: '10px', fontFamily: 'monospace', color: nameColor }).setDepth(150);
      this.inventoryElements.push(iText);

      if (isConsumable) {
        const useBg = this.add.graphics().setDepth(151);
        useBg.fillStyle(0x335533); useBg.fillRect(ix + 2, iy + 14, 50, 10);
        useBg.setInteractive(new Phaser.Geom.Rectangle(ix + 2, iy + 14, 50, 10), Phaser.Geom.Rectangle.Contains);
        const iid = i;
        useBg.on('pointerdown', () => { this.network.emit('use_item', { itemKey: this.inventory[iid] }); this.showInventory(); });
        this.inventoryElements.push(useBg);
        const useText = this.add.text(ix + 27, iy + 15, 'Use', { fontSize: '10px', fontFamily: 'monospace', color: '#88ff88' }).setOrigin(0.5).setDepth(152);
        this.inventoryElements.push(useText);
      } else if (isEquippable) {
        const eqBg = this.add.graphics().setDepth(151);
        eqBg.fillStyle(0x333355); eqBg.fillRect(ix + 56, iy + 14, 50, 10);
        eqBg.setInteractive(new Phaser.Geom.Rectangle(ix + 56, iy + 14, 50, 10), Phaser.Geom.Rectangle.Contains);
        const iid2 = i;
        eqBg.on('pointerdown', () => { this.network.emit('equip_item', { itemKey: this.inventory[iid2] }); this.showInventory(); });
        this.inventoryElements.push(eqBg);
        const eqText = this.add.text(ix + 81, iy + 15, 'Equip', { fontSize: '10px', fontFamily: 'monospace', color: '#8888ff' }).setOrigin(0.5).setDepth(152);
        this.inventoryElements.push(eqText);
      }
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
    const hint = this.add.text(10, 402, 'Enter to send | Esc to cancel', { fontSize: '10px', fontFamily: 'monospace', color: '#666666' }).setDepth(200);
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
      else if (msg.y < targetY) msg.y = Math.min(targetY, msg.y + 2.5);

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

    const pad = this.input.gamepad && this.input.gamepad.pad1;
    if (pad) {
      const ax = pad.leftStick.x;
      const ay = pad.leftStick.y;
      if (Math.abs(ax) > 0.2) { dx = ax > 0 ? 1 : -1; direction = ax > 0 ? 'right' : 'left'; }
      if (Math.abs(ay) > 0.2) { dy = ay > 0 ? 1 : -1; direction = ay > 0 ? 'down' : 'up'; }
      if (pad.A) this.selectSpell(0);
      if (pad.B || pad.X) { if (this.spells[1]) this.selectSpell(1); }
      if (pad.Y) this.toggleInventory();
      if (pad.L1) this.toggleHelp();
      if (pad.R1 && this.dead) this.respawn();
    }

    if (this.keys.A.isDown || this.keys.LEFT.isDown || this.touch.left) { dx = -1; direction = 'left'; }
    else if (this.keys.D.isDown || this.keys.RIGHT.isDown || this.touch.right) { dx = 1; direction = 'right'; }

    if (this.keys.W.isDown || this.keys.UP.isDown || this.touch.up) { dy = -1; direction = 'up'; }
    else if (this.keys.S.isDown || this.keys.DOWN.isDown || this.touch.down) { dy = 1; direction = 'down'; }

    const moving = dx !== 0 || dy !== 0;

    const sprinting = (this.keys.SHIFT.isDown || this.touchSprint) && this.myStats.mp > 0;
    const wasSprinting = this.isSprinting;
    this.isSprinting = sprinting && moving;
    if (this.isSprinting && !wasSprinting) window.soundManager.playSprint();

    if (moving) {
      if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

      const dt = delta / 1000;
      const speedMult = sprinting ? 2 : 1;
      let newX = this.playerSprite.x + dx * SPEED * speedMult * dt;
      let newY = this.playerSprite.y + dy * SPEED * speedMult * dt;

      const margin = 16;
      newX = Phaser.Math.Clamp(newX, margin, COLS * TILE_SIZE - margin);
      newY = Phaser.Math.Clamp(newY, margin, ROWS * TILE_SIZE - margin);

      const tileX = Math.floor(newX / TILE_SIZE);
      const tileY = Math.floor(newY / TILE_SIZE);

      if (this.mapData && this.mapData[tileY] && this.mapData[tileY][tileX] !== undefined) {
        const tile = this.mapData[tileY][tileX];
        if (tile === 0 || tile === 4 || tile === 5 || tile === 6 || tile === 7 || tile === 8 || tile === 9 || tile === 10 || tile === 11 || tile === 12) {
          this.playerSprite.x = newX;
          this.playerSprite.y = newY;
        }
      } else {
        this.playerSprite.x = newX;
        this.playerSprite.y = newY;
      }

      this.playerSprite.setScale(direction === 'left' ? -1 : 1, 1);

      this.walkCycle += delta * (sprinting ? 0.015 : 0.01);
      this.walkBob = Math.sin(this.walkCycle) * 3;
      const walkSway = Math.cos(this.walkCycle * 1.3) * 1.5;
      this.playerSprite.y += this.walkBob;
      this.playerSprite.x += walkSway;
      this.playerSprite.rotation = Math.sin(this.walkCycle * 2) * 0.04;

      this.walkSoundTimer -= delta;
      if (this.walkSoundTimer <= 0) {
        window.soundManager.playWalk();
        this.walkSoundTimer = sprinting ? 300 : 450;
      }
    } else {
      this.playerSprite.setScale(direction === 'left' ? -1 : 1, 1);
      this.walkBob = 0;
      this.playerSprite.rotation = 0;
    }

    if (this.isSprinting) {
      for (let i = this.sprintLines.length - 1; i >= 0; i--) {
        const sl = this.sprintLines[i];
        sl.alpha -= delta * 0.003;
        if (sl.alpha <= 0) { sl.destroy(); this.sprintLines.splice(i, 1); }
      }
      if (Math.random() < 0.3) {
        const offX = direction === 'right' ? -10 : direction === 'left' ? 10 : (Math.random() - 0.5) * 8;
        const offY = direction === 'up' ? 10 : direction === 'down' ? -10 : (Math.random() - 0.5) * 8;
        const sl = this.add.text(this.playerSprite.x + offX, this.playerSprite.y + offY, '|', { fontSize: '6px', fontFamily: 'monospace', color: '#88ccff' }).setOrigin(0.5).setDepth(8).setAlpha(0.5);
        this.sprintLines.push(sl);
      }
      if (this.sprintMpTimer === undefined) this.sprintMpTimer = 0;
      this.sprintMpTimer += delta;
      if (this.sprintMpTimer > 200 && this.myStats.mp > 0) {
        this.sprintMpTimer = 0;
        this.showDamageNumber(this.playerSprite.x + 10, this.playerSprite.y - 16, '-1 MP', '#8888ff');
      }
    } else {
      for (let i = this.sprintLines.length - 1; i >= 0; i--) {
        this.sprintLines[i].destroy();
      }
      this.sprintLines = [];
      this.sprintMpTimer = 0;
    }

    if (this.sprintText) {
      this.sprintText.setText(this.isSprinting ? 'SPRINT' : '');
      this.sprintText.setAlpha(this.isSprinting ? 0.6 + Math.sin(Date.now() * 0.008) * 0.3 : 0);
    }

    if (this.equipmentAura && this.playerSprite) {
      this.equipmentAura.setPosition(this.playerSprite.x, this.playerSprite.y);
    }
    if (this.equipmentOverlay && this.playerSprite) {
      this.equipmentOverlay.setPosition(this.playerSprite.x, this.playerSprite.y);
    }

    for (const oid in this.otherPlayers) {
      const op = this.otherPlayers[oid];
      if (!op.sprite) continue;
      if (op.serverMoving) {
        op.walkCycle += delta * 0.01;
        op.sprite.y += Math.sin(op.walkCycle) * 2;
      }
    }

    if (direction !== this.facingDir || (moving && direction !== this.facingDir)) {
      this.facingDir = direction;
      const baseKey = 'player_' + this.playerClass;
      if (direction === 'up') {
        this.playerSprite.setTexture(baseKey + '_back');
      } else {
        this.playerSprite.setTexture(baseKey);
      }
    }

    if (time - this.lastMoveSent > MOVE_THROTTLE && this.network) {
      this.network.emit('move', {
        x: Math.round(this.playerSprite.x),
        y: Math.round(this.playerSprite.y),
        direction: direction,
        moving: moving,
        sprinting: this.isSprinting,
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

    if (this.spellSlots) {
      const now = Date.now();
      const cd = 1500;
      for (let i = 0; i < 5; i++) {
        const slot = this.spellSlots[i];
        if (slot.key === this.selectedSpell) {
          const pulse = 0.6 + Math.sin(this.pulseTime * 0.005) * 0.4;
          slot.highlight.clear();
          slot.highlight.lineStyle(2, Phaser.Display.Color.GetColor(Math.floor(255 * pulse), Math.floor(200 * pulse), 0));
          slot.highlight.strokeRect(70 + i * 102, 424, 96, 40);
        }
        const elapsed = now - (slot.lastCast || 0);
        const pct = Math.min(1, elapsed / cd);
        slot.cdBar.clear();
        if (pct < 1) {
          const bw = 96 * (1 - pct);
          slot.cdBar.fillStyle(0x000000, 0.5);
          slot.cdBar.fillRect(70 + i * 102, 424, bw, 40);
        }
      }
    }

    if (this.minimap && this.playerSprite) {
      const otherPlayers = this.otherPlayerSprites ? Object.values(this.otherPlayerSprites).map(p => ({ x: p.sprite.x, y: p.sprite.y, a: p.sprite.alpha > 0.5 })) : [];
      const monsters = this.monsterSprites ? Object.values(this.monsterSprites).map(m => ({ x: m.sprite.x, y: m.sprite.y, boss: m.boss })) : [];
      this.minimap.update(this.playerSprite.x, this.playerSprite.y, monsters, otherPlayers);
    }
    this._updateNetStatus();
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
    const lines = ['--- GOAL ---', ''];
    for (let i = 0; i < 5; i++) {
      const visited = this.zonesVisited && this.zonesVisited[zones[i]];
      const icon = visited ? '[X]' : '[ ]';
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
    const shortLore = lore.length > 200 ? lore.slice(0, 197) + '...' : lore;
    this.zoneLoreText = this.add.text(320, 110, zoneName + '\n' + shortLore, {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: color || '#88ccff',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center',
      lineSpacing: 5,
      wordWrap: { width: 360 },
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
    this.sendChatMessage('System', 'WASD/Arrows to move | Shift to sprint (costs MP)', '#88ccff');
    this.sendChatMessage('System', 'Press 1-5 to select a spell, then CLICK anywhere to cast it at that spot', '#88ff88');
    this.sendChatMessage('System', 'Click monsters to target them | Click items on ground to pick up', '#88ccff');
    this.sendChatMessage('System', 'Press I for inventory — spend SKILL POINTS there on level up!', '#ffcc00');
    this.sendChatMessage('System', 'Press H for help | Enter to chat | R to respawn', '#88ccff');
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

    const closeZone = this.add.rectangle(320, 240, 640, 480, 0xffffff, 0).setInteractive().setDepth(302);
    closeZone.on('pointerdown', () => this.toggleHelp());
    this.helpElements.push(closeZone);

    const closeBtn = this.add.text(580, 440, '[ CLOSE ]', { fontSize: '12px', fontFamily: 'monospace', color: '#ffcc00', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5).setDepth(303);
    const closeBtnZone = this.add.rectangle(580, 440, 100, 24, 0xffffff, 0).setInteractive().setDepth(304);
    closeBtnZone.on('pointerdown', (e) => { e.stopPropagation(); this.toggleHelp(); });
    this.helpElements.push(closeBtn);
    this.helpElements.push(closeBtnZone);

    const lines = [
      { text: '=== GUIDE BOOK ===', color: '#ffcc00', s: 14 },
      { text: '', color: '#ffffff', s: 8 },
      { text: '--- CONTROLS ---', color: '#88ccff', s: 12 },
      { text: 'WASD / Arrow Keys : Move', color: '#cccccc', s: 10 },
      { text: 'Shift : Sprint (costs MP)', color: '#cccccc', s: 10 },
      { text: '1-5 : Select a spell slot', color: '#cccccc', s: 10 },
      { text: 'Click : Cast selected spell at cursor', color: '#cccccc', s: 10 },
      { text: 'Click monster : Target it (track HP)', color: '#cccccc', s: 10 },
      { text: 'I : Inventory (use potions, equip gear)', color: '#cccccc', s: 10 },
      { text: 'Enter : Chat with other players', color: '#cccccc', s: 10 },
      { text: 'R : Respawn after death', color: '#cccccc', s: 10 },
      { text: 'H / Esc : Open/close Guide', color: '#cccccc', s: 10 },
      { text: 'Gamepad : Left stick move, A/B/X cast, Y inventory', color: '#cccccc', s: 10 },
      { text: '', color: '#ffffff', s: 6 },
      { text: '--- HOW TO PLAY ---', color: '#88ccff', s: 12 },
      { text: '1. Kill monsters to earn XP and loot', color: '#aaaaaa', s: 10 },
      { text: '2. Level up to grow stronger', color: '#aaaaaa', s: 10 },
      { text: '3. Equip better gear from loot drops', color: '#aaaaaa', s: 10 },
      { text: '4. Use potions to restore HP/MP', color: '#aaaaaa', s: 10 },
      { text: '5. Walk to zone edges to explore new areas', color: '#aaaaaa', s: 10 },
      { text: '6. Learn new spells from scroll drops', color: '#aaaaaa', s: 10 },
      { text: '', color: '#ffffff', s: 6 },
      { text: '--- ZONES (in order) ---', color: '#88ccff', s: 12 },
      { text: 'Meadow (Lv1-5) -> Forest (Lv5-10)', color: '#88ff88', s: 10 },
      { text: 'Caves (Lv10-15) -> Ruins (Lv15-20)', color: '#88ff88', s: 10 },
      { text: 'Tower (Lv20+) - Final boss: Aether Lord', color: '#ffcc00', s: 10 },
      { text: '', color: '#ffffff', s: 6 },
      { text: '--- ITEM RARITY ---', color: '#88ccff', s: 12 },
      { text: 'Common (white) | Uncommon (green)', color: '#cccccc', s: 10 },
      { text: 'Rare (blue) | Epic (purple)', color: '#cccccc', s: 10 },
      { text: 'Legendary (orange) - best gear!', color: '#ff8800', s: 10 },
      { text: '', color: '#ffffff', s: 6 },
      { text: '--- TIPS ---', color: '#88ccff', s: 12 },
      { text: 'HP/MP regenerate over time', color: '#88ff88', s: 10 },
      { text: 'Edge tiles glow blue - walk there to move on', color: '#88ccff', s: 10 },
      { text: 'Blue arrows on edges show exit direction', color: '#88ccff', s: 10 },
      { text: 'You can only equip 1 weapon, 1 armor, 1 ring', color: '#aaaaaa', s: 10 },
      { text: 'Scrolls teach you permanent new spells', color: '#aaaaaa', s: 10 },
    ];

    let y = 22;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const t = this.add.text(320, y, l.text, { fontSize: l.s + 'px', fontFamily: 'monospace', color: l.color }).setOrigin(0.5, 0).setDepth(301);
      this.helpElements.push(t);
      y += (l.text === '' ? 4 : l.s > 12 ? 24 : l.s > 10 ? 18 : 14);
      if (y > 445) break;
    }
  }

  hideHelp() {
    this.showingHelp = false;
    this.helpElements.forEach(e => e.destroy());
    this.helpElements = [];
  }

  _createNetStatus() {
    this.netStatusText = this.add.text(2, 478, '', {
      fontSize: '8px', fontFamily: 'monospace', color: '#44ff44',
    }).setDepth(200).setAlpha(0.6);
  }

  _updateNetStatus() {
    if (!this.netStatusText) return;
    const connected = this.network && this.network.connected;
    this.netStatusText.setText(connected ? 'connected' : 'DISCONNECTED');
    this.netStatusText.setColor(connected ? '#44ff44' : '#ff4444');
  }

  sendChatMessage(name, text, color) {
    this.addChatMessage(name, text, color);
  }

  shutdown() {
    window.soundManager.stopAmbient();
    if (this.particles) this.particles.destroy();
    if (this.minimap) this.minimap.destroy();
    if (this.equipmentOverlay) this.equipmentOverlay.destroy();
    if (this.netStatusText) this.netStatusText.destroy();
    if (this.petSprite) this.petSprite.destroy();
    if (this.petName) this.petName.destroy();
  }
}
