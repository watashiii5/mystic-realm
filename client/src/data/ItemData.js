const ITEM_NAMES = {
  wooden_staff: 'Wooden Staff', starter_robe: 'Starter Robe', starter_ring: 'Starter Ring',
  forest_staff: 'Forest Staff', leaf_cloak: 'Leaf Cloak', vine_ring: 'Vine Ring',
  crystal_staff: 'Crystal Staff', crystal_robe: 'Crystal Robe', crystal_ring: 'Crystal Ring',
  ancient_staff: 'Ancient Staff', ancient_robe: 'Ancient Robe', soul_ring: 'Soul Ring',
  legendary_staff: 'Legendary Staff', legendary_robe: 'Legendary Robe', boss_ring: 'Aether Ring',
  health_pot: 'Health Potion', mana_pot: 'Mana Potion',
  greater_health_pot: 'Greater Health Potion', greater_mana_pot: 'Greater Mana Potion',
};

const ITEM_TIERS = {
  health_pot: 0, mana_pot: 0, greater_health_pot: 1, greater_mana_pot: 1,
  wooden_staff: 1, starter_robe: 1, starter_ring: 1,
  forest_staff: 2, leaf_cloak: 2, vine_ring: 2,
  crystal_staff: 3, crystal_robe: 3, crystal_ring: 3,
  ancient_staff: 4, ancient_robe: 4, soul_ring: 4,
  legendary_staff: 5, legendary_robe: 5, boss_ring: 5,
};

const ITEM_TYPES = {
  wooden_staff: 'weapon', starter_robe: 'armor', starter_ring: 'accessory',
  forest_staff: 'weapon', leaf_cloak: 'armor', vine_ring: 'accessory',
  crystal_staff: 'weapon', crystal_robe: 'armor', crystal_ring: 'accessory',
  ancient_staff: 'weapon', ancient_robe: 'armor', soul_ring: 'accessory',
  legendary_staff: 'weapon', legendary_robe: 'armor', boss_ring: 'accessory',
  health_pot: 'consumable', mana_pot: 'consumable',
  greater_health_pot: 'consumable', greater_mana_pot: 'consumable',
};

const RARITY_COLORS = { 0: '#aaaaaa', 1: '#ffffff', 2: '#44ff44', 3: '#44ccff', 4: '#cc44ff', 5: '#ff8800' };
const RARITY_NAMES = { 0: 'Common', 1: 'Common', 2: 'Uncommon', 3: 'Rare', 4: 'Epic', 5: 'Legendary' };

const ITEM_DESCS = {
  wooden_staff: 'A basic wooden staff', starter_robe: 'Simple cloth robe', starter_ring: 'A simple copper ring',
  forest_staff: 'Carved from living wood', leaf_cloak: 'Woven from enchanted leaves', vine_ring: 'Living vines coiled into a ring',
  crystal_staff: 'Pulsing with crystal energy', crystal_robe: 'Robes lined with crystal shards', crystal_ring: 'A ring of pure crystal',
  ancient_staff: 'Wielded by forgotten mages', ancient_robe: 'Etched with ancient runes', soul_ring: 'Pulses with a faint heartbeat',
  legendary_staff: 'Staff of a true archmage', legendary_robe: 'Robes woven from starlight', boss_ring: "The Aether Lord's own ring",
  health_pot: 'Restores 40 HP', mana_pot: 'Restores 30 MP', greater_health_pot: 'Restores 80 HP', greater_mana_pot: 'Restores 60 MP',
};

const ITEM_STATS = {
  wooden_staff: { atk: 3 }, starter_robe: { def: 2 }, starter_ring: { mp: 10 },
  forest_staff: { atk: 6, mp: 5 }, leaf_cloak: { def: 4, hp: 10 }, vine_ring: { hp: 15 },
  crystal_staff: { atk: 10, mp: 10 }, crystal_robe: { def: 7, mp: 15 }, crystal_ring: { mp: 25 },
  ancient_staff: { atk: 15, mp: 15 }, ancient_robe: { def: 10, mp: 20 }, soul_ring: { hp: 25, mp: 15 },
  legendary_staff: { atk: 22, mp: 25 }, legendary_robe: { def: 15, hp: 30 }, boss_ring: { hp: 40, mp: 30, atk: 5 },
  health_pot: { heal: 40 }, mana_pot: { mana: 30 }, greater_health_pot: { heal: 80 }, greater_mana_pot: { mana: 60 },
};
