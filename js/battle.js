import { CANVAS_W, CANVAS_H, PAL, PLAYER_SPEED, ENEMY_BULLET_SPEED, AMMO_PER_STAGE, AMMO_PICKUP_AMOUNT, TIME_LIMIT_PER_STAGE } from './constants.js';
import { drawSprite, drawSpriteFlash } from './sprites.js';
import * as SPR from './sprites.js';
import { createFormation } from './enemies.js';
import { rollDrop } from './items.js';
import { drawFlash, triggerFlash, drawLevelUp, triggerLevelUp } from './ui.js';
import * as UI from './ui.js';
import { getTouchState } from './touch.js';

export class Battle {
  constructor(ctx, player, floor, onEnd) {
    this.ctx = ctx;
    this.player = player;
    this.floor = floor;
    this.onEnd = onEnd;

    this.shipX = CANVAS_W / 2 - 5;
    this.shipY = CANVAS_H - 18;
    this.shipW = 10;
    this.shipH = 10;

    this.ammo = AMMO_PER_STAGE[floor] || 25;
    this.maxAmmo = this.ammo;

    // Time limit
    this.timeLimit = TIME_LIMIT_PER_STAGE[floor] || 60;
    this.startTime = Date.now();

    this.pickups = [];
    this.playerBullets = [];
    this.enemyBullets = [];
    this.bulletCooldown = 0;

    this.enemies = createFormation(floor);
    for (const e of this.enemies) {
      if (e.isBoss) { e.phase = 3; e.phaseHp = e.maxHp / 3; }
    }

    this.globalTimer = 0;
    this.shakeX = 0; this.shakeY = 0; this.shakeIntensity = 0;
    this.slowMoFrames = 0; // slow motion on big kills
    this.active = true; this.won = false;
    this.drops = []; this.endTimer = 0;
    this.damageNumbers = []; this.particles = [];
    this.explosions = []; // big ring explosions

    this.stars = [];
    for (let i = 0; i < 40; i++) {
      this.stars.push({ x: Math.random() * CANVAS_W, y: Math.random() * CANVAS_H, speed: 0.1 + Math.random() * 0.3, brightness: Math.floor(Math.random() * 3) + 1 });
    }

    this.keys = {};
    this._onKeyDown = e => { this.keys[e.key] = true; };
    this._onKeyUp = e => { this.keys[e.key] = false; };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);

    // Start battle BGM
    UI.startBGM(floor === 5 ? 'boss' : 'battle');
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    UI.stopBGM();
  }

  shake(n) { this.shakeIntensity = Math.max(this.shakeIntensity, n); }

  spawnParticles(x, y, count, color, speed = 2) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * speed;
      this.particles.push({ x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, life: 15 + Math.random() * 25, color, size: 1 });
    }
  }

  // Big sparkle burst for kills
  spawnKillExplosion(x, y, colors, count = 20, speed = 3) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 0.5 + Math.random() * speed;
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push({ x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, life: 20 + Math.random() * 30, color, size: Math.random() > 0.5 ? 2 : 1 });
    }
    // Expanding ring
    this.explosions.push({ x, y, radius: 2, maxRadius: 20 + count, life: 20, color: colors[0] });
  }

  spawnPickup(type) {
    // Spawn from random edge, roam freely like enemies
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    const spd = 0.3 + Math.random() * 0.4;
    const angle = Math.random() * Math.PI * 2;
    if (edge === 0) { x = -6; y = 30 + Math.random() * (CANVAS_H - 50); }
    else if (edge === 1) { x = CANVAS_W + 6; y = 30 + Math.random() * (CANVAS_H - 50); }
    else if (edge === 2) { x = 10 + Math.random() * (CANVAS_W - 20); y = -6; }
    else { x = 10 + Math.random() * (CANVAS_W - 20); y = CANVAS_H + 6; }
    // Aim roughly toward center
    const tx = CANVAS_W / 2 + (Math.random() - 0.5) * 100;
    const ty = CANVAS_H / 2 + (Math.random() - 0.5) * 40;
    const dx = tx - x, dy = ty - y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    this.pickups.push({ type, x, y, vx: (dx / dist) * spd, vy: (dy / dist) * spd, life: 350, _entered: false });
  }

  getRemainingTime() {
    return Math.max(0, this.timeLimit - Math.floor((Date.now() - this.startTime) / 1000));
  }

  update() {
    this.globalTimer++;

    // Slow-mo effect (only slow rendering, don't skip logic)
    if (this.slowMoFrames > 0) {
      this.slowMoFrames--;
    }

    if (!this.active) {
      this.endTimer++;
      this.updateParticles(); this.updateStars(); this.updateExplosions();
      if (this.endTimer > 90) { this.destroy(); this.onEnd(this.won, this.drops); }
      return;
    }

    // Time limit check
    const remaining = this.getRemainingTime();
    if (remaining <= 10 && remaining > 0 && this.globalTimer % 60 === 0) UI.sfx_timeWarning();
    if (remaining <= 0) {
      this.player.hp = 0;
      this.active = false; this.won = false;
      UI.updateHUD(this.player);
      UI.showMessage('TIME UP! やられてしまった...', 0);
      return;
    }

    const rapidFire = this.player._rapidFire && Date.now() < this.player._rapidFireEnd;
    if (!rapidFire && this.player._rapidFire) this.player._rapidFire = false;
    const bulletSpeed = this.player.bulletSpeed * (rapidFire ? 2 : 1);
    const shootCooldownMax = rapidFire ? 5 : 10;

    // Movement (keyboard + touch)
    const spd = PLAYER_SPEED;
    const t = getTouchState();
    if (this.keys['ArrowLeft'] || this.keys['a'] || t.left) this.shipX = Math.max(0, this.shipX - spd);
    if (this.keys['ArrowRight'] || this.keys['d'] || t.right) this.shipX = Math.min(CANVAS_W - this.shipW, this.shipX + spd);
    if (this.keys['ArrowUp'] || this.keys['w'] || t.up) this.shipY = Math.max(10, this.shipY - spd);
    if (this.keys['ArrowDown'] || this.keys['s'] || t.down) this.shipY = Math.min(CANVAS_H - this.shipH - 2, this.shipY + spd);

    // Shoot
    if (this.bulletCooldown > 0) this.bulletCooldown--;
    if ((this.keys[' '] || t.shoot) && this.bulletCooldown <= 0 && this.ammo > 0) {
      this.playerBullets.push({ x: this.shipX + this.shipW / 2 - 0.5, y: this.shipY - 4, speed: bulletSpeed, trail: [] });
      this.ammo--;
      this.bulletCooldown = shootCooldownMax;
      UI.sfx_shoot();
    }

    // Items
    for (let i = 1; i <= 5; i++) {
      if (this.keys[String(i)]) {
        this.keys[String(i)] = false;
        const item = this.player.useItem(i - 1);
        if (item && item.use) { UI.showMessage(item.use(this.player), 1500); UI.sfx_item(); UI.updateHUD(this.player); }
      }
    }

    // Spawn pickups - ammo every 90 frames (first at frame 30), heart every 200
    if (this.globalTimer >= 30 && this.globalTimer % 90 === 30) this.spawnPickup('ammo');
    if (this.globalTimer >= 60 && this.globalTimer % 200 === 60 && this.player.hp < this.player.maxHp * 0.7) this.spawnPickup('heart');

    // Update pickups
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.x += p.vx; p.y += p.vy; p.life--;
      // Let pickup enter screen first, then bounce freely everywhere
      if (p.x > 4 && p.x < CANVAS_W - 4 && p.y > 14 && p.y < CANVAS_H - 4) p._entered = true;
      if (p._entered) {
        if (p.x < 4 || p.x > CANVAS_W - 4) { p.vx *= -1; p.x = Math.max(4, Math.min(CANVAS_W - 4, p.x)); }
        if (p.y < 14 || p.y > CANVAS_H - 4) { p.vy *= -1; p.y = Math.max(14, Math.min(CANVAS_H - 4, p.y)); }
      }
      if (p.life <= 0) { this.pickups.splice(i, 1); continue; }

      if (Math.abs(p.x - this.shipX - this.shipW / 2) < 14 && Math.abs(p.y - this.shipY - this.shipH / 2) < 14) {
        if (p.type === 'ammo') {
          this.ammo = Math.min(this.maxAmmo, this.ammo + AMMO_PICKUP_AMOUNT);
          this.damageNumbers.push({ text: `+${AMMO_PICKUP_AMOUNT}`, x: this.shipX + 5, y: this.shipY - 10, life: 30, color: PAL.CYAN });
          UI.sfx_ammoPickup();
        } else {
          const heal = Math.floor(this.player.maxHp * 0.2);
          this.player.heal(heal);
          UI.updateHUD(this.player);
          this.damageNumbers.push({ text: `+${heal}HP`, x: this.shipX + 5, y: this.shipY - 10, life: 30, color: PAL.GREEN });
          UI.sfx_heal();
        }
        this.spawnParticles(p.x, p.y, 6, p.type === 'ammo' ? PAL.CYAN : PAL.RED, 1.5);
        this.pickups.splice(i, 1);
      }
    }

    // Player bullets
    for (let i = this.playerBullets.length - 1; i >= 0; i--) {
      const b = this.playerBullets[i];
      b.trail.push({ x: b.x, y: b.y }); if (b.trail.length > 3) b.trail.shift();
      b.y -= b.speed;
      if (b.y < -4) { this.playerBullets.splice(i, 1); continue; }

      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        const ew = enemy.sprite[0].length, eh = enemy.sprite.length;
        if (b.x >= enemy.x - 1 && b.x <= enemy.x + ew + 1 && b.y >= enemy.y && b.y <= enemy.y + eh) {
          const dmg = Math.max(1, this.player.atk);
          enemy.hp -= dmg;
          enemy.hitFlash = 4;
          this.playerBullets.splice(i, 1);
          UI.sfx_hit();
          this.damageNumbers.push({ text: String(dmg), x: enemy.x + ew / 2, y: enemy.y, life: 25, color: PAL.YELLOW });
          this.spawnParticles(b.x, b.y, 4, PAL.YELLOW, 1.2);

          // Boss phase
          if (enemy.isBoss && enemy.hp > 0) {
            const newPhase = Math.ceil(enemy.hp / enemy.phaseHp);
            if (newPhase < enemy.phase) {
              enemy.phase = newPhase;
              this.shake(10);
              triggerFlash(PAL.ORANGE, 0.6);
              UI.sfx_enemyDie();
              this.spawnKillExplosion(enemy.x + ew / 2, enemy.y + eh / 2, [PAL.ORANGE, PAL.RED, PAL.YELLOW], 25, 3.5);
              enemy.speed += 0.12;
              enemy.shootChance += 0.012;
              this.slowMoFrames = 6;
              UI.sfx_bossPhase();
              this.damageNumbers.push({ text: `PHASE ${enemy.phase}!`, x: 120, y: 25, life: 60, color: PAL.RED });
            }
          }

          if (enemy.hp <= 0) {
            enemy.alive = false;
            UI.sfx_enemyDie();

            if (enemy.isBoss) {
              // MASSIVE boss death
              this.shake(15);
              triggerFlash(PAL.WHITE, 0.8);
              UI.sfx_bossDie();
              this.spawnKillExplosion(enemy.x + ew / 2, enemy.y + eh / 2, [PAL.GOLD, PAL.ORANGE, PAL.RED, PAL.WHITE, PAL.YELLOW], 60, 5);
              this.slowMoFrames = 12;
              // Secondary explosions
              for (let e = 0; e < 4; e++) {
                setTimeout(() => {
                  this.spawnKillExplosion(
                    enemy.x + ew / 2 + (Math.random() - 0.5) * 20,
                    enemy.y + eh / 2 + (Math.random() - 0.5) * 10,
                    [PAL.ORANGE, PAL.RED], 15, 3
                  );
                }, e * 100);
              }
            } else {
              // Normal enemy kill - colorful burst!
              this.shake(5);
              triggerFlash(PAL.WHITE, 0.15);
              const killColors = [PAL.ORANGE, PAL.YELLOW, PAL.RED, PAL.WHITE];
              this.spawnKillExplosion(enemy.x + ew / 2, enemy.y + eh / 2, killColors, 18, 2.8);
              // Slight slow-mo on last enemy or every 3rd kill
              const alive = this.enemies.filter(e => e.alive).length;
              if (alive === 0 || alive % 3 === 0) this.slowMoFrames = 3;
            }

            const leveled = this.player.addExp(enemy.exp);
            if (leveled) { triggerLevelUp(); UI.sfx_levelUp(); UI.showMessage(`レベルアップ！ Lv.${this.player.lv}`, 2000); }
            if (Math.random() < enemy.dropChance) this.drops.push(rollDrop(this.floor));
            UI.updateHUD(this.player);
          }
          break;
        }
      }
    }

    // Enemy movement
    const aliveEnemies = this.enemies.filter(e => e.alive);
    for (const e of aliveEnemies) {
      e.x += e.speed * e.speedMult * e.dir;
      e.y += Math.sin(this.globalTimer * 0.04 + e.sineOffset) * e.sineAmp;
      const ew = e.sprite[0].length;
      if (e.x <= 1) { e.dir = 1; e.y += 1.5; }
      if (e.x + ew >= CANVAS_W - 1) { e.dir = -1; e.y += 1.5; }
      if (e.hitFlash > 0) e.hitFlash--;

      if (e.shootChance > 0 && Math.random() < e.shootChance) {
        const eh = e.sprite.length;
        const dx = (this.shipX + this.shipW / 2) - (e.x + ew / 2);
        const dy = (this.shipY) - (e.y + eh);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const bSpeed = ENEMY_BULLET_SPEED + this.floor * 0.15;

        if (e.isBoss) {
          const spread = e.phase <= 1 ? 5 : e.phase <= 2 ? 3 : 3;
          const arc = e.phase <= 1 ? 0.8 : 0.4;
          for (let a = 0; a < spread; a++) {
            const angle = -arc / 2 + (arc / (spread - 1 || 1)) * a;
            this.enemyBullets.push({ x: e.x + ew / 2, y: e.y + eh, vx: (dx / dist) * bSpeed * 0.4 + Math.sin(angle) * 0.7, vy: bSpeed, atk: e.atk });
          }
        } else {
          this.enemyBullets.push({ x: e.x + ew / 2, y: e.y + eh, vx: (dx / dist) * bSpeed * 0.35 + (Math.random() - 0.5) * 0.5, vy: bSpeed, atk: e.atk });
        }
      }

      // Enemy reaches bottom of screen = game over (not player position)
      if (e.y + e.sprite.length >= CANVAS_H - 2) {
        this.player.hp = 0; this.active = false; this.won = false;
        UI.updateHUD(this.player); UI.showMessage('敵が突破した！', 0); return;
      }
    }

    // Boss barrage + minion spawn
    if (this.floor === 5) {
      for (const e of aliveEnemies) {
        if (!e.isBoss) continue;
        const interval = e.phase <= 1 ? 90 : e.phase <= 2 ? 120 : 150;
        if (this.globalTimer % interval === 0) {
          const ew = e.sprite[0].length, eh = e.sprite.length;
          const n = e.phase <= 1 ? 16 : e.phase <= 2 ? 12 : 8;
          for (let i = 0; i < n; i++) {
            const angle = (Math.PI * 2 / n) * i + this.globalTimer * 0.02;
            this.enemyBullets.push({ x: e.x + ew / 2, y: e.y + eh / 2, vx: Math.cos(angle) * 0.7, vy: Math.abs(Math.sin(angle)) * 0.8 + 0.3, atk: e.atk });
          }
          this.shake(4);
        }
        // Spawn minions every 400 frames in phase 2 and 1
        if (e.phase <= 2 && this.globalTimer % 400 === 200) {
          // Add small fast enemies as minions
          for (let m = 0; m < 2; m++) {
            const mx = 20 + Math.random() * (CANVAS_W - 40);
            const minion = {
              type: 'minion', name: '手下', sprite: SPR.BAT,
              hp: 3, maxHp: 3, atk: 10, speed: 0.6,
              shootChance: 0.01, exp: 5, dropChance: 0,
              isBoss: false, x: mx, y: -8, alive: true,
              dir: Math.random() > 0.5 ? 1 : -1,
              speedMult: 1 + Math.random() * 0.8,
              sineOffset: Math.random() * Math.PI * 2,
              sineAmp: 0.15 + Math.random() * 0.2,
              hitFlash: 0,
            };
            this.enemies.push(minion);
          }
        }
      }
    }

    // Enemy bullets
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      b.x += (b.vx || 0); b.y += (b.vy || ENEMY_BULLET_SPEED);
      if (b.y > CANVAS_H + 5 || b.y < -5 || b.x < -5 || b.x > CANVAS_W + 5) { this.enemyBullets.splice(i, 1); continue; }

      if (b.x >= this.shipX - 1 && b.x <= this.shipX + this.shipW + 1 &&
          b.y >= this.shipY - 1 && b.y <= this.shipY + this.shipH + 1) {
        const dmg = this.player.takeDamage(b.atk);
        this.enemyBullets.splice(i, 1);
        triggerFlash(PAL.RED, 0.4); this.shake(5);
        UI.sfx_playerHit(); UI.updateHUD(this.player);
        this.damageNumbers.push({ text: `-${dmg}`, x: this.shipX + this.shipW / 2, y: this.shipY - 5, life: 30, color: PAL.RED });
        this.spawnParticles(this.shipX + this.shipW / 2, this.shipY, 8, PAL.RED, 1.8);
        if (this.player.isDead()) {
          this.active = false; this.won = false;
          this.spawnKillExplosion(this.shipX + this.shipW / 2, this.shipY + this.shipH / 2, [PAL.ORANGE, PAL.RED], 25, 3);
          UI.sfx_gameOver(); UI.showMessage('やられてしまった...', 0); return;
        }
      }
    }

    // Win
    if (aliveEnemies.length === 0) {
      this.active = false; this.won = true;
      this.shake(8); triggerFlash(PAL.GOLD, 0.5);
      UI.sfx_victory();
      UI.showMessage('敵を全滅させた！', 0);
    }

    this.damageNumbers = this.damageNumbers.filter(d => { d.y -= 0.5; d.life--; return d.life > 0; });
    this.updateParticles(); this.updateStars(); this.updateShake(); this.updateExplosions();
  }

  updateParticles() {
    this.particles = this.particles.filter(p => {
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.02;
      p.vx *= 0.98;
      p.life--;
      return p.life > 0;
    });
  }
  updateExplosions() {
    this.explosions = this.explosions.filter(e => {
      e.radius += (e.maxRadius - e.radius) * 0.15;
      e.life--;
      return e.life > 0;
    });
  }
  updateStars() { for (const s of this.stars) { s.y += s.speed; if (s.y > CANVAS_H) { s.y = 0; s.x = Math.random() * CANVAS_W; } } }
  updateShake() {
    if (this.shakeIntensity > 0) {
      this.shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= 0.85;
      if (this.shakeIntensity < 0.3) this.shakeIntensity = 0;
    } else { this.shakeX = 0; this.shakeY = 0; }
  }

  draw() {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);

    ctx.fillStyle = '#06060e';
    ctx.fillRect(-5, -5, CANVAS_W + 10, CANVAS_H + 10);

    for (const s of this.stars) {
      ctx.fillStyle = s.brightness === 1 ? '#222' : s.brightness === 2 ? '#444' : '#666';
      ctx.fillRect(Math.floor(s.x), Math.floor(s.y), 1, 1);
    }

    // === HUD in battle (top bar) ===
    // Time remaining
    const remaining = this.getRemainingTime();
    const timeColor = remaining > 15 ? PAL.WHITE : remaining > 5 ? PAL.YELLOW : PAL.RED;
    ctx.fillStyle = timeColor;
    ctx.font = '6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${remaining}s`, CANVAS_W / 2, 8);

    // Stage
    ctx.fillStyle = PAL.DARK_GRAY;
    ctx.font = '5px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`STAGE ${this.floor}`, 2, 7);

    // Ammo (right side, big clear text)
    ctx.textAlign = 'right';
    const ammoPct = this.ammo / this.maxAmmo;
    ctx.fillStyle = ammoPct > 0.4 ? PAL.CYAN : ammoPct > 0.15 ? PAL.YELLOW : PAL.RED;
    ctx.font = '6px monospace';
    ctx.fillText(`${this.ammo}`, CANVAS_W - 3, 8);
    // Ammo label
    ctx.fillStyle = PAL.DARK_GRAY;
    ctx.font = '4px monospace';
    ctx.fillText('AMMO', CANVAS_W - 14, 8);
    // Ammo dots
    const dotX = CANVAS_W - 3;
    for (let d = 0; d < Math.min(this.ammo, 20); d++) {
      ctx.fillStyle = ammoPct > 0.4 ? PAL.CYAN : ammoPct > 0.15 ? PAL.YELLOW : PAL.RED;
      ctx.fillRect(dotX - d * 2, 10, 1, 2);
    }
    ctx.textAlign = 'left';

    // Enemies
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.isBoss && e.phase < 3) {
        const sprite = e.sprite;
        for (let row = 0; row < sprite.length; row++) {
          for (let col = 0; col < sprite[row].length; col++) {
            const color = sprite[row][col];
            if (!color) continue;
            const skip = e.phase <= 1 ? 0.25 : e.phase <= 2 ? 0.12 : 0;
            if (Math.random() < skip) continue;
            ctx.fillStyle = e.hitFlash > 0 ? PAL.WHITE : (e.phase <= 1 ? (Math.random() > 0.3 ? color : PAL.DARK_RED) : color);
            ctx.fillRect(Math.floor(e.x + col), Math.floor(e.y + row), 1, 1);
          }
        }
      } else {
        if (e.hitFlash > 0) drawSpriteFlash(ctx, e.sprite, e.x, e.y, 1);
        else drawSprite(ctx, e.sprite, e.x, e.y, 1);
      }

      if (e.isBoss) {
        const barW = 60, barX = 120 - barW / 2;
        const hpPct = e.hp / e.maxHp;
        ctx.fillStyle = '#222'; ctx.fillRect(barX, 15, barW, 3);
        ctx.fillStyle = hpPct > 0.5 ? PAL.GREEN : hpPct > 0.25 ? PAL.YELLOW : PAL.RED;
        ctx.fillRect(barX, 15, barW * hpPct, 3);
        ctx.fillStyle = '#fff';
        ctx.fillRect(barX + barW / 3, 15, 1, 3);
        ctx.fillRect(barX + barW * 2 / 3, 15, 1, 3);
        ctx.fillStyle = PAL.WHITE;
        ctx.font = '4px monospace'; ctx.textAlign = 'center';
        ctx.fillText(`${e.name} P${e.phase}/3`, 120, 14);
        ctx.textAlign = 'left';
      }
    }

    // Explosion rings
    for (const e of this.explosions) {
      ctx.strokeStyle = e.color;
      ctx.globalAlpha = Math.min(1, e.life / 10);
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Pickups
    for (const p of this.pickups) {
      if (this.globalTimer % 10 < 8) {
        if (p.type === 'ammo') {
          ctx.fillStyle = PAL.CYAN;
          ctx.fillRect(Math.floor(p.x) - 2, Math.floor(p.y) - 2, 5, 5);
          ctx.fillStyle = PAL.WHITE;
          ctx.fillRect(Math.floor(p.x) - 1, Math.floor(p.y) - 1, 3, 3);
          ctx.fillStyle = PAL.CYAN;
          ctx.fillRect(Math.floor(p.x), Math.floor(p.y) - 1, 1, 3);
          ctx.fillRect(Math.floor(p.x) - 1, Math.floor(p.y), 3, 1);
        } else {
          // Heart shape
          const hx = Math.floor(p.x), hy = Math.floor(p.y);
          ctx.fillStyle = PAL.RED;
          ctx.fillRect(hx - 2, hy - 1, 2, 2);
          ctx.fillRect(hx + 1, hy - 1, 2, 2);
          ctx.fillRect(hx - 3, hy, 7, 2);
          ctx.fillRect(hx - 2, hy + 2, 5, 1);
          ctx.fillRect(hx - 1, hy + 3, 3, 1);
          ctx.fillRect(hx, hy + 4, 1, 1);
        }
      }
    }

    // Player
    drawSprite(ctx, SPR.HERO_SHIP, this.shipX, this.shipY, 1);

    // Bullets
    for (const b of this.playerBullets) {
      for (let t = 0; t < b.trail.length; t++) {
        ctx.fillStyle = PAL.YELLOW; ctx.globalAlpha = 0.2 + t * 0.15;
        ctx.fillRect(Math.floor(b.trail[t].x), Math.floor(b.trail[t].y), 1, 2);
      }
      ctx.globalAlpha = 1;
      drawSprite(ctx, SPR.PLAYER_BULLET, b.x, b.y, 1);
    }
    for (const b of this.enemyBullets) drawSprite(ctx, SPR.ENEMY_BULLET, b.x, b.y, 1);

    // Particles (varying sizes for juiciness)
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.min(1, p.life / 12);
      ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size || 1, p.size || 1);
    }
    ctx.globalAlpha = 1;

    // Damage numbers
    for (const d of this.damageNumbers) {
      ctx.globalAlpha = Math.min(1, d.life / 12);
      ctx.fillStyle = d.color; ctx.font = '5px monospace';
      ctx.fillText(d.text, d.x - 4, d.y);
      ctx.globalAlpha = 1;
    }

    // No ammo warning
    if (this.ammo === 0 && this.active && this.globalTimer % 20 < 10) {
      ctx.fillStyle = PAL.RED; ctx.font = '6px monospace'; ctx.textAlign = 'center';
      ctx.fillText('NO AMMO!', CANVAS_W / 2, this.shipY + this.shipH + 8);
      ctx.textAlign = 'left';
    }

    // Time warning flash
    if (remaining <= 10 && remaining > 0 && this.globalTimer % 30 < 5) {
      ctx.fillStyle = PAL.RED; ctx.globalAlpha = 0.15;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.globalAlpha = 1;
    }

    drawFlash(ctx); drawLevelUp(ctx);
    ctx.restore();
  }
}
