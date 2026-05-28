const CHAR_CLASSES = [
  { key: 'mage', name: 'Mage', texture: 'player_mage', desc: 'Balanced spellcaster with healing', stats: 'HP:80 MP:100 ATK:12 DEF:8', spells: 'Magic Bolt + Heal' },
  { key: 'sorcerer', name: 'Sorcerer', texture: 'player_sorcerer', desc: 'Glass cannon — highest damage', stats: 'HP:60 MP:120 ATK:18 DEF:5', spells: 'Fireball' },
  { key: 'druid', name: 'Druid', texture: 'player_druid', desc: 'Nature warrior — tanky support', stats: 'HP:100 MP:80 ATK:8 DEF:12', spells: 'Heal + Summon Wolf' },
  { key: 'warrior', name: 'Warrior', texture: 'player_warrior', desc: 'Unyielding shieldbearer — high HP and defense', stats: 'HP:130 MP:40 ATK:16 DEF:14', spells: 'Stone Wall + Gale' },
  { key: 'archer', name: 'Archer', texture: 'player_archer', desc: 'Deadly ranged striker — fastest and most agile', stats: 'HP:70 MP:90 ATK:20 DEF:4', spells: 'Magic Bolt + Ice Shard' },
  { key: 'summoner', name: 'Summoner', texture: 'player_summoner', desc: 'Mystic beast tamer — summons pets to fight', stats: 'HP:75 MP:110 ATK:10 DEF:6', spells: 'Summon Wolf + Heal' },
];

class CharCreateScene extends Phaser.Scene {
  constructor() {
    super('CharCreateScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#0a0a1e');
    const cx = 320;
    const cy = 240;

    this.selectedClass = 0;
    this.playerName = '';
    this.classChanged = false;

    for (let i = 0; i < 20; i++) {
      const pt = this.add.text(Math.random() * 640, Math.random() * 480, ['*', '.', 'o', '+'][Math.random() * 4 | 0], {
        fontSize: '8px', fontFamily: 'monospace', color: ['#88ccff', '#ffcc00', '#88ff88'][Math.random() * 3 | 0],
      }).setAlpha(0.1 + Math.random() * 0.4);
      pt.speed = 0.1 + Math.random() * 0.3;
      pt.drift = Math.random() * 6.28;
      this.stars = this.stars || [];
      this.stars.push(pt);
    }

    this.add.text(cx, 30, 'CREATE YOUR CHARACTER', {
      fontSize: '28px', fontFamily: 'monospace', color: '#ffcc00',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: this.children.list[this.children.list.length - 1], alpha: 1, duration: 500, ease: 'Cubic.easeOut' });

    this.nameText = this.add.text(cx, 80, 'Name: _', {
      fontSize: '16px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: this.nameText, alpha: 1, duration: 400, delay: 200 });

    this.classPreview = this.add.image(cx, 175, CHAR_CLASSES[0].texture).setScale(3).setAlpha(0);
    this.tweens.add({ targets: this.classPreview, alpha: 1, scaleX: 3, scaleY: 3, duration: 500, delay: 300 });

    this.classNameGlow = this.add.graphics().setDepth(-1);

    this.classNameText = this.add.text(cx, 245, CHAR_CLASSES[0].name, {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffcc00',
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: this.classNameText, alpha: 1, duration: 400, delay: 400 });

    this.classDescText = this.add.text(cx, 275, CHAR_CLASSES[0].desc, {
      fontSize: '13px', fontFamily: 'monospace', color: '#aaaacc',
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: this.classDescText, alpha: 1, duration: 400, delay: 450 });

    this.classStatsText = this.add.text(cx, 298, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#88ff88',
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: this.classStatsText, alpha: 1, duration: 400, delay: 500 });

    this.classSpellsText = this.add.text(cx, 315, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#88ccff',
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: this.classSpellsText, alpha: 1, duration: 400, delay: 550 });

    this.updateClassDisplay(0);

    this.classPreview.setInteractive();
    this.input.on('pointerdown', (pointer) => {
      if (pointer.x < 320) this.switchClass(-1);
      else this.switchClass(1);
    });

    this.add.text(cx, 355, '\u2190 Click sides to switch     ENTER Join \u2192', {
      fontSize: '11px', fontFamily: 'monospace', color: '#555577',
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: this.children.list[this.children.list.length - 1], alpha: 1, duration: 400, delay: 700 });

    this.arrowLeft = this.add.text(30, 175, '\u25C0', { fontSize: '28px', fontFamily: 'monospace', color: '#555577' }).setOrigin(0.5).setAlpha(0.5);
    this.arrowRight = this.add.text(610, 175, '\u25B6', { fontSize: '28px', fontFamily: 'monospace', color: '#555577' }).setOrigin(0.5).setAlpha(0.5);
    this.tweens.add({ targets: [this.arrowLeft, this.arrowRight], alpha: 0.5, duration: 400, delay: 600 });

    this.input.keyboard.on('keydown', (event) => {
      if (event.key === 'Enter') { this.joinGame(); return; }
      if (event.key === 'Backspace') {
        this.playerName = this.playerName.slice(0, -1);
        this.nameText.setText('Name: ' + (this.playerName || '_'));
        return;
      }
      if (event.key === 'ArrowLeft') { this.switchClass(-1); return; }
      if (event.key === 'ArrowRight') { this.switchClass(1); return; }
      if (event.key.length === 1 && this.playerName.length < 16) {
        this.playerName += event.key;
        this.nameText.setText('Name: ' + this.playerName + '_');
      }
    });
  }

  switchClass(dir) {
    this.selectedClass = (this.selectedClass + dir + CHAR_CLASSES.length) % CHAR_CLASSES.length;
    this.classChanged = true;
    this.tweens.add({
      targets: this.classPreview, alpha: 0, scaleX: 2.5, scaleY: 2.5, duration: 150,
      onComplete: () => {
        this.updateClassDisplay(this.selectedClass);
        this.tweens.add({ targets: this.classPreview, alpha: 1, scaleX: 3, scaleY: 3, duration: 200, ease: 'Back.easeOut' });
      },
    });
    this.cameras.main.shake(50, 0.002);
  }

  updateClassDisplay(idx) {
    const cls = CHAR_CLASSES[idx];
    this.classPreview.setTexture(cls.texture);
    this.classNameText.setText(cls.name);
    this.classDescText.setText(cls.desc);
    this.classStatsText.setText(cls.stats);
    this.classSpellsText.setText('Spells: ' + cls.spells);

    const colors = { mage: 0x3355aa, sorcerer: 0xcc3333, druid: 0x33aa55, warrior: 0x886644, archer: 0x44aa44, summoner: 0x8844aa };
    this.classNameGlow.clear();
    this.classNameGlow.fillStyle(colors[cls.key] || 0x3355aa, 0.15);
    this.classNameGlow.fillCircle(320, 245, 80);
  }

  joinGame() {
    const cls = CHAR_CLASSES[this.selectedClass];
    const name = this.playerName.trim() || cls.name;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.time.delayedCall(300, () => {
      this.scene.start('GameScene', { name, class: cls.key });
    });
  }

  update(time, delta) {
    if (!this.stars) return;
    for (const s of this.stars) {
      s.drift += delta * 0.0008;
      s.y -= s.speed * (delta * 0.05);
      s.x += Math.sin(s.drift) * 0.2;
      if (s.y < -10) s.y = 490;
      if (s.x < -10) s.x = 650;
      if (s.x > 650) s.x = -10;
    }
  }
}
