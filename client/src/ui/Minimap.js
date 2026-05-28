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
    this._build(mapData);
  }

  _build(mapData) {
    const s = this.scene;
    this.bg = s.add.graphics().setDepth(60).setAlpha(0.7);
    this._drawBg(mapData);

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

  update(playerX, playerY, monsters, otherPlayers) {
    if (!this.playerDot || !this.bg.alpha) return;
    const mx = 640, my = 480;
    this.playerDot.setPosition(
      this.x + (playerX / mx) * this.width,
      this.y + (playerY / my) * this.height
    );

    for (const d of this.monsterDots) d.destroy();
    this.monsterDots = [];
    if (monsters) {
      for (const m of monsters) {
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
    this._drawBg(mapData);
  }

  destroy() {
    this.bg.destroy();
    this.border.destroy();
    this.playerDot.destroy();
    if (this.label) this.label.destroy();
    for (const d of this.monsterDots) d.destroy();
    for (const d of this.otherPlayerDots) d.destroy();
  }
}
