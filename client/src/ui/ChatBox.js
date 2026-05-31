class ChatBox {
  constructor(scene, network) {
    this.scene = scene;
    this.network = network;
    this.input = '';
    this.isChatting = false;
    this.messages = [];
    this.pool = [];
    this.bg = null;
    this.inputBg = null;
    this.inputText = null;
    this.inputHint = null;
    this.scrollOffset = 0;
    this.MAX_VISIBLE = 6;
    this.MAX_HISTORY = 50;

    scene.input.on('wheel', (_pointer, _gos, _dx, dy) => {
      if (this.isChatting || this.messages.length < this.MAX_VISIBLE) return;
      this.scrollOffset = Math.max(0, Math.min(this.messages.length - this.MAX_VISIBLE, this.scrollOffset + (dy > 0 ? 1 : -1)));
    });

    this._touchStartY = 0;
    this._touchActive = false;
    scene.input.on('pointerdown', (pointer) => {
      if (this.isChatting) return;
      if (pointer.x < 490 && pointer.y > 340) {
        this._touchStartY = pointer.y;
        this._touchActive = true;
      }
    });
    scene.input.on('pointermove', (pointer) => {
      if (!this._touchActive || this.isChatting || !pointer.isDown) return;
      if (pointer.x < 490 && pointer.y > 340) {
        const dy = this._touchStartY - pointer.y;
        if (Math.abs(dy) > 10) {
          this.scrollOffset = Math.max(0, Math.min(this.messages.length - this.MAX_VISIBLE, this.scrollOffset + (dy > 0 ? 1 : -1)));
          this._touchStartY = pointer.y;
        }
      }
    });
    scene.input.on('pointerup', () => { this._touchActive = false; });
  }

  addMessage(name, text, color) {
    const isSys = name === 'System';
    const displayName = isSys ? '' : (name.length > 12 ? name.slice(0, 12) + '..' : name + ':');
    const displayText = text.length > 60 ? text.slice(0, 60) + '..' : text;
    const entry = { text: isSys ? '> ' + displayText : displayName + ' ' + displayText, time: Date.now(), sys: isSys, color: color || (isSys ? '#88ccff' : '#cccccc'), y: 430, alpha: 1 };
    this.messages.push(entry);
    while (this.messages.length > this.MAX_HISTORY) this.messages.shift();
    this.scrollOffset = 0;
    this.renderHistory();
  }

  showInput() {
    const s = this.scene;
    this.inputBg = s.add.graphics().setDepth(200);
    this.inputBg.fillStyle(0x000000, 0.85);
    this.inputBg.fillRect(4, 396, 480, 62);
    this.inputBg.lineStyle(1, 0x88ccff, 0.3);
    this.inputBg.strokeRect(4, 396, 480, 62);
    this.inputBg.fillStyle(0x88ccff, 0.1);
    this.inputBg.fillRect(4, 430, 480, 26);
    this.inputBg.setAlpha(0);
    s.tweens.add({ targets: this.inputBg, alpha: 1, duration: 150 });
    this.inputText = s.add.text(10, 434, '> ' + this.input + '_', { fontSize: '13px', fontFamily: 'monospace', color: '#ffffff' }).setDepth(200);
    this.inputText.setAlpha(0);
    s.tweens.add({ targets: this.inputText, alpha: 1, duration: 150 });
    this.inputHint = s.add.text(10, 402, 'Enter to send | Esc to cancel | Scroll wheel for history', { fontSize: '10px', fontFamily: 'monospace', color: '#666666' }).setDepth(200);
  }

  hideInput() {
    if (this.inputBg) this.inputBg.destroy();
    if (this.inputText) this.inputText.destroy();
    if (this.inputHint) this.inputHint.destroy();
    this.inputBg = null;
    this.inputText = null;
    this.inputHint = null;
  }

  updateInputText() {
    if (this.inputText) {
      this.inputText.setText('> ' + this.input + '_');
    }
  }

  renderHistory() {
    const s = this.scene;
    const now = Date.now();
    const chatW = 480;
    const baseY = 370;
    const lineH = 15;

    const visible = [];
    for (let i = 0; i < this.messages.length; i++) {
      const msg = this.messages[i];
      if (msg.sys) {
        const elapsed = now - msg.time;
        if (elapsed > 10000) msg.alpha = Math.max(0, 1 - (elapsed - 10000) / 2000);
      }
      if (msg.alpha > 0) visible.push(msg);
    }

    const totalVis = visible.length;
    const startIdx = Math.max(0, totalVis - this.MAX_VISIBLE - this.scrollOffset);
    const endIdx = Math.max(startIdx, totalVis - this.scrollOffset);
    const count = Math.min(endIdx - startIdx, this.MAX_VISIBLE);
    const clampedStart = Math.max(0, endIdx - count);

    if (!this.bg) {
      this.bg = s.add.graphics().setDepth(149);
    }
    this.bg.clear();
    if (count > 0) {
      const bgH = count * lineH + 8;
      this.bg.fillStyle(0x000000, 0.45);
      this.bg.fillRect(4, baseY - 4, chatW, bgH);
      this.bg.fillStyle(0xffffff, 0.06);
      this.bg.fillRect(4, baseY - 4, chatW, 1);
    }

    let idx = 0;
    for (let i = clampedStart; i < endIdx && idx < this.MAX_VISIBLE; i++) {
      const msg = visible[i];
      if (!msg || msg.alpha <= 0) continue;

      let t = this.pool[idx];
      if (!t) {
        t = s.add.text(10, 0, '', { fontSize: '11px', fontFamily: 'monospace', wordWrap: { width: chatW - 12 } }).setDepth(150);
        this.pool.push(t);
      }

      const targetY = baseY + idx * lineH;
      if (msg.y === undefined) msg.y = 430;
      if (msg.y > targetY) msg.y = Math.max(targetY, msg.y - 2.5);
      else if (msg.y < targetY) msg.y = Math.min(targetY, msg.y + 2.5);

      t.setText(msg.text);
      t.setPosition(10, msg.y);
      t.setStyle({ color: msg.color, stroke: '#000000', strokeThickness: 2 });
      t.setAlpha(msg.alpha);
      t.setVisible(true);
      idx++;
    }
    for (let i = idx; i < this.pool.length; i++) {
      this.pool[i].setVisible(false);
    }
  }

  destroy() {
    this.hideInput();
    if (this.bg) this.bg.destroy();
    this.pool.forEach(t => t.destroy());
    this.pool = [];
    this.messages = [];
  }
}
