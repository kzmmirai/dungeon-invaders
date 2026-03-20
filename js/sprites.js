import { PAL } from './constants.js';

// Sprite color index mapping
const C = {
  _: null,        // transparent
  K: PAL.BLACK,
  W: PAL.WHITE,
  R: PAL.RED,
  G: PAL.GREEN,
  B: PAL.BLUE,
  Y: PAL.YELLOW,
  O: PAL.ORANGE,
  P: PAL.PURPLE,
  M: PAL.MAGENTA,
  S: PAL.SKIN,
  T: PAL.STEEL,
  D: PAL.DARK_BLUE,
  N: PAL.BROWN,
  L: PAL.LIGHT_GRAY,
  A: PAL.DARK_GRAY,
  c: PAL.CYAN,
  F: PAL.GOLD,
  E: PAL.DARK_GREEN,
  Q: PAL.DARK_RED,
};

// Convert string sprite to color array
function parse(rows, colorMap) {
  return rows.map(row =>
    row.split('').map(ch => colorMap[ch] || null)
  );
}

// ===== PLAYER HERO (8x8) - Brave warrior =====
export const HERO = parse([
  '___FF___',
  '__FFFF__',
  '__SSSS__',
  '__S_S___',
  '_TBBBT__',
  '_TBBBT__',
  '__T__T__',
  '__N__N__',
], C);

// ===== PLAYER SHIP for battle (10x10) - Armored hero ship =====
export const HERO_SHIP = parse([
  '____FF____',
  '___FFFF___',
  '___SSSS___',
  '__TBBBT___',
  '_TTBBBTT__',
  'TTTTTTTTTT',
  'cTTTTTTTTc',
  '_cT____Tc_',
  '_TT____TT_',
  '____________',
], C);

// ===== ENEMIES =====
export const SLIME = parse([
  '___GG___',
  '__GGGG__',
  '_GGGGGG_',
  'GGGGGGGG',
  'GG_GG_GG',
  'GGGGGGGG',
  '_GGGGGG_',
  '__G__G__',
], C);

export const BAT = parse([
  'PP____PP',
  'PPP__PPP',
  'PPPPPPPP',
  'PP_PP_PP',
  'PPPPPPPP',
  '_PP__PP_',
  '________',
  '________',
], C);

export const SKELETON = parse([
  '__WWWW__',
  '_WWWWWW_',
  'WW_WW_WW',
  '_WWWWWW_',
  '__WWWW__',
  '_WLLLLW_',
  '_LLLLLL_',
  '_LL__LL_',
], C);

export const GOLEM = parse([
  '__AAAA__',
  '_AAAAAA_',
  'AAAAAAAA',
  'AA_AA_AA',
  'AAAAAAAA',
  '_AAAAAA_',
  'AAAAAAAA',
  'AAA__AAA',
], C);

export const DARK_MAGE = parse([
  '__PPPP__',
  '_PPPPPP_',
  'PPPPPPPP',
  'PP_PP_PP',
  '_MMMMMM_',
  'MMMMMMMM',
  '_MM__MM_',
  '_MM__MM_',
], C);

export const DRAGON = parse([
  'RR______________RR',
  'RRR____RRRR____RRR',
  '_RRR__RRRRRR__RRR_',
  '__RRRRRRRRRRRRRR__',
  '__RRR_RRRRRR_RRR__',
  '__RRRRRRRRRRRRRR__',
  '___RRRR_RR_RRRR___',
  '____RRRRRRRRRR____',
  '_____RRRRRRRR_____',
  '______RRRRRR______',
  '____RR_RRRR_RR____',
  '___RR___RR___RR___',
], C);

// ===== ITEMS =====
export const POTION = parse([
  '__WW__',
  '_WWWW_',
  '__WW__',
  '_RRRR_',
  'RRRRRR',
  '_RRRR_',
], C);

export const POWER_UP = parse([
  '__WW__',
  '_WWWW_',
  '__WW__',
  '_OOOO_',
  'OOOOOO',
  '_OOOO_',
], C);

export const SHIELD = parse([
  'BBBBBB',
  'BBBBBB',
  'BBYBBB',
  '_BBBB_',
  '__BB__',
  '__BB__',
], C);

export const SCROLL = parse([
  '_YYYY_',
  'YYYYYY',
  'Y_YY_Y',
  'YYYYYY',
  'YYYYYY',
  '_YYYY_',
], C);

export const FULL_POTION = parse([
  '__WW__',
  '_WWWW_',
  '__WW__',
  '_FFFF_',
  'FFFFFF',
  '_FFFF_',
], C);

export const CHEST = parse([
  '_NNNN_',
  'NFFFFN',
  'NNNNNN',
  'N_NN_N',
  'NNNNNN',
  '_NNNN_',
], C);

export const FOUNTAIN = parse([
  '__cc__',
  '_cccc_',
  'cccccc',
  '__cc__',
  '_TTTT_',
  'TTTTTT',
], C);

export const STAIRS_SPRITE = parse([
  'AAAAAA',
  'A___AA',
  'AA__AA',
  'AA__AA',
  'AAA_AA',
  'AAAAAA',
], C);

// ===== BULLETS =====
export const PLAYER_BULLET = parse([
  'Y',
  'W',
  'Y',
  'Y',
], C);

export const ENEMY_BULLET = parse([
  'R',
  'O',
  'R',
  'Y',
], C);

// ===== DRAW FUNCTION =====
export function drawSprite(ctx, sprite, x, y, scale = 1) {
  for (let row = 0; row < sprite.length; row++) {
    for (let col = 0; col < sprite[row].length; col++) {
      const color = sprite[row][col];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(
          Math.floor(x + col * scale),
          Math.floor(y + row * scale),
          scale,
          scale
        );
      }
    }
  }
}

// Draw sprite with white flash (for hit effect)
export function drawSpriteFlash(ctx, sprite, x, y, scale = 1) {
  for (let row = 0; row < sprite.length; row++) {
    for (let col = 0; col < sprite[row].length; col++) {
      if (sprite[row][col]) {
        ctx.fillStyle = PAL.WHITE;
        ctx.fillRect(
          Math.floor(x + col * scale),
          Math.floor(y + row * scale),
          scale,
          scale
        );
      }
    }
  }
}
