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

    /* --- Tile & Monster PNG textures --- */

    const TILE_KEYS = ['tile_0','tile_1','tile_2','tile_3','tile_4','tile_5','tile_6','tile_7','tile_8','tile_9','tile_10','tile_11','tile_12'];
    const MONSTER_KEYS = ['slime','rabbit','sprite','wolf','treant','spider','bat','skeleton','crystal','golem','phantom','wraith','mage','elemental','boss'];
    const allAssets = [...TILE_KEYS, ...MONSTER_KEYS.map(k => 'monster_' + k)];
    let loadedCount = 0;
    const totalAssets = allAssets.length;
    const startGame = () => { if (!this._started) { this._started = true; this.scene.start('MenuScene'); } };
    const loadImg = (key, url) => {
      const img = new Image();
      img.onload = () => { this.textures.addImage(key, img); loadedCount++; if (loadedCount >= totalAssets) startGame(); };
      img.onerror = () => {
        const g = this.make.graphics({ add: false });
        g.fillStyle(0x888888); g.fillCircle(16, 16, 12); g.fillStyle(0x666666); g.fillCircle(16, 16, 8);
        g.generateTexture(key, 32, 32); g.destroy();
        loadedCount++; if (loadedCount >= totalAssets) startGame();
      };
      img.src = url;
    };
    for (const k of TILE_KEYS) loadImg(k, 'assets/tiles/' + k + '.png');
    for (const k of MONSTER_KEYS) loadImg('monster_' + k, 'assets/monsters/monster_' + k + '.png');

    this.time.delayedCall(5000, startGame);

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


  }
}
