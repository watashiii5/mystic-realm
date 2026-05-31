const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const srcDir = path.join(process.env.TEMP, 'monsters_pack', '50+ Monsters Pack 2D', 'Monsters', 'Normal Colors');
const outDir = path.join(__dirname, '..', 'client', 'assets', 'monsters');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Mapping: game monster key -> sprite number from pack
// These are guessed by color/theme - user can adjust
const MONSTER_MAP = {
  slime: 1, rabbit: 2, sprite: 3,
  wolf: 6, treant: 8, spider: 5,
  bat: 10, skeleton: 12, crystal: 14,
  golem: 16, phantom: 18, wraith: 20,
  mage: 22, elemental: 24, boss: 30,
};

async function processMonsters() {
  for (const [key, num] of Object.entries(MONSTER_MAP)) {
    const srcFile = path.join(srcDir, `Monster #${num} Front Normal Color Palette.png`);
    if (!fs.existsSync(srcFile)) {
      console.log(`Missing: ${key} (#${num})`);
      continue;
    }
    await sharp(srcFile)
      .resize(32, 32, { kernel: 'nearest' })
      .png()
      .toFile(path.join(outDir, `monster_${key}.png`));
    console.log(`Processed: ${key} (monster #${num})`);
  }

  // Also generate a combined spritesheet
  const files = Object.entries(MONSTER_MAP).filter(([k]) => {
    const srcFile = path.join(srcDir, `Monster #${MONSTER_MAP[k]} Front Normal Color Palette.png`);
    return fs.existsSync(srcFile);
  }).map(([k]) => path.join(outDir, `monster_${k}.png`));

  if (files.length > 0) {
    const buffers = await Promise.all(files.map(f => sharp(f).raw().toBuffer()));
    const meta = await sharp(files[0]).metadata();
    const cols = 8;
    const rows = Math.ceil(files.length / cols);
    const composite = buffers.map((buf, i) => ({
      input: { raw: buf, width: meta.width, height: meta.height, channels: 4 },
      top: Math.floor(i / cols) * meta.height,
      left: (i % cols) * meta.width,
    }));
    await sharp({
      create: { width: cols * meta.width, height: rows * meta.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    }).composite(composite).png().toFile(path.join(outDir, 'monsters_sheet.png'));
    console.log(`Created spritesheet: ${files.length} monsters, ${cols}x${rows}`);
  }

  console.log('Done!');
}

processMonsters().catch(console.error);
