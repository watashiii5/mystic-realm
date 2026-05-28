class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    var l = document.getElementById('loading');
    if (l) l.style.display = 'none';
    const W = 32, H = 32;

    const make = (key, drawFn) => {
      const g = this.make.graphics({ add: false });
      drawFn(g, W, H);
      g.generateTexture(key, W, H);
      g.destroy();
    };

    make('tile_0', (g) => {
      g.fillStyle(0x4a7c2e); g.fillRect(0, 0, W, H);
      g.fillStyle(0x5a9c3e); g.fillRect(0, 0, 4, 4);
      g.fillRect(16, 8, 4, 4); g.fillRect(8, 20, 4, 4);
      g.fillRect(24, 16, 4, 4);
    });

    make('tile_1', (g) => {
      g.fillStyle(0x2d5a1e); g.fillCircle(16, 9, 9);
      g.fillStyle(0x3d7a2e); g.fillCircle(14, 7, 5);
      g.fillCircle(18, 11, 4);
      g.fillStyle(0x8B4513); g.fillRect(13, 17, 6, 12);
      g.fillRect(14, 15, 4, 4);
    });

    make('tile_2', (g) => {
      g.fillStyle(0x2266aa); g.fillRect(0, 0, W, H);
      g.fillStyle(0x3388cc); g.fillRect(0, 4, W, 2);
      g.fillRect(0, 16, W, 2); g.fillRect(0, 28, W, 2);
      g.fillStyle(0x1a5588); g.fillRect(0, 10, W, 1);
      g.fillRect(0, 22, W, 1);
    });

    make('tile_3', (g) => {
      g.fillStyle(0x666666); g.fillRect(0, 0, W, H);
      g.fillStyle(0x888888); g.fillRect(0, 0, W, 2);
      g.fillRect(0, 8, W, 2); g.fillRect(0, 16, W, 2);
      g.fillRect(0, 24, W, 2);

      g.fillStyle(0x555555); g.fillRect(0, 0, 2, 8);
      g.fillRect(8, 0, 2, 8); g.fillRect(16, 0, 2, 8);
      g.fillRect(24, 0, 2, 8);
      g.fillRect(4, 8, 2, 8); g.fillRect(12, 8, 2, 8);
      g.fillRect(20, 8, 2, 8); g.fillRect(28, 8, 2, 8);
      g.fillRect(0, 16, 2, 8); g.fillRect(8, 16, 2, 8);
      g.fillRect(16, 16, 2, 8); g.fillRect(24, 16, 2, 8);
      g.fillRect(4, 24, 2, 8); g.fillRect(12, 24, 2, 8);
      g.fillRect(20, 24, 2, 8); g.fillRect(28, 24, 2, 8);
    });

    make('tile_4', (g) => {
      g.fillStyle(0xc4a882); g.fillRect(0, 0, W, H);
      g.fillStyle(0xb89872); g.fillRect(2, 6, 4, 4);
      g.fillRect(18, 2, 4, 4); g.fillRect(8, 16, 4, 4);
      g.fillRect(24, 22, 4, 4); g.fillRect(6, 26, 4, 4);
    });

    make('tile_9', (g) => {
      g.fillStyle(0x3a3a4a); g.fillRect(0, 0, W, H);
      g.fillStyle(0x2a2a3a); g.fillCircle(8, 8, 4);
      g.fillCircle(20, 16, 3); g.fillCircle(12, 24, 5);
      g.fillStyle(0x4a4a5a, 0.3); g.fillRect(0, 14, W, 1);
    });

    make('tile_10', (g) => {
      g.fillStyle(0x5a4a3a); g.fillRect(0, 0, W, H);
      g.fillStyle(0x6a5a4a); g.fillRect(4, 2, 8, 8);
      g.fillRect(18, 10, 10, 6); g.fillRect(6, 18, 6, 10);
      g.lineStyle(1, 0x4a3a2a); g.strokeRect(4, 2, 8, 8);
      g.strokeRect(18, 10, 10, 6); g.strokeRect(6, 18, 6, 10);
    });

    make('tile_11', (g) => {
      g.fillStyle(0x665544); g.fillRect(0, 0, W, H);
      g.fillStyle(0x776655); g.fillRect(2, 4, 6, 6);
      g.fillRect(14, 2, 8, 8); g.fillRect(20, 14, 8, 10);
      g.fillRect(4, 20, 10, 8);
      g.lineStyle(1, 0x554433); g.strokeRect(2, 4, 6, 6);
      g.strokeRect(14, 2, 8, 8); g.strokeRect(20, 14, 8, 10);
      g.strokeRect(4, 20, 10, 8);
    });

    make('tile_12', (g) => {
      g.fillStyle(0x3a3a4a); g.fillRect(0, 0, W, H);
      g.fillStyle(0x2a2a3a); g.fillRect(0, 0, W, 2);
      g.fillRect(0, 14, W, 2); g.fillRect(0, 28, W, 2);
      g.fillStyle(0x4a4a6a); g.fillCircle(6, 8, 2);
      g.fillCircle(16, 20, 2); g.fillCircle(26, 10, 2);
    });

    make('tile_5', (g) => {
      g.fillStyle(0x4a7c2e); g.fillRect(0, 0, W, H);
      g.fillStyle(0x88ccff, 0.4); g.fillRect(0, 0, W, 4);
      g.fillStyle(0xffffff, 0.3); g.fillRect(8, 0, 4, 2);
      g.fillRect(20, 1, 6, 2);
    });

    make('tile_6', (g) => {
      g.fillStyle(0x4a7c2e); g.fillRect(0, 0, W, H);
      g.fillStyle(0x88ccff, 0.4); g.fillRect(0, 28, W, 4);
      g.fillStyle(0xffffff, 0.3); g.fillRect(6, 29, 4, 2);
      g.fillRect(18, 30, 6, 2);
    });

    make('tile_7', (g) => {
      g.fillStyle(0x4a7c2e); g.fillRect(0, 0, W, H);
      g.fillStyle(0x88ccff, 0.4); g.fillRect(0, 0, 4, H);
      g.fillStyle(0xffffff, 0.3); g.fillRect(0, 8, 2, 4);
      g.fillRect(1, 20, 2, 6);
    });

    make('tile_8', (g) => {
      g.fillStyle(0x4a7c2e); g.fillRect(0, 0, W, H);
      g.fillStyle(0x88ccff, 0.4); g.fillRect(28, 0, 4, H);
      g.fillStyle(0xffffff, 0.3); g.fillRect(29, 6, 2, 4);
      g.fillRect(30, 18, 2, 6);
    });

    const drawChar = (g, robe, accent, hat) => {
      g.fillStyle(0x000000); g.fillEllipse(16, 30, 18, 5);

      g.fillStyle(robe); g.fillRect(9, 16, 14, 14);
      g.fillRect(8, 28, 16, 4);

      g.fillStyle(0xffd5b4); g.fillCircle(16, 12, 6);
      g.fillRect(13, 16, 6, 3);

      g.fillStyle(0x000000); g.fillRect(13, 10, 2, 3);
      g.fillRect(17, 10, 2, 3);
      g.fillStyle(0xffffff); g.fillRect(14, 10, 1, 2);
      g.fillRect(18, 10, 1, 2);

      g.fillStyle(robe); g.fillRect(14, 6, 4, 3);

      if (hat) {
        g.fillStyle(robe); g.fillTriangle(16, 0, 8, 12, 24, 12);
        g.fillStyle(accent); g.fillRect(8, 10, 16, 3);
        g.fillStyle(accent); g.fillRect(11, 3, 10, 2);
      }
    };

    make('player_mage', (g) => drawChar(g, 0x3355aa, 0x5577cc, true));
    make('player_sorcerer', (g) => drawChar(g, 0xcc3333, 0xee5555, false));
    make('player_druid', (g) => drawChar(g, 0x33aa55, 0x55cc77, false));

    this.scene.start('MenuScene');
  }
}
