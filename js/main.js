import { W, H, clamp } from "./util.js";
import { Input, installTouchControls } from "./input.js";
import { Sfx } from "./audio.js";
import { Game } from "./game.js";
import { render } from "./render.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d", { alpha: false });
ctx.imageSmoothingEnabled = false;

const frame = document.getElementById("frame");
const boot = document.getElementById("boot");
const input = new Input();
const sfx = new Sfx();
const game = new Game(input, sfx);
installTouchControls(input);

const coarsePointer = matchMedia("(pointer: coarse)");
const rotatePrompt = document.getElementById("rotate-prompt");
function resize() {
  const viewport = window.visualViewport;
  const width = Math.floor(viewport?.width || innerWidth);
  const height = Math.floor(viewport?.height || innerHeight);
  const landscape = width >= height;
  const safeHeight = coarsePointer.matches ? (landscape ? 104 : 32) : 24;
  const scale = Math.max(0.1, Math.min((width - 16) / W, (height - safeHeight - 16) / H));
  const w = Math.floor(W * scale);
  const h = Math.floor(H * scale);
  frame.style.width = `${w}px`;
  frame.style.height = `${h}px`;
  frame.style.transform = coarsePointer.matches && landscape ? `translateY(-${Math.floor(safeHeight / 2)}px)` : "";
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  document.body.classList.toggle("portrait-touch", coarsePointer.matches && !landscape);
  if (rotatePrompt) rotatePrompt.setAttribute("aria-hidden", String(!coarsePointer.matches || landscape));
}
addEventListener("resize", resize);
addEventListener("orientationchange", resize);
window.visualViewport?.addEventListener("resize", resize);
coarsePointer.addEventListener?.("change", resize);
resize();

let last = performance.now();
let booted = false;
function loop(now) {
  const dt = clamp((now - last) / 1000, 0, 0.05);
  last = now;
  try {
    game.update(dt);
    render(ctx, game);
    input.endFrame();
  } catch (err) {
    console.error(err);
  }
  if (!booted) {
    booted = true;
    setTimeout(() => boot.classList.add("hidden"), 350);
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// For automated visual checks and curious tinkerers.
window.__game = game;
window.__debug = {
  game,
  start: () => game.startRun(),
  goto: (i) => {
    game.mode = "play";
    if (!game.player) game.startRun();
    game.loadRoom(i);
  },
  blood: (n) => { game.blood = n; },
  debt: (n) => { game.debt = n; },
  god: (on = true) => { game.debugGod = on; },
  allContracts: () => {
    for (const c of [["dash", 8], ["doubleJump", 10], ["fox", 16], ["katana", 22]]) {
      game.contracts.add(c[0]);
      game.debt += c[1];
      if (c[0] === "katana") game.weapons.add("katana");
    }
  },
  hurtBoss: (n = 40) => { if (game.boss) game.boss.hurt(n, game); },
  killAll: () => { for (const e of game.enemies) e.hurt(9999, game, 1); },
  win: () => { if (game.boss) game.boss.hurt(99999, game); },
};

document.addEventListener("contextmenu", (e) => e.preventDefault());
