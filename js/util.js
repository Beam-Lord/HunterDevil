export const W = 480;
export const H = 272;
export const TILE = 16;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const approach = (v, target, step) => {
  if (v < target) return Math.min(v + step, target);
  return Math.max(v - step, target);
};
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const sign = (v) => (v < 0 ? -1 : 1);
export const overlap = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
export const formatTime = (sec) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};
export const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export const PAL = {
  ink: "#08070d",
  ink2: "#100d19",
  ink3: "#1a1428",
  night: "#241a38",
  plum: "#3a1e44",
  blood: "#c3152f",
  blood2: "#ff3b52",
  blood3: "#ff7b82",
  rust: "#7e1a2c",
  bone: "#f2e6d8",
  bone2: "#cdbfae",
  steel: "#aab6cc",
  steel2: "#6d7893",
  gold: "#ffc857",
  gold2: "#b97d24",
  teal: "#49d8c6",
  teal2: "#1c7d7b",
  purple: "#8a5cff",
  skin: "#f0c49a",
  skin2: "#b98262",
  hair: "#f3c969",
  hair2: "#b28435",
  green: "#8fae5d",
  green2: "#4f6b3e",
  white: "#ffffff",
};
