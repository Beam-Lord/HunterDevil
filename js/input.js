const MAP = {
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
  up: ["KeyW", "ArrowUp"],
  down: ["KeyS", "ArrowDown"],
  jump: ["Space", "KeyZ"],
  attack: ["KeyJ", "KeyX"],
  dash: ["KeyK", "KeyC"],
  special: ["KeyL", "KeyV"],
  swap: ["KeyQ"],
  interact: ["KeyE"],
  contracts: ["Tab"],
  pause: ["Escape", "KeyP"],
  confirm: ["Enter", "NumpadEnter"],
  back: ["Escape"],
  mute: ["KeyM"],
  restart: ["KeyR"],
  menu1: ["Digit1"],
  menu2: ["Digit2"],
  menu3: ["Digit3"],
  menu4: ["Digit4"],
};

const BLOCK = new Set([
  "Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Tab", "Enter",
]);

export class Input {
  constructor() {
    this.downSet = new Set();
    this.pressedSet = new Set();
    this.releasedSet = new Set();
    this.onAction = null;
    this.anyPressed = false;

    addEventListener("keydown", (e) => {
      if (BLOCK.has(e.code)) e.preventDefault();
      if (!e.repeat) {
        this.downSet.add(e.code);
        this.pressedSet.add(e.code);
        this.anyPressed = true;
        this.onAction?.(e.code);
      }
    });
    addEventListener("keyup", (e) => {
      this.downSet.delete(e.code);
      this.releasedSet.add(e.code);
    });
    addEventListener("blur", () => this.downSet.clear());
  }

  down(action) {
    return MAP[action].some((code) => this.downSet.has(code));
  }
  pressed(action) {
    return MAP[action].some((code) => this.pressedSet.has(code));
  }
  released(action) {
    return MAP[action].some((code) => this.releasedSet.has(code));
  }
  axis() {
    let x = 0;
    if (this.down("left")) x -= 1;
    if (this.down("right")) x += 1;
    return x;
  }
  endFrame() {
    this.pressedSet.clear();
    this.releasedSet.clear();
    this.anyPressed = false;
  }
}

// Touch buttons feed the same key sets as the keyboard, so every action
// remains available on phones and tablets.
export function installTouchControls(input) {
  if (!matchMedia("(pointer: coarse)").matches) return;
  const wrap = document.createElement("div");
  wrap.id = "touch";
  wrap.setAttribute("aria-label", "Controles táctiles");
  wrap.innerHTML = `
    <div class="touch-cluster touch-move" aria-label="Movimiento">
      <button data-code="KeyA" aria-label="Mover a la izquierda">◀</button>
      <button data-code="KeyD" aria-label="Mover a la derecha">▶</button>
    </div>
    <div class="touch-cluster touch-utility" aria-label="Acciones">
      <button data-code="KeyE">USAR</button>
      <button data-code="Tab">PACTO</button>
      <button data-code="Escape">PAUSA</button>
      <button data-code="KeyQ">CAMB.</button>
    </div>
    <div class="touch-cluster touch-combat" aria-label="Combate">
      <button data-code="KeyK">DASH</button>
      <button data-code="KeyL">ZORRO</button>
      <button data-code="KeyJ">ATACAR</button>
      <button data-code="Space">SALTAR</button>
    </div>`;
  document.body.appendChild(wrap);

  wrap.querySelectorAll("button").forEach((btn) => {
    const code = btn.dataset.code;
    const press = (e) => {
      e.preventDefault();
      if (btn.hasPointerCapture?.(e.pointerId)) return;
      btn.setPointerCapture?.(e.pointerId);
      input.downSet.add(code);
      input.pressedSet.add(code);
      input.anyPressed = true;
      input.onAction?.(code);
    };
    const release = (e) => {
      e.preventDefault();
      if (btn.hasPointerCapture?.(e.pointerId)) btn.releasePointerCapture(e.pointerId);
      input.downSet.delete(code);
      input.releasedSet.add(code);
    };
    btn.addEventListener("pointerdown", press);
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", release);
    btn.addEventListener("lostpointercapture", release);
  });
}
