const config = {
  type: Phaser.AUTO,
  width: 640,
  height: 480,
  pixelArt: true,
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, CharCreateScene, GameScene],
};

const game = new Phaser.Game(config);
