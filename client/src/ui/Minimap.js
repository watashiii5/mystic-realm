class Minimap {
  constructor(scene, mapData) {
    this.scene = scene;
    this.tileSize = 3;
    this.width = 80;
    this.height = 60;
    this.x = 640 - this.width - 6;
    this.y = 6;
    this.playerDot = null;
    this.monsterDots = [];
    this.otherPlayerDots = [];
    this._explored = null;
    this._build(mapData);
  }

  _build(mapData) {
    const s = this.scene;
    this.bg = s.add.graphics().setDepth(60).setAlpha(0.7);
    this._drawBg(mapData);

    this.fog = s.add.graphics().setDepth(60).setAlpha(0.6);

    this.border = s.add.graphics().setDepth(61).setAlpha(0.6);
    this.border.lineStyle(1, 0x88ccff, 0.6);
    this.border.strokeRect(this.x - 1, this.y - 1, this.width + 2, this.height + 2);

    this.playerDot = s.add.circle(this.x + 4, this.y + 4, 2, 0x88ff88).setDepth(62).setAlpha(0.9);

    const label = s.add.text(this.x + this.width - 2, this.y - 1, 'MAP', {
      fontSize: '7px', fontFamily: 'monospace', color: '#88ccff',
    }).setOrigin(1, 0).setDepth(62).setAlpha(0.5);
    this.label = label;
  }

  _drawBg(mapData) {
    this.bg.clear();
    if (!mapData) return;
    const cols = mapData[0] ? mapData[0].length : 20;
    const rows = mapData.length || 15;
    const ts = this.tileSize;
    if (!this._explored) {
      this._explored = [];
      for (let y = 0; y < rows; y++) { this._explored[y] = []; for (let x = 0; x < cols; x++) this._explored[y][x] = false; }
    }
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const tile = mapData[y]?.[x] ?? 0;
        const walkable = tile === 0 || tile === 4 || tile === 5 || tile === 6 || tile === 7 || tile === 8 || tile === 9 || tile === 10 || tile === 11 || tile === 12;
        const color = walkable ? 0x223322 : 0x332222;
        if (tile >= 9 && tile <= 12) this.bg.fillStyle(0x443366, 0.6);
        else if (!walkable) this.bg.fillStyle(color, 0.5);
        else this.bg.fillStyle(color, 0.3);
        this.bg.fillRect(this.x + x * ts, this.y + y * ts, ts, ts);
      }
    }
  }

  _drawFog(px, py) {
    this.fog.clear();
    if (!this._explored) return;
    const ts = this.tileSize;
    const rows = this._explored.length;
    const cols = this._explored[0] ? this._explored[0].length : 20;
    const visTileX = Math.round(px / 32);
    const visTileY = Math.round(py / 32);
    const viewDist = 4;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const dx = x - visTileX, dy = y - visTileY;
        const dsq = dx * dx + dy * dy;
        if (dsq <= viewDist * viewDist) this._explored[y][x] = true;
        if (!this._explored[y][x]) {
          this.fog.fillStyle(0x000000, 0.7);
          this.fog.fillRect(this.x + x * ts, this.y + y * ts, ts, ts);
        } else if (dsq > viewDist * viewDist + 2) {
          this.fog.fillStyle(0x000000, 0.25);
          this.fog.fillRect(this.x + x * ts, this.y + y * ts, ts, ts);
        }
      }
    }
  }

  update(playerX, playerY, monsters, otherPlayers) {
    if (!this.playerDot || !this.bg.alpha) return;
    const mx = 640, my = 480;
    this.playerDot.setPosition(
      this.x + (playerX / mx) * this.width,
      this.y + (playerY / my) * this.height
    );

    this._drawFog(playerX, playerY);

    for (const d of this.monsterDots) d.destroy();
    this.monsterDots = [];
    if (monsters) {
      for (const m of monsters) {
        const tileX = Math.round(m.x / 32);
        const tileY = Math.round(m.y / 32);
        if (!this._explored || !this._explored[tileY] || !this._explored[tileY][tileX]) continue;
        const dot = this.scene.add.circle(
          this.x + (m.x / mx) * this.width,
          this.y + (m.y / my) * this.height,
          m.boss ? 2.5 : 1.5, 0xff4444
        ).setDepth(62).setAlpha(0.8);
        this.monsterDots.push(dot);
      }
    }

    for (const d of this.otherPlayerDots) d.destroy();
    this.otherPlayerDots = [];
    if (otherPlayers) {
      for (const p of otherPlayers) {
        if (p.a === false) continue;
        const tileX = Math.round(p.x / 32);
        const tileY = Math.round(p.y / 32);
        if (!this._explored || !this._explored[tileY] || !this._explored[tileY][tileX]) continue;
        const dot = this.scene.add.circle(
          this.x + (p.x / mx) * this.width,
          this.y + (p.y / my) * this.height,
          1.5, 0x88ccff
        ).setDepth(62).setAlpha(0.7);
        this.otherPlayerDots.push(dot);
      }
    }
  }

  refreshMap(mapData) {
    this._explored = null;
    this._drawBg(mapData);
  }

  destroy() {
    this.bg.destroy();
    this.fog.destroy();
    this.border.destroy();
    this.playerDot.destroy();
    if (this.label) this.label.destroy();
    for (const d of this.monsterDots) d.destroy();
    for (const d of this.otherPlayerDots) d.destroy();
  }
}
