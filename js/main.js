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

function resize() {
  const pad = innerWidth < 640 ? 0 : 24;
  const scale = Math.min((innerWidth - pad) / W, (innerHeight - pad) / H);
  const w = Math.max(320, Math.floor(W * scale));
  const h = Math.max(181, Math.floor(H * scale));
  frame.style.width = `${w}px`;
  frame.style.height = `${h}px`;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
}
addEventListener("resize", resize);
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
