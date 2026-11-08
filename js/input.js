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

// Basic touch support: on-screen d-pad and action buttons write into the
// same key sets as the keyboard.
export function installTouchControls(input) {
  if (!matchMedia("(pointer: coarse)").matches) return;
  const wrap = document.createElement("div");
  wrap.id = "touch";
  wrap.innerHTML = `
    <div class="pad">
      <button data-code="KeyA">◀</button>
      <button data-code="KeyD">▶</button>
    </div>
    <div class="acts">
      <button data-code="KeyE">E</button>
      <button data-code="KeyK">K</button>
      <button data-code="KeyJ">J</button>
      <button data-code="Space">JMP</button>
    </div>`;
  document.body.appendChild(wrap);
  wrap.querySelectorAll("button").forEach((btn) => {
    const code = btn.dataset.code;
    const press = (e) => {
      e.preventDefault();
      input.downSet.add(code);
      input.pressedSet.add(code);
      input.onAction?.(code);
    };
    const release = (e) => {
      e.preventDefault();
      input.downSet.delete(code);
    };
    btn.addEventListener("pointerdown", press);
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", release);
    btn.addEventListener("pointerleave", release);
  });
}
