import * as SPR from './sprites.js';

// Enemy type definitions - HIGH damage, you WILL die
const ENEMY_TYPES = {
  slime: {
    name: 'スライム',
    sprite: SPR.SLIME,
    hp: 6,
    atk: 10,
    speed: 0.3,
    shootChance: 0.015,
    exp: 15,
    dropChance: 0.3,
  },
  bat: {
    name: 'コウモリ',
    sprite: SPR.BAT,
    hp: 8,
    atk: 14,
    speed: 0.8,
    shootChance: 0.018,
    exp: 22,
    dropChance: 0.3,
  },
  skeleton: {
    name: 'スケルトン',
    sprite: SPR.SKELETON,
    hp: 12,
    atk: 18,
    speed: 0.45,
    shootChance: 0.022,
    exp: 35,
    dropChance: 0.35,
  },
  golem: {
    name: 'ゴーレム',
    sprite: SPR.GOLEM,
    hp: 22,
    atk: 16,
    speed: 0.2,
    shootChance: 0.015,
    exp: 40,
    dropChance: 0.4,
  },
  darkMage: {
    name: 'ダークメイジ',
    sprite: SPR.DARK_MAGE,
    hp: 16,
    atk: 22,
    speed: 0.55,
    shootChance: 0.028,
    exp: 50,
    dropChance: 0.4,
  },
  dragon: {
    name: 'ドラゴン',
    sprite: SPR.DRAGON,
    hp: 80,
    atk: 28,
    speed: 0.3,
    shootChance: 0.04,
    exp: 150,
    dropChance: 1.0,
    isBoss: true,
  },
};

// 5 stages, 1 encounter each
const FLOOR_CONFIG = [
  null,
  { types: ['slime'],              rows: 3, cols: 5, count: 12 },
  { types: ['bat', 'slime'],       rows: 3, cols: 6, count: 15 },
  { types: ['skeleton', 'bat'],    rows: 4, cols: 5, count: 16 },
  { types: ['darkMage', 'golem'],  rows: 4, cols: 5, count: 18 },
  { types: ['dragon'],             rows: 1, cols: 1, count: 1, boss: true },
];

export function createEnemy(type, x, y) {
  const def = ENEMY_TYPES[type];
  return {
    type, name: def.name, sprite: def.sprite,
    hp: def.hp, maxHp: def.hp, atk: def.atk,
    speed: def.speed, shootChance: def.shootChance,
    exp: def.exp, dropChance: def.dropChance,
    isBoss: def.isBoss || false,
    x, y, alive: true,
    dir: Math.random() > 0.5 ? 1 : -1,
    speedMult: 0.2 + Math.random() * 1.8,   // 0.2x~2.0x: some crawl, some zoom
    sineOffset: Math.random() * Math.PI * 2,
    sineAmp: 0.05 + Math.random() * 0.35,
    hitFlash: 0,
  };
}

export function createFormation(floor) {
  const config = FLOOR_CONFIG[floor];
  if (!config) return [];
  const enemies = [];

  if (config.boss) {
    const type = config.types[0];
    const def = ENEMY_TYPES[type];
    const sprW = def.sprite[0].length;
    enemies.push(createEnemy(type, 120 - sprW / 2, 10));
    // Boss gets 20 minions (mix of slime and bat)
    const minionTypes = ['slime', 'bat'];
    for (let i = 0; i < 20; i++) {
      const mt = minionTypes[Math.floor(Math.random() * minionTypes.length)];
      const mx = 10 + Math.random() * 220;
      const my = 25 + Math.random() * 50;
      enemies.push(createEnemy(mt, mx, my));
    }
    return enemies;
  }

  // Scatter enemies randomly across upper half (not grid formation)
  const primaryType = config.types[0];

  let placed = 0;
  while (placed < config.count) {
    const typeIdx = (placed < config.count / 3 && config.types.length > 1) ? 0 : (config.types.length > 1 ? 1 : 0);
    const type = config.types[typeIdx];
    const x = 8 + Math.random() * (240 - 16);
    const y = 6 + Math.random() * 55; // upper 40% of screen
    enemies.push(createEnemy(type, x, y));
    placed++;
  }
  return enemies;
}

export function dungeonEnemyCount() { return 1; }

export function getFloorEnemyType(floor) {
  const config = FLOOR_CONFIG[floor];
  return config ? config.types[0] : 'slime';
}

export function getEnemySprite(floor) {
  return ENEMY_TYPES[getFloorEnemyType(floor)].sprite;
}
