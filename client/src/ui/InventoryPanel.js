class InventoryPanel {
  constructor(scene, network) {
    this.scene = scene;
    this.network = network;
    this.elements = [];
    this.tooltip = null;
    this.visible = false;
    this.tab = 'inv';
    this.potionCd = 0;
  }

  toggle(inventory, equipped, statPoints) {
    this.visible = !this.visible;
    if (this.visible) {
      window.soundManager.playInventoryOpen();
      this.tab = 'inv';
      this.show(inventory, equipped, statPoints);
    } else {
      window.soundManager.playInventoryClose();
      this.hide();
    }
  }

  show(inventory, equipped, statPoints) {
    this.hide();
    this._inventory = inventory;
    this._equipped = equipped;
    this._statPoints = statPoints;
    const s = this.scene;
    const gold = this.scene.myGold || 0;

    const g = s.add.graphics().setDepth(150);
    g.fillStyle(0x000000, 0.88);
    g.fillRect(30, 20, 580, 440);
    g.lineStyle(2, 0xffcc00);
    g.strokeRect(30, 20, 580, 440);
    this.elements.push(g);

    const title = s.add.text(320, 28, 'INVENTORY', { fontSize: '14px', fontFamily: 'monospace', color: '#ffcc00' }).setOrigin(0.5).setDepth(150);
    this.elements.push(title);

    const goldText = s.add.text(560, 28, 'Gold: ' + gold, { fontSize: '12px', fontFamily: 'monospace', color: '#ffcc00', stroke: '#000000', strokeThickness: 2 }).setOrigin(1, 0.5).setDepth(150);
    this.elements.push(goldText);

    const tabInv = s.add.text(50, 40, '[ INVENTORY ]', { fontSize: '12px', fontFamily: 'monospace', color: this.tab === 'inv' ? '#ffcc00' : '#888888' }).setDepth(150).setInteractive({ useHandCursor: true });
    tabInv.on('pointerdown', () => { this.tab = 'inv'; this.show(inventory, equipped, statPoints); });
    this.elements.push(tabInv);

    const tabShop = s.add.text(180, 40, '[ SHOP ]', { fontSize: '12px', fontFamily: 'monospace', color: this.tab === 'shop' ? '#ffcc00' : '#888888' }).setDepth(150).setInteractive({ useHandCursor: true });
    tabShop.on('pointerdown', () => { this.tab = 'shop'; this.scene.network.emit('request_shop'); this.show(inventory, equipped, statPoints); });
    this.elements.push(tabShop);

    if (this.tab === 'shop') {
      this._drawShop();
    } else {
      this._drawInventory();
    }
  }

  refreshShop() {
    if (this.visible) this.show(this._inventory, this._equipped, this._statPoints);
  }

  _drawInventory() {
    const s = this.scene;
    const inventory = this._inventory || [];
    const equipped = this._equipped || {};
    const statPoints = this._statPoints || 0;
    const gold = this.scene.myGold || 0;

    const equipTitle = s.add.text(50, 54, 'Equipment:', { fontSize: '11px', fontFamily: 'monospace', color: '#8888ff' }).setDepth(150);
    this.elements.push(equipTitle);

    const slots = ['weapon', 'armor', 'accessory'];
    const slotLabels = ['Weapon:', 'Armor:', 'Acc:'];
    for (let i = 0; i < 3; i++) {
      const label = s.add.text(50, 72 + i * 18, slotLabels[i], { fontSize: '10px', fontFamily: 'monospace', color: '#cccccc' }).setDepth(150);
      this.elements.push(label);
      const eq = equipped[slots[i]];
      const eqName = eq ? (ITEM_NAMES[eq] || eq) : '(empty)';
      const val = eqName.length > 20 ? eqName.slice(0, 20) + '..' : eqName;
      const eText = s.add.text(120, 72 + i * 18, val, { fontSize: '10px', fontFamily: 'monospace', color: '#ffffff', wordWrap: { width: 200 } }).setDepth(150);
      this.elements.push(eText);
    }

    const spSection = statPoints > 0;
    if (spSection) {
      const spBg = s.add.graphics().setDepth(150);
      spBg.fillStyle(0x443300, 0.6); spBg.fillRect(40, 124, 300, 38);
      spBg.lineStyle(1, 0xffcc00, 0.5); spBg.strokeRect(40, 124, 300, 38);
      this.elements.push(spBg);

      const spTitle = s.add.text(50, 126, 'SKILL POINTS: ' + statPoints + '  (Press I to close)', { fontSize: '11px', fontFamily: 'monospace', color: '#ffcc00' }).setDepth(150);
      this.elements.push(spTitle);
      const statOpts = [{k:'hp',l:'+10 HP'},{k:'mp',l:'+8 MP'},{k:'atk',l:'+2 ATK'},{k:'def',l:'+2 DEF'}];
      for (let si = 0; si < 4; si++) {
        const sx = 50 + si * 72;
        const bg = s.add.graphics().setDepth(151);
        bg.fillStyle(0x665522); bg.fillRoundedRect(sx, 140, 66, 20, 4);
        bg.lineStyle(1, 0xffcc00, 0.4); bg.strokeRoundedRect(sx, 140, 66, 20, 4);
        bg.setInteractive(new Phaser.Geom.Rectangle(sx, 140, 66, 20), Phaser.Geom.Rectangle.Contains);
        const sk = statOpts[si].k;
        bg.on('pointerdown', () => { this.network.emit('allocate_stat', { stat: sk }); });
        this.elements.push(bg);
        const t = s.add.text(sx + 33, 150, statOpts[si].l, { fontSize: '11px', fontFamily: 'monospace', color: '#ffcc00' }).setOrigin(0.5).setDepth(152);
        this.elements.push(t);
      }
    }

    const invTitle = s.add.text(50, 130 + (spSection ? 38 : 0), 'Items (' + Math.min(inventory.length, 20) + ')', { fontSize: '11px', fontFamily: 'monospace', color: '#88ff88' }).setDepth(150);
    this.elements.push(invTitle);

    const maxShow = Math.min(inventory.length, 20);
    const itemsPerRow = 3;
    const invOffset = statPoints > 0 ? 38 : 0;
    for (let i = 0; i < maxShow; i++) {
      const itemKey = inventory[i];
      const col = i % itemsPerRow;
      const row = Math.floor(i / itemsPerRow);
      const ix = 50 + col * 175;
      const iy = 150 + invOffset + row * 32;

      const itemType = ITEM_TYPES[itemKey] || '';
      const isConsumable = itemType === 'consumable';
      const isEquippable = !isConsumable && itemType !== 'scroll' && itemType !== '';
      const displayName = ITEM_NAMES[itemKey] || itemKey;
      const tier = ITEM_TIERS[itemKey] !== undefined ? ITEM_TIERS[itemKey] : 0;

      const bg = s.add.graphics().setDepth(150);
      bg.fillStyle(0x444444); bg.fillRect(ix, iy, 165, 26);
      bg.lineStyle(1, 0x666666); bg.strokeRect(ix, iy, 165, 26);
      bg.setInteractive(new Phaser.Geom.Rectangle(ix, iy, 165, 26), Phaser.Geom.Rectangle.Contains);
      const tooltipData = ITEM_DESCS[itemKey] || null;
      const tooltipStats = ITEM_STATS[itemKey] || null;
      bg.on('pointerover', () => {
        if (this.tooltip) this.tooltip.destroy();
        const lines = [displayName + ' (' + (RARITY_NAMES[tier] || 'Common') + ')'];
        if (tooltipData) lines.push(tooltipData);
        if (tooltipStats) {
          const parts = [];
          if (tooltipStats.atk) parts.push('ATK+' + tooltipStats.atk);
          if (tooltipStats.def) parts.push('DEF+' + tooltipStats.def);
          if (tooltipStats.hp) parts.push('HP+' + tooltipStats.hp);
          if (tooltipStats.mp) parts.push('MP+' + tooltipStats.mp);
          if (tooltipStats.heal) parts.push('Heal ' + tooltipStats.heal);
          if (tooltipStats.mana) parts.push('Mana ' + tooltipStats.mana);
          if (parts.length) lines.push(parts.join(' | '));
        }
        const sellPrice = this._getSellPrice(itemKey);
        if (sellPrice > 0) lines.push('Sell: ' + sellPrice + ' gold');
        const yOff = Math.min(iy, 400);
        this.tooltip = s.add.text(ix + 170, yOff, lines.join('\n'), {
          fontSize: '10px', fontFamily: 'monospace', color: '#ffffff',
          backgroundColor: '#000000cc', padding: { x: 4, y: 2 },
        }).setDepth(200);
      });
      bg.on('pointerout', () => {
        if (this.tooltip) { this.tooltip.destroy(); this.tooltip = null; }
      });
      this.elements.push(bg);

      const shortKey = displayName.length > 16 ? displayName.slice(0, 16) + '..' : displayName;
      const nameColor = RARITY_COLORS[tier] || '#ffffff';
      const iText = s.add.text(ix + 4, iy + 1, shortKey, { fontSize: '10px', fontFamily: 'monospace', color: nameColor }).setDepth(150);
      this.elements.push(iText);

      if (isConsumable) {
        const onCd = Date.now() - this.potionCd < 3000;
        const useBg = s.add.graphics().setDepth(151);
        useBg.fillStyle(onCd ? 0x553333 : 0x335533); useBg.fillRect(ix + 2, iy + 14, 50, 10);
        useBg.setInteractive(new Phaser.Geom.Rectangle(ix + 2, iy + 14, 50, 10), Phaser.Geom.Rectangle.Contains);
        const iid = i;
        useBg.on('pointerdown', () => {
          if (Date.now() - this.potionCd < 3000) return;
          this.potionCd = Date.now();
          this.network.emit('use_item', { itemKey: inventory[iid] });
        });
        this.elements.push(useBg);

        const useText = s.add.text(ix + 27, iy + 15, onCd ? 'CD' : 'Use', { fontSize: '10px', fontFamily: 'monospace', color: onCd ? '#ff4444' : '#88ff88' }).setOrigin(0.5).setDepth(152);
        this.elements.push(useText);

        const sellBg = s.add.graphics().setDepth(151);
        sellBg.fillStyle(0x555533); sellBg.fillRect(ix + 56, iy + 14, 50, 10);
        sellBg.setInteractive(new Phaser.Geom.Rectangle(ix + 56, iy + 14, 50, 10), Phaser.Geom.Rectangle.Contains);
        const iidSell = i;
        sellBg.on('pointerdown', () => {
          const sp = this._getSellPrice(inventory[iidSell]);
          if (sp > 0) this.network.emit('sell_item', { itemKey: inventory[iidSell] });
        });
        this.elements.push(sellBg);
        const sellText = s.add.text(ix + 81, iy + 15, 'Sell', { fontSize: '10px', fontFamily: 'monospace', color: '#ffcc00' }).setOrigin(0.5).setDepth(152);
        this.elements.push(sellText);
      } else if (isEquippable) {
        const eqBg = s.add.graphics().setDepth(151);
        eqBg.fillStyle(0x333355); eqBg.fillRect(ix + 2, iy + 14, 50, 10);
        eqBg.setInteractive(new Phaser.Geom.Rectangle(ix + 2, iy + 14, 50, 10), Phaser.Geom.Rectangle.Contains);
        const iid2 = i;
        eqBg.on('pointerdown', () => { this.network.emit('equip_item', { itemKey: inventory[iid2] }); });
        this.elements.push(eqBg);
        const eqText = s.add.text(ix + 27, iy + 15, 'Equip', { fontSize: '10px', fontFamily: 'monospace', color: '#8888ff' }).setOrigin(0.5).setDepth(152);
        this.elements.push(eqText);

        const sellBg = s.add.graphics().setDepth(151);
        sellBg.fillStyle(0x555533); sellBg.fillRect(ix + 56, iy + 14, 50, 10);
        sellBg.setInteractive(new Phaser.Geom.Rectangle(ix + 56, iy + 14, 50, 10), Phaser.Geom.Rectangle.Contains);
        const iidSell = i;
        sellBg.on('pointerdown', () => {
          const sp = this._getSellPrice(inventory[iidSell]);
          if (sp > 0) this.network.emit('sell_item', { itemKey: inventory[iidSell] });
        });
        this.elements.push(sellBg);
        const sellText = s.add.text(ix + 81, iy + 15, 'Sell', { fontSize: '10px', fontFamily: 'monospace', color: '#ffcc00' }).setOrigin(0.5).setDepth(152);
        this.elements.push(sellText);
      }
    }
  }

  _getSellPrice(itemKey) {
    const itemData = ITEM_STATS[itemKey];
    if (!itemData) return 0;
    const isConsumable = (ITEM_TYPES[itemKey] || '') === 'consumable';
    if (isConsumable) {
      if (itemData.heal >= 80) return 22;
      if (itemData.mana >= 60) return 17;
      if (itemData.heal) return 10;
      if (itemData.mana) return 7;
    }
    const tier = ITEM_TIERS[itemKey] !== undefined ? ITEM_TIERS[itemKey] : 0;
    const tierPrices = [0, 15, 40, 100, 200, 400];
    return tierPrices[tier] || 0;
  }

  _drawShop() {
    const s = this.scene;
    const shop = this.scene.shopData;
    const gold = this.scene.myGold || 0;

    if (!shop || !shop.items) {
      const loading = s.add.text(320, 200, 'Loading shop...', { fontSize: '12px', fontFamily: 'monospace', color: '#888888' }).setOrigin(0.5).setDepth(150);
      this.elements.push(loading);
      return;
    }

    const shopTitle = s.add.text(50, 54, 'Shop - Zone Items', { fontSize: '11px', fontFamily: 'monospace', color: '#8888ff' }).setDepth(150);
    this.elements.push(shopTitle);

    const items = shop.items || [];
    const itemsPerRow = 2;
    for (let i = 0; i < items.length; i++) {
      const entry = items[i];
      const col = i % itemsPerRow;
      const row = Math.floor(i / itemsPerRow);
      const ix = 60 + col * 260;
      const iy = 72 + row * 36;

      const displayName = ITEM_NAMES[entry.key] || entry.key;
      const tier = ITEM_TIERS[entry.key] !== undefined ? ITEM_TIERS[entry.key] : 0;
      const nameColor = RARITY_COLORS[tier] || '#ffffff';
      const canAfford = gold >= entry.price;

      const bg = s.add.graphics().setDepth(150);
      bg.fillStyle(canAfford ? 0x444444 : 0x333333); bg.fillRect(ix, iy, 250, 30);
      bg.lineStyle(1, canAfford ? 0x888888 : 0x555555); bg.strokeRect(ix, iy, 250, 30);
      this.elements.push(bg);

      const nameText = s.add.text(ix + 6, iy + 3, displayName, { fontSize: '11px', fontFamily: 'monospace', color: nameColor }).setDepth(150);
      this.elements.push(nameText);

      const priceText = s.add.text(ix + 160, iy + 3, entry.price + 'g', { fontSize: '11px', fontFamily: 'monospace', color: canAfford ? '#ffcc00' : '#ff4444' }).setDepth(150);
      this.elements.push(priceText);

      const buyBg = s.add.graphics().setDepth(151);
      buyBg.fillStyle(canAfford ? 0x335533 : 0x333333); buyBg.fillRect(ix + 200, iy + 3, 46, 24);
      buyBg.lineStyle(1, canAfford ? 0x88ff88 : 0x555555); buyBg.strokeRect(ix + 200, iy + 3, 46, 24);
      this.elements.push(buyBg);
      if (canAfford) {
        buyBg.setInteractive(new Phaser.Geom.Rectangle(ix + 200, iy + 3, 46, 24), Phaser.Geom.Rectangle.Contains);
        const buyKey = entry.key;
        buyBg.on('pointerdown', () => { this.network.emit('buy_item', { itemKey: buyKey }); });
      }
      const buyText = s.add.text(ix + 223, iy + 6, 'Buy', { fontSize: '10px', fontFamily: 'monospace', color: canAfford ? '#88ff88' : '#555555' }).setOrigin(0.5).setDepth(152);
      this.elements.push(buyText);
    }
  }

  hide() {
    this.visible = false;
    this.elements.forEach(e => e.destroy());
    this.elements = [];
    if (this.tooltip) { this.tooltip.destroy(); this.tooltip = null; }
  }

  destroy() {
    this.hide();
  }
}