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
      g.fillStyle(0x3d6a1e, 0.3); g.fillRect(6, 10, 3, 3);
      g.fillRect(22, 24, 3, 3);
    });

    make('tile_1', (g) => {
      g.fillStyle(0x4a7c2e); g.fillRect(0, 0, W, H);
      g.fillStyle(0x3d6a1e); g.fillRect(0, 0, W, H);
      g.fillStyle(0x2d5a1e, 0.85); g.fillCircle(16, 12, 10);
      g.fillStyle(0x3d7a2e, 0.85); g.fillCircle(14, 10, 6);
      g.fillStyle(0x8B4513); g.fillRect(13, 18, 6, 12);
      g.fillRect(14, 16, 4, 4);
      g.fillStyle(0x6B3513); g.fillRect(12, 20, 2, 6);
    });

    make('tile_2', (g) => {
      g.fillStyle(0x1a5599); g.fillRect(0, 0, W, H);
      g.fillStyle(0x3388cc); g.fillRect(2, 6, 28, 3);
      g.fillStyle(0x4499dd); g.fillRect(4, 10, 24, 2);
      g.fillStyle(0x1a5599); g.fillRect(0, 14, W, 4);
      g.fillStyle(0x3388cc); g.fillRect(2, 20, 28, 3);
      g.fillStyle(0x4499dd); g.fillRect(4, 24, 24, 2);
      g.fillStyle(0xffffff, 0.15); g.fillRect(8, 8, 3, 2);
      g.fillRect(20, 22, 3, 2);
    });

    make('tile_3', (g) => {
      g.fillStyle(0x666666); g.fillRect(0, 0, W, H);
      g.fillStyle(0x777777); g.fillRect(0, 0, W, 2);
      g.fillRect(0, 8, W, 2); g.fillRect(0, 16, W, 2);
      g.fillRect(0, 24, W, 2);
      g.fillStyle(0x555555); g.fillRect(2, 2, 6, 6);
      g.fillRect(12, 2, 8, 6); g.fillRect(24, 2, 6, 6);
      g.fillRect(2, 10, 10, 6); g.fillRect(18, 10, 8, 6);
      g.fillRect(6, 18, 8, 6); g.fillRect(20, 18, 10, 6);
      g.fillStyle(0x888888); g.fillRect(4, 4, 2, 2);
      g.fillRect(14, 4, 4, 2); g.fillRect(26, 4, 2, 2);
      g.fillRect(4, 12, 6, 2); g.fillRect(20, 12, 4, 2);
      g.fillRect(8, 20, 4, 2); g.fillRect(22, 20, 6, 2);
    });

    make('tile_4', (g) => {
      g.fillStyle(0xc4a882); g.fillRect(0, 0, W, H);
      g.fillStyle(0xb89872); g.fillRect(2, 6, 4, 4);
      g.fillRect(18, 2, 4, 4); g.fillRect(8, 16, 4, 4);
      g.fillRect(24, 22, 4, 4); g.fillRect(6, 26, 4, 4);
      g.fillStyle(0xd4b892); g.fillRect(10, 12, 4, 2);
      g.fillRect(20, 14, 2, 4);
    });

    make('tile_9', (g) => {
      g.fillStyle(0x3a3a4a); g.fillRect(0, 0, W, H);
      g.fillStyle(0x2a2a3a); g.fillCircle(8, 8, 4);
      g.fillCircle(20, 16, 3); g.fillCircle(12, 24, 5);
      g.fillStyle(0x4a4a5a, 0.3); g.fillRect(0, 14, W, 1);
      g.fillStyle(0x88ccff, 0.08); g.fillCircle(16, 16, 12);
    });

    make('tile_10', (g) => {
      g.fillStyle(0x5a4a3a); g.fillRect(0, 0, W, H);
      g.fillStyle(0x6a5a4a); g.fillRect(4, 2, 8, 8);
      g.fillRect(18, 10, 10, 6); g.fillRect(6, 18, 6, 10);
      g.lineStyle(1, 0x4a3a2a); g.strokeRect(4, 2, 8, 8);
      g.strokeRect(18, 10, 10, 6); g.strokeRect(6, 18, 6, 10);
      g.fillStyle(0xaa66ff, 0.1); g.fillRect(2, 2, 28, 28);
    });

    make('tile_11', (g) => {
      g.fillStyle(0x665544); g.fillRect(0, 0, W, H);
      g.fillStyle(0x776655); g.fillRect(2, 4, 6, 6);
      g.fillRect(14, 2, 8, 8); g.fillRect(20, 14, 8, 10);
      g.fillRect(4, 20, 10, 8);
      g.lineStyle(1, 0x554433); g.strokeRect(2, 4, 6, 6);
      g.strokeRect(14, 2, 8, 8); g.strokeRect(20, 14, 8, 10);
      g.strokeRect(4, 20, 10, 8);
      g.fillStyle(0xaa66ff, 0.08); g.fillRect(0, 0, W, H);
    });

    make('tile_12', (g) => {
      g.fillStyle(0x3a3a4a); g.fillRect(0, 0, W, H);
      g.fillStyle(0x2a2a3a); g.fillRect(0, 0, W, 2);
      g.fillRect(0, 14, W, 2); g.fillRect(0, 28, W, 2);
      g.fillStyle(0x4a4a6a); g.fillCircle(6, 8, 2);
      g.fillCircle(16, 20, 2); g.fillCircle(26, 10, 2);
      g.fillStyle(0xff6600, 0.08); g.fillRect(0, 0, W, H);
    });

    make('tile_5', (g) => {
      g.fillStyle(0x4a7c2e); g.fillRect(0, 0, W, H);
      g.fillStyle(0x88ccff, 0.3); g.fillRect(0, 0, W, 8);
      g.fillStyle(0x88ccff, 0.5); g.fillTriangle(16, 2, 10, 10, 22, 10);
      g.fillStyle(0xffffff, 0.4); g.fillRect(12, 11, 8, 2);
    });

    make('tile_6', (g) => {
      g.fillStyle(0x4a7c2e); g.fillRect(0, 0, W, H);
      g.fillStyle(0x88ccff, 0.3); g.fillRect(0, 24, W, 8);
      g.fillStyle(0x88ccff, 0.5); g.fillTriangle(16, 30, 10, 22, 22, 22);
      g.fillStyle(0xffffff, 0.4); g.fillRect(12, 19, 8, 2);
    });

    make('tile_7', (g) => {
      g.fillStyle(0x4a7c2e); g.fillRect(0, 0, W, H);
      g.fillStyle(0x88ccff, 0.3); g.fillRect(0, 0, 8, H);
      g.fillStyle(0x88ccff, 0.5); g.fillTriangle(4, 16, 10, 10, 10, 22);
      g.fillStyle(0xffffff, 0.4); g.fillRect(11, 12, 2, 8);
    });

    make('tile_8', (g) => {
      g.fillStyle(0x4a7c2e); g.fillRect(0, 0, W, H);
      g.fillStyle(0x88ccff, 0.3); g.fillRect(24, 0, 8, H);
      g.fillStyle(0x88ccff, 0.5); g.fillTriangle(28, 16, 22, 10, 22, 22);
      g.fillStyle(0xffffff, 0.4); g.fillRect(19, 12, 2, 8);
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

    const drawCharBack = (g, robe, accent, hat) => {
      g.fillStyle(0x000000); g.fillEllipse(16, 30, 18, 5);
      g.fillStyle(robe); g.fillRect(9, 16, 14, 14);
      g.fillRect(8, 28, 16, 4);
      g.fillStyle(robe); g.fillRect(13, 8, 6, 10);
      if (hat) {
        g.fillStyle(robe); g.fillTriangle(16, 0, 8, 12, 24, 12);
        g.fillStyle(accent); g.fillRect(8, 10, 16, 3);
        g.fillStyle(accent); g.fillRect(11, 3, 10, 2);
      } else {
        g.fillStyle(accent); g.fillRect(13, 6, 6, 8);
        g.fillRect(15, 4, 2, 4);
      }
    };

    make('player_mage', (g) => drawChar(g, 0x3355aa, 0x5577cc, true));
    make('player_sorcerer', (g) => drawChar(g, 0xcc3333, 0xee5555, false));
    make('player_druid', (g) => drawChar(g, 0x33aa55, 0x55cc77, false));
    make('player_warrior', (g) => drawChar(g, 0x886644, 0xaa8866, false));
    make('player_archer', (g) => drawChar(g, 0x44aa44, 0x66cc66, false));
    make('player_summoner', (g) => drawChar(g, 0x8844aa, 0xaa66cc, true));

    make('player_mage_back', (g) => drawCharBack(g, 0x3355aa, 0x5577cc, true));
    make('player_sorcerer_back', (g) => drawCharBack(g, 0xcc3333, 0xee5555, false));
    make('player_druid_back', (g) => drawCharBack(g, 0x33aa55, 0x55cc77, false));
    make('player_warrior_back', (g) => drawCharBack(g, 0x886644, 0xaa8866, false));
    make('player_archer_back', (g) => drawCharBack(g, 0x44aa44, 0x66cc66, false));
    make('player_summoner_back', (g) => drawCharBack(g, 0x8844aa, 0xaa66cc, true));

    make('item_staff', (g) => {
      g.fillStyle(0x8B4513); g.fillRect(14, 4, 4, 24);
      g.fillStyle(0x8888ff, 0.7); g.fillCircle(16, 6, 6);
      g.fillStyle(0xffffff, 0.4); g.fillCircle(15, 5, 2);
    });
    make('item_robe', (g) => {
      g.fillStyle(0x3355aa); g.fillRect(8, 6, 16, 20);
      g.fillStyle(0x5577cc); g.fillRect(8, 6, 16, 4);
      g.fillStyle(0x2244aa, 0.6); g.fillRect(10, 12, 12, 12);
    });
    make('item_ring', (g) => {
      g.lineStyle(3, 0xffcc00); g.strokeCircle(16, 16, 8);
      g.fillStyle(0xff8800, 0.3); g.fillCircle(16, 16, 6);
      g.fillStyle(0xffcc00); g.fillCircle(16, 10, 3);
    });
    make('item_potion', (g) => {
      g.fillStyle(0x44cc44); g.fillRect(12, 8, 8, 18);
      g.fillStyle(0x66ee66); g.fillRect(12, 8, 8, 6);
      g.fillStyle(0x338833); g.fillRect(14, 4, 4, 6);
      g.fillStyle(0xffffff, 0.3); g.fillRect(13, 12, 3, 6);
    });
    make('item_scroll', (g) => {
      g.fillStyle(0xeedd99); g.fillRect(8, 6, 16, 20);
      g.fillStyle(0xddcc88); g.fillRect(8, 6, 16, 3);
      g.fillStyle(0xccbb77); g.fillRect(8, 23, 16, 3);
      g.fillStyle(0x886644); g.fillRect(13, 10, 6, 8);
      g.fillStyle(0xaa8866); g.fillRect(14, 11, 4, 6);
    });
    make('item_artifact', (g) => {
      g.fillStyle(0x8844aa); g.fillTriangle(16, 2, 4, 26, 28, 26);
      g.fillStyle(0xaa66cc); g.fillTriangle(16, 6, 8, 24, 24, 24);
      g.fillStyle(0xffcc00, 0.8); g.fillCircle(16, 16, 4);
      g.fillStyle(0xffffff, 0.5); g.fillCircle(15, 15, 2);
    });

    this.scene.start('MenuScene');
  }
}
