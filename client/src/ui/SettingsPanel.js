class SettingsPanel {
  constructor(scene) {
    this.scene = scene;
    this.visible = false;
    this.elements = [];
    this._build();
  }

  _build() {
    const s = this.scene;
    const cx = 320;
    const cy = 240;

    const bg = s.add.rectangle(cx, cy, 300, 260, 0x111122, 0.92).setDepth(300).setOrigin(0.5).setAlpha(0).setInteractive();
    const border = s.add.graphics().setDepth(301).setAlpha(0);
    border.lineStyle(2, 0x4466aa);
    border.strokeRect(cx - 148, cy - 128, 296, 256);

    const title = s.add.text(cx, cy - 110, 'SETTINGS', {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffcc00',
    }).setOrigin(0.5).setDepth(302).setAlpha(0);

    const masterLabel = s.add.text(cx - 120, cy - 70, 'Master', {
      fontSize: '13px', fontFamily: 'monospace', color: '#aaaacc',
    }).setDepth(302).setAlpha(0);

    const masterSlider = this._createSlider(s, cx - 30, cy - 70, 140, window.soundManager.masterVolume, (v) => {
      window.soundManager.setMasterVolume(v);
    }, 302);

    const sfxLabel = s.add.text(cx - 120, cy - 25, 'SFX', {
      fontSize: '13px', fontFamily: 'monospace', color: '#aaaacc',
    }).setDepth(302).setAlpha(0);

    const sfxSlider = this._createSlider(s, cx - 30, cy - 25, 140, window.soundManager.sfxVolume, (v) => {
      window.soundManager.setSfxVolume(v);
    }, 302);

    const muteBtnBg = s.add.graphics().setDepth(302).setAlpha(0);
    muteBtnBg.fillStyle(0x444466);
    muteBtnBg.fillRoundedRect(cx - 50, cy + 20, 100, 28, 6);
    const muteBtnText = s.add.text(cx, cy + 34, window.soundManager.muted ? 'UNMUTE' : 'MUTE', {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5).setDepth(303).setAlpha(0);
    const muteZone = s.add.zone(cx, cy + 34, 100, 28).setInteractive().setDepth(304).setAlpha(0);
    muteZone.on('pointerdown', () => {
      const m = window.soundManager.toggleMute();
      muteBtnText.setText(m ? 'UNMUTE' : 'MUTE');
      window.soundManager.playMenuSelect();
    });
    muteZone.on('pointerover', () => window.soundManager.playMenuHover());

    const closeBg = s.add.graphics().setDepth(302).setAlpha(0);
    closeBg.fillStyle(0x664444);
    closeBg.fillRoundedRect(cx - 40, cy + 70, 80, 24, 6);
    const closeText = s.add.text(cx, cy + 82, 'CLOSE', {
      fontSize: '12px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5).setDepth(303).setAlpha(0);
    const closeZone = s.add.zone(cx, cy + 82, 80, 24).setInteractive().setDepth(304).setAlpha(0);
    closeZone.on('pointerdown', () => {
      window.soundManager.playMenuSelect();
      this.hide();
    });
    closeZone.on('pointerover', () => window.soundManager.playMenuHover());

    this.elements = [
      bg, border, title,
      masterLabel, masterSlider.bg, masterSlider.fill, masterSlider.knob, masterSlider.zone,
      sfxLabel, sfxSlider.bg, sfxSlider.fill, sfxSlider.knob, sfxSlider.zone,
      muteBtnBg, muteBtnText, muteZone,
      closeBg, closeText, closeZone,
    ];
    this._sliders = [masterSlider, sfxSlider];
  }

  _createSlider(scene, x, y, w, val, onChange, depth) {
    const bg = scene.add.graphics().setDepth(depth).setAlpha(0);
    bg.fillStyle(0x333355);
    bg.fillRoundedRect(x, y - 4, w, 8, 4);

    const fill = scene.add.graphics().setDepth(depth + 1).setAlpha(0);
    fill.fillStyle(0x6688cc);
    fill.fillRoundedRect(x, y - 4, w * val, 8, 4);

    const knob = scene.add.circle(x + w * val, y, 7, 0xaaccff).setDepth(depth + 2).setAlpha(0);
    knob.setStrokeStyle(1, 0xffffff);

    const zone = scene.add.zone(x + w / 2, y, w, 20).setInteractive().setDepth(depth + 3).setAlpha(0);
    zone.on('pointerdown', (p) => {
      const rel = Phaser.Math.Clamp((p.x - x) / w, 0, 1);
      this._setSlider({ bg, fill, knob, zone, x, w, onChange }, rel);
    });
    zone.on('pointermove', (p) => {
      if (p.isDown) {
        const rel = Phaser.Math.Clamp((p.x - x) / w, 0, 1);
        this._setSlider({ bg, fill, knob, zone, x, w, onChange }, rel);
      }
    });

    return { bg, fill, knob, zone, x, w, onChange };
  }

  _setSlider(slider, val) {
    slider.fill.clear();
    slider.fill.fillStyle(0x6688cc);
    slider.fill.fillRoundedRect(slider.x, slider.y - 4, slider.w * val, 8, 4);
    slider.knob.x = slider.x + slider.w * val;
    slider.onChange(val);
  }

  show() {
    if (this.visible) return;
    this.visible = true;
    for (const el of this.elements) {
      this.scene.tweens.add({ targets: el, alpha: 1, duration: 200, ease: 'Cubic.easeOut' });
    }
  }

  hide() {
    if (!this.visible) return;
    this.visible = false;
    for (const el of this.elements) {
      this.scene.tweens.add({ targets: el, alpha: 0, duration: 150, ease: 'Cubic.easeIn' });
    }
  }

  toggle() {
    if (this.visible) this.hide();
    else this.show();
  }

  destroy() {
    for (const el of this.elements) el.destroy();
  }
}
