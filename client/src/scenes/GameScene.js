const TILE_SIZE = 32;
const COLS = 20;
const ROWS = 15;
const SPEED = 120;
const MOVE_THROTTLE = 50;
const TILE_TEXTURES = ['tile_0', 'tile_1', 'tile_2', 'tile_3', 'tile_4'];

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init(data) {
    this.playerName = data.name || 'Adventurer';
    this.playerClass = data.class || 'mage';
    this.myId = null;
    this.mapData = null;
    this.tileSprites = [];
    this.playerSprite = null;
    this.otherPlayers = {};
    this.keys = {};
    this.lastMoveSent = 0;
    this.chatMessages = [];
    this.chatInput = '';
    this.isChatting = false;
    this.chatTexts = [];
    this.network = null;
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a1a2e');

    this.keys = {
      W: this.input.keyboard.addKey('W'),
      A: this.input.keyboard.addKey('A'),
      S: this.input.keyboard.addKey('S'),
      D: this.input.keyboard.addKey('D'),
      UP: this.input.keyboard.addKey('UP'),
      DOWN: this.input.keyboard.addKey('DOWN'),
      LEFT: this.input.keyboard.addKey('LEFT'),
      RIGHT: this.input.keyboard.addKey('RIGHT'),
    };

    this.network = new Network();
    this.setupNetwork();
    this.network.connect();

    this.input.keyboard.on('keydown', (event) => {
      if (event.key === 'Enter') {
        if (!this.isChatting) {
          this.isChatting = true;
          this.chatInput = '';
          this.showChatInput();
        } else {
          if (this.chatInput.length > 0 && this.network) {
            this.network.emit('chat_message', { text: this.chatInput });
          }
          this.isChatting = false;
          this.hideChatInput();
        }
        event.stopPropagation();
      }

      if (this.isChatting) {
        if (event.key === 'Backspace') {
          this.chatInput = this.chatInput.slice(0, -1);
          this.updateChatInput();
        } else if (event.key.length === 1 && this.chatInput.length < 80) {
          this.chatInput += event.key;
          this.updateChatInput();
        }
        event.stopPropagation();
      }
    });
  }

  setupNetwork() {
    const self = this;

    self.network.on('map_data', (data) => {
      self.mapData = data.map;
      self.renderMap();
      self.network.emit('join', {
        name: self.playerName,
        class: self.playerClass,
      });
    });

    self.network.on('you_joined', (data) => {
      self.myId = data.id;
      self.createPlayer();
      self.createHUD();
    });

    self.network.on('player_joined', (data) => {
      if (data.id === self.myId) return;
      self.addOtherPlayer(data.id, data.player);
    });

    self.network.on('player_left', (data) => {
      self.removeOtherPlayer(data.id);
    });

    self.network.on('state_update', (data) => {
      if (!self.myId || !data.players) return;
      self.updateOtherPlayers(data.players);
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
        const sprite = this.add.image(
          x * TILE_SIZE + TILE_SIZE / 2,
          y * TILE_SIZE + TILE_SIZE / 2,
          texKey
        );
        this.tileSprites.push(sprite);
      }
    }
  }

  createPlayer() {
    const texKey = 'player_' + this.playerClass;
    const spawnX = 5 * TILE_SIZE + TILE_SIZE / 2;
    const spawnY = 7 * TILE_SIZE + TILE_SIZE / 2;
    this.playerSprite = this.add.image(spawnX, spawnY, texKey);
    this.playerSprite.setDepth(10);
  }

  createHUD() {
    this.hudContainer = this.add.container(0, 0).setDepth(50);

    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.6);
    g.fillRect(4, 4, 180, 60);
    this.hudContainer.add(g);

    const clsLabel = this.playerClass.charAt(0).toUpperCase() + this.playerClass.slice(1);
    this.nameLabel = this.add.text(10, 8, this.playerName + ' (' + clsLabel + ')', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#ffcc00',
    });
    this.hudContainer.add(this.nameLabel);

    this.hpBarBg = this.add.graphics();
    this.hpBarBg.fillStyle(0x333333);
    this.hpBarBg.fillRect(10, 26, 120, 10);
    this.hudContainer.add(this.hpBarBg);

    this.hpBar = this.add.graphics();
    this.hpBar.fillStyle(0xcc3333);
    this.hpBar.fillRect(10, 26, 120, 10);
    this.hudContainer.add(this.hpBar);

    this.mpBarBg = this.add.graphics();
    this.mpBarBg.fillStyle(0x333333);
    this.mpBarBg.fillRect(10, 40, 120, 10);
    this.hudContainer.add(this.mpBarBg);

    this.mpBar = this.add.graphics();
    this.mpBar.fillStyle(0x3333cc);
    this.mpBar.fillRect(10, 40, 120, 10);
    this.hudContainer.add(this.mpBar);
  }

  addOtherPlayer(id, playerData) {
    if (this.otherPlayers[id]) return;

    const texKey = 'player_' + (playerData.class || 'mage');
    const sprite = this.add.image(playerData.x, playerData.y, texKey);
    sprite.setDepth(10);

    const nameText = this.add.text(0, -20, playerData.name, {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.otherPlayers[id] = { sprite, nameText };
  }

  removeOtherPlayer(id) {
    const p = this.otherPlayers[id];
    if (p) {
      p.sprite.destroy();
      p.nameText.destroy();
      delete this.otherPlayers[id];
    }
  }

  updateOtherPlayers(players) {
    for (const id in players) {
      if (parseInt(id) === this.myId) continue;
      const pData = players[id];
      let pObj = this.otherPlayers[id];
      if (!pObj) {
        this.addOtherPlayer(parseInt(id), pData);
        pObj = this.otherPlayers[id];
      }
      if (pObj) {
        pObj.sprite.setPosition(pData.x, pData.y);
        pObj.nameText.setPosition(pData.x, pData.y - 20);
      }
    }
  }

  showChatInput() {
    this.chatInputBg = this.add.graphics().setDepth(200);
    this.chatInputBg.fillStyle(0x000000, 0.8);
    this.chatInputBg.fillRect(4, 440, 632, 36);

    this.chatInputText = this.add.text(10, 446, '> ' + this.chatInput + '_', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setDepth(200);
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
    if (this.chatMessages.length > maxMsg) {
      this.chatMessages.shift();
    }
    this.renderChatHistory();
  }

  renderChatHistory() {
    this.chatTexts.forEach(t => t.destroy());
    this.chatTexts = [];
    const startY = 400;
    for (let i = 0; i < this.chatMessages.length; i++) {
      const t = this.add.text(10, startY + i * 16, this.chatMessages[i], {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#cccccc',
        stroke: '#000000',
        strokeThickness: 2,
      }).setDepth(150);
      this.chatTexts.push(t);
    }
  }

  update(time, delta) {
    if (!this.playerSprite || this.isChatting) return;

    let dx = 0;
    let dy = 0;
    let direction = 'down';

    if (this.keys.A.isDown || this.keys.LEFT.isDown) { dx = -1; direction = 'left'; }
    else if (this.keys.D.isDown || this.keys.RIGHT.isDown) { dx = 1; direction = 'right'; }

    if (this.keys.W.isDown || this.keys.UP.isDown) { dy = -1; direction = 'up'; }
    else if (this.keys.S.isDown || this.keys.DOWN.isDown) { dy = 1; direction = 'down'; }

    const moving = dx !== 0 || dy !== 0;

    if (moving) {
      if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
      }

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
        if (tile === 0 || tile === 4) {
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
        zone: 'meadow',
      });
      this.lastMoveSent = time;
    }
  }
}
