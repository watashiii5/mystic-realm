function hideLoading() {
  var el = document.getElementById('loading');
  if (el) el.style.display = 'none';
}

try {
  var config = {
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

  var game = new Phaser.Game(config);
  console.log('Phaser game created successfully');

  game.events.on('ready', function () {
    hideLoading();
    console.log('Phaser game ready');
  });

  setTimeout(function () {
    var el = document.getElementById('loading');
    if (el && el.style.display !== 'none') {
      el.textContent = 'Mystic Realm loaded (click here)';
      el.style.color = '#ffffff';
      el.style.cursor = 'pointer';
      el.onclick = hideLoading;
    }
  }, 5000);
} catch (e) {
  var el = document.getElementById('error');
  if (el) {
    el.textContent = 'Failed to start Phaser: ' + e.message + '\n' + (e.stack || '');
    el.style.display = 'block';
  }
  document.getElementById('loading').style.display = 'none';
}
