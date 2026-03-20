// ===== TOUCH CONTROLS FOR MOBILE =====
// Virtual D-pad (left side) + Action buttons (right side)

let touchState = {
  left: false, right: false, up: false, down: false,
  shoot: false, items: [false, false, false, false, false],
};

let dpadCenter = null;
let dpadTouchId = null;
let actionTouchId = null;

const DPAD_RADIUS = 40;
const DEADZONE = 10;

export function getTouchState() { return touchState; }

export function initTouch(canvas) {
  const container = document.getElementById('game-container');

  // Create touch overlay
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
      </div>
    </div>
  `;
  container.appendChild(overlay);

  const dpad = document.getElementById('touch-dpad');
  const knob = document.getElementById('dpad-knob');
  const shootBtn = document.getElementById('btn-shoot');

  // D-pad touch
  dpad.addEventListener('touchstart', e => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    dpadTouchId = touch.identifier;
    const rect = dpad.getBoundingClientRect();
    dpadCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    updateDpad(touch);
  }, { passive: false });

  dpad.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      if (touch.identifier === dpadTouchId) updateDpad(touch);
    }
  }, { passive: false });

  dpad.addEventListener('touchend', e => {
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

    // Move knob visually
    const kx = Math.cos(angle) * clampDist;
    const ky = Math.sin(angle) * clampDist;
    knob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;

    // Update state
    touchState.left = dx < -DEADZONE;
    touchState.right = dx > DEADZONE;
    touchState.up = dy < -DEADZONE;
    touchState.down = dy > DEADZONE;
  }

  // Shoot button
  shootBtn.addEventListener('touchstart', e => {
    e.preventDefault();
    touchState.shoot = true;
  }, { passive: false });
  shootBtn.addEventListener('touchend', e => {
    touchState.shoot = false;
  });

  // Item buttons
  overlay.querySelectorAll('.item-btn').forEach(btn => {
    const idx = parseInt(btn.dataset.item) - 1;
    btn.addEventListener('touchstart', e => {
      e.preventDefault();
      touchState.items[idx] = true;
    }, { passive: false });
    btn.addEventListener('touchend', () => {
      touchState.items[idx] = false;
    });
  });

  // Also add tap-to-start for title/gameover
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    // Simulate Enter key press for scene transitions
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' })), 100);
  }, { passive: false });
}

// Detect if device has touch
export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
