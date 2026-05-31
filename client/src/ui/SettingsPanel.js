class SettingsPanel {
  constructor(scene) {
    this.scene = scene;
    this.visible = false;
    this.elements = [];
    this._loadSettings();
    this._build();
  }

  _build() {
    const s = this.scene;
    const cx = 320;
    const cy = 240;
    const panelW = 320;
    const panelH = 310;

    const bg = s.add.rectangle(cx, cy, panelW, panelH, 0x111122, 0.94).setDepth(300).setOrigin(0.5).setAlpha(0).setInteractive();
    const border = s.add.graphics().setDepth(301).setAlpha(0);
    border.lineStyle(2, 0x4466aa);
    border.strokeRect(cx - panelW / 2 + 2, cy - panelH / 2 + 2, panelW - 4, panelH - 4);

    const title = s.add.text(cx, cy - panelH / 2 + 22, 'SETTINGS', {
      fontSize: '20px', fontFamily: 'monospace', color: '#ffcc00',
    }).setOrigin(0.5).setDepth(302).setAlpha(0);

    const rows = [
      { label: 'Master', vol: 'master' },
      { label: 'SFX',    vol: 'sfx' },
      { label: 'Music',  vol: 'music' },
    ];

    const sliders = [];
    const pcts = [];

    rows.forEach((r, i) => {
      const yy = cy - 55 + i * 48;
      const sm = window.soundManager;

      const lbl = s.add.text(cx - 140, yy, r.label, {
        fontSize: '13px', fontFamily: 'monospace', color: '#aaaacc',
      }).setDepth(302).setAlpha(0);

      const pct = s.add.text(cx + 140, yy, sm.getVolumePercent(r.vol) + '%', {
        fontSize: '11px', fontFamily: 'monospace', color: '#8888aa',
      }).setOrigin(1, 0.5).setDepth(302).setAlpha(0);
      pcts.push(pct);

      const volKey = r.vol;
      const slider = this._createSlider(s, cx - 75, yy, 150, sm['getVolumePercent'](r.vol) / 100, (v) => {
        sm['set' + volKey.charAt(0).toUpperCase() + volKey.slice(1) + 'Volume'](v);
        pct.setText(sm.getVolumePercent(r.vol) + '%');
      }, 302);

      const testBtn = s.add.text(cx + 155, yy, '[TEST]', {
        fontSize: '9px', fontFamily: 'monospace', color: '#6688aa',
      }).setOrigin(0, 0.5).setDepth(303).setAlpha(0).setInteractive({ useHandCursor: true });
      testBtn.on('pointerover', () => { testBtn.setColor('#88aacc'); sm.playMenuHover(); });
      testBtn.on('pointerout', () => { testBtn.setColor('#6688aa'); });
      testBtn.on('pointerdown', () => {
        const sounds = ['playMenuSelect', 'playCastSpell', 'playLevelUp'];
        sm[sounds[i]]();
      });

      sliders.push(slider);
      this.elements.push(lbl, pct, testBtn,
        slider.bg, slider.fill, slider.knob, slider.zone);
    });

    const muteBtnBg = s.add.graphics().setDepth(302).setAlpha(0);
    muteBtnBg.fillStyle(0x444466);
    muteBtnBg.fillRoundedRect(cx - 120, cy + 80, 100, 28, 6);
    const muteBtnText = s.add.text(cx - 70, cy + 94, window.soundManager.muted ? 'UNMUTE' : 'MUTE', {
      fontSize: '12px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5).setDepth(303).setAlpha(0);
    const muteZone = s.add.rectangle(cx - 70, cy + 94, 100, 28, 0xffffff, 0).setInteractive().setDepth(304).setAlpha(0);
    muteZone.on('pointerdown', () => {
      const m = window.soundManager.toggleMute();
      muteBtnText.setText(m ? 'UNMUTE' : 'MUTE');
      this._saveSettings();
      window.soundManager.playMenuSelect();
    });
    muteZone.on('pointerover', () => window.soundManager.playMenuHover());

    const fsBtnBg = s.add.graphics().setDepth(302).setAlpha(0);
    const isFs = s.sys.game.scale.isFullscreen;
    fsBtnBg.fillStyle(0x446644);
    fsBtnBg.fillRoundedRect(cx + 20, cy + 80, 120, 28, 6);
    const fsBtnText = s.add.text(cx + 80, cy + 94, isFs ? 'WINDOWED' : 'FULLSCREEN', {
      fontSize: '12px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5).setDepth(303).setAlpha(0);
    const fsZone = s.add.rectangle(cx + 80, cy + 94, 120, 28, 0xffffff, 0).setInteractive().setDepth(304).setAlpha(0);
    fsZone.on('pointerdown', () => {
      if (s.sys.game.scale.isFullscreen) {
        s.sys.game.scale.stopFullscreen();
        fsBtnText.setText('FULLSCREEN');
      } else {
        s.sys.game.scale.startFullscreen();
        fsBtnText.setText('WINDOWED');
      }
      window.soundManager.playMenuSelect();
    });
    fsZone.on('pointerover', () => window.soundManager.playMenuHover());

    const closeBg = s.add.graphics().setDepth(302).setAlpha(0);
    closeBg.fillStyle(0x664444);
    closeBg.fillRoundedRect(cx - 35, cy + 120, 70, 24, 6);
    const closeText = s.add.text(cx, cy + 132, 'CLOSE', {
      fontSize: '12px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5).setDepth(303).setAlpha(0);
    const closeZone = s.add.rectangle(cx, cy + 132, 70, 24, 0xffffff, 0).setInteractive().setDepth(304).setAlpha(0);
    closeZone.on('pointerdown', () => {
      window.soundManager.playMenuSelect();
      this.hide();
    });
    closeZone.on('pointerover', () => window.soundManager.playMenuHover());

    this.elements.push(
      bg, border, title,
      muteBtnBg, muteBtnText, muteZone,
      fsBtnBg, fsBtnText, fsZone,
      closeBg, closeText, closeZone,
    );
    this._sliders = sliders;
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

    const zone = scene.add.rectangle(x + w / 2, y, w, 20, 0xffffff, 0).setInteractive().setDepth(depth + 3).setAlpha(0);
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
    this._saveSettings();
  }

  _saveSettings() {
    try {
      const sm = window.soundManager;
      const data = {
        masterVolume: sm.masterVolume ?? 0.5,
        sfxVolume: sm.sfxVolume ?? 0.7,
        musicVolume: sm.musicVolume ?? 0.3,
        muted: sm.muted || false,
      };
      localStorage.setItem('mysticRealm_settings', JSON.stringify(data));
    } catch (e) { /* localStorage may be unavailable */ }
  }

  _loadSettings() {
    try {
      const raw = localStorage.getItem('mysticRealm_settings');
      if (!raw) return;
      const data = JSON.parse(raw);
      const sm = window.soundManager;
      if (data.masterVolume !== undefined) sm.setMasterVolume(data.masterVolume);
      if (data.sfxVolume !== undefined) sm.setSfxVolume(data.sfxVolume);
      if (data.musicVolume !== undefined) sm.setMusicVolume(data.musicVolume);
      if (data.muted) sm.toggleMute();
    } catch (e) { /* ignore */ }
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
