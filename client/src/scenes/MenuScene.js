class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#0a0a1e');
    const cx = 320;
    const cy = 240;

    this.stars = [];
    for (let i = 0; i < 40; i++) {
      const s = this.add.text(Math.random() * 640, Math.random() * 480, '.', {
        fontSize: '8px', fontFamily: 'monospace', color: '#ffffff',
      }).setAlpha(0.2 + Math.random() * 0.6);
      s.speed = 0.2 + Math.random() * 0.5;
      s.drift = Math.random() * 6.28;
      this.stars.push(s);
    }

    for (let i = 0; i < 6; i++) {
      const px = Math.random() * 640;
      const py = Math.random() * 480;
      const pt = this.add.text(px, py, ['*', '+', '.', 'o'][Math.random() * 4 | 0], {
        fontSize: '10px', fontFamily: 'monospace', color: ['#88ccff', '#ffcc00', '#88ff88', '#ff88cc'][Math.random() * 4 | 0],
      }).setAlpha(0).setDepth(1);
      this.tweens.add({
        targets: pt, alpha: 0.8, y: py - 30 - Math.random() * 30, duration: 2000 + Math.random() * 2000,
        repeat: -1, delay: Math.random() * 3000,
        onRepeat: () => { pt.setPosition(Math.random() * 640, Math.random() * 400 + 40); pt.setAlpha(0); },
      });
    }

    const title = this.add.text(cx, cy - 90, 'MYSTIC', {
      fontSize: '52px', fontFamily: 'monospace', color: '#ffcc00',
      stroke: '#000', strokeThickness: 8,
    }).setOrigin(0.5).setAlpha(0);

    const title2 = this.add.text(cx, cy - 30, 'REALM', {
      fontSize: '52px', fontFamily: 'monospace', color: '#88ccff',
      stroke: '#000', strokeThickness: 8,
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({ targets: title, alpha: 1, y: cy - 80, duration: 800, ease: 'Back.easeOut' });
    this.tweens.add({ targets: title2, alpha: 1, y: cy - 20, duration: 800, ease: 'Back.easeOut', delay: 200 });

    const glow = this.add.graphics().setDepth(-1);
    this.tweens.add({
      targets: glow, alpha: 0.6, duration: 1500, yoyo: true, repeat: -1,
    });

    this.add.text(cx, cy + 30, 'A Fantasy Multiplayer RPG', {
      fontSize: '14px', fontFamily: 'monospace', color: '#666688',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: this.children.list[this.children.list.length - 1],
      alpha: 1, duration: 600, delay: 500,
    });

    const blink = this.add.text(cx, cy + 80, 'Press any key or click to begin', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: blink, alpha: 1, duration: 400, delay: 1000,
      onComplete: () => {
        this.tweens.add({ targets: blink, alpha: 0.2, duration: 800, yoyo: true, repeat: -1 });
      },
    });

    const ver = this.add.text(630, 470, 'v1.0', {
      fontSize: '9px', fontFamily: 'monospace', color: '#333344',
    }).setOrigin(1, 1);

    const startGame = () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => this.scene.start('CharCreateScene'));
    };

    this.input.keyboard.on('keydown', startGame);
    this.input.on('pointerdown', startGame);
  }

  update(time, delta) {
    if (!this.stars) return;
    for (const s of this.stars) {
      s.drift += delta * 0.001;
      s.y -= s.speed * (delta * 0.06);
      s.x += Math.sin(s.drift) * 0.3;
      if (s.y < -10) s.y = 490;
      if (s.x < -10) s.x = 650;
      if (s.x > 650) s.x = -10;
    }
  }
}
