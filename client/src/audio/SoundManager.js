class SoundManager {
  constructor() {
    this.ctx = null;
    this.masterVolume = 0.5;
    this.sfxVolume = 0.7;
    this.musicVolume = 0.3;
    this.muted = false;
    this._ambientNodes = null;
    this._ambientPlaying = false;
    this._init();
  }

  _init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      this.ctx = null;
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      const resume = () => {
        this.ctx.resume();
        document.removeEventListener('click', resume);
        document.removeEventListener('keydown', resume);
        document.removeEventListener('touchstart', resume);
      };
      document.addEventListener('click', resume);
      document.addEventListener('keydown', resume);
      document.addEventListener('touchstart', resume);
    }
  }

  _vol() {
    return this.masterVolume * (this.muted ? 0 : 1);
  }

  _gain(vol) {
    if (!this.ctx) return null;
    const g = this.ctx.createGain();
    g.gain.value = vol * this._vol();
    g.connect(this.ctx.destination);
    return g;
  }

  _musicGain(vol) {
    if (!this.ctx) return null;
    const g = this.ctx.createGain();
    g.gain.value = vol * this._vol() * this.musicVolume;
    g.connect(this.ctx.destination);
    return g;
  }

  _filter(type, freq) {
    if (!this.ctx) return null;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    return f;
  }

  _scheduledGain(vol, startTime, dur) {
    if (!this.ctx) return null;
    const g = this.ctx.createGain();
    const v = vol * this._vol();
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(v, startTime + 0.005);
    g.gain.setValueAtTime(v, startTime + dur - 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
    return g;
  }

  _noise(dur, vol) {
    if (!this.ctx) return;
    const bufSize = Math.ceil(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this._gain(vol);
    if (!g) return;
    const now = this.ctx.currentTime;
    g.gain.setValueAtTime(vol * this._vol(), now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(g);
    src.start(now);
    src.stop(now + dur);
  }

  _sfx(fn) {
    if (!this.ctx || this.muted || this.masterVolume === 0 || this.sfxVolume === 0) return;
    fn(this.ctx, this.ctx.currentTime, this._vol() * this.sfxVolume);
  }

  _oscBand(now, freqs, dur, vol, type) {
    return freqs.map((f, i) => {
      const o = this.ctx.createOscillator();
      const g = this._scheduledGain(vol, now + i * 0.005, dur);
      if (!g) return null;
      o.type = type || 'sine';
      o.frequency.value = f;
      o.connect(g);
      o.start(now + i * 0.005);
      o.stop(now + i * 0.005 + dur);
      return { o, g };
    });
  }

  /* --- SFX --- */

  playMenuHover() {
    this._sfx((ctx, now, vol) => {
      const o = ctx.createOscillator();
      const g = this._scheduledGain(0.15, now, 0.05);
      if (!g) return;
      o.type = 'sine'; o.frequency.value = 600;
      o.connect(g); o.start(now); o.stop(now + 0.06);
    });
  }

  playMenuSelect() {
    this._sfx((ctx, now, vol) => {
      const o = ctx.createOscillator();
      const g = this._scheduledGain(0.3, now, 0.15);
      if (!g) return;
      o.type = 'sine';
      o.frequency.setValueAtTime(400, now);
      o.frequency.exponentialRampToValueAtTime(900, now + 0.12);
      o.connect(g); o.start(now); o.stop(now + 0.16);
    });
  }

  playWalk() {
    this._sfx((ctx, now, vol) => {
      const bufSize = Math.ceil(ctx.sampleRate * 0.04);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = this._scheduledGain(0.06, now, 0.04);
      if (!g) return;
      src.connect(g); src.start(now); src.stop(now + 0.05);
    });
  }

  playCastSpell() {
    this._sfx((ctx, now, vol) => {
      const o1 = ctx.createOscillator();
      const g1 = this._scheduledGain(0.2, now, 0.2);
      if (!g1) return;
      o1.type = 'sawtooth';
      o1.frequency.setValueAtTime(600, now);
      o1.frequency.exponentialRampToValueAtTime(200, now + 0.18);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2000;
      o1.connect(f); f.connect(g1); o1.start(now); o1.stop(now + 0.2);
      const bufSize = Math.ceil(ctx.sampleRate * 0.08);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(); src.buffer = buf;
      const g2 = this._scheduledGain(0.08, now, 0.08);
      if (!g2) return;
      src.connect(g2); src.start(now); src.stop(now + 0.09);
    });
  }

  playFireCast() {
    this._sfx((ctx, now, vol) => {
      const o1 = ctx.createOscillator();
      const g1 = this._scheduledGain(0.25, now, 0.25);
      if (!g1) return;
      o1.type = 'sawtooth';
      o1.frequency.setValueAtTime(300, now);
      o1.frequency.exponentialRampToValueAtTime(600, now + 0.12);
      o1.frequency.exponentialRampToValueAtTime(150, now + 0.25);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1500;
      o1.connect(f); f.connect(g1); o1.start(now); o1.stop(now + 0.26);
      const bufSize = Math.ceil(ctx.sampleRate * 0.15);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(); src.buffer = buf;
      const g2 = this._scheduledGain(0.1, now, 0.15);
      if (!g2) return;
      const f2 = ctx.createBiquadFilter(); f2.type = 'highpass'; f2.frequency.value = 1000;
      src.connect(f2); f2.connect(g2); src.start(now); src.stop(now + 0.16);
    });
  }

  playIceCast() {
    this._sfx((ctx, now, vol) => {
      [1200, 1500, 1800].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = this._scheduledGain(0.12, now + i * 0.04, 0.12);
        if (!g) return;
        o.type = 'sine';
        o.frequency.setValueAtTime(f, now + i * 0.04);
        o.frequency.exponentialRampToValueAtTime(f + 400, now + i * 0.04 + 0.06);
        const f2 = ctx.createBiquadFilter(); f2.type = 'highpass'; f2.frequency.value = 800;
        o.connect(f2); f2.connect(g); o.start(now + i * 0.04); o.stop(now + i * 0.04 + 0.13);
      });
      const bufSize = Math.ceil(ctx.sampleRate * 0.1);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(); src.buffer = buf;
      const g3 = this._scheduledGain(0.06, now, 0.1);
      if (!g3) return;
      const f3 = ctx.createBiquadFilter(); f3.type = 'highpass'; f3.frequency.value = 2000;
      src.connect(f3); f3.connect(g3); src.start(now); src.stop(now + 0.11);
    });
  }

  playHit() {
    this._sfx((ctx, now, vol) => {
      const bufSize = Math.ceil(ctx.sampleRate * 0.06);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(); src.buffer = buf;
      const g = this._scheduledGain(0.2, now, 0.06);
      if (!g) return;
      src.connect(g); src.start(now); src.stop(now + 0.07);
      const o = ctx.createOscillator();
      const g2 = this._scheduledGain(0.25, now, 0.08);
      if (!g2) return;
      o.type = 'square'; o.frequency.value = 150;
      o.connect(g2); o.start(now); o.stop(now + 0.09);
    });
  }

  playHeal() {
    this._sfx((ctx, now, vol) => {
      [400, 500, 650, 800].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = this._scheduledGain(0.12, now + i * 0.07, 0.13);
        if (!g) return;
        o.type = 'sine'; o.frequency.value = f;
        o.connect(g); o.start(now + i * 0.07); o.stop(now + i * 0.07 + 0.14);
      });
    });
  }

  playLevelUp() {
    this._sfx((ctx, now, vol) => {
      [400, 500, 630, 800, 1000, 1200].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = this._scheduledGain(0.18, now + i * 0.06, 0.12);
        if (!g) return;
        o.type = 'sine'; o.frequency.value = f;
        const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 2000;
        o.connect(f2); f2.connect(g);
        o.start(now + i * 0.06); o.stop(now + i * 0.06 + 0.13);
      });
    });
  }

  playDeath() {
    this._sfx((ctx, now, vol) => {
      const o = ctx.createOscillator();
      const g = this._scheduledGain(0.3, now, 0.55);
      if (!g) return;
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(350, now);
      o.frequency.exponentialRampToValueAtTime(50, now + 0.5);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 800;
      o.connect(f); f.connect(g); o.start(now); o.stop(now + 0.55);
      const bufSize = Math.ceil(ctx.sampleRate * 0.2);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(); src.buffer = buf;
      const g2 = this._scheduledGain(0.1, now, 0.2);
      if (!g2) return;
      src.connect(g2); src.start(now); src.stop(now + 0.21);
    });
  }

  playItemPickup() {
    this._sfx((ctx, now, vol) => {
      const o = ctx.createOscillator();
      const g = this._scheduledGain(0.2, now, 0.14);
      if (!g) return;
      o.type = 'sine';
      o.frequency.setValueAtTime(700, now);
      o.frequency.exponentialRampToValueAtTime(1500, now + 0.08);
      o.connect(g); o.start(now); o.stop(now + 0.15);
    });
  }

  playRareItemPickup() {
    this._sfx((ctx, now, vol) => {
      [800, 1000, 1300, 1600].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = this._scheduledGain(0.15, now + i * 0.05, 0.12);
        if (!g) return;
        o.type = 'sine'; o.frequency.value = f;
        o.connect(g); o.start(now + i * 0.05); o.stop(now + i * 0.05 + 0.13);
      });
      const o2 = ctx.createOscillator();
      const g2 = this._scheduledGain(0.15, now, 0.2);
      if (!g2) return;
      o2.type = 'triangle';
      o2.frequency.setValueAtTime(500, now);
      o2.frequency.exponentialRampToValueAtTime(2000, now + 0.2);
      o2.connect(g2); o2.start(now); o2.stop(now + 0.21);
    });
  }

  playMonsterDeath() {
    this._sfx((ctx, now, vol) => {
      const o = ctx.createOscillator();
      const g = this._scheduledGain(0.18, now, 0.3);
      if (!g) return;
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(180, now);
      o.frequency.exponentialRampToValueAtTime(40, now + 0.25);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600;
      o.connect(f); f.connect(g); o.start(now); o.stop(now + 0.3);
      const bufSize = Math.ceil(ctx.sampleRate * 0.1);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(); src.buffer = buf;
      const g2 = this._scheduledGain(0.08, now, 0.1);
      if (!g2) return;
      src.connect(g2); src.start(now); src.stop(now + 0.11);
    });
  }

  playBossRoar() {
    this._sfx((ctx, now, vol) => {
      const o1 = ctx.createOscillator();
      const g1 = this._scheduledGain(0.3, now, 0.7);
      if (!g1) return;
      o1.type = 'sawtooth';
      o1.frequency.setValueAtTime(90, now);
      o1.frequency.exponentialRampToValueAtTime(35, now + 0.6);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
      o1.connect(f); f.connect(g1); o1.start(now); o1.stop(now + 0.7);
      const bufSize = Math.ceil(ctx.sampleRate * 0.4);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(); src.buffer = buf;
      const g2 = this._scheduledGain(0.15, now, 0.4);
      if (!g2) return;
      const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 300;
      src.connect(f2); f2.connect(g2); src.start(now); src.stop(now + 0.41);
      const o2 = ctx.createOscillator();
      const g3 = this._scheduledGain(0.12, now + 0.08, 0.5);
      if (!g3) return;
      o2.type = 'square';
      o2.frequency.setValueAtTime(55, now + 0.08);
      o2.frequency.exponentialRampToValueAtTime(25, now + 0.45);
      o2.connect(g3); o2.start(now + 0.08); o2.stop(now + 0.5);
    });
  }

  playChatMessage() {
    this._sfx((ctx, now, vol) => {
      [650, 900].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = this._scheduledGain(0.08, now + i * 0.06, 0.07);
        if (!g) return;
        o.type = 'sine'; o.frequency.value = f;
        o.connect(g); o.start(now + i * 0.06); o.stop(now + i * 0.06 + 0.08);
      });
    });
  }

  playZoneTransition() {
    this._sfx((ctx, now, vol) => {
      [300, 400, 600, 900].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = this._scheduledGain(0.12, now + i * 0.08, 0.2);
        if (!g) return;
        o.type = 'sine'; o.frequency.value = f;
        const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 2000;
        o.connect(f2); f2.connect(g);
        o.start(now + i * 0.08); o.stop(now + i * 0.08 + 0.2);
      });
      const bufSize = Math.ceil(ctx.sampleRate * 0.2);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(); src.buffer = buf;
      const g = this._scheduledGain(0.06, now, 0.2);
      if (!g) return;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 2;
      src.connect(f); f.connect(g); src.start(now); src.stop(now + 0.21);
    });
  }

  playInventoryOpen() {
    this._sfx((ctx, now, vol) => {
      const o = ctx.createOscillator();
      const g = this._scheduledGain(0.15, now, 0.12);
      if (!g) return;
      o.type = 'sine';
      o.frequency.setValueAtTime(400, now);
      o.frequency.exponentialRampToValueAtTime(700, now + 0.1);
      o.connect(g); o.start(now); o.stop(now + 0.13);
    });
  }

  playInventoryClose() {
    this._sfx((ctx, now, vol) => {
      const o = ctx.createOscillator();
      const g = this._scheduledGain(0.15, now, 0.1);
      if (!g) return;
      o.type = 'sine';
      o.frequency.setValueAtTime(600, now);
      o.frequency.exponentialRampToValueAtTime(350, now + 0.08);
      o.connect(g); o.start(now); o.stop(now + 0.11);
    });
  }

  playRespawn() {
    this._sfx((ctx, now, vol) => {
      [300, 450, 600, 800].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = this._scheduledGain(0.15, now + i * 0.08, 0.18);
        if (!g) return;
        o.type = 'triangle'; o.frequency.value = f;
        const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 2500;
        o.connect(f2); f2.connect(g);
        o.start(now + i * 0.08); o.stop(now + i * 0.08 + 0.19);
      });
    });
  }

  playSprint() {
    this._sfx((ctx, now, vol) => {
      const bufSize = Math.ceil(ctx.sampleRate * 0.15);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource(); src.buffer = buf;
      const g = this._scheduledGain(0.06, now, 0.15);
      if (!g) return;
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2000;
      src.connect(f); f.connect(g); src.start(now); src.stop(now + 0.16);
    });
  }

  playError() {
    this._sfx((ctx, now, vol) => {
      const o = ctx.createOscillator();
      const g = this._scheduledGain(0.2, now, 0.15);
      if (!g) return;
      o.type = 'square';
      o.frequency.setValueAtTime(200, now);
      o.frequency.setValueAtTime(150, now + 0.08);
      o.connect(g); o.start(now); o.stop(now + 0.16);
    });
  }

  /* --- Music / Ambient --- */

  startAmbient() {
    if (!this.ctx || this._ambientPlaying) return;
    this._ambientPlaying = true;
    this._updateAmbient();
  }

  stopAmbient() {
    this._ambientPlaying = false;
    if (this._ambientNodes) {
      this._ambientNodes.forEach(n => { try { n.stop(); } catch (e) {} });
      this._ambientNodes = null;
    }
  }

  _updateAmbient() {
    if (!this._ambientPlaying || !this.ctx) return;
    const now = this.ctx.currentTime;
    const dur = 8;
    const gain = this._musicGain(0.15);
    if (!gain) return;

    const nodes = [];

    const o1 = this.ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.setValueAtTime(55 + Math.random() * 8, now);
    o1.frequency.linearRampToValueAtTime(55 + Math.random() * 8, now + dur);
    const g1 = this.ctx.createGain();
    g1.gain.setValueAtTime(0, now);
    g1.gain.linearRampToValueAtTime(0.5, now + 1.5);
    g1.gain.setValueAtTime(0.5, now + dur - 2);
    g1.gain.linearRampToValueAtTime(0, now + dur);
    const f1 = this.ctx.createBiquadFilter();
    f1.type = 'lowpass'; f1.frequency.value = 300;
    o1.connect(f1); f1.connect(g1); g1.connect(gain);
    o1.start(now); o1.stop(now + dur);
    nodes.push(o1);

    const o2 = this.ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.setValueAtTime(65 + Math.random() * 10, now);
    o2.frequency.linearRampToValueAtTime(65 + Math.random() * 10, now + dur);
    const g2 = this.ctx.createGain();
    g2.gain.setValueAtTime(0, now);
    g2.gain.linearRampToValueAtTime(0.3, now + 2);
    g2.gain.setValueAtTime(0.3, now + dur - 2.5);
    g2.gain.linearRampToValueAtTime(0, now + dur);
    const f2 = this.ctx.createBiquadFilter();
    f2.type = 'lowpass'; f2.frequency.value = 250;
    o2.connect(f2); f2.connect(g2); g2.connect(gain);
    o2.start(now); o2.stop(now + dur);
    nodes.push(o2);

    const bufSize = Math.ceil(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * 0.3;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const g3 = this.ctx.createGain();
    g3.gain.setValueAtTime(0, now);
    g3.gain.linearRampToValueAtTime(0.15, now + 3);
    g3.gain.setValueAtTime(0.15, now + dur - 3);
    g3.gain.linearRampToValueAtTime(0, now + dur);
    const f3 = this.ctx.createBiquadFilter();
    f3.type = 'bandpass'; f3.frequency.value = 200; f3.Q.value = 0.5;
    src.connect(f3); f3.connect(g3); g3.connect(gain);
    src.start(now); src.stop(now + dur);
    nodes.push(src);

    this._ambientNodes = nodes;
    gain.connect(this.ctx.destination);

    this._ambientTimer = setTimeout(() => this._updateAmbient(), dur * 1000 + 100);
  }

  /* --- Volume controls --- */

  setMasterVolume(v) { this.masterVolume = Math.max(0, Math.min(1, v)); }
  setSfxVolume(v) { this.sfxVolume = Math.max(0, Math.min(1, v)); }
  setMusicVolume(v) { this.musicVolume = Math.max(0, Math.min(1, v)); }
  toggleMute() { this.muted = !this.muted; return this.muted; }
  setMuted(val) { this.muted = val; }

  getVolumePercent(which) {
    const v = which === 'master' ? this.masterVolume : which === 'sfx' ? this.sfxVolume : this.musicVolume;
    return Math.round(v * 100);
  }
}

window.soundManager = new SoundManager();
