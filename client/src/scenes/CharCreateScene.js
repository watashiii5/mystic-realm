const CHAR_CLASSES = [
  { key: 'mage', name: 'Mage', texture: 'player_mage', desc: 'Balanced spellcaster' },
  { key: 'sorcerer', name: 'Sorcerer', texture: 'player_sorcerer', desc: 'Glass cannon' },
  { key: 'druid', name: 'Druid', texture: 'player_druid', desc: 'Nature support' },
];

class CharCreateScene extends Phaser.Scene {
  constructor() {
    super('CharCreateScene');
  }

  create() {
    const cx = 320;
    const cy = 240;

    this.selectedClass = 0;
    this.playerName = '';

    this.add.text(cx, 40, 'CREATE YOUR CHARACTER', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#ffcc00',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.nameText = this.add.text(cx, 90, 'Name: _', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.classPreview = this.add.image(cx, 200, CHAR_CLASSES[0].texture).setScale(4);

    this.classNameText = this.add.text(cx, 280, CHAR_CLASSES[0].name, {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#ffcc00',
    }).setOrigin(0.5);

    this.classDescText = this.add.text(cx, 310, CHAR_CLASSES[0].desc, {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#aaaacc',
    }).setOrigin(0.5);

    this.add.text(cx, 370, '\u2190 \u2192  Switch Class     ENTER  Join Game', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#666688',
    }).setOrigin(0.5);

    this.add.text(cx, 400, 'Type your name, then press ENTER', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#666688',
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown', (event) => {
      if (event.key === 'Enter') {
        this.joinGame();
        return;
      }

      if (event.key === 'Backspace') {
        this.playerName = this.playerName.slice(0, -1);
        this.nameText.setText('Name: ' + this.playerName + '_');
        return;
      }

      if (event.key === 'ArrowLeft') {
        this.selectedClass = (this.selectedClass - 1 + CHAR_CLASSES.length) % CHAR_CLASSES.length;
        const cls = CHAR_CLASSES[this.selectedClass];
        this.classPreview.setTexture(cls.texture);
        this.classNameText.setText(cls.name);
        this.classDescText.setText(cls.desc);
        return;
      }

      if (event.key === 'ArrowRight') {
        this.selectedClass = (this.selectedClass + 1) % CHAR_CLASSES.length;
        const cls = CHAR_CLASSES[this.selectedClass];
        this.classPreview.setTexture(cls.texture);
        this.classNameText.setText(cls.name);
        this.classDescText.setText(cls.desc);
        return;
      }

      if (event.key.length === 1 && this.playerName.length < 16) {
        this.playerName += event.key;
        this.nameText.setText('Name: ' + this.playerName + '_');
      }
    });
  }

  joinGame() {
    const cls = CHAR_CLASSES[this.selectedClass];
    const name = this.playerName.trim() || cls.name;
    this.scene.start('GameScene', {
      name,
      class: cls.key,
    });
  }
}
