class TargetPreview {
  constructor(scene) {
    this.scene = scene;
    this.gfx = scene.add.graphics().setDepth(50);
    this.visible = false;
    this.PROJ_RANGE = 200;
    this.AOE_MAX = 50;
  }

  show(px, py, tx, ty, spellKey) {
    this.visible = true;
    const g = this.gfx;
    g.clear();

    const dx = tx - px;
    const dy = ty - py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const inRange = dist <= this.PROJ_RANGE;

    const aimColor = inRange ? 0x88ccff : 0xff4444;
    const aimAlpha = inRange ? 0.6 : 0.3;

    const spell = Object.values(SPELLS).find(s => s.name === spellKey || spellKey);
    const spellDef = SPELLS[spellKey];
    const isAOE = spellDef && spellDef.aoe;

    g.lineStyle(2, aimColor, aimAlpha * 0.5);
    g.fillStyle(aimColor, aimAlpha * 0.08);
    g.fillCircle(px, py, this.PROJ_RANGE);
    g.strokeCircle(px, py, this.PROJ_RANGE);

    if (isAOE) {
      const aoeRadius = spellDef.radius || this.AOE_MAX;
      g.lineStyle(1, aimColor, aimAlpha * 0.4);
      g.fillStyle(aimColor, aimAlpha * 0.12);
      g.fillCircle(tx, ty, aoeRadius);
      g.strokeCircle(tx, ty, aoeRadius);
    }

    const crossSize = 6;
    g.lineStyle(1, aimColor, aimAlpha * 0.7);
    g.strokeCircle(tx, ty, 4);
    g.beginPath();
    g.moveTo(tx - crossSize, ty); g.lineTo(tx + crossSize, ty);
    g.moveTo(tx, ty - crossSize); g.lineTo(tx, ty + crossSize);
    g.strokePath();

    g.lineStyle(1, aimColor, aimAlpha * 0.2);
    g.beginPath();
    g.moveTo(px, py); g.lineTo(tx, ty);
    g.strokePath();
  }

  hide() {
    this.visible = false;
    this.gfx.clear();
  }

  update(px, py, tx, ty, spellKey) {
    if (spellKey && this.visible) {
      this.show(px, py, tx, ty, spellKey);
    }
  }

  destroy() {
    this.gfx.destroy();
  }
}
