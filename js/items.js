import * as SPR from './sprites.js';

export const ITEM_TYPES = {
  potion: {
    name: '回復薬',
    desc: 'HP+15',
    sprite: SPR.POTION,
    use(player) {
      player.heal(15);
      return `HP を 15 回復した！`;
    },
  },
  powerUp: {
    name: '強化薬',
    desc: 'ATK+3',
    sprite: SPR.POWER_UP,
    use(player) {
      player.atk += 3;
      return `攻撃力が 3 上がった！`;
    },
  },
  shield: {
    name: '盾の欠片',
    desc: 'DEF+2',
    sprite: SPR.SHIELD,
    use(player) {
      player.def += 2;
      return `防御力が 2 上がった！`;
    },
  },
  scroll: {
    name: '速射の巻物',
    desc: '30秒弾速2倍',
    sprite: SPR.SCROLL,
    use(player) {
      player._rapidFire = true;
      player._rapidFireEnd = Date.now() + 30000;
      return `弾速が 30秒間 2倍になった！`;
    },
  },
  fullPotion: {
    name: '全回復薬',
    desc: 'HP全回復',
    sprite: SPR.FULL_POTION,
    use(player) {
      player.fullHeal();
      return `HP が全回復した！`;
    },
  },
};

// Drop table (5 floors)
const DROP_TABLE = [
  null,
  ['potion', 'potion', 'powerUp'],                    // 1F
  ['potion', 'powerUp', 'shield'],                    // 2F
  ['potion', 'powerUp', 'shield', 'scroll'],          // 3F
  ['potion', 'shield', 'scroll', 'fullPotion'],       // 4F
  ['fullPotion', 'fullPotion', 'powerUp', 'scroll'],  // 5F
];

// Chest drop table
const CHEST_TABLE = [
  null,
  ['potion', 'powerUp'],           // 1F
  ['powerUp', 'shield'],           // 2F
  ['shield', 'scroll'],            // 3F
  ['scroll', 'fullPotion'],        // 4F
  ['fullPotion', 'powerUp'],       // 5F
];

export function rollDrop(floor) {
  const table = DROP_TABLE[floor] || DROP_TABLE[1];
  const id = table[Math.floor(Math.random() * table.length)];
  return { id, ...ITEM_TYPES[id] };
}

export function rollChestDrop(floor) {
  const table = CHEST_TABLE[floor] || CHEST_TABLE[1];
  const id = table[Math.floor(Math.random() * table.length)];
  return { id, ...ITEM_TYPES[id] };
}

export function createItemInstance(id) {
  return { id, ...ITEM_TYPES[id] };
}
