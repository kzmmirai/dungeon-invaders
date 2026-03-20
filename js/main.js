import { CANVAS_W, CANVAS_H, SCENE, T, MAX_FLOOR, MAX_ITEMS, PAL } from './constants.js';
import { Player } from './player.js';
import { generateMap, DungeonRenderer } from './dungeon.js';
import { Battle } from './battle.js';
import { rollChestDrop, createItemInstance } from './items.js';
import * as UI from './ui.js';
import { drawSprite } from './sprites.js';
import * as SPR from './sprites.js';
import { initTouch, getTouchState, isTouchDevice } from './touch.js';

// ===== INIT =====
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// Init touch controls if on mobile
if (isTouchDevice()) {
  initTouch(canvas);
  document.body.classList.add('touch-device');
}

const player = new Player();
const dungeonRenderer = new DungeonRenderer(ctx);

let scene = SCENE.TITLE;
let dungeonData = null;
let battle = null;
let keys = {};
let keysJustPressed = {};
let moveTimer = 0;
let titleSelection = 0;

// DOM screen refs
const titleScreen = document.getElementById('title-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const gameoverInfo = document.getElementById('gameover-info');
const clearScreen = document.getElementById('clear-screen');
const clearInfo = document.getElementById('clear-info');
const menuNew = document.getElementById('menu-new');
const menuContinue = document.getElementById('menu-continue');
const swapModal = document.getElementById('swap-modal');
const swapNewItem = document.getElementById('swap-new-item');
const swapList = document.getElementById('swap-list');
const swapDiscard = document.getElementById('swap-discard');

// Item swap state
let swapState = { newItem: null, selectedSlot: 0, returnScene: null, pendingDrops: [] };

// Input - attach to window, always capture
window.addEventListener('keydown', e => {
  if (!keys[e.key]) keysJustPressed[e.key] = true;
  keys[e.key] = true;
  // Don't prevent default for F5/F12/devtools
  if (!e.key.startsWith('F') && e.key !== 'Tab') e.preventDefault();
}, { capture: true });
window.addEventListener('keyup', e => { keys[e.key] = false; }, { capture: true });

// Also allow clicking to start (in case keyboard focus is lost)
document.addEventListener('click', () => {
  if (scene === SCENE.TITLE) {
    keysJustPressed['Enter'] = true;
  }
});

function consumeKey(key) {
  if (keysJustPressed[key]) { keysJustPressed[key] = false; return true; }
  return false;
}

// ===== SCREEN MANAGEMENT =====
function hideAllScreens() {
  titleScreen.classList.add('hidden');
  gameoverScreen.classList.add('hidden');
  clearScreen.classList.add('hidden');
  swapModal.classList.add('hidden');
}

function showScreen(id) {
  hideAllScreens();
  document.getElementById(id).classList.remove('hidden');
}

// ===== SAVE / LOAD =====
function saveGame() {
  player.save();
  UI.showMessage('セーブしました！', 1500);
  UI.sfx_item();
}

function loadGame() {
  if (!player.load()) return false;
  player.items = (player._savedItemIds || []).map(id => createItemInstance(id));
  delete player._savedItemIds;
  return true;
}

// ===== ITEM SWAP =====
function openSwapModal(newItem, returnScene) {
  swapState.newItem = newItem;
  swapState.selectedSlot = 0;
  swapState.returnScene = returnScene;
  scene = SCENE.ITEM_SWAP;

  swapNewItem.textContent = `新: ${newItem.name} (${newItem.desc})`;
  swapList.innerHTML = '';
  for (let i = 0; i < MAX_ITEMS; i++) {
    const li = document.createElement('li');
    const item = player.items[i];
    li.textContent = `${i + 1}: ${item ? item.name + ' (' + item.desc + ')' : '---'}`;
    swapList.appendChild(li);
  }
  updateSwapSelection();
  swapModal.classList.remove('hidden');
}

function updateSwapSelection() {
  swapList.querySelectorAll('li').forEach((li, i) => {
    li.classList.toggle('selected', i === swapState.selectedSlot);
  });
  swapDiscard.classList.toggle('selected', swapState.selectedSlot === MAX_ITEMS);
}

function closeSwapModal() {
  swapModal.classList.add('hidden');
  scene = swapState.returnScene || SCENE.DUNGEON;
  processNextDrop();
}

function processNextDrop() {
  if (swapState.pendingDrops.length === 0) return;
  const next = swapState.pendingDrops.shift();
  if (player.items.length < MAX_ITEMS) {
    player.addItem(next);
    UI.showMessage(`${next.name} を手に入れた！`, 1500);
    UI.updateHUD(player);
    processNextDrop();
  } else {
    openSwapModal(next, swapState.returnScene);
  }
}

// ===== SCENE LOGIC =====
function enterTitle() {
  scene = SCENE.TITLE;
  UI.stopBGM();
  hideAllScreens();
  titleScreen.classList.remove('hidden');
  const hasSave = Player.hasSave();
  menuContinue.classList.toggle('hidden', !hasSave);
  titleSelection = 0;
  updateTitleMenu();
}

function updateTitleMenu() {
  const hasSave = Player.hasSave();
  menuNew.className = `menu-item${titleSelection === 0 ? ' selected' : ''}`;
  menuNew.textContent = titleSelection === 0 ? '> NEW GAME <' : 'NEW GAME';
  if (hasSave) {
    menuContinue.className = `menu-item${titleSelection === 1 ? ' selected' : ''}`;
    menuContinue.textContent = titleSelection === 1 ? '> CONTINUE <' : 'CONTINUE';
  }
}

function startDungeon() {
  hideAllScreens();
  dungeonData = generateMap(player.floor);
  player.x = dungeonData.playerX;
  player.y = dungeonData.playerY;
  scene = SCENE.DUNGEON;
  UI.updateHUD(player);
  UI.showMessage(`STAGE ${player.floor} - ${getFloorName(player.floor)}`, 2500);
  UI.startBGM('dungeon');
}

function getFloorName(floor) {
  return ['', '地下洞窟', '暗黒の森', '骨の迷宮', '魔王の城', 'ドラゴンの巣'][floor] || '???';
}

function startBattle() {
  scene = SCENE.BATTLE;
  battle = new Battle(ctx, player, player.floor, (won, drops) => {
    battle = null;
    if (won) {
      const returnScene = SCENE.DUNGEON;
      if (drops.length > 0) {
        swapState.returnScene = returnScene;
        swapState.pendingDrops = [...drops];
        const first = swapState.pendingDrops.shift();
        if (player.items.length < MAX_ITEMS) {
          player.addItem(first);
          UI.showMessage(`${first.name} を手に入れた！`, 1500);
          scene = returnScene;
          UI.updateHUD(player);
          processNextDrop();
        } else {
          openSwapModal(first, returnScene);
        }
      } else {
        scene = returnScene;
        UI.showMessage('戦闘に勝利した！', 2000);
      }

      if (dungeonData && dungeonData.enemiesRemaining <= 0 && !dungeonData.stairsRevealed) {
        dungeonData.stairsRevealed = true;
        dungeonData.map[dungeonData.stairsY][dungeonData.stairsX] = T.STAIRS;
        setTimeout(() => { UI.showMessage('階段が現れた！', 2000); UI.sfx_stairs(); }, 500);
      }
      UI.updateHUD(player);
    } else {
      scene = SCENE.GAME_OVER;
      gameoverInfo.textContent = `到達: STAGE ${player.floor}　Lv.${player.lv}`;
      showScreen('gameover-screen');
    }
  });
}

function tryMove(dx, dy) {
  const nx = player.x + dx, ny = player.y + dy;
  if (nx < 0 || nx >= 30 || ny < 0 || ny >= 20) return;
  const tile = dungeonData.map[ny][nx];
  if (tile === T.WALL || tile === T.VOID) return;

  if (tile === T.ENEMY) {
    dungeonData.map[ny][nx] = T.FLOOR;
    dungeonData.enemiesRemaining--;
    player.x = nx; player.y = ny;
    startBattle();
    return;
  }
  if (tile === T.CHEST) {
    dungeonData.map[ny][nx] = T.FLOOR;
    const item = rollChestDrop(player.floor);
    if (player.items.length < MAX_ITEMS) {
      player.addItem(item);
      UI.showMessage(`宝箱: ${item.name} を手に入れた！`, 2000);
    } else {
      swapState.returnScene = SCENE.DUNGEON;
      swapState.pendingDrops = [];
      openSwapModal(item, SCENE.DUNGEON);
    }
    UI.sfx_item();
    UI.updateHUD(player);
  }
  if (tile === T.FOUNTAIN) {
    dungeonData.map[ny][nx] = T.FLOOR;
    player.fullHeal();
    UI.showMessage('泉の水でHPが全回復した！', 2000);
    UI.sfx_heal();
    UI.updateHUD(player);
  }
  if (tile === T.STAIRS) {
    if (player.floor >= MAX_FLOOR) {
      Player.deleteSave();
      scene = SCENE.GAME_CLEAR;
      clearInfo.textContent = `最終レベル: Lv.${player.lv}`;
      showScreen('clear-screen');
      return;
    }
    player.floor++;
    player.save();
    UI.sfx_stairs();
    startDungeon();
    return;
  }
  player.x = nx; player.y = ny;
}

// ===== UPDATE =====
function update() {
  switch (scene) {
    case SCENE.TITLE: {
      const hasSave = Player.hasSave();
      if (hasSave && (consumeKey('ArrowUp') || consumeKey('ArrowDown'))) {
        titleSelection = titleSelection === 0 ? 1 : 0;
        updateTitleMenu();
      }
      if (consumeKey('Enter') || consumeKey(' ')) {
        if (titleSelection === 1 && hasSave) { if (loadGame()) startDungeon(); }
        else { player.reset(); Player.deleteSave(); startDungeon(); }
      }
      break;
    }
    case SCENE.DUNGEON: {
      const t = getTouchState();
      moveTimer++;
      if (moveTimer >= 8) {
        if (keys['ArrowUp'] || keys['w'] || t.up) { tryMove(0, -1); moveTimer = 0; }
        else if (keys['ArrowDown'] || keys['s'] || t.down) { tryMove(0, 1); moveTimer = 0; }
        else if (keys['ArrowLeft'] || keys['a'] || t.left) { tryMove(-1, 0); moveTimer = 0; }
        else if (keys['ArrowRight'] || keys['d'] || t.right) { tryMove(1, 0); moveTimer = 0; }
      }
      for (let i = 1; i <= 5; i++) {
        if (consumeKey(String(i)) || t.items[i - 1]) {
          t.items[i - 1] = false;
          const item = player.useItem(i - 1);
          if (item && item.use) {
            UI.showMessage(item.use(player), 1500);
            UI.sfx_item();
            UI.updateHUD(player);
          }
        }
      }
      if (consumeKey('q')) saveGame();
      break;
    }
    case SCENE.BATTLE:
      if (battle) battle.update();
      break;

    case SCENE.ITEM_SWAP:
      if (consumeKey('ArrowUp') || consumeKey('w')) {
        swapState.selectedSlot = Math.max(0, swapState.selectedSlot - 1);
        updateSwapSelection();
      }
      if (consumeKey('ArrowDown') || consumeKey('s')) {
        swapState.selectedSlot = Math.min(MAX_ITEMS, swapState.selectedSlot + 1);
        updateSwapSelection();
      }
      if (consumeKey('Enter') || consumeKey(' ')) {
        if (swapState.selectedSlot < MAX_ITEMS) {
          const old = player.items[swapState.selectedSlot];
          player.items[swapState.selectedSlot] = swapState.newItem;
          UI.showMessage(`${old.name} → ${swapState.newItem.name}`, 2000);
        } else {
          UI.showMessage(`${swapState.newItem.name} を捨てた`, 1500);
        }
        UI.sfx_item();
        UI.updateHUD(player);
        closeSwapModal();
      }
      break;

    case SCENE.GAME_OVER:
    case SCENE.GAME_CLEAR:
      if (consumeKey('Enter') || consumeKey(' ')) {
        enterTitle();
        UI.clearMessage();
      }
      break;
  }
  keysJustPressed = {};
}

// ===== DRAW =====
function draw() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  switch (scene) {
    case SCENE.TITLE:
      // Canvas is blank, DOM overlay shows title
      ctx.fillStyle = '#06060a';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      break;
    case SCENE.DUNGEON:
      dungeonRenderer.draw(dungeonData, player, player.floor);
      UI.drawFlash(ctx);
      break;
    case SCENE.BATTLE:
      if (battle) battle.draw();
      break;
    case SCENE.ITEM_SWAP:
      if (dungeonData) dungeonRenderer.draw(dungeonData, player, player.floor);
      break;
    case SCENE.GAME_OVER:
    case SCENE.GAME_CLEAR:
      ctx.fillStyle = '#06060a';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      break;
  }
}

function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }

// Start with title
enterTitle();
gameLoop();
