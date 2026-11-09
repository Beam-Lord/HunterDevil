import { W, H, PAL, clamp } from "./util.js";
import { es } from "./es.js";

const FONT = '"DejaVu Sans Mono", "Courier New", monospace';

export function text(ctx, str, x, y, o = {}) {
  str = es(str);
  const {
    size = 8, color = PAL.bone, align = "left", weight = 700,
    shadow = true, glow = 0, alpha = 1, baseline = "top", spacing = 0,
  } = o;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textBaseline = baseline;
  ctx.textAlign = align;
  if (shadow) {
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillText(str, x + 1, y + 1);
  }
  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
  }
  ctx.fillStyle = color;
  if (spacing) {
    const chars = [...str];
    const widths = chars.map((c) => ctx.measureText(c).width + spacing);
    const total = widths.reduce((a, b) => a + b, 0) - spacing;
    let cx = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
    ctx.textAlign = "left";
    chars.forEach((c, i) => {
      ctx.fillText(c, cx, y);
      cx += widths[i];
    });
  } else {
    ctx.fillText(str, x, y);
  }
  ctx.restore();
}

export function px(ctx, x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function panel(ctx, x, y, w, h, accent = PAL.blood) {
  ctx.save();
  ctx.fillStyle = "rgba(5,4,9,0.88)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(242,230,216,0.16)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  // corner brackets
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1;
  const c = 8;
  ctx.beginPath();
  ctx.moveTo(x, y + c); ctx.lineTo(x, y); ctx.lineTo(x + c, y);
  ctx.moveTo(x + w - c, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + c);
  ctx.moveTo(x, y + h - c); ctx.lineTo(x, y + h); ctx.lineTo(x + c, y + h);
  ctx.moveTo(x + w - c, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - c);
  ctx.stroke();
  // top accent line
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = accent;
  ctx.fillRect(x + 16, y, w - 32, 1);
  ctx.restore();
}

function heart(ctx, x, y, filled, scale = 1) {
  const map = [
    ".XX.XX.",
    "XXXXXXX",
    "XXXXXXX",
    ".XXXXX.",
    "..XXX..",
    "...X...",
  ];
  for (let r = 0; r < map.length; r++) {
    for (let c = 0; c < map[r].length; c++) {
      if (map[r][c] !== "X") continue;
      const col = filled
        ? (r === 1 && c < 4 ? PAL.blood3 : PAL.blood2)
        : "#2a1a24";
      px(ctx, x + c * scale, y + r * scale, scale, scale, col);
    }
  }
  if (!filled) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = PAL.blood;
    ctx.strokeRect(x + 0.5, y + 0.5, 7 * scale - 1, 6 * scale - 1);
    ctx.restore();
  }
}

function bloodDrop(ctx, x, y, s = 1) {
  px(ctx, x + 2 * s, y, 2 * s, 2 * s, PAL.blood2);
  px(ctx, x + 1 * s, y + 2 * s, 4 * s, 3 * s, PAL.blood);
  px(ctx, x, y + 3 * s, 6 * s, 3 * s, PAL.blood);
  px(ctx, x + 1 * s, y + 5 * s, 4 * s, 2 * s, PAL.rust);
  px(ctx, x + 1 * s, y + 2 * s, 1 * s, 1 * s, PAL.blood3);
}

function chainIcon(ctx, x, y) {
  ctx.save();
  ctx.strokeStyle = PAL.gold2;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, 4, 3);
  ctx.strokeRect(x + 3.5, y + 2.5, 4, 3);
  ctx.restore();
}

function weaponIcon(ctx, x, y, weapon) {
  if (weapon === "chainsaw") {
    px(ctx, x, y + 4, 13, 4, "#3a3440");
    px(ctx, x + 1, y + 5, 11, 2, PAL.steel);
    for (let i = 0; i < 5; i++) {
      px(ctx, x + 1 + i * 2.4, y + 3, 1, 1, PAL.steel);
    }
    px(ctx, x - 3, y + 3, 4, 6, PAL.rust);
    px(ctx, x - 2, y + 4, 2, 2, PAL.blood);
  } else if (weapon === "shotgun") {
    px(ctx, x, y + 4, 16, 3, PAL.steel2);
    px(ctx, x + 10, y + 3, 5, 2, PAL.steel);
    px(ctx, x + 1, y + 6, 4, 3, "#3a2b22");
    px(ctx, x + 6, y + 6, 4, 2, "#3a2b22");
  } else {
    px(ctx, x, y + 5, 16, 2, PAL.ink);
    px(ctx, x + 1, y + 5, 14, 1, PAL.steel);
    px(ctx, x - 2, y + 4, 3, 4, PAL.gold2);
  }
}

export function drawHud(ctx, game) {
  const p = game.player;
  if (!p) return;
  const t = game.time;
  // top backdrop
  const g = ctx.createLinearGradient(0, 0, 0, 46);
  g.addColorStop(0, "rgba(5,4,10,0.86)");
  g.addColorStop(1, "rgba(5,4,10,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 46);

  // hearts
  for (let i = 0; i < p.maxHp; i++) {
    heart(ctx, 11 + i * 11, 8, i < p.hp, 1);
  }
  // blood
  bloodDrop(ctx, 12, 21);
  text(ctx, String(game.blood).padStart(3, "0"), 22, 21, { size: 9, color: PAL.bone, glow: 2 });
  // debt
  chainIcon(ctx, 56, 22);
  const debtCol = game.debt >= 60 ? PAL.blood2 : game.debt >= 30 ? PAL.gold : PAL.bone2;
  text(ctx, `DEBT ${String(game.debt).padStart(2, "0")}`, 66, 21, { size: 8, color: debtCol, glow: game.debt >= 60 ? 4 : 0 });

  // right metadata
  text(ctx, game.room.sector, W - 12, 8, { size: 7, color: PAL.steel2, align: "right" });
  text(ctx, game.timeText, W - 12, 18, { size: 8, color: PAL.bone2, align: "right" });
  text(ctx, "TAB CONTRACTS  ·  ESC PAUSE", W - 12, 30, { size: 6, color: "rgba(242,230,216,0.42)", align: "right", shadow: false });

  // weapon / ammo
  const wy = H - 30;
  ctx.save();
  ctx.fillStyle = "rgba(5,4,10,0.62)";
  ctx.fillRect(6, wy - 3, 118, 27);
  ctx.strokeStyle = "rgba(242,230,216,0.12)";
  ctx.strokeRect(6.5, wy - 2.5, 117, 26);
  ctx.restore();
  weaponIcon(ctx, 14, wy + 2, p.weapon);
  const wname = p.weapon === "chainsaw" ? "CHAINSAW" : p.weapon === "shotgun" ? "BLOOD GUN" : "KON BLADE";
  text(ctx, wname, 38, wy, { size: 7, color: PAL.bone, glow: 1 });
  if (p.weapon === "shotgun") {
    for (let i = 0; i < p.maxAmmo; i++) {
      px(ctx, 38 + i * 5, wy + 11, 3, 5, i < p.ammo ? PAL.gold : "#2a2028");
    }
    if (p.ammo < p.maxAmmo) px(ctx, 38, wy + 18, Math.min(1, p.reload / 0.72) * 28, 1, PAL.gold2);
  } else if (p.weapon === "katana") {
    text(ctx, "CURSED EDGE", 38, wy + 11, { size: 6, color: PAL.steel2, shadow: false });
  } else {
    text(ctx, "HOLD NOTHING BACK", 38, wy + 11, { size: 6, color: PAL.steel2, shadow: false });
  }
  if (game.weapons.size > 1) {
    text(ctx, "Q SWAP", W - 10, H - 12, { size: 6, color: "rgba(242,230,216,0.35)", align: "right", shadow: false });
  }

  // special cooldown
  if (game.hasContract("fox")) {
    const ready = p.specialCd <= 0;
    text(ctx, ready ? "L — FOX BITE" : `FOX ${p.specialCd.toFixed(1)}s`, 9, H - 46,
      { size: 6, color: ready ? PAL.gold : PAL.steel2, shadow: false });
  }

  if (game.boss && !game.boss.dead) drawBossBar(ctx, game);
}

function drawBossBar(ctx, game) {
  const b = game.boss;
  const w = 268;
  const x = (W - w) / 2;
  const y = H - 15;
  ctx.save();
  ctx.fillStyle = "rgba(4,3,8,0.82)";
  ctx.fillRect(x - 3, y - 11, w + 6, 21);
  text(ctx, "THE DEBT DEVIL", x, y - 12, { size: 7, color: PAL.blood3, glow: 3 });
  text(ctx, b.phase === 2 ? "FORECLOSURE" : "COLLECTOR CLASS", x + w, y - 12, { size: 6, color: PAL.gold, align: "right" });
  ctx.fillStyle = "#2a0d18";
  ctx.fillRect(x, y, w, 6);
  const pct = clamp(b.hp / b.maxHp, 0, 1);
  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, PAL.rust);
  grad.addColorStop(0.6, PAL.blood);
  grad.addColorStop(1, PAL.blood2);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w * pct, 6);
  // segment ticks
  ctx.globalAlpha = 0.5;
  for (let i = 1; i < 10; i++) px(ctx, x + (w / 10) * i, y, 1, 6, PAL.ink);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(242,230,216,0.35)";
  ctx.strokeRect(x - 0.5, y - 0.5, w + 1, 7);
  if (b.state === "stunned") {
    text(ctx, "OPEN!", x + w / 2, y - 20, { size: 8, color: PAL.gold, align: "center", glow: 5 });
  }
  ctx.restore();
}

export function drawWorldUi(ctx, game) {
  const p = game.player;
  if (!p) return;
  // interaction prompt
  if (game.prompt) {
    const label = game.prompt.label;
    const w = label.length * 6 + 22;
    const x = W / 2 - w / 2;
    const y = H - 52;
    ctx.save();
    ctx.fillStyle = "rgba(5,4,10,0.82)";
    ctx.fillRect(x, y, w, 14);
    ctx.strokeStyle = PAL.gold2;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, 13);
    // keycap E
    px(ctx, x + 5, y + 4, 7, 7, PAL.bone2);
    text(ctx, "E", x + 7, y + 4, { size: 6, color: PAL.ink, shadow: false });
    text(ctx, label.replace("  [E]", ""), x + 16, y + 4, { size: 7, color: PAL.bone, shadow: false });
    ctx.restore();
  }

  // hint toast
  if (game.hint) {
    const h = game.hint;
    const fade = Math.min(1, h.t * 3, (h.dur - h.t) * 2);
    const w = Math.min(W - 40, h.text.length * 4.8 + 24);
    const x = W / 2 - w / 2;
    const y = game.prompt ? H - 72 : H - 50;
    ctx.save();
    ctx.globalAlpha = clamp(fade, 0, 1);
    ctx.fillStyle = "rgba(5,4,10,0.7)";
    ctx.fillRect(x, y, w, 13);
    ctx.fillStyle = "rgba(210,31,60,0.7)";
    ctx.fillRect(x, y, 2, 13);
    text(ctx, h.text, W / 2, y + 3, { size: 6, color: PAL.bone2, align: "center", shadow: false });
    ctx.restore();
  }

  // low health warning
  if (p.hp === 1) {
    const a = 0.18 + Math.abs(Math.sin(game.time * 5)) * 0.16;
    const vg = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 300);
    vg.addColorStop(0, "rgba(210,31,60,0)");
    vg.addColorStop(1, `rgba(210,31,60,${a})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
}

export function drawBanner(ctx, game) {
  const b = game.banner;
  if (!b) return;
  const fadeIn = clamp(b.t * 3, 0, 1);
  const fadeOut = clamp((b.dur - b.t) * 1.6, 0, 1);
  const a = Math.min(fadeIn, fadeOut);
  const slide = (1 - fadeIn) * 14;
  ctx.save();
  ctx.globalAlpha = a;
  const y = 62 - slide;
  // dark band
  const g = ctx.createLinearGradient(0, y - 18, 0, y + 46);
  g.addColorStop(0, "rgba(4,3,8,0)");
  g.addColorStop(0.3, "rgba(4,3,8,0.72)");
  g.addColorStop(0.7, "rgba(4,3,8,0.72)");
  g.addColorStop(1, "rgba(4,3,8,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, y - 18, W, 66);
  text(ctx, b.sector || "", W / 2, y - 4, { size: 7, color: PAL.gold, align: "center", glow: 3, spacing: 2 });
  text(ctx, b.title, W / 2, y + 9, { size: 19, color: PAL.bone, align: "center", glow: 6, spacing: 2 });
  text(ctx, b.flavor || "", W / 2, y + 33, { size: 7, color: PAL.steel2, align: "center", shadow: false });
  ctx.globalAlpha = a * 0.8;
  ctx.fillStyle = PAL.blood;
  ctx.fillRect(W / 2 - 34, y + 31, 30, 1);
  ctx.fillRect(W / 2 + 4, y + 31, 30, 1);
  ctx.restore();
}

export function drawTitle(ctx, game) {
  const t = game.titleTime;
  // dark vignette over the drifting city
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "rgba(4,3,8,0.5)");
  g.addColorStop(0.45, "rgba(4,3,8,0.18)");
  g.addColorStop(1, "rgba(4,3,8,0.8)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // decorative chainsaw slash behind title
  ctx.save();
  ctx.translate(W / 2, 78);
  ctx.rotate(-0.08);
  ctx.globalAlpha = 0.16;
  px(ctx, -150, -10, 300, 20, PAL.blood2);
  for (let i = 0; i < 22; i++) {
    px(ctx, -150 + i * 14, -18, 7, 8, PAL.blood);
  }
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = PAL.blood;
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(0, 0, 110 + i * 18, -0.7, 0.7);
    ctx.stroke();
  }
  ctx.restore();

  // title
  const jitter = Math.sin(t * 1.5) * 0.6;
  const cx = W / 2;
  text(ctx, "CHAINSAW", cx + 2, 36 + jitter, { size: 38, color: PAL.rust, align: "center", glow: 8, spacing: 1 });
  text(ctx, "CHAINSAW", cx, 34 + jitter, { size: 38, color: PAL.bone, align: "center", glow: 10, spacing: 1 });
  // blood drip under it
  ctx.save();
  ctx.globalAlpha = 0.8;
  px(ctx, cx - 96, 70, 2, 5, PAL.blood);
  px(ctx, cx - 92, 70, 1, 10, PAL.blood);
  px(ctx, cx - 93, 80, 3, 3, PAL.blood2);
  px(ctx, cx + 74, 70, 2, 7, PAL.blood);
  px(ctx, cx + 78, 70, 1, 4, PAL.blood);
  ctx.restore();

  text(ctx, "DEBT", cx + 1, 82 + jitter, { size: 34, color: PAL.gold2, align: "center", glow: 9, spacing: 8 });
  text(ctx, "DEBT", cx, 80 + jitter, { size: 34, color: PAL.blood2, align: "center", glow: 12, spacing: 8 });

  // teeth divider
  ctx.save();
  for (let i = 0; i < 21; i++) {
    const x = cx - 126 + i * 12;
    ctx.fillStyle = i % 2 ? PAL.bone2 : PAL.steel2;
    ctx.beginPath();
    ctx.moveTo(x, 120);
    ctx.lineTo(x + 5, 126);
    ctx.lineTo(x + 10, 120);
    ctx.fill();
  }
  ctx.restore();

  text(ctx, "A BLOODSOAKED BARGAIN", cx, 133, { size: 9, color: PAL.gold, align: "center", spacing: 2, glow: 3 });
  text(ctx, "POWER NOW. INTEREST FOREVER.", cx, 148, { size: 7, color: PAL.steel2, align: "center", shadow: false });

  // press enter
  const blink = Math.sin(t * 4.4) > -0.2 ? 1 : 0.35;
  ctx.save();
  ctx.globalAlpha = blink;
  text(ctx, "PRESS ENTER TO SIGN", cx, 177, { size: 12, color: PAL.bone, align: "center", glow: 6, spacing: 2 });
  ctx.restore();

  // controls
  ctx.save();
  ctx.globalAlpha = 0.8;
  text(ctx, "A / D  MOVE      SPACE  JUMP      J  ATTACK      K  DASH", cx, 201, { size: 7, color: PAL.bone2, align: "center", shadow: false, spacing: 0 });
  text(ctx, "E  INTERACT      TAB  CONTRACTS      ESC  PAUSE", cx, 212, { size: 7, color: PAL.bone2, align: "center", shadow: false, spacing: 0 });
  ctx.restore();

  // bottom row
  text(ctx, "A FAN-MADE PIXEL NIGHTMARE", 12, H - 18, { size: 6, color: "rgba(242,230,216,0.35)", shadow: false, spacing: 1 });
  text(ctx, `BEST  ${game.bestText}`, W - 12, H - 18, { size: 6, color: "rgba(242,230,216,0.35)", align: "right", shadow: false });
  text(ctx, "M — SOUND", 12, H - 10, { size: 6, color: "rgba(242,230,216,0.22)", shadow: false });

  // little animated chainsaw ornament
  ctx.save();
  ctx.translate(cx, 160);
  ctx.rotate(Math.sin(t * 2) * 0.05);
  ctx.globalAlpha = 0.4;
  px(ctx, -22, 0, 44, 3, PAL.steel2);
  for (let i = 0; i < 8; i++) px(ctx, -20 + i * 5, -2, 3, 2, PAL.steel2);
  ctx.restore();
}
