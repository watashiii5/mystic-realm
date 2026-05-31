const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const DCSS = path.join(process.env.TEMP, 'opencode', 'crawl_tiles', 'releases', 'Nov-2015', 'dngn');
const OUT = path.join(__dirname, '..', 'client', 'assets', 'tiles');

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const tileMap = {
  'tile_0': { src: 'floor/lair0.png', desc: 'grass' },
  'tile_1': { src: 'floor/moss0.png', desc: 'forest moss' },
  'tile_2': { src: 'water/shallow_water.png', desc: 'water' },
  'tile_3': { src: 'wall/stone_gray0.png', desc: 'border wall' },
  'tile_4': { src: 'floor/sand1.png', desc: 'sand/ruins' },
  'tile_5': { src: 'water/shallow_bord_top.png', desc: 'water N edge' },
  'tile_6': { src: 'water/shallow_bord_btm.png', desc: 'water S edge' },
  'tile_7': { src: 'water/shallow_bord_lft.png', desc: 'water W edge' },
  'tile_8': { src: 'water/shallow_bord_rgt.png', desc: 'water E edge' },
  'tile_9': { src: 'floor/orc0.png', desc: 'dark stone caves' },
  'tile_10': { src: 'floor/crystal_floor0.png', desc: 'purple crystal tower' },
  'tile_11': { src: 'floor/cobble_blood1.png', desc: 'brown tower' },
  'tile_12': { src: 'floor/volcanic_floor0.png', desc: 'dark orange tower' },
};

(async () => {
  for (const [outName, { src, desc }] of Object.entries(tileMap)) {
    const inPath = path.join(DCSS, src);
    if (!fs.existsSync(inPath)) {
      console.warn('MISSING:', inPath);
      continue;
    }
    const outPath = path.join(OUT, outName + '.png');
    await sharp(inPath).toColourspace('srgb').toFile(outPath);
    console.log(outName + '.png <- ' + src + ' (' + desc + ')');
  }
  console.log('Done -', Object.keys(tileMap).length, 'tiles copied to', OUT);
})();
