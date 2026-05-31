class HelpPanel {
  constructor(scene) {
    this.scene = scene;
    this.elements = [];
    this.visible = false;
  }

  toggle() {
    if (this.visible) this.hide();
    else this.show();
  }

  show() {
    this.hide();
    this.visible = true;
    const s = this.scene;

    const g = s.add.graphics().setDepth(300);
    g.fillStyle(0x000000, 0.92);
    g.fillRect(10, 10, 620, 460);
    g.lineStyle(2, 0xffcc00);
    g.strokeRect(10, 10, 620, 460);
    this.elements.push(g);

    const closeZone = s.add.rectangle(320, 240, 640, 480, 0xffffff, 0).setInteractive().setDepth(302);
    closeZone.on('pointerdown', () => this.toggle());
    this.elements.push(closeZone);

    const closeBtn = s.add.text(580, 440, '[ CLOSE ]', { fontSize: '12px', fontFamily: 'monospace', color: '#ffcc00', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5).setDepth(303);
    const closeBtnZone = s.add.rectangle(580, 440, 100, 24, 0xffffff, 0).setInteractive().setDepth(304);
    closeBtnZone.on('pointerdown', (e) => { e.stopPropagation(); this.toggle(); });
    this.elements.push(closeBtn);
    this.elements.push(closeBtnZone);

    const lines = [
      { text: '=== GUIDE BOOK ===', color: '#ffcc00', s: 14 },
      { text: '', color: '#ffffff', s: 8 },
      { text: '--- CONTROLS ---', color: '#88ccff', s: 12 },
      { text: 'WASD / Arrow Keys : Move', color: '#cccccc', s: 10 },
      { text: 'Shift : Sprint (costs MP)', color: '#cccccc', s: 10 },
      { text: '1-5 : Select a spell slot', color: '#cccccc', s: 10 },
      { text: 'Click : Cast selected spell at cursor', color: '#cccccc', s: 10 },
      { text: 'Click monster : Target it (track HP)', color: '#cccccc', s: 10 },
      { text: 'I : Inventory (use potions, equip gear)', color: '#cccccc', s: 10 },
      { text: 'Enter : Chat with other players', color: '#cccccc', s: 10 },
      { text: 'R : Respawn after death', color: '#cccccc', s: 10 },
      { text: 'H / Esc : Open/close Guide', color: '#cccccc', s: 10 },
      { text: 'Gamepad : Left stick move, A/B/X cast, Y inventory', color: '#cccccc', s: 10 },
      { text: '', color: '#ffffff', s: 6 },
      { text: '--- HOW TO PLAY ---', color: '#88ccff', s: 12 },
      { text: '1. Kill monsters to earn XP and loot', color: '#aaaaaa', s: 10 },
      { text: '2. Level up to grow stronger', color: '#aaaaaa', s: 10 },
      { text: '3. Equip better gear from loot drops', color: '#aaaaaa', s: 10 },
      { text: '4. Use potions to restore HP/MP', color: '#aaaaaa', s: 10 },
      { text: '5. Walk to zone edges to explore new areas', color: '#aaaaaa', s: 10 },
      { text: '6. Learn new spells from scroll drops', color: '#aaaaaa', s: 10 },
      { text: '', color: '#ffffff', s: 6 },
      { text: '--- ZONES (in order) ---', color: '#88ccff', s: 12 },
      { text: 'Meadow (Lv1-5) -> Forest (Lv5-10)', color: '#88ff88', s: 10 },
      { text: 'Caves (Lv10-15) -> Ruins (Lv15-20)', color: '#88ff88', s: 10 },
      { text: 'Tower (Lv20+) - Final boss: Aether Lord', color: '#ffcc00', s: 10 },
      { text: '', color: '#ffffff', s: 6 },
      { text: '--- ITEM RARITY ---', color: '#88ccff', s: 12 },
      { text: 'Common (white) | Uncommon (green)', color: '#cccccc', s: 10 },
      { text: 'Rare (blue) | Epic (purple)', color: '#cccccc', s: 10 },
      { text: 'Legendary (orange) - best gear!', color: '#ff8800', s: 10 },
      { text: '', color: '#ffffff', s: 6 },
      { text: '--- TIPS ---', color: '#88ccff', s: 12 },
      { text: 'HP/MP regenerate over time', color: '#88ff88', s: 10 },
      { text: 'Edge tiles glow blue - walk there to move on', color: '#88ccff', s: 10 },
      { text: 'Blue arrows on edges show exit direction', color: '#88ccff', s: 10 },
      { text: 'You can only equip 1 weapon, 1 armor, 1 ring', color: '#aaaaaa', s: 10 },
      { text: 'Scrolls teach you permanent new spells', color: '#aaaaaa', s: 10 },
    ];

    let y = 22;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const t = s.add.text(320, y, l.text, { fontSize: l.s + 'px', fontFamily: 'monospace', color: l.color }).setOrigin(0.5, 0).setDepth(301);
      this.elements.push(t);
      y += (l.text === '' ? 4 : l.s > 12 ? 24 : l.s > 10 ? 18 : 14);
      if (y > 445) break;
    }
  }

  hide() {
    this.visible = false;
    this.elements.forEach(e => e.destroy());
    this.elements = [];
  }

  destroy() {
    this.hide();
  }
}
