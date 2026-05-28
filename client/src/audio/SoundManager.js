class SoundManager {
  constructor() {
    this.ctx = null;
    this.masterVolume = 0.5;
    this.sfxVolume = 0.7;
    this.muted = false;
    this._initOnInteraction = null;
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

  _gain(vol) {
    const g = this.ctx.createGain();
    g.gain.value = vol * this.masterVolume * this.sfxVolume * (this.muted ? 0 : 1);
    g.connect(this.ctx.destination);
    return g;
  }

  _osc(type, freq, dur, vol, detune) {
    if (!this.ctx) return null;
    const o = this.ctx.createOscillator();
    const g = this._gain(vol);
    o.type = type;
    o.frequency.value = freq;
    if (detune) o.detune.value = detune;
    o.connect(g);
    g.gain.setValueAtTime(vol * this.masterVolume * this.sfxVolume * (this.muted ? 0 : 1), this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.start(this.ctx.currentTime);
    o.stop(this.ctx.currentTime + dur);
    return { osc: o, gain: g };
  }

  _noise(dur, vol) {
    if (!this.ctx) return;
    const bufSize = this.ctx.sampleRate * dur;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this._gain(vol);
    src.connect(g);
    g.gain.setValueAtTime(vol * this.masterVolume * this.sfxVolume * (this.muted ? 0 : 1), this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    src.start(this.ctx.currentTime);
    src.stop(this.ctx.currentTime + dur);
  }

  _tone(freq, dur, vol, type) {
    this._osc(type || 'sine', freq, dur, vol || 0.3);
  }

  playMenuHover() {
    this._tone(600, 0.05, 0.15, 'sine');
  }

  playMenuSelect() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this._gain(0.3);
    o.type = 'sine';
    o.frequency.setValueAtTime(400, now);
    o.frequency.exponentialRampToValueAtTime(800, now + 0.1);
    o.connect(g);
    g.gain.setValueAtTime(0.3 * this.masterVolume * this.sfxVolume * (this.muted ? 0 : 1), now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    o.start(now);
    o.stop(now + 0.15);
  }

  playWalk() {
    this._noise(0.04, 0.08);
  }

  playCastSpell() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const o1 = this.ctx.createOscillator();
    const g1 = this._gain(0.2);
    o1.type = 'sawtooth';
    o1.frequency.setValueAtTime(600, now);
    o1.frequency.exponentialRampToValueAtTime(200, now + 0.18);
    o1.connect(g1);
    g1.gain.setValueAtTime(0.2 * this.masterVolume * this.sfxVolume * (this.muted ? 0 : 1), now);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    o1.start(now);
    o1.stop(now + 0.2);
    this._noise(0.08, 0.1);
  }

  playHit() {
    this._noise(0.06, 0.25);
    this._tone(150, 0.08, 0.3, 'square');
  }

  playHeal() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [400, 500, 600].forEach((f, i) => {
      const o = this.ctx.createOscillator();
      const g = this._gain(0.15);
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(g);
      const t = now + i * 0.08;
      g.gain.setValueAtTime(0.15 * this.masterVolume * this.sfxVolume * (this.muted ? 0 : 1), t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.start(t);
      o.stop(t + 0.12);
    });
  }

  playLevelUp() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [400, 500, 600, 800, 1000].forEach((f, i) => {
      const o = this.ctx.createOscillator();
      const g = this._gain(0.2);
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(g);
      const t = now + i * 0.07;
      g.gain.setValueAtTime(0.2 * this.masterVolume * this.sfxVolume * (this.muted ? 0 : 1), t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      o.start(t);
      o.stop(t + 0.1);
    });
  }

  playDeath() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this._gain(0.3);
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(400, now);
    o.frequency.exponentialRampToValueAtTime(60, now + 0.5);
    o.connect(g);
    g.gain.setValueAtTime(0.3 * this.masterVolume * this.sfxVolume * (this.muted ? 0 : 1), now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    o.start(now);
    o.stop(now + 0.55);
    this._noise(0.2, 0.15);
  }

  playItemPickup() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this._gain(0.2);
    o.type = 'sine';
    o.frequency.setValueAtTime(800, now);
    o.frequency.exponentialRampToValueAtTime(1600, now + 0.08);
    o.connect(g);
    g.gain.setValueAtTime(0.2 * this.masterVolume * this.sfxVolume * (this.muted ? 0 : 1), now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    o.start(now);
    o.stop(now + 0.12);
  }

  playMonsterDeath() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this._gain(0.2);
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(200, now);
    o.frequency.exponentialRampToValueAtTime(50, now + 0.25);
    o.connect(g);
    g.gain.setValueAtTime(0.2 * this.masterVolume * this.sfxVolume * (this.muted ? 0 : 1), now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    o.start(now);
    o.stop(now + 0.3);
    this._noise(0.12, 0.12);
  }

  playBossRoar() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const o1 = this.ctx.createOscillator();
    const g1 = this._gain(0.35);
    o1.type = 'sawtooth';
    o1.frequency.setValueAtTime(100, now);
    o1.frequency.exponentialRampToValueAtTime(40, now + 0.6);
    o1.connect(g1);
    g1.gain.setValueAtTime(0.35 * this.masterVolume * this.sfxVolume * (this.muted ? 0 : 1), now);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    o1.start(now);
    o1.stop(now + 0.65);
    this._noise(0.4, 0.2);
    const o2 = this.ctx.createOscillator();
    const g2 = this._gain(0.15);
    o2.type = 'square';
    o2.frequency.setValueAtTime(60, now + 0.1);
    o2.frequency.exponentialRampToValueAtTime(30, now + 0.5);
    o2.connect(g2);
    g2.gain.setValueAtTime(0.15 * this.masterVolume * this.sfxVolume * (this.muted ? 0 : 1), now + 0.1);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    o2.start(now + 0.1);
    o2.stop(now + 0.55);
  }

  playChatMessage() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [600, 800].forEach((f, i) => {
      const o = this.ctx.createOscillator();
      const g = this._gain(0.1);
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(g);
      const t = now + i * 0.06;
      g.gain.setValueAtTime(0.1 * this.masterVolume * this.sfxVolume * (this.muted ? 0 : 1), t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      o.start(t);
      o.stop(t + 0.06);
    });
  }

  setMasterVolume(v) { this.masterVolume = Math.max(0, Math.min(1, v)); }
  setSfxVolume(v) { this.sfxVolume = Math.max(0, Math.min(1, v)); }
  toggleMute() { this.muted = !this.muted; return this.muted; }
  setMuted(val) { this.muted = val; }
}

window.soundManager = new SoundManager();
