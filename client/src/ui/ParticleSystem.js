class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    this.active = [];
  }

  _get() {
    let p = this.pool.pop();
    if (!p) {
      p = this.scene.add.circle(0, 0, 3, 0xffffff).setDepth(100).setAlpha(0);
    }
    this.active.push(p);
    return p;
  }

  _release(p) {
    p.setAlpha(0);
    p.setPosition(-100, -100);
    p.setScale(1);
    this.pool.push(p);
  }

  burst(x, y, count, config) {
    const c = config || {};
    const color = c.color || 0xffffff;
    const spread = c.spread || 40;
    const speed = c.speed || 60;
    const size = c.size || 3;
    const life = c.life || 400;
    const gravity = c.gravity || 0;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * spread;
      const p = this._get();
      p.setFillStyle(color, 0.8);
      p.setPosition(x + Math.cos(angle) * 2, y + Math.sin(angle) * 2);
      p.setScale(size / 3);
      p.setAlpha(0.8);
      p.setDepth(c.depth || 100);

      const targetX = x + Math.cos(angle) * (dist + Math.random() * speed * 0.3);
      const targetY = y + Math.sin(angle) * (dist + Math.random() * speed * 0.3) + gravity;

      this.scene.tweens.add({
        targets: p,
        x: targetX,
        y: targetY,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: life + Math.random() * life * 0.3,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          const idx = this.active.indexOf(p);
          if (idx !== -1) this.active.splice(idx, 1);
          this._release(p);
        },
      });
    }
  }

  emit(x, y, config) {
    this.burst(x, y, 1, config);
  }

  ring(x, y, color, count, radius, life) {
    const c = color || 0xffffff;
    const r = radius || 20;
    const n = count || 8;
    const l = life || 300;
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2;
      const p = this._get();
      p.setFillStyle(c, 0.6);
      p.setPosition(x + Math.cos(angle) * r * 0.2, y + Math.sin(angle) * r * 0.2);
      p.setScale(0.5);
      p.setAlpha(0.6);
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * r,
        y: y + Math.sin(angle) * r,
        alpha: 0,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: l,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          const idx = this.active.indexOf(p);
          if (idx !== -1) this.active.splice(idx, 1);
          this._release(p);
        },
      });
    }
  }

  stream(x, y, targetX, targetY, color, count, life) {
    for (let i = 0; i < count; i++) {
      const p = this._get();
      p.setFillStyle(color || 0x88ccff, 0.5);
      p.setPosition(x + (Math.random() - 0.5) * 4, y + (Math.random() - 0.5) * 4);
      p.setScale(0.5);
      p.setAlpha(0.5);
      this.scene.tweens.add({
        targets: p,
        x: targetX + (Math.random() - 0.5) * 6,
        y: targetY + (Math.random() - 0.5) * 6,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: (life || 300) + Math.random() * 100,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          const idx = this.active.indexOf(p);
          if (idx !== -1) this.active.splice(idx, 1);
          this._release(p);
        },
      });
    }
  }

  clear() {
    for (const p of this.active) {
      this.scene.tweens.killTweensOf(p);
      this._release(p);
    }
    this.active = [];
  }

  destroy() {
    this.clear();
    for (const p of this.pool) p.destroy();
    this.pool = [];
  }
}
