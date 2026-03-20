import { PAL } from './constants.js';

const $ = id => document.getElementById(id);

export function updateHUD(player) {
  $('hud-floor').textContent = `STAGE ${player.floor}`;
  $('hud-lv').textContent = `Lv.${player.lv}`;
  $('hud-exp').textContent = `EXP ${player.exp}/${player.expToNext()}`;

  const hpPct = Math.max(0, player.hp / player.maxHp * 100);
  $('hp-bar').style.width = hpPct + '%';
  $('hp-bar').style.background = hpPct > 50 ? '#44cc44' : hpPct > 25 ? '#cccc44' : '#cc4444';
  $('hp-text').textContent = `HP ${player.hp}/${player.maxHp}`;

  for (let i = 0; i < 5; i++) {
    const slot = document.querySelector(`.item-slot[data-slot="${i + 1}"]`);
    if (player.items[i]) {
      slot.textContent = `${i + 1}: ${player.items[i].name}`;
      slot.classList.add('has-item');
    } else {
      slot.textContent = `${i + 1}: ---`;
      slot.classList.remove('has-item');
    }
  }
}

let messageTimer = null;
export function showMessage(text, duration = 2000) {
  const box = $('message-box');
  box.textContent = text;
  if (messageTimer) clearTimeout(messageTimer);
  if (duration > 0) messageTimer = setTimeout(() => { box.textContent = ''; }, duration);
}

export function clearMessage() { $('message-box').textContent = ''; }

// Screen flash
let flashAlpha = 0;
let flashColor = PAL.WHITE;
export function triggerFlash(color = PAL.WHITE, intensity = 0.5) { flashColor = color; flashAlpha = intensity; }
export function drawFlash(ctx) {
  if (flashAlpha > 0) {
    ctx.fillStyle = flashColor; ctx.globalAlpha = flashAlpha;
    ctx.fillRect(0, 0, 240, 160); ctx.globalAlpha = 1;
    flashAlpha = Math.max(0, flashAlpha - 0.02);
  }
}

// Level up effect
let lvUpTimer = 0;
export function triggerLevelUp() { lvUpTimer = 90; }
export function drawLevelUp(ctx) {
  if (lvUpTimer > 0) {
    const alpha = Math.min(1, lvUpTimer / 30);
    ctx.globalAlpha = alpha; ctx.fillStyle = PAL.GOLD;
    ctx.font = '8px monospace'; ctx.textAlign = 'center';
    ctx.fillText('LEVEL UP!', 120, 80 - (90 - lvUpTimer) * 0.3);
    ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    lvUpTimer--;
  }
}

// ===== AUDIO ENGINE =====
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playSound(freq = 440, duration = 0.08, type = 'square', volume = 0.15) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}

// Multi-tone sound for richer effects
function playChord(notes, duration = 0.15, type = 'sine', volume = 0.08) {
  for (const freq of notes) playSound(freq, duration, type, volume);
}

// Sweep sound (rising or falling pitch)
function playSweep(startFreq, endFreq, duration = 0.2, type = 'square', volume = 0.12) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(endFreq, ctx.currentTime + duration);
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}

// Noise burst for explosions
function playNoise(duration = 0.1, volume = 0.1) {
  try {
    const ctx = getAudioCtx();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(gain); gain.connect(ctx.destination);
    source.start();
  } catch (e) {}
}

// ===== SOUND EFFECTS =====
export function sfx_shoot() {
  playSweep(1200, 600, 0.06, 'square', 0.08);
}

export function sfx_hit() {
  playSound(200, 0.06, 'sawtooth', 0.1);
  playNoise(0.04, 0.06);
}

export function sfx_enemyDie() {
  // Satisfying explosion: noise + falling sweep + chord
  playNoise(0.15, 0.12);
  playSweep(400, 80, 0.2, 'sawtooth', 0.1);
  playSound(150, 0.2, 'square', 0.06);
}

export function sfx_bossDie() {
  // Massive explosion
  playNoise(0.4, 0.18);
  playSweep(600, 40, 0.5, 'sawtooth', 0.12);
  setTimeout(() => { playNoise(0.3, 0.15); playSweep(300, 60, 0.4, 'square', 0.1); }, 150);
  setTimeout(() => { playChord([262, 330, 392, 523], 0.6, 'sine', 0.08); }, 400);
}

export function sfx_bossPhase() {
  playNoise(0.2, 0.15);
  playSweep(200, 600, 0.3, 'sawtooth', 0.1);
  playSound(100, 0.3, 'square', 0.08);
}

export function sfx_playerHit() {
  playSweep(300, 80, 0.15, 'sawtooth', 0.15);
  playNoise(0.08, 0.1);
}

export function sfx_levelUp() {
  // Triumphant arpeggio
  playSound(523, 0.15, 'sine', 0.12);
  setTimeout(() => playSound(659, 0.15, 'sine', 0.12), 80);
  setTimeout(() => playSound(784, 0.15, 'sine', 0.12), 160);
  setTimeout(() => playChord([523, 659, 784, 1047], 0.4, 'sine', 0.08), 240);
}

export function sfx_item() {
  // Pickup sparkle
  playSweep(400, 800, 0.1, 'sine', 0.1);
  setTimeout(() => playSound(1000, 0.08, 'sine', 0.08), 60);
}

export function sfx_heal() {
  // Gentle healing chime
  playSound(523, 0.15, 'sine', 0.1);
  setTimeout(() => playSound(659, 0.12, 'sine', 0.1), 100);
  setTimeout(() => playSound(784, 0.2, 'sine', 0.12), 200);
  playSweep(300, 800, 0.4, 'sine', 0.04);
}

export function sfx_stairs() {
  // Mysterious descent
  playSweep(800, 200, 0.4, 'sine', 0.1);
  setTimeout(() => playSound(200, 0.3, 'sine', 0.08), 200);
}

export function sfx_ammoPickup() {
  playSweep(600, 1200, 0.08, 'square', 0.08);
  playSound(1200, 0.05, 'sine', 0.06);
}

export function sfx_timeWarning() {
  playSound(880, 0.1, 'square', 0.08);
  setTimeout(() => playSound(880, 0.1, 'square', 0.08), 150);
}

export function sfx_gameOver() {
  playSweep(400, 80, 0.5, 'sawtooth', 0.12);
  setTimeout(() => playSweep(200, 60, 0.5, 'sine', 0.1), 300);
  setTimeout(() => playSound(60, 0.8, 'sine', 0.08), 600);
}

export function sfx_victory() {
  const notes = [523, 587, 659, 784, 1047];
  notes.forEach((n, i) => setTimeout(() => playSound(n, 0.2, 'sine', 0.1), i * 100));
  setTimeout(() => playChord([523, 659, 784, 1047], 0.6, 'sine', 0.08), 500);
}

// ===== BGM ENGINE =====
let bgmInterval = null;
let bgmPlaying = false;
let bgmType = null;

const BGM_PATTERNS = {
  dungeon: {
    bpm: 80,
    bass: [130, 0, 130, 0, 146, 0, 130, 0, 110, 0, 110, 0, 130, 0, 146, 0],
    melody: [0, 0, 330, 0, 0, 0, 294, 0, 0, 0, 262, 0, 0, 0, 294, 0],
    vol: 0.04,
  },
  battle: {
    bpm: 140,
    bass: [110, 0, 110, 146, 0, 110, 0, 146, 130, 0, 130, 174, 0, 130, 0, 174],
    melody: [440, 0, 523, 0, 440, 0, 392, 0, 349, 0, 392, 0, 440, 0, 523, 0],
    vol: 0.04,
  },
  boss: {
    bpm: 160,
    bass: [98, 98, 0, 98, 130, 0, 98, 0, 98, 98, 0, 98, 146, 0, 130, 0],
    melody: [392, 0, 440, 523, 0, 440, 0, 523, 587, 0, 523, 440, 0, 523, 440, 0],
    vol: 0.05,
  },
};

let bgmStep = 0;

export function startBGM(type) {
  if (bgmPlaying && bgmType === type) return;
  stopBGM();
  bgmType = type;
  bgmPlaying = true;
  bgmStep = 0;

  const pattern = BGM_PATTERNS[type];
  if (!pattern) return;

  const stepMs = 60000 / pattern.bpm / 4;

  bgmInterval = setInterval(() => {
    if (!bgmPlaying) return;
    const bass = pattern.bass[bgmStep % pattern.bass.length];
    const melody = pattern.melody[bgmStep % pattern.melody.length];
    if (bass > 0) playSound(bass, stepMs / 1000 * 0.8, 'triangle', pattern.vol);
    if (melody > 0) playSound(melody, stepMs / 1000 * 0.6, 'sine', pattern.vol * 0.7);
    bgmStep++;
  }, stepMs);
}

export function stopBGM() {
  bgmPlaying = false;
  bgmType = null;
  if (bgmInterval) { clearInterval(bgmInterval); bgmInterval = null; }
}
