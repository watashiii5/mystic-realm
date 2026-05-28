function pixel(g, x, y, color) {
  g.fillStyle(color);
  g.fillRect(x, y, 1, 1);
}

function drawPlayer(g, robeColor, accentColor, hasHat) {
  const skin = 0xffd5b4;
  const dark = 0x000000;
  const white = 0xffffff;

  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      if (y >= 18 && y <= 30) {
        if (x >= 9 && x <= 22) pixel(g, x, y, robeColor);
        if (y >= 24 && y <= 26 && x >= 8 && x <= 23) pixel(g, x, y, robeColor);
      }
      if (y >= 12 && y <= 17) {
        if (x >= 11 && x <= 20) pixel(g, x, y, skin);
        if (y === 17 && x === 15) pixel(g, x, y, robeColor);
        if (y === 17 && x === 16) pixel(g, x, y, robeColor);
      }
      if (y === 14 && (x === 13 || x === 17)) pixel(g, x, y, dark);
      if (y === 15 && (x === 13 || x === 17)) pixel(g, x, y, dark);
      if (y === 16 && (x === 14 || x === 16)) pixel(g, x, y, dark);
      if (y === 9 && (x === 13 || x === 18)) pixel(g, x, y, dark);
      if (y === 10 && (x === 13 || x === 18)) pixel(g, x, y, white);
      if (y === 9 && x === 15) pixel(g, x, y, dark);
      if (y === 10 && x === 15) pixel(g, x, y, dark);
      if (y === 12 && x >= 14 && x <= 17) pixel(g, x, y, robeColor);
    }
  }

  if (hasHat) {
    for (let y = 3; y <= 9; y++) {
      for (let x = 12; x <= 19; x++) pixel(g, x, y, robeColor);
    }
    for (let y = 6; y <= 8; y++) {
      for (let x = 10; x <= 21; x++) pixel(g, x, y, accentColor);
    }
    for (let y = 3; y <= 5; y++) {
      for (let x = 14; x <= 17; x++) pixel(g, x, y, accentColor);
    }
  }
}

function createTrees(g) {
  const brown = 0x8B4513;
  const green = 0x2d5a1e;
  const lightGreen = 0x3d7a2e;

  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      if (x >= 13 && x <= 17 && y >= 18 && y <= 28) pixel(g, x, y, brown);
      if (x >= 14 && x <= 16 && y >= 16 && y <= 17) pixel(g, x, y, brown);
      if (y >= 2 && y <= 15) {
        const dx = Math.abs(x - 15);
        const dy = Math.abs(y - 8);
        if (dx * dx + dy * dy <= 64) pixel(g, x, y, green);
        if (dx * dx + dy * dy <= 49 && (x + y) % 3 === 0) pixel(g, x, y, lightGreen);
      }
    }
  }
}

function createWater(g) {
  const water = 0x2266aa;
  const light = 0x3388cc;
  const deep = 0x1a5588;

  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      pixel(g, x, y, water);
      if ((x + y) % 4 === 0) pixel(g, x, y, light);
      if ((x + y + 2) % 4 === 0) pixel(g, x, y, deep);
    }
  }
}

function createWall(g) {
  const gray = 0x666666;
  const light = 0x888888;
  const dark = 0x444444;

  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      pixel(g, x, y, gray);
    }
  }
  for (let y = 0; y < 32; y += 8) {
    for (let x = 0; x < 32; x++) {
      if (y < 2) pixel(g, x, y, light);
      if (y >= 6 && y < 8) pixel(g, x, y, dark);
    }
  }
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x += 8) {
      if (x < 2) pixel(g, x, y, light);
      if (x >= 6 && x < 8) pixel(g, x, y, dark);
    }
  }
}

function createPath(g) {
  const tan = 0xc4a882;
  const dark = 0xb89872;

  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      pixel(g, x, y, tan);
      if ((x + y) % 5 === 0) pixel(g, x, y, dark);
    }
  }
}

function createGrass(g) {
  const green = 0x4a7c2e;
  const light = 0x5a9c3e;
  const dark = 0x3a6c1e;

  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      pixel(g, x, y, green);
      if ((x * 7 + y * 3) % 11 < 3) pixel(g, x, y, light);
      if ((x * 5 + y * 7) % 13 < 2) pixel(g, x, y, dark);
    }
  }
}

class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    const draw = (key, fn) => {
      const g = this.make.graphics({ add: false });
      fn(g);
      g.generateTexture(key, 32, 32);
      g.destroy();
    };

    draw('tile_0', createGrass);
    draw('tile_1', createTrees);
    draw('tile_2', createWater);
    draw('tile_3', createWall);
    draw('tile_4', createPath);

    draw('player_mage', (g) => drawPlayer(g, 0x3355aa, 0x5577cc, true));
    draw('player_sorcerer', (g) => drawPlayer(g, 0xcc3333, 0xee5555, false));
    draw('player_druid', (g) => drawPlayer(g, 0x33aa55, 0x55cc77, false));

    const g = this.make.graphics({ add: false });
    g.fillStyle(0x000000);
    g.fillRect(0, 0, 640, 480);
    g.generateTexture('black', 640, 480);
    g.destroy();

    this.scene.start('MenuScene');
  }
}
