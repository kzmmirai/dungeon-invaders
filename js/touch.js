// ===== TOUCH CONTROLS FOR MOBILE =====
// Analog stick (left) + Action buttons (right)

let touchState = {
  left: false, right: false, up: false, down: false,
  shoot: false, items: [false, false, false, false, false],
};

let dpadCenter = null;
let dpadTouchId = null;

const DPAD_RADIUS = 50;
const DEADZONE = 8; // small deadzone for responsive feel

export function getTouchState() { return touchState; }

export function initTouch(canvas) {
  const container = document.getElementById('game-container');

  const overlay = document.createElement('div');
  overlay.id = 'touch-overlay';
  overlay.innerHTML = `
    <div id="touch-dpad">
      <div class="dpad-bg"></div>
      <div id="dpad-knob"></div>
    </div>
    <div id="touch-buttons">
      <button id="btn-shoot" class="touch-btn shoot-btn">FIRE</button>
      <div class="item-buttons">
        <button class="touch-btn item-btn" data-item="1">1</button>
        <button class="touch-btn item-btn" data-item="2">2</button>
        <button class="touch-btn item-btn" data-item="3">3</button>
        <button class="touch-btn item-btn" data-item="4">4</button>
        <button class="touch-btn item-btn" data-item="5">5</button>
      </div>
    </div>
  `;
  container.appendChild(overlay);

  const dpad = document.getElementById('touch-dpad');
  const knob = document.getElementById('dpad-knob');
  const shootBtn = document.getElementById('btn-shoot');

  // D-pad: use the entire left half of screen as touch area
  document.addEventListener('touchstart', e => {
    for (const touch of e.changedTouches) {
      // Left half = dpad
      if (touch.clientX < window.innerWidth * 0.4 && dpadTouchId === null) {
        e.preventDefault();
        dpadTouchId = touch.identifier;
        dpadCenter = { x: touch.clientX, y: touch.clientY };
        // Show dpad at touch position
        dpad.style.left = (touch.clientX - 60) + 'px';
        dpad.style.top = (touch.clientY - 60) + 'px';
        dpad.style.opacity = '1';
        updateDpad(touch);
      }
    }
  }, { passive: false });

  document.addEventListener('touchmove', e => {
    for (const touch of e.changedTouches) {
      if (touch.identifier === dpadTouchId) {
        e.preventDefault();
        updateDpad(touch);
      }
    }
  }, { passive: false });

  document.addEventListener('touchend', e => {
    for (const touch of e.changedTouches) {
      if (touch.identifier === dpadTouchId) {
        dpadTouchId = null;
        touchState.left = touchState.right = touchState.up = touchState.down = false;
        knob.style.transform = 'translate(-50%, -50%)';
        dpad.style.opacity = '0.5';
      }
    }
  });

  document.addEventListener('touchcancel', e => {
    for (const touch of e.changedTouches) {
      if (touch.identifier === dpadTouchId) {
        dpadTouchId = null;
        touchState.left = touchState.right = touchState.up = touchState.down = false;
        knob.style.transform = 'translate(-50%, -50%)';
      }
    }
  });

  function updateDpad(touch) {
    if (!dpadCenter) return;
    const dx = touch.clientX - dpadCenter.x;
    const dy = touch.clientY - dpadCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampDist = Math.min(dist, DPAD_RADIUS);
    const angle = Math.atan2(dy, dx);

    const kx = Math.cos(angle) * clampDist;
    const ky = Math.sin(angle) * clampDist;
    knob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;

    // Use separate thresholds - makes diagonal movement natural
    touchState.left = dx < -DEADZONE;
    touchState.right = dx > DEADZONE;
    touchState.up = dy < -DEADZONE;
    touchState.down = dy > DEADZONE;
  }

  // Shoot button - support held press
  shootBtn.addEventListener('touchstart', e => {
    e.preventDefault();
    touchState.shoot = true;
  }, { passive: false });
  shootBtn.addEventListener('touchend', () => { touchState.shoot = false; });
  shootBtn.addEventListener('touchcancel', () => { touchState.shoot = false; });

  // Item buttons 1-5
  overlay.querySelectorAll('.item-btn').forEach(btn => {
    const idx = parseInt(btn.dataset.item) - 1;
    btn.addEventListener('touchstart', e => {
      e.preventDefault();
      touchState.items[idx] = true;
    }, { passive: false });
    btn.addEventListener('touchend', () => { touchState.items[idx] = false; });
    btn.addEventListener('touchcancel', () => { touchState.items[idx] = false; });
  });

  // Tap canvas to start (title/gameover)
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' })), 100);
  }, { passive: false });
}

export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
