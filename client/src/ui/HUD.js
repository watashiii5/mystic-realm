const SPELL_NAMES = {
  magic_bolt: 'Magic Bolt', heal: 'Heal', fireball: 'Fireball',
  ice_shard: 'Ice Shard', stone_wall: 'Stone Wall', gale: 'Gale',
  flame_wave: 'Flame Wave', summon_wolf: 'Summon Wolf', teleport: 'Teleport',
  meteor: 'Meteor', frost_nova: 'Frost Nova', poison_cloud: 'Poison Cloud',
  slash: 'Slash',
};

class HUD {

  constructor(scene, playerClass, playerName) {
    this.scene = scene;
    this.playerClass = playerClass;
    this.playerName = playerName;
    this.container = scene.add.container(0, 0).setDepth(50);
    this.spellBarContainer = scene.add.container(0, 0).setDepth(50);
    this.spellSlots = [];
    this.selectedSpell = null;
    this.pulseTime = 0;

    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.6);
    g.fillRect(4, 4, 180, 82);
    this.container.add(g);

    const clsLabel = playerClass.charAt(0).toUpperCase() + playerClass.slice(1);
    this.nameLabel = scene.add.text(10, 8, playerName + ' (' + clsLabel + ')', { fontSize: '12px', fontFamily: 'monospace', color: '#ffcc00' });
    this.container.add(this.nameLabel);

    this.hpBarBg = scene.add.graphics();
    this.hpBarBg.fillStyle(0x333333); this.hpBarBg.fillRect(10, 24, 120, 10);
    this.container.add(this.hpBarBg);
    this.hpBar = scene.add.graphics();
    this.container.add(this.hpBar);

    this.mpBarBg = scene.add.graphics();
    this.mpBarBg.fillStyle(0x333333); this.mpBarBg.fillRect(10, 38, 120, 10);
    this.container.add(this.mpBarBg);
    this.mpBar = scene.add.graphics();
    this.container.add(this.mpBar);

    this.xpBarBg = scene.add.graphics();
    this.xpBarBg.fillStyle(0x333333); this.xpBarBg.fillRect(10, 52, 120, 8);
    this.container.add(this.xpBarBg);
    this.xpBar = scene.add.graphics();
    this.container.add(this.xpBar);

    this.hpText = scene.add.text(134, 24, '', { fontSize: '10px', fontFamily: 'monospace', color: '#ffffff' });
    this.container.add(this.hpText);
    this.mpText = scene.add.text(134, 38, '', { fontSize: '10px', fontFamily: 'monospace', color: '#ffffff' });
    this.container.add(this.mpText);

    this.lvlText = scene.add.text(10, 62, '', { fontSize: '10px', fontFamily: 'monospace', color: '#aaaaaa' });
    this.container.add(this.lvlText);
    this.atkDefText = scene.add.text(60, 62, '', { fontSize: '10px', fontFamily: 'monospace', color: '#aaaaaa' });
    this.container.add(this.atkDefText);

    this.statPointsText = scene.add.text(10, 72, '', { fontSize: '10px', fontFamily: 'monospace', color: '#ffcc00', stroke: '#000000', strokeThickness: 2 });
    this.container.add(this.statPointsText);
    this.sprintText = scene.add.text(140, 72, '', { fontSize: '8px', fontFamily: 'monospace', color: '#88ccff' });
    this.container.add(this.sprintText);
    this.weakenedText = scene.add.text(10, 82, '', { fontSize: '10px', fontFamily: 'monospace', color: '#ff4444', stroke: '#000000', strokeThickness: 2 });
    this.container.add(this.weakenedText);
    this.spIndicator = scene.add.text(188, 4, '', { fontSize: '14px', fontFamily: 'monospace', color: '#ffcc00', stroke: '#000000', strokeThickness: 3 }).setDepth(55);
    this.goldText = scene.add.text(188, 20, '', { fontSize: '11px', fontFamily: 'monospace', color: '#ffcc00', stroke: '#000000', strokeThickness: 2 }).setDepth(55);

    this.zoneText = scene.add.text(320, 4, 'Meadow', { fontSize: '12px', fontFamily: 'monospace', color: '#88ccff', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5, 0).setDepth(50);
    this.targetInfo = scene.add.text(320, 460, '', { fontSize: '10px', fontFamily: 'monospace', color: '#ffffff', stroke: '#000000', strokeThickness: 2, wordWrap: { width: 300 } }).setOrigin(0.5).setDepth(50);
    this.progressText = scene.add.text(320, 16, '', { fontSize: '10px', fontFamily: 'monospace', color: '#aaaaaa', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5, 0).setDepth(50);
    this.questText = scene.add.text(478, 36, '', { fontSize: '10px', fontFamily: 'monospace', color: '#ffcc00', stroke: '#000000', strokeThickness: 1, lineSpacing: 3, wordWrap: { width: 155 } }).setDepth(50).setAlpha(0.85);

    this.displayHp = 100;
    this.displayMp = 100;
    this.displayXp = 0;
    this.zoneLoreText = null;
  }

  updateStats(stats) {
    if (!this.hpBar || !stats.maxHp || !stats.maxMp) return;

    this.displayHp += (stats.hp - this.displayHp) * 0.15;
    this.displayMp += (stats.mp - this.displayMp) * 0.15;

    const hpW = 120 * Math.max(0, this.displayHp / stats.maxHp);
    this.hpBar.clear();
    this.hpBar.fillStyle(0xcc3333); this.hpBar.fillRect(10, 24, Math.max(0, hpW), 10);
    if (hpW > 4) {
      this.hpBar.fillStyle(0xff5555); this.hpBar.fillRect(10, 24, Math.max(0, hpW - 2), 4);
    }
    this.hpText.setText(Math.ceil(this.displayHp) + '/' + stats.maxHp);

    const mpW = 120 * Math.max(0, this.displayMp / stats.maxMp);
    this.mpBar.clear();
    this.mpBar.fillStyle(0x3333cc); this.mpBar.fillRect(10, 38, Math.max(0, mpW), 10);
    if (mpW > 4) {
      this.mpBar.fillStyle(0x5555ff); this.mpBar.fillRect(10, 38, Math.max(0, mpW - 2), 4);
    }
    this.mpText.setText(Math.ceil(this.displayMp) + '/' + stats.maxMp);

    this.lvlText.setText('Lv.' + stats.level);
    this.atkDefText.setText('ATK:' + stats.atk + ' DEF:' + stats.def);
    if (stats.statPoints > 0) {
      this.statPointsText.setText('+ ' + stats.statPoints + ' SP!');
      if (this.spIndicator) {
        this.spIndicator.setText('SP!');
        this.spIndicator.setAlpha(0.5 + Math.sin(Date.now() * 0.005) * 0.5);
      }
    } else {
      this.statPointsText.setText('');
      if (this.spIndicator) this.spIndicator.setText('');
    }
  }

  updateXPBar(xp, level) {
    if (!this.xpBar) return;
    this.displayXp += ((xp || 0) - this.displayXp) * 0.1;
    const needed = Math.floor(100 * Math.pow(1.3, level - 1));
    const w = 120 * Math.min(1, Math.max(0, this.displayXp / needed));
    this.xpBar.clear();
    this.xpBar.fillStyle(0x44cc44); this.xpBar.fillRect(10, 52, Math.max(0, w), 8);
    if (w > 4) {
      this.xpBar.fillStyle(0x66ff66); this.xpBar.fillRect(10, 52, Math.max(0, w - 2), 3);
    }
  }

  createSpellBar(spells) {
    this.spellBarContainer.removeAll(true);
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRect(60, 418, 520, 52);
    this.spellBarContainer.add(bg);

    this.spellSlots = [];
    const costs = { magic_bolt: 5, heal: 15, fireball: 12, ice_shard: 10, stone_wall: 20, gale: 8, flame_wave: 18, summon_wolf: 25, teleport: 20, meteor: 30, frost_nova: 22, poison_cloud: 15, slash: 0 };

    for (let i = 0; i < 5; i++) {
      const slotBg = this.scene.add.graphics();
      slotBg.fillStyle(0x333333); slotBg.fillRect(70 + i * 102, 424, 96, 40);
      slotBg.lineStyle(1, 0x666666); slotBg.strokeRect(70 + i * 102, 424, 96, 40);
      this.spellBarContainer.add(slotBg);

      const keyText = this.scene.add.text(74 + i * 102, 426, (i + 1) + '.', { fontSize: '10px', fontFamily: 'monospace', color: '#888888' });
      this.spellBarContainer.add(keyText);

      const spellName = this.scene.add.text(90 + i * 102, 426, '', { fontSize: '11px', fontFamily: 'monospace', color: '#ffffff' });
      this.spellBarContainer.add(spellName);

      const spellCost = this.scene.add.text(90 + i * 102, 439, '', { fontSize: '10px', fontFamily: 'monospace', color: '#8888ff' });
      this.spellBarContainer.add(spellCost);

      const highlight = this.scene.add.graphics();
      this.spellBarContainer.add(highlight);

      const cdBar = this.scene.add.graphics().setAlpha(0.6);
      this.spellBarContainer.add(cdBar);

      this.spellSlots.push({ bg: slotBg, name: spellName, cost: spellCost, highlight, cdBar, key: null, lastCast: 0, costVal: costs, index: i });
    }
    this._updateSpellBar(spells);
  }

  _updateSpellBar(spells) {
    if (!this.spellSlots) return;
    const costs = { magic_bolt: 5, heal: 15, fireball: 12, ice_shard: 10, stone_wall: 20, gale: 8, flame_wave: 18, summon_wolf: 25, teleport: 20, meteor: 30, frost_nova: 22, poison_cloud: 15, slash: 0 };
    const mp = this._currentMp || 100;

    for (let i = 0; i < 5; i++) {
      const slot = this.spellSlots[i];
      const spellKey = spells[i];
      if (spellKey) {
        slot.name.setText(SPELL_NAMES[spellKey] || spellKey);
        const cost = costs[spellKey] || 5;
        slot.cost.setText(cost > 0 ? 'MP:' + cost : '');
        slot.cost.setColor(mp >= cost ? '#8888ff' : '#ff4444');
        slot.key = spellKey;
      } else {
        slot.name.setText('--');
        slot.cost.setText('');
        slot.key = null;
      }
      slot.highlight.clear();
      if (slot.key === this.selectedSpell) {
        slot.highlight.lineStyle(2, 0xffcc00);
        slot.highlight.strokeRect(70 + i * 102, 424, 96, 40);
      }
    }
  }

  updateSpellBar(spells, mp) {
    this._currentMp = mp;
    this._updateSpellBar(spells);
  }

  updateSpellCooldowns(time) {
    if (!this.spellSlots) return;
    const now = Date.now();
    const cd = 1500;
    this.pulseTime += time;

    for (let i = 0; i < 5; i++) {
      const slot = this.spellSlots[i];
      if (slot.key === this.selectedSpell) {
        const pulse = 0.6 + Math.sin(this.pulseTime * 0.005) * 0.4;
        slot.highlight.clear();
        slot.highlight.lineStyle(2, Phaser.Display.Color.GetColor(Math.floor(255 * pulse), Math.floor(200 * pulse), 0));
        slot.highlight.strokeRect(70 + i * 102, 424, 96, 40);
      }
      const elapsed = now - (slot.lastCast || 0);
      const pct = Math.min(1, elapsed / cd);
      slot.cdBar.clear();
      if (pct < 1) {
        const bw = 96 * (1 - pct);
        slot.cdBar.fillStyle(0x000000, 0.5);
        slot.cdBar.fillRect(70 + i * 102, 424, bw, 40);
      }
    }
  }

  selectSpell(idx, spells) {
    if (idx >= 0 && idx < spells.length) {
      this.selectedSpell = this.selectedSpell === spells[idx] ? null : spells[idx];
      this._updateSpellBar(spells);
      return this.selectedSpell;
    }
    return null;
  }

  setZoneLabel(label) {
    if (this.zoneText) this.zoneText.setText(label);
  }

  updateProgressText(kills, level) {
    if (!this.progressText) return;
    this.progressText.setText('Kills: ' + (kills || 0) + ' | Lv.' + (level || 1));
    this._updateQuestText();
  }

  _updateQuestText() {
    if (!this.questText) return;
    const zones = ['meadow', 'forest', 'caves', 'ruins', 'tower'];
    const names = ['Meadow', 'Forest', 'Caves', 'Ruins', 'Tower'];
    const levels = ['1-5', '5-10', '10-15', '15-20', '20+'];
    const zv = this._zonesVisited || { meadow: true };
    const lines = ['--- GOAL ---', ''];
    for (let i = 0; i < 5; i++) {
      const visited = zv[zones[i]];
      const icon = visited ? '[X]' : '[ ]';
      const color = visited ? '#88ff88' : '#666666';
      lines.push(icon + ' ' + names[i] + ' (Lv' + levels[i] + ')');
    }
    lines.push('');
    lines.push('Defeat the Aether Lord');
    lines.push('in the Tower!');
    this.questText.setText(lines.join('\n'));
  }

  setZonesVisited(zv) {
    this._zonesVisited = zv;
  }

  showZoneLore(zoneName, lore, color) {
    const s = this.scene;
    if (this.zoneLoreText) this.zoneLoreText.destroy();
    const shortLore = lore.length > 200 ? lore.slice(0, 197) + '...' : lore;
    this.zoneLoreText = s.add.text(320, 110, zoneName + '\n' + shortLore, {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: color || '#88ccff',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center',
      lineSpacing: 5,
      wordWrap: { width: 360 },
    }).setOrigin(0.5).setDepth(60).setAlpha(0);

    s.tweens.add({
      targets: this.zoneLoreText,
      alpha: 1, duration: 400, yoyo: true, hold: 3000,
      onComplete: () => { if (this.zoneLoreText) { this.zoneLoreText.destroy(); this.zoneLoreText = null; } }
    });
  }

  updateWeakened(active) {
    if (this.weakenedText) this.weakenedText.setText(active ? 'WEAKENED (-50% ATK/DEF)' : '');
  }

  updateGold(gold) {
    if (this.goldText) this.goldText.setText('Gold: ' + gold);
  }

  destroy() {
    this.container.destroy();
    this.spellBarContainer.destroy();
    if (this.zoneText) this.zoneText.destroy();
    if (this.weakenedText) this.weakenedText.destroy();
    if (this.targetInfo) this.targetInfo.destroy();
    if (this.progressText) this.progressText.destroy();
    if (this.questText) this.questText.destroy();
    if (this.spIndicator) this.spIndicator.destroy();
    if (this.goldText) this.goldText.destroy();
    if (this.zoneLoreText) this.zoneLoreText.destroy();
  }
}
