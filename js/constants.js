// Canvas
export const CANVAS_W = 240;
export const CANVAS_H = 160;
export const TILE = 8;

// Map
export const MAP_COLS = 30;
export const MAP_ROWS = 20;

// Tile types
export const T = {
  VOID: 0,
  WALL: 1,
  FLOOR: 2,
  ENEMY: 3,
  STAIRS: 4,
  CHEST: 5,
  FOUNTAIN: 6,
  PLAYER: 7,
};

// Color palette (retro 16-color)
export const PAL = {
  BLACK:      '#0a0a0a',
  DARK_BLUE:  '#1a1a3e',
  DARK_GREEN: '#1e5a1e',
  DARK_CYAN:  '#2a6a6a',
  DARK_RED:   '#8b1a1a',
  PURPLE:     '#6a2a8a',
  BROWN:      '#8b6a2a',
  LIGHT_GRAY: '#aaaaaa',
  DARK_GRAY:  '#555555',
  BLUE:       '#4488ff',
  GREEN:      '#44cc44',
  CYAN:       '#44cccc',
  RED:        '#cc4444',
  MAGENTA:    '#cc44cc',
  YELLOW:     '#ffdd44',
  WHITE:      '#eeeeee',
  GOLD:       '#ffd700',
  ORANGE:     '#ff8844',
  SKIN:       '#ffcc99',
  STEEL:      '#8899aa',
};

// Player initial stats
export const INIT_STATS = {
  hp: 30,
  maxHp: 30,
  atk: 5,
  def: 2,
  lv: 1,
  exp: 0,
  bulletSpeed: 2,
};

// Level up gains
export const LV_UP = {
  hp: 8,
  atk: 2,
  def: 1,
  expBase: 10,
};

export const MAX_LV = 15;
export const MAX_ITEMS = 5;
export const MAX_FLOOR = 5; // Update this when adding stages

// Battle constants
export const PLAYER_SHIP_W = 10;
export const PLAYER_SHIP_H = 10;
export const PLAYER_SPEED = 1.5;
export const BULLET_W = 2;
export const BULLET_H = 4;
export const ENEMY_BULLET_SPEED = 0.8;

// Ammo
export const AMMO_PER_STAGE = [0, 30, 28, 25, 22, 35]; // per stage
export const AMMO_PICKUP_AMOUNT = 10;

// Time limit per battle (seconds)
export const TIME_LIMIT_PER_STAGE = [0, 25, 30, 35, 40, 70];

// Scene states
export const SCENE = {
  TITLE: 'title',
  DUNGEON: 'dungeon',
  BATTLE: 'battle',
  BATTLE_RESULT: 'battleResult',
  GAME_OVER: 'gameOver',
  GAME_CLEAR: 'gameClear',
  ITEM_SWAP: 'itemSwap',
};
