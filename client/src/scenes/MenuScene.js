class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const cx = 320;
    const cy = 240;

    this.add.text(cx, cy - 80, 'MYSTIC REALM', {
      fontSize: '48px',
      fontFamily: 'monospace',
      color: '#ffcc00',
      stroke: '#000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(cx, cy - 20, 'A Fantasy Multiplayer RPG', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#aaaacc',
    }).setOrigin(0.5);

    const blink = this.add.text(cx, cy + 60, 'Press ENTER to begin', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: blink,
      alpha: 0.2,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    this.input.keyboard.on('keydown-ENTER', () => {
      this.scene.start('CharCreateScene');
    });
  }
}
