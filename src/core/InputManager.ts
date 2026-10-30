/**
 * Abstract input layer supporting Keyboard+Mouse AND virtual mobile joystick/touch buttons.
 */
export class InputManager {
  public moveX = 0; // -1 left, +1 right
  public moveZ = 0; // -1 forward, +1 backward
  public jump = false;
  public sprint = false;
  public crouch = false;
  public primaryDown = false;   // Left click (Mine / Attack / Place)
  public secondaryDown = false; // Right click (Aim / Block / Remove)
  public lookDeltaX = 0;
  public lookDeltaY = 0;
  public isPointerLocked = false;
  public isMobileMode = false;

  private keys = new Set<string>();
  private actionCallbacks = new Map<string, () => void>();

  constructor(canvasElement: HTMLElement) {
    this.isMobileMode = 'ontouchstart' in window && window.innerWidth <= 920;

    window.addEventListener('keydown', (e) => {
      const code = e.code;
      this.keys.add(code);

      if (code === 'Tab') {
        e.preventDefault();
        this.trigger('toggleMenu');
      } else if (code === 'KeyB') {
        this.trigger('toggleBuild');
      } else if (code === 'KeyF') {
        this.trigger('toggleFlashlight');
      } else if (code === 'KeyE') {
        this.trigger('interact');
      } else if (code === 'KeyZ') {
        this.trigger('sleep');
      } else if (code === 'KeyQ') {
        this.trigger('cycleBuildPrev');
      } else if (code === 'KeyR') {
        this.trigger('cycleBuildNext');
      } else if (code.startsWith('Digit')) {
        const num = parseInt(code.replace('Digit', ''), 10);
        if (num >= 1 && num <= 9) {
          this.trigger(`slot${num}`);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    canvasElement.addEventListener('mousedown', (e) => {
      if (!this.isPointerLocked && !this.isMobileMode) {
        canvasElement.requestPointerLock?.();
        return;
      }
      if (e.button === 0) this.primaryDown = true;
      if (e.button === 2) this.secondaryDown = true;
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.primaryDown = false;
      if (e.button === 2) this.secondaryDown = false;
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === canvasElement;
      if (!this.isPointerLocked) {
        this.primaryDown = false;
        this.secondaryDown = false;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.lookDeltaX += e.movementX;
        this.lookDeltaY += e.movementY;
      }
    });

    this.setupMobileTouchControls();
  }

  public onAction(name: string, cb: () => void): void {
    this.actionCallbacks.set(name, cb);
  }

  private trigger(name: string): void {
    const cb = this.actionCallbacks.get(name);
    if (cb) cb();
  }

  private setupMobileTouchControls(): void {
    const mobileWrap = document.getElementById('mobile-controls');
    if (this.isMobileMode && mobileWrap) {
      mobileWrap.classList.remove('hidden');
    }

    const zone = document.getElementById('virtual-joystick-zone');
    const knob = document.getElementById('virtual-joystick-knob');
    if (zone && knob) {
      let activeTouchId: number | null = null;
      const center = { x: 60, y: 60 };

      zone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const t = e.changedTouches[0];
        activeTouchId = t.identifier;
      });

      zone.addEventListener('touchmove', (e) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === activeTouchId) {
            const rect = zone.getBoundingClientRect();
            const dx = t.clientX - rect.left - center.x;
            const dy = t.clientY - rect.top - center.y;
            const maxR = 45;
            const dist = Math.min(maxR, Math.hypot(dx, dy));
            const ang = Math.atan2(dy, dx);
            const kx = Math.cos(ang) * dist;
            const ky = Math.sin(ang) * dist;
            knob.style.transform = `translate(${kx}px, ${ky}px)`;
            this.moveX = kx / maxR;
            this.moveZ = ky / maxR;
          }
        }
      });

      const resetJoy = () => {
        activeTouchId = null;
        knob.style.transform = 'translate(0px, 0px)';
        this.moveX = 0;
        this.moveZ = 0;
      };
      zone.addEventListener('touchend', resetJoy);
      zone.addEventListener('touchcancel', resetJoy);
    }

    const bindBtn = (id: string, downFn: () => void, upFn?: () => void) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        downFn();
      });
      if (upFn) {
        el.addEventListener('touchend', (e) => {
          e.preventDefault();
          upFn();
        });
      }
    };

    bindBtn('mb-attack', () => (this.primaryDown = true), () => (this.primaryDown = false));
    bindBtn('mb-interact', () => this.trigger('interact'));
    bindBtn('mb-jump', () => (this.jump = true), () => (this.jump = false));
    bindBtn('mb-build', () => this.trigger('toggleBuild'));
    bindBtn('mb-flashlight', () => this.trigger('toggleFlashlight'));
    bindBtn('mb-menu', () => this.trigger('toggleMenu'));
  }

  public update(): void {
    if (!this.isMobileMode) {
      const left = this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? -1 : 0;
      const right = this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0;
      const forward = this.keys.has('KeyW') || this.keys.has('ArrowUp') ? -1 : 0;
      const back = this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0;
      this.moveX = left + right;
      this.moveZ = forward + back;
      this.jump = this.keys.has('Space');
      this.sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
      this.crouch = this.keys.has('ControlLeft') || this.keys.has('ControlRight') || this.keys.has('KeyC');
    }
  }

  public consumeLookDelta(): { dx: number; dy: number } {
    const dx = this.lookDeltaX;
    const dy = this.lookDeltaY;
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    return { dx, dy };
  }
}
