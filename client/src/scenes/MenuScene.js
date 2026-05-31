class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    this.events.on('shutdown', this.shutdown, this);
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

    const titleGlow = this.add.graphics().setDepth(-1);
    this.tweens.add({
      targets: titleGlow, alpha: 0.6, duration: 1500, yoyo: true, repeat: -1,
    });

    this.tweens.add({ targets: title, scaleX: 1.02, scaleY: 1.02, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: title2, scaleX: 1.02, scaleY: 1.02, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 200 });

    this._orbitalParticles = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const dist = 80 + Math.random() * 30;
      const pt = this.add.text(cx + Math.cos(angle) * dist, cy - 50 + Math.sin(angle) * dist, ['*', '+', '.', 'o'][Math.random() * 4 | 0], {
        fontSize: '8px', fontFamily: 'monospace', color: ['#88ccff', '#ffcc00', '#88ff88', '#ff88cc'][Math.random() * 4 | 0],
      }).setOrigin(0.5).setDepth(2).setAlpha(0.3);
      this._orbitalParticles.push({ text: pt, angle, dist, speed: 0.3 + Math.random() * 0.3, offset: Math.random() * 100 });
    }

    window.soundManager.startAmbient();

    this.add.text(cx, cy + 30, 'A Fantasy Multiplayer RPG', {
      fontSize: '14px', fontFamily: 'monospace', color: '#666688',
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: this.children.list[this.children.list.length - 1],
      alpha: 1, duration: 600, delay: 500,
    });

    this._createButton(cx, cy + 80, 'NEW GAME', 0x44aa44, () => {
      window.soundManager.playMenuSelect();
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => this.scene.start('CharCreateScene'));
    });

    this._createButton(cx, cy + 115, 'SETTINGS', 0x444488, () => {
      window.soundManager.playMenuSelect();
      this.settingsPanel = this.settingsPanel || new SettingsPanel(this);
      this.settingsPanel.show();
    });

    this._createButton(cx, cy + 150, 'CREDITS', 0x446644, () => {
      window.soundManager.playMenuSelect();
      this._showCredits();
    });

    const ver = this.add.text(630, 470, 'v1.0', {
      fontSize: '9px', fontFamily: 'monospace', color: '#333344',
    }).setOrigin(1, 1);

    this.input.keyboard.on('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        if (this.settingsPanel && this.settingsPanel.visible) return;
        window.soundManager.playMenuSelect();
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.time.delayedCall(300, () => this.scene.start('CharCreateScene'));
      }
      if (event.key === 'Escape') {
        if (this.settingsPanel && this.settingsPanel.visible) {
          this.settingsPanel.hide();
        }
      }
    });

  }

  _createButton(x, y, text, color, onClick) {
    const w = 180;
    const h = 26;
    const bg = this.add.graphics().setDepth(5).setAlpha(0);
    const hoverBg = this.add.graphics().setDepth(4).setAlpha(0);
    const label = this.add.text(x, y, text, {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5).setDepth(6).setAlpha(0);

    const zone = this.add.rectangle(x, y, w, h, 0xffffff, 0).setInteractive({ useHandCursor: true }).setDepth(7);

    zone.on('pointerover', () => {
      window.soundManager.playMenuHover();
      this.tweens.add({ targets: [bg, label], alpha: 1, duration: 100 });
      hoverBg.clear();
      hoverBg.fillStyle(color, 0.3);
      hoverBg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 6);
      this.tweens.add({ targets: hoverBg, alpha: 0.5, duration: 100 });
    });

    zone.on('pointerout', () => {
      if (bg.alpha < 0.9) {
        this.tweens.add({ targets: [bg, label], alpha: 0.3, duration: 100 });
      }
      this.tweens.add({ targets: hoverBg, alpha: 0, duration: 100 });
    });

    zone.on('pointerdown', onClick);

    this.tweens.add({
      targets: [bg, label],
      alpha: 0.3, duration: 400, delay: 800 + (y - 240) * 2,
    });
    bg.fillStyle(color, 0.2);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 6);

    return { bg, label, zone, hoverBg };
  }

  _showCredits() {
    const cx = 320;
    const cy = 240;
    if (this._creditsBg) return;

    const bg = this.add.rectangle(cx, cy, 280, 180, 0x111122, 0.92).setDepth(300).setOrigin(0.5).setAlpha(0);
    const border = this.add.graphics().setDepth(301).setAlpha(0);
    border.lineStyle(2, 0x446644);
    border.strokeRect(cx - 138, cy - 88, 276, 176);

    const lines = [
      'MYSTIC REALM',
      '',
      'Created by Anon',
      '',
      'Powered by Phaser 3 & Socket.IO',
      '',
      'Thanks for playing!',
    ];
    const text = this.add.text(cx, cy - 60, lines.join('\n'), {
      fontSize: '12px', fontFamily: 'monospace', color: '#aaaacc',
      align: 'center', lineSpacing: 4,
    }).setOrigin(0.5).setDepth(302).setAlpha(0);

    const closeBg = this.add.graphics().setDepth(302).setAlpha(0);
    closeBg.fillStyle(0x446644);
    closeBg.fillRoundedRect(cx - 40, cy + 65, 80, 24, 6);
    const closeText = this.add.text(cx, cy + 77, 'CLOSE', {
      fontSize: '12px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5).setDepth(303).setAlpha(0);
    const closeZone = this.add.rectangle(cx, cy + 77, 80, 24, 0xffffff, 0).setInteractive().setDepth(304).setAlpha(0);
    closeZone.on('pointerdown', () => {
      window.soundManager.playMenuSelect();
      this.tweens.add({ targets: [bg, border, text, closeBg, closeText, closeZone], alpha: 0, duration: 150, onComplete: () => {
        bg.destroy(); border.destroy(); text.destroy(); closeBg.destroy(); closeText.destroy(); closeZone.destroy();
        this._creditsBg = null;
      } });
    });
    closeZone.on('pointerover', () => window.soundManager.playMenuHover());

    this.tweens.add({ targets: [bg, border, text, closeBg, closeText, closeZone], alpha: 1, duration: 200 });
    this._creditsBg = bg;
  }

  shutdown() {
    window.soundManager.stopAmbient();
  }

  update(time, delta) {
    if (!this.stars) return;
    const cx = 320, cy = 240;
    for (const s of this.stars) {
      s.drift += delta * 0.001;
      s.y -= s.speed * (delta * 0.06);
      s.x += Math.sin(s.drift) * 0.3;
      if (s.y < -10) s.y = 490;
      if (s.x < -10) s.x = 650;
      if (s.x > 650) s.x = -10;
    }
    if (this._orbitalParticles) {
      const t = delta * 0.001;
      for (const p of this._orbitalParticles) {
        p.angle += p.speed * t;
        p.text.x = cx + Math.cos(p.angle) * p.dist;
        p.text.y = cy - 50 + Math.sin(p.angle) * p.dist;
        p.text.setAlpha(0.2 + Math.sin(Date.now() * 0.002 + p.offset) * 0.2);
      }
    }
  }
}
