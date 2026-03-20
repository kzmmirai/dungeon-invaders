// ===== STAGE DEFINITIONS =====
// 新ステージ追加はこのファイルだけ編集すればOK
// 1. STAGES配列に追加
// 2. 必要なら enemies.js に新敵タイプを追加
// 3. sprites.js に新スプライトを追加

export const STAGES = [
  null, // index 0 unused

  // STAGE 1
  {
    name: '地下洞窟',
    theme: { wall: '#1a1a3e', wallAccent: '#252550', floor: '#12121e', floorAccent: '#181828', fog: '#0a0a15' },
    enemies: { types: ['slime'], count: 12 },
    bossMinions: null,
    timeLimit: 25,
    ammo: 30,
    drops: ['potion', 'potion', 'powerUp'],
    chestDrops: ['potion', 'powerUp'],
  },

  // STAGE 2
  {
    name: '暗黒の森',
    theme: { wall: '#1a2e1a', wallAccent: '#1e3a1e', floor: '#101a10', floorAccent: '#142014', fog: '#060d06' },
    enemies: { types: ['bat', 'slime'], count: 15 },
    bossMinions: null,
    timeLimit: 30,
    ammo: 28,
    drops: ['potion', 'powerUp', 'shield'],
    chestDrops: ['powerUp', 'shield'],
  },

  // STAGE 3
  {
    name: '骨の迷宮',
    theme: { wall: '#2e2a1a', wallAccent: '#3a341e', floor: '#1a1610', floorAccent: '#201c14', fog: '#0d0b06' },
    enemies: { types: ['skeleton', 'bat'], count: 16 },
    bossMinions: null,
    timeLimit: 35,
    ammo: 25,
    drops: ['potion', 'powerUp', 'shield', 'scroll'],
    chestDrops: ['shield', 'scroll'],
  },

  // STAGE 4
  {
    name: '魔王の城',
    theme: { wall: '#2e1a2a', wallAccent: '#3a1e34', floor: '#1a101a', floorAccent: '#201420', fog: '#0d060d' },
    enemies: { types: ['darkMage', 'golem'], count: 18 },
    bossMinions: null,
    timeLimit: 40,
    ammo: 22,
    drops: ['potion', 'shield', 'scroll', 'fullPotion'],
    chestDrops: ['scroll', 'fullPotion'],
  },

  // STAGE 5 (BOSS)
  {
    name: 'ドラゴンの巣',
    theme: { wall: '#2e1a1a', wallAccent: '#3a1e1e', floor: '#1a1010', floorAccent: '#201414', fog: '#0d0606' },
    enemies: { types: ['dragon'], count: 1, boss: true },
    bossMinions: { types: ['slime', 'bat'], count: 20 },
    timeLimit: 70,
    ammo: 35,
    drops: ['fullPotion', 'fullPotion', 'powerUp', 'scroll'],
    chestDrops: ['fullPotion', 'scroll'],
  },
];

// Helper: total stage count
export const STAGE_COUNT = STAGES.length - 1;

// Helper: get stage config safely
export function getStage(floor) {
  return STAGES[floor] || STAGES[1];
}
