const TILE_SIZE = 32;
const COLS = 20;
const ROWS = 15;
const SPEED = 160;
const MOVE_THROTTLE = 50;
const TILE_TEXTURES = ['tile_0', 'tile_1', 'tile_2', 'tile_3', 'tile_4', 'tile_5', 'tile_6', 'tile_7', 'tile_8', 'tile_9', 'tile_10', 'tile_11', 'tile_12'];
const ZONE_LEVELS = {
  meadow: { min: 1, max: 5 },
  forest: { min: 5, max: 10 },
  caves: { min: 10, max: 15 },
  ruins: { min: 15, max: 20 },
  tower: { min: 20, max: 25 },
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
    this.moveVx = 0;
    this.moveVy = 0;
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
    this.dead = false;
    this.damageTexts = [];
    this.progressMonstersKilled = 0;
    this.statPoints = 0;
    this.myGold = 0;
    this.allocatedStats = { hp: 0, mp: 0, atk: 0, def: 0 };
    this.zonesVisited = { meadow: true };
    this.weakened = false;
    this.questShown = false;
    this.levelUpText = null;
    this.levelUpTimer = 0;
    this.facingDir = 'down';
    this.walkBob = 0;
    this.walkCycle = 0;
    this.walkFrame = 0;
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
    this.chatBox = new ChatBox(this, this.network);
    this.invPanel = new InventoryPanel(this, this.network);
    this.setupNetwork();
    this.network.connect();
    if (this.input.gamepad) this.input.gamepad.start();

    this.helpPanel = new HelpPanel(this);

    this.input.keyboard.on('keydown', (event) => {
      if (event.key === 'h' || event.key === 'H') { this.toggleHelp(); event.stopPropagation(); return; }

      if (this.helpPanel.visible) {
        if (event.key === 'h' || event.key === 'H' || event.key === 'Escape') { this.toggleHelp(); event.stopPropagation(); }
        return;
      }

      if (this.chatBox.isChatting) {
        if (event.key === 'Enter') {
          if (this.chatBox.input.length > 0 && this.network) {
            this.network.emit('chat_message', { text: this.chatBox.input });
          }
          this.chatBox.isChatting = false;
          this.chatBox.hideInput();
        } else if (event.key === 'Escape') {
          this.chatBox.isChatting = false;
          this.chatBox.hideInput();
        } else if (event.key === 'Backspace') {
          this.chatBox.input = this.chatBox.input.slice(0, -1);
          this.chatBox.updateInputText();
        } else if (event.key.length === 1 && this.chatBox.input.length < 80) {
          this.chatBox.input += event.key;
          this.chatBox.updateInputText();
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
        this.chatBox.isChatting = true;
        this.chatBox.input = '';
        this.chatBox.showInput();
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

    this.input.on('pointermove', (pointer) => {
      this.mouseX = pointer.x;
      this.mouseY = pointer.y;
    });

    this.input.on('pointerdown', (pointer) => {
      if (this.chatBox.isChatting || this.invPanel.visible) return;
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
        if (this.hud) {
          for (const s of this.hud.spellSlots) { if (s.key === this.selectedSpell) s.lastCast = Date.now(); }
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
    this.targetPreview = new TargetPreview(this);
    this._createNetStatus();
    window.soundManager.setZone('meadow');
    window.soundManager.startAmbient();
    this.createVirtualControls();
  }

  createVirtualControls() {
    this.touch = { up: false, down: false, left: false, right: false };
    const isTouch = this.sys.game.device.input.touch;
    if (!isTouch) return;

    const cssW = this.sys.game.scale.width;
    const resp = Math.max(1, 500 / cssW);

    const btn = (label, x, y, w, h, cb, held) => {
      const fs = Math.round(14 * resp);
      const bg = this.add.graphics().setDepth(250).setAlpha(0.5);
      bg.fillStyle(0x333333); bg.fillRoundedRect(x, y, w, h, Math.round(6 * resp));
      bg.lineStyle(Math.max(1, resp), 0x888888); bg.strokeRoundedRect(x, y, w, h, Math.round(6 * resp));
      this.add.text(x + w/2, y + h/2, label, { fontSize: fs + 'px', fontFamily: 'monospace', color: '#ffffff' }).setOrigin(0.5).setDepth(251);
      const zone = this.add.rectangle(x + w/2, y + h/2, w, h, 0xffffff, 0).setInteractive({ useHandCursor: true }).setDepth(252);
      zone.on('pointerdown', () => cb(true));
      if (held) { zone.on('pointerup', () => cb(false)); zone.on('pointerout', () => cb(false)); }
    };

    const D = Math.round(38 * resp);
    const g = Math.max(1, Math.round(2 * resp));
    const row1y = Math.round(480 - 3 * D - 2 * g);
    const row2y = row1y + D + g;
    const row3y = row2y + D + g;
    const padL = Math.round(6 * resp);
    const off = Math.round(4 * resp);

    btn('\u25B2', padL + off, row1y, D, D, (v) => { this.touch.up = v; }, true);
    btn('\u25BC', padL + off, row3y, D, D, (v) => { this.touch.down = v; }, true);
    btn('\u25C0', padL, row2y, D, D, (v) => { this.touch.left = v; }, true);
    btn('\u25B6', padL + off + D + g, row2y, D, D, (v) => { this.touch.right = v; }, true);

    const sx = 640 - Math.round(88 * resp);
    const sw = Math.round(82 * resp);
    const sh = Math.round(34 * resp);

    btn('R', sx, 135, sw, Math.round(24 * resp), () => { if (this.dead) this.respawn(); });
    btn('I', sx, 165, Math.round(38 * resp), Math.round(28 * resp), () => { if (!this.invPanel.visible) this.toggleInventory(); });
    btn('H', sx + Math.round(42 * resp), 165, Math.round(38 * resp), Math.round(28 * resp), () => { if (!this.helpPanel.visible) this.toggleHelp(); });
    btn('CHAT', sx, 197 + Math.round(4 * resp), sw, Math.round(28 * resp), () => { this.chatBox.isChatting = true; this.chatBox.input = ''; this.chatBox.showInput(); });

    for (let i = 0; i < 5; i++) {
      btn('' + (i + 1), sx, 245 + i * (sh + g), sw, sh, () => { if (this.spells[i]) this.selectSpell(i); });
    }

    this.touchSprint = false;
    btn('>>', sx, 245 + 5 * (sh + g), sw, sh, () => { this.touchSprint = !this.touchSprint; });
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
      if (data.player.g !== undefined) { self.myGold = data.player.g; self.hud.updateGold(data.player.g); }
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
        if (me.g !== undefined) { self.myGold = me.g; if (self.hud) self.hud.updateGold(me.g); }
        if (me.w !== undefined) { self.weakened = me.w === 1; if (self.hud) self.hud.updateWeakened(self.weakened); }
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
      window.soundManager.setZone(data.zone);
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
        if (self.hud) self.hud.setZoneLabel(self.zoneLabel);
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
      if (self.hud) self.updateXPBar(data.xpe || self.myStats.xp);
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
          if (data.a >= 20) self.cameras.main.shake(100, 0.006);
          if (data.a >= 40) self.cameras.main.shake(150, 0.01);
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
      if (data.gold !== undefined) {
        self.myGold = data.gold;
        if (self.hud) self.hud.updateGold(data.gold);
        if (self.invPanel.visible) self.invPanel.refreshShop();
      }
      self.updateSpellBar();
      if (self.invPanel.visible) self.invPanel.show(self.inventory, self.equipped, self.statPoints);
    });

    self.network.on('shop_data', (data) => {
      self.shopData = data;
      if (self.invPanel.visible) self.invPanel.refreshShop();
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

    const overlayColors = { 1: 0xffffff, 2: 0x44ff44, 3: 0x44ccff, 4: 0xcc44ff, 5: 0xff8800 };

    if (this.equipped.weapon) {
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

    if (this.equipped.armor) {
      const aTier = ITEM_TIERS[this.equipped.armor] || 1;
      const aCol = overlayColors[aTier] || 0xffffff;
      this.equipmentOverlay.fillStyle(aCol, 0.15);
      this.equipmentOverlay.fillRect(-8, -5, 16, 16);
    }

    if (this.equipped.accessory) {
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
    this.hud = new HUD(this, this.playerClass, this.playerName);
    if (this.myStats) {
      this.hud.updateStats({ ...this.myStats, statPoints: this.statPoints });
      this.hud.updateXPBar(this.myStats.xp || 0, this.myStats.level || 1);
    }
    this.hud.setZonesVisited(this.zonesVisited);
    this.hud.updateProgressText(this.progressMonstersKilled, this.myStats?.level || 1);
    this.hud.createSpellBar(this.spells);
  }

  updateHUD() {
    if (!this.hud) return;
    this.hud.updateStats({ ...this.myStats, statPoints: this.statPoints });
  }

  updateXPBar(xp) {
    if (this.hud) this.hud.updateXPBar(xp || 0, this.myStats?.level || 1);
  }

  createSpellBar() {
    if (this.hud) this.hud.createSpellBar(this.spells);
  }

  updateSpellBar() {
    if (this.hud) this.hud.updateSpellBar(this.spells, this.myStats?.mp || 0);
  }

  selectSpell(idx) {
    if (idx >= 0 && idx < this.spells.length) {
      this.selectedSpell = this.hud ? this.hud.selectSpell(idx, this.spells) : null;
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
    this.otherPlayers[id] = { sprite, nameText, hpBar, walkCycle: Math.random() * Math.PI * 2, serverMoving: false, moveVx: 0, moveVy: 0 };
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
        pObj.prevX = pObj.sprite.x;
        pObj.prevY = pObj.sprite.y;
        pObj.targetX = pData.x;
        pObj.targetY = pData.y;
        pObj.lastUpdate = this.time.now;
        pObj.nameText.setPosition(pData.x, pData.y - 20);
        pObj.sprite.setAlpha((pData.a !== undefined ? pData.a : pData.alive) ? 1 : 0.3);
        const otherDir = pData.d || 'down';
        const otherClass = pData.c || 'mage';
        const otherFacingUp = otherDir === 'up' || otherDir === 'up-left' || otherDir === 'up-right';
        const otherFacingLeft = otherDir === 'left' || otherDir === 'up-left' || otherDir === 'down-left';
        pObj.sprite.setTexture(otherFacingUp ? 'player_' + otherClass + '_back' : 'player_' + otherClass);
        pObj.sprite.setScale(otherFacingLeft ? -1 : 1, 1);
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
    const boss = m.b !== undefined ? m.b : (m.boss || false);
    const hp = m.h !== undefined ? m.h : m.hp;
    if (boss) window.soundManager.playBossRoar();
    const maxHp = m.mh !== undefined ? m.mh : m.maxHp;
    const texKey = boss ? 'monster_boss' : 'monster_' + key;
    const sprite = this.add.image(m.x, m.y, texKey).setDepth(8);

    const hpBar = this.add.graphics().setDepth(9);

    const zl = ZONE_LEVELS[this.currentZone];
    const pl = this.myStats.level;
    let nameColor = '#ffcc00';
    if (!boss && zl) {
      if (pl >= zl.max + 3) nameColor = '#88ff88';
      else if (pl >= zl.min - 2) nameColor = '#ffff88';
      else nameColor = '#ff6666';
    }
    const nameText = this.add.text(m.x, m.y - 20, name, { fontSize: '10px', fontFamily: 'monospace', color: nameColor, stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5).setDepth(9);

    const bSize = boss ? 40 : (key === 'treant' || key === 'golem' ? 32 : 24);
    const clickZone = this.add.rectangle(m.x, m.y, bSize, bSize, 0xffffff, 0).setInteractive({ useHandCursor: true }).setDepth(8);
    const mid = m.id;
    clickZone.on('pointerdown', () => {
      this.targetMonster = mid;
      this.updateSpellBar();
      this.showTargetRing(m.x, m.y);
      if (!this.selectedSpell && this.spells && this.spells.length > 0) {
        const autoSpell = this.spells[0];
        this.network.emit('cast_spell', {
          spell: autoSpell,
          toX: Math.round(m.x),
          toY: Math.round(m.y),
        });
        if (this.hud) {
          for (const s of this.hud.spellSlots) { if (s.key === autoSpell) s.lastCast = Date.now(); }
        }
      }
    });

    this.monsterSprites[m.id] = { sprite, hpBar, nameText, clickZone, boss, maxHp, _prevHp: hp, _statusGfx: null };
    this.updateMonsterHP(m.id, hp, maxHp);

    sprite.setAlpha(0);
    this.tweens.add({ targets: sprite, alpha: 1, duration: 300, ease: 'Cubic.easeOut' });
    const flashRing = this.add.graphics().setDepth(9);
    flashRing.lineStyle(2, 0xffffff, 0.5);
    flashRing.strokeCircle(m.x, m.y, 16);
    this.tweens.add({ targets: flashRing, scaleX: 2, scaleY: 2, alpha: 0, duration: 400, onComplete: () => flashRing.destroy() });
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

        if (ms._prevHp !== undefined && hp < ms._prevHp) {
          ms.sprite.setTint(0xffffff);
          this.time.delayedCall(80, () => { if (ms && ms.sprite && ms.sprite.active) ms.sprite.clearTint(); });
          if (ms._prevHp - hp > 15) {
            this.cameras.main.shake(80, 0.004);
          }
        }
        ms._prevHp = hp;

        const statusTypes = m.se || [];
        if (statusTypes.length > 0 && ms._statusGfx) {
          const sx = m.x, sy = m.y;
          ms._statusGfx.clear();
          ms._statusGfx.setPosition(sx, sy);
          const statusColors = { burn: 0xff6600, slow: 0xaa44ff, freeze: 0x44ccff, poison: 0x44ff44 };
          for (let si = 0; si < statusTypes.length; si++) {
            const col = statusColors[statusTypes[si].t] || 0xffffff;
            const offset = si * 3;
            ms._statusGfx.lineStyle(1.5, col, 0.8);
            ms._statusGfx.strokeCircle(0, 0, 12 + offset);
          }
          ms._statusGfx.setAlpha(0.5 + Math.sin(Date.now() * 0.005) * 0.3);
        } else if (statusTypes.length > 0 && !ms._statusGfx) {
          ms._statusGfx = this.add.graphics().setDepth(7);
        } else if (statusTypes.length === 0 && ms._statusGfx) {
          ms._statusGfx.destroy();
          ms._statusGfx = null;
        }

        this.updateMonsterHP(m.id, hp, maxHp);
        if (this.targetMonster === m.id) {
          const pct = Math.floor((hp / maxHp) * 100);
          if (this.hud) this.hud.targetInfo.setText(name + ' - HP: ' + hp + '/' + maxHp + ' (' + pct + '%)');
        }
      }
    }
    for (const id in this.monsterSprites) {
      if (!aliveIds.has(parseInt(id))) {
        const ms = this.monsterSprites[id];
        ms.sprite.destroy();
        ms.hpBar.destroy();
        if (ms.nameText) ms.nameText.destroy();
        if (ms.clickZone) ms.clickZone.destroy();
        if (ms._statusGfx) ms._statusGfx.destroy();
        delete this.monsterSprites[id];
      }
    }
    if (!aliveIds.has(this.targetMonster)) {
    this.targetMonster = null;
    this.mouseX = 0;
    this.mouseY = 0;
      if (this.hud) this.hud.targetInfo.setText('');
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
      const ms = this.monsterSprites[id];
      ms.sprite.destroy();
      ms.hpBar.destroy();
      if (ms.nameText) ms.nameText.destroy();
      if (ms.clickZone) ms.clickZone.destroy();
      if (ms._statusGfx) ms._statusGfx.destroy();
    }
    this.monsterSprites = {};
    this.targetMonster = null;
    if (this.hud) this.hud.targetInfo.setText('');
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
    let glow = null;
    if (tier > 0) {
      glow = this.add.graphics().setDepth(4);
      glow.fillStyle(rarityCol, 0.12);
      glow.fillCircle(item.x, item.y, 14);
      glow.lineStyle(1, rarityCol, 0.35);
      glow.strokeCircle(item.x, item.y, 12);
      this.groundItemSprites[item.id] = { sprite, zone: null, pulse: null, label: null, glow };
    } else {
      this.groundItemSprites[item.id] = { sprite, zone: null, pulse: null, label: null, glow: null };
    }

    const clickZone = this.add.rectangle(item.x, item.y, 22, 22, 0xffffff, 0).setInteractive({ useHandCursor: true }).setDepth(5);
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

    sprite.setScale(0);
    this.tweens.add({ targets: sprite, scaleX: 1, scaleY: 1, duration: 250, ease: 'Back.easeOut' });
    if (glow) { glow.setAlpha(0); this.tweens.add({ targets: glow, alpha: 1, duration: 300 }); }
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
    this.invPanel.toggle(this.inventory, this.equipped, this.statPoints);
  }

  addChatMessage(name, text, color) {
    this.chatBox.addMessage(name, text, color);
  }

  update(time, delta) {
    if (!this.playerSprite || this.chatBox.isChatting || this.invPanel.visible) return;

    if (this.dead) return;

    let dx = 0;
    let dy = 0;

    const pad = this.input.gamepad && this.input.gamepad.pad1;
    if (pad) {
      const ax = pad.leftStick.x;
      const ay = pad.leftStick.y;
      if (Math.abs(ax) > 0.2) dx = ax > 0 ? 1 : -1;
      if (Math.abs(ay) > 0.2) dy = ay > 0 ? 1 : -1;
      if (pad.A) this.selectSpell(0);
      if (pad.B || pad.X) { if (this.spells[1]) this.selectSpell(1); }
      if (pad.Y) this.toggleInventory();
      if (pad.L1) this.toggleHelp();
      if (pad.R1 && this.dead) this.respawn();
    }

    if (this.keys.A.isDown || this.keys.LEFT.isDown || this.touch.left) dx = -1;
    else if (this.keys.D.isDown || this.keys.RIGHT.isDown || this.touch.right) dx = 1;

    if (this.keys.W.isDown || this.keys.UP.isDown || this.touch.up) dy = -1;
    else if (this.keys.S.isDown || this.keys.DOWN.isDown || this.touch.down) dy = 1;

    const moving = dx !== 0 || dy !== 0;

    const sprinting = (this.keys.SHIFT.isDown || this.touchSprint) && this.myStats.mp > 0;
    const wasSprinting = this.isSprinting;
    this.isSprinting = sprinting && moving;
    if (this.isSprinting && !wasSprinting) window.soundManager.playSprint();

    const dt = Math.min(delta / 1000, 0.05);
    const speedMult = sprinting ? 2 : 1;

    if (moving) {
      if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
      const targetVx = dx * SPEED * speedMult;
      const targetVy = dy * SPEED * speedMult;
      const accel = 15;
      this.moveVx += (targetVx - this.moveVx) * Math.min(1, accel * dt);
      this.moveVy += (targetVy - this.moveVy) * Math.min(1, accel * dt);
    } else {
      const decel = 10;
      this.moveVx *= Math.max(0, 1 - decel * dt);
      this.moveVy *= Math.max(0, 1 - decel * dt);
    }

    if (Math.abs(this.moveVx) > 0.1 || Math.abs(this.moveVy) > 0.1) {
      const margin = 16;
      let newX = this.playerSprite.x + this.moveVx * dt;
      let newY = this.playerSprite.y + this.moveVy * dt;
      newX = Phaser.Math.Clamp(newX, margin, COLS * TILE_SIZE - margin);
      newY = Phaser.Math.Clamp(newY, margin, ROWS * TILE_SIZE - margin);

      const canWalk = (x, y) => {
        const tx = Math.floor(x / TILE_SIZE);
        const ty = Math.floor(y / TILE_SIZE);
        if (!this.mapData || !this.mapData[ty] || this.mapData[ty][tx] === undefined) return true;
        const t = this.mapData[ty][tx];
        return t === 0 || t === 4 || t === 5 || t === 6 || t === 7 || t === 8 || t === 9 || t === 10 || t === 11 || t === 12;
      };

      if (canWalk(newX, newY)) {
        this.playerSprite.x = newX;
        this.playerSprite.y = newY;
      } else {
        if (canWalk(newX, this.playerSprite.y)) { this.playerSprite.x = newX; this.moveVy = 0; }
        else { this.moveVx = 0; }
        if (canWalk(this.playerSprite.x, newY)) { this.playerSprite.y = newY; this.moveVx = 0; }
        else { this.moveVy = 0; }
      }
    }

    let direction = this.facingDir;
    if (moving) {
      if (dx < 0 && dy < 0) direction = 'up-left';
      else if (dx > 0 && dy < 0) direction = 'up-right';
      else if (dx < 0 && dy > 0) direction = 'down-left';
      else if (dx > 0 && dy > 0) direction = 'down-right';
      else if (dx < 0) direction = 'left';
      else if (dx > 0) direction = 'right';
      else if (dy < 0) direction = 'up';
      else if (dy > 0) direction = 'down';
    }

    const isMoving = Math.abs(this.moveVx) > 1 || Math.abs(this.moveVy) > 1;
    const baseKey = 'player_' + this.playerClass;
    const facingUp = direction === 'up' || direction === 'up-left' || direction === 'up-right';
    const facingLeft = direction === 'left' || direction === 'up-left' || direction === 'down-left';
    this.playerSprite.setTexture(baseKey + (facingUp ? '_back' : ''));
    this.playerSprite.setScale(facingLeft ? -1 : 1, 1);

    if (isMoving) {
      this.walkCycle += delta * (sprinting ? 0.012 : 0.008);
      this.playerSprite.y += Math.sin(this.walkCycle) * 1.5;

      this.walkSoundTimer -= delta;
      if (this.walkSoundTimer <= 0) {
        window.soundManager.playWalk();
        this.walkSoundTimer = sprinting ? 300 : 450;
      }
    } else {
      this.walkCycle = 0;
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

    if (this.hud) {
      this.hud.sprintText.setText(this.isSprinting ? 'SPRINT' : '');
      this.hud.sprintText.setAlpha(this.isSprinting ? 0.6 + Math.sin(Date.now() * 0.008) * 0.3 : 0);
    }

    if (this.equipmentAura && this.playerSprite) {
      this.equipmentAura.setPosition(this.playerSprite.x, this.playerSprite.y);
    }
    if (this.equipmentOverlay && this.playerSprite) {
      this.equipmentOverlay.setPosition(this.playerSprite.x, this.playerSprite.y);
    }

    for (const oid in this.otherPlayers) {
      const op = this.otherPlayers[oid];
      if (!op.sprite || op.targetX === undefined) continue;
      const elapsed = time - op.lastUpdate;
      const t = Math.min(elapsed / 50, 1);
      op.sprite.x = op.prevX + (op.targetX - op.prevX) * t;
      op.sprite.y = op.prevY + (op.targetY - op.prevY) * t;
      if (op.serverMoving) {
        op.walkCycle += delta * 0.01;
        op.sprite.y += Math.sin(op.walkCycle) * 2;
      }
    }

    this.facingDir = direction;

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
        if (this.hud) this.hud.targetInfo.setPosition(ms.sprite.x, ms.sprite.y + 24);
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

    if (this.hud) this.hud.updateSpellCooldowns(delta);

    if (this.targetPreview && this.selectedSpell && this.playerSprite) {
      this.targetPreview.show(this.playerSprite.x, this.playerSprite.y, this.mouseX, this.mouseY, this.selectedSpell);
    } else if (this.targetPreview) {
      this.targetPreview.hide();
    }

    if (this.minimap && this.playerSprite) {
      const otherPlayers = Object.values(this.otherPlayers).map(p => ({ x: p.sprite.x, y: p.sprite.y, a: p.sprite.alpha > 0.5 }));
      const monsters = this.monsterSprites ? Object.values(this.monsterSprites).map(m => ({ x: m.sprite.x, y: m.sprite.y, boss: m.boss })) : [];
      this.minimap.update(this.playerSprite.x, this.playerSprite.y, monsters, otherPlayers);
    }
    this._updateNetStatus();
  }

  updateProgressText() {
    if (this.hud) {
      this.hud.setZonesVisited(this.zonesVisited);
      this.hud.updateProgressText(this.progressMonstersKilled, this.myStats?.level || 1);
    }
  }

  showZoneLore(zoneName, lore, color) {
    if (this.hud) this.hud.showZoneLore(zoneName, lore, color);
  }

  showTutorial() {
    this.addChatMessage('System', 'WASD/Arrows to move | Shift to sprint (costs MP)', '#88ccff');
    this.addChatMessage('System', 'Press 1-5 to select a spell, then CLICK anywhere to cast it at that spot', '#88ff88');
    this.addChatMessage('System', 'Click monsters to target them | Click items on ground to pick up', '#88ccff');
    this.addChatMessage('System', 'Press I for inventory — spend SKILL POINTS there on level up!', '#ffcc00');
    this.addChatMessage('System', 'Press H for help | Enter to chat | R to respawn', '#88ccff');
    this.addChatMessage('System', 'GOAL: Explore all 5 zones and defeat the Aether Lord in the Tower!', '#ffcc00');
  }

  toggleHelp() {
    this.helpPanel.toggle();
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

  shutdown() {
    window.soundManager.stopAmbient();
    if (this.hud) this.hud.destroy();
    if (this.chatBox) this.chatBox.destroy();
    if (this.invPanel) this.invPanel.destroy();
    if (this.helpPanel) this.helpPanel.destroy();
    if (this.targetPreview) this.targetPreview.destroy();
    if (this.particles) this.particles.destroy();
    if (this.minimap) this.minimap.destroy();
    if (this.equipmentOverlay) this.equipmentOverlay.destroy();
    if (this.netStatusText) this.netStatusText.destroy();
    if (this.petSprite) this.petSprite.destroy();
    if (this.petName) this.petName.destroy();
  }
}
