import { TILE, MAP_COLS, MAP_ROWS, T, PAL } from './constants.js';
import { drawSprite } from './sprites.js';
import * as SPR from './sprites.js';
import { getEnemySprite, dungeonEnemyCount } from './enemies.js';

export function generateMap(floor) {
  const map = Array.from({ length: MAP_ROWS }, () => new Array(MAP_COLS).fill(T.WALL));

  const rooms = [];
  const roomCount = 4 + Math.floor(Math.random() * 3);

  for (let i = 0; i < roomCount; i++) {
    const w = 4 + Math.floor(Math.random() * 5);
    const h = 3 + Math.floor(Math.random() * 4);
    const x = 1 + Math.floor(Math.random() * (MAP_COLS - w - 2));
    const y = 1 + Math.floor(Math.random() * (MAP_ROWS - h - 2));

    let overlap = false;
    for (const r of rooms) {
      if (x < r.x + r.w + 1 && x + w + 1 > r.x && y < r.y + r.h + 1 && y + h + 1 > r.y) { overlap = true; break; }
    }
    if (overlap) continue;

    for (let ry = y; ry < y + h; ry++) {
      for (let rx = x; rx < x + w; rx++) map[ry][rx] = T.FLOOR;
    }
    rooms.push({ x, y, w, h, cx: Math.floor(x + w / 2), cy: Math.floor(y + h / 2) });
  }

  if (rooms.length < 3) return generateMap(floor);

  for (let i = 0; i < rooms.length - 1; i++) {
    const a = rooms[i], b = rooms[i + 1];
    let cx = a.cx, cy = a.cy;
    while (cx !== b.cx) { map[cy][cx] = T.FLOOR; cx += cx < b.cx ? 1 : -1; }
    while (cy !== b.cy) { map[cy][cx] = T.FLOOR; cy += cy < b.cy ? 1 : -1; }
    map[cy][cx] = T.FLOOR;
  }

  const startRoom = rooms[0];
  const playerX = startRoom.cx, playerY = startRoom.cy;
  const endRoom = rooms[rooms.length - 1];
  const stairsX = endRoom.cx, stairsY = endRoom.cy;

  const enemyPositions = [];
  const availableRooms = rooms.slice(1);
  const enemyRoom = availableRooms[Math.floor(Math.random() * availableRooms.length)];
  const ex = enemyRoom.cx, ey = enemyRoom.cy;
  if (map[ey][ex] === T.FLOOR) { map[ey][ex] = T.ENEMY; enemyPositions.push({ x: ex, y: ey }); }

  const chestCount = 1 + (Math.random() > 0.5 ? 1 : 0);
  for (let i = 0; i < chestCount; i++) {
    const room = availableRooms[Math.floor(Math.random() * availableRooms.length)];
    const cx2 = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
    const cy2 = room.y + 1 + Math.floor(Math.random() * (room.h - 2));
    if (map[cy2][cx2] === T.FLOOR) map[cy2][cx2] = T.CHEST;
  }

  if (Math.random() < 0.4) {
    const room = availableRooms[Math.floor(Math.random() * availableRooms.length)];
    const fx = room.x + 1 + Math.floor(Math.random() * (room.w - 2));
    const fy = room.y + 1 + Math.floor(Math.random() * (room.h - 2));
    if (map[fy][fx] === T.FLOOR) map[fy][fx] = T.FOUNTAIN;
  }

  return { map, rooms, playerX, playerY, stairsX, stairsY, enemyPositions, enemiesRemaining: enemyPositions.length, stairsRevealed: false };
}

// Floor-specific color themes
const FLOOR_THEMES = [
  null,
  { wall: '#1a1a3e', wallAccent: '#252550', floor: '#12121e', floorAccent: '#181828', fog: '#0a0a15' }, // 1F cave
  { wall: '#1a2e1a', wallAccent: '#1e3a1e', floor: '#101a10', floorAccent: '#142014', fog: '#060d06' }, // 2F forest
  { wall: '#2e2a1a', wallAccent: '#3a341e', floor: '#1a1610', floorAccent: '#201c14', fog: '#0d0b06' }, // 3F bones
  { wall: '#2e1a2a', wallAccent: '#3a1e34', floor: '#1a101a', floorAccent: '#201420', fog: '#0d060d' }, // 4F castle
  { wall: '#2e1a1a', wallAccent: '#3a1e1e', floor: '#1a1010', floorAccent: '#201414', fog: '#0d0606' }, // 5F dragon
];

export class DungeonRenderer {
  constructor(ctx) {
    this.ctx = ctx;
    this.animTimer = 0;
  }

  draw(dungeonData, player, floor) {
    this.animTimer++;
    const ctx = this.ctx;
    const { map, stairsX, stairsY, stairsRevealed } = dungeonData;
    const theme = FLOOR_THEMES[floor] || FLOOR_THEMES[1];

    const camX = Math.floor(player.x * TILE - 120 + TILE / 2);
    const camY = Math.floor(player.y * TILE - 80 + TILE / 2);

    ctx.fillStyle = theme.fog;
    ctx.fillRect(0, 0, 240, 160);

    const startCol = Math.max(0, Math.floor(camX / TILE) - 1);
    const endCol = Math.min(MAP_COLS, Math.ceil((camX + 240) / TILE) + 1);
    const startRow = Math.max(0, Math.floor(camY / TILE) - 1);
    const endRow = Math.min(MAP_ROWS, Math.ceil((camY + 160) / TILE) + 1);

    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        const sx = c * TILE - camX;
        const sy = r * TILE - camY;
        const tile = map[r][c];
        const dist = Math.abs(player.x - c) + Math.abs(player.y - r);
        if (dist > 9) continue;

        // Light falloff
        const brightness = dist <= 3 ? 1 : dist <= 5 ? 0.7 : dist <= 7 ? 0.4 : 0.2;

        switch (tile) {
          case T.WALL:
            ctx.fillStyle = theme.wall;
            ctx.fillRect(sx, sy, TILE, TILE);
            // Brick pattern varies by floor
            ctx.fillStyle = theme.wallAccent;
            if (r % 2 === 0) {
              ctx.fillRect(sx, sy, TILE, 1);
              ctx.fillRect(sx + 4, sy + 4, 1, 1);
            } else {
              ctx.fillRect(sx, sy + 4, TILE, 1);
              ctx.fillRect(sx + 1, sy + 1, 1, 1);
            }
            // Top edge highlight
            if (r > 0 && map[r - 1][c] !== T.WALL) {
              ctx.fillStyle = theme.wallAccent;
              ctx.fillRect(sx, sy, TILE, 1);
            }
            break;

          case T.FLOOR:
            ctx.fillStyle = theme.floor;
            ctx.fillRect(sx, sy, TILE, TILE);
            // Floor texture
            if ((c + r) % 4 === 0) {
              ctx.fillStyle = theme.floorAccent;
              ctx.fillRect(sx + 3, sy + 3, 2, 2);
            }
            if ((c * 7 + r * 13) % 11 === 0) {
              ctx.fillStyle = theme.floorAccent;
              ctx.fillRect(sx + 1, sy + 5, 1, 1);
            }
            break;

          case T.ENEMY:
            ctx.fillStyle = theme.floor;
            ctx.fillRect(sx, sy, TILE, TILE);
            drawSprite(ctx, getEnemySprite(floor), sx, sy, 1);
            // Pulsing red glow
            if (this.animTimer % 40 < 20) {
              ctx.fillStyle = PAL.RED;
              ctx.globalAlpha = 0.15;
              ctx.fillRect(sx - 1, sy - 1, TILE + 2, TILE + 2);
              ctx.globalAlpha = 1;
            }
            break;

          case T.CHEST:
            ctx.fillStyle = theme.floor;
            ctx.fillRect(sx, sy, TILE, TILE);
            drawSprite(ctx, SPR.CHEST, sx + 1, sy + 1, 1);
            // Gold sparkle
            if (this.animTimer % 30 < 5) {
              ctx.fillStyle = PAL.GOLD;
              const sparkX = sx + (this.animTimer % 6);
              const sparkY = sy + ((this.animTimer + 3) % 5);
              ctx.fillRect(sparkX, sparkY, 1, 1);
            }
            break;

          case T.FOUNTAIN:
            ctx.fillStyle = theme.floor;
            ctx.fillRect(sx, sy, TILE, TILE);
            drawSprite(ctx, SPR.FOUNTAIN, sx + 1, sy + 1, 1);
            // Water animation
            ctx.fillStyle = PAL.CYAN;
            ctx.globalAlpha = 0.3 + Math.sin(this.animTimer * 0.1) * 0.15;
            ctx.fillRect(sx + 2, sy + 1, 4, 2);
            ctx.globalAlpha = 1;
            break;

          case T.STAIRS:
            ctx.fillStyle = theme.floor;
            ctx.fillRect(sx, sy, TILE, TILE);
            drawSprite(ctx, SPR.STAIRS_SPRITE, sx + 1, sy + 1, 1);
            // Pulsing glow
            ctx.fillStyle = PAL.GOLD;
            ctx.globalAlpha = 0.15 + Math.sin(this.animTimer * 0.08) * 0.1;
            ctx.fillRect(sx - 1, sy - 1, TILE + 2, TILE + 2);
            ctx.globalAlpha = 1;
            break;
        }

        // Light falloff overlay
        if (brightness < 1) {
          ctx.fillStyle = theme.fog;
          ctx.globalAlpha = 1 - brightness;
          ctx.fillRect(sx, sy, TILE, TILE);
          ctx.globalAlpha = 1;
        }
      }
    }

    // Player with bobbing animation
    const px = player.x * TILE - camX;
    const py = player.y * TILE - camY + Math.sin(this.animTimer * 0.1) * 0.5;
    drawSprite(ctx, SPR.HERO, px, py, 1);

    // Player torch glow
    ctx.fillStyle = PAL.ORANGE;
    ctx.globalAlpha = 0.04 + Math.sin(this.animTimer * 0.15) * 0.02;
    const glowR = 28 + Math.sin(this.animTimer * 0.12) * 3;
    ctx.beginPath();
    ctx.arc(px + 4, py + 4, glowR, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Minimap (top-right corner)
    const mmX = 240 - 35, mmY = 3;
    ctx.fillStyle = '#000';
    ctx.globalAlpha = 0.6;
    ctx.fillRect(mmX - 1, mmY - 1, 34, 22);
    ctx.globalAlpha = 1;
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        const t = map[r][c];
        if (t === T.VOID || t === T.WALL) continue;
        const d = Math.abs(player.x - c) + Math.abs(player.y - r);
        if (d > 12) continue;
        ctx.fillStyle = t === T.ENEMY ? PAL.RED : t === T.STAIRS ? PAL.GOLD : t === T.CHEST ? PAL.YELLOW : '#333';
        ctx.fillRect(mmX + c, mmY + r, 1, 1);
      }
    }
    // Player on minimap
    ctx.fillStyle = PAL.GREEN;
    ctx.fillRect(mmX + player.x, mmY + player.y, 1, 1);
  }
}
