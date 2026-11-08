import { W, H, PAL, hash, clamp } from "./util.js";
import {
  drawCheckpoint, drawAltar, drawMakima, drawDoor,
} from "./sprites.js";

const px = (ctx, x, y, w, h, c) => {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

export function drawSkyline(ctx, cam, par, baseY, step, color, seed, winColor, alpha = 1) {
  const shift = (cam * par) % step;
  const start = Math.floor((cam * par) / step);
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = -1; i < W / step + 2; i++) {
    const idx = i + start;
    const x = Math.round(i * step - shift);
    const hgt = 44 + Math.round(hash(idx * 3.1 + seed) * 104);
    const w = step - 4;
    const y = baseY - hgt;
    px(ctx, x, y, w, hgt, color);
    // rooftop antenna / water tank
    if (hash(idx + seed) > 0.62) {
      px(ctx, x + 8, y - 12, 1, 12, color);
      px(ctx, x + 7, y - 14, 3, 2, color);
    }
    if (hash(idx * 1.7 + seed) > 0.8) {
      px(ctx, x + w - 14, y - 6, 9, 6, color);
      px(ctx, x + w - 15, y - 7, 11, 2, color);
    }
    // windows
    const rows = Math.floor(hgt / 11);
    const cols = Math.max(1, Math.floor((w - 6) / 9));
    for (let r = 1; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const hv = hash(idx * 9.7 + r * 3.3 + c * 7.1 + seed);
        if (hv > 0.58) {
          const wy = y + r * 11;
          const wx = x + 4 + c * 9;
          ctx.globalAlpha = alpha * (0.25 + hv * 0.45);
          px(ctx, wx, wy, 3, 2, winColor);
          ctx.globalAlpha = alpha;
        }
      }
    }
  }
  ctx.restore();
}

export function drawBackground(ctx, game) {
  const t = game.time;
  const cam = game.camera.x;
  const theme = game.room.theme;
  if (theme === "city") drawCity(ctx, game, t, cam);
  else if (theme === "subway") drawSubway(ctx, game, t, cam);
  else drawBossRoom(ctx, game, t, cam);
}

function drawCity(ctx, game, t, cam) {
  // sky
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#06050e");
  g.addColorStop(0.42, "#160b20");
  g.addColorStop(0.72, "#351226");
  g.addColorStop(1, "#4a1927");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // stars
  for (let i = 0; i < 46; i++) {
    const x = (hash(i * 1.7) * 620 - cam * 0.02 + 1200) % 620 - 70;
    const y = 8 + hash(i * 2.9) * 92;
    const a = 0.15 + Math.abs(Math.sin(t * 0.7 + i)) * 0.5;
    ctx.globalAlpha = a;
    px(ctx, x, y, hash(i) > 0.85 ? 2 : 1, 1, i % 7 === 0 ? PAL.blood3 : PAL.bone);
  }
  ctx.globalAlpha = 1;

  // blood moon
  const mx = 344 - cam * 0.035;
  const my = 58;
  ctx.save();
  const glow = ctx.createRadialGradient(mx, my, 8, mx, my, 84);
  glow.addColorStop(0, "rgba(255,90,100,0.26)");
  glow.addColorStop(0.5, "rgba(210,40,60,0.10)");
  glow.addColorStop(1, "rgba(210,40,60,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(mx - 90, my - 90, 180, 180);
  ctx.fillStyle = "#e8b7a7";
  ctx.beginPath();
  ctx.arc(mx, my, 31, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d7958d";
  // craters
  ctx.globalAlpha = 0.5;
  const craters = [[-9, -7, 6], [8, 2, 9], [-4, 11, 4], [13, -11, 4], [-15, 4, 3]];
  for (const [cx, cy, r] of craters) {
    ctx.beginPath();
    ctx.arc(mx + cx, my + cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // drips of blood from the moon
  ctx.fillStyle = "#b12b40";
  px(ctx, mx - 3, my + 29, 2, 8, "#b12b40");
  px(ctx, mx + 11, my + 25, 1, 12, "#9d2136");
  ctx.restore();

  // thin clouds
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#c47b8e";
  for (let i = 0; i < 5; i++) {
    const x = ((i * 170 + t * 4 - cam * 0.05) % 720 + 720) % 720 - 120;
    const y = 34 + i * 13;
    ctx.beginPath();
    ctx.ellipse(x, y, 46, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // far / mid / near skylines
  drawSkyline(ctx, cam, 0.06, 218, 42, "#120d1b", 3, "#7c4a68", 0.9);
  drawSkyline(ctx, cam, 0.16, 236, 54, "#1a1024", 11, "#b66573", 1);
  drawSkyline(ctx, cam, 0.31, 252, 66, "#21152c", 23, "#d69358", 1);

  // neon signs on the near layer
  for (const n of game.room.neon) {
    const x = n.x - cam * 0.31;
    if (x < -90 || x > W + 90) continue;
    drawNeon(ctx, x, n.y, n.text, n.color, t + n.x);
  }

  // overhead cables and hanging chains
  ctx.strokeStyle = "rgba(8,7,13,0.9)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const y = 18 + i * 14 + Math.sin(t * 0.4 + i) * 1;
    ctx.beginPath();
    ctx.moveTo(-10, y);
    ctx.bezierCurveTo(120, y + 10, 330, y - 6, W + 10, y + 6);
    ctx.stroke();
  }
  drawChain(ctx, 58 - cam * 0.4, 0, 46 + Math.sin(t * 0.7) * 3, t);
  drawChain(ctx, 404 - cam * 0.5, 0, 62 + Math.sin(t * 0.5 + 2) * 4, t);

  // ground haze
  const haze = ctx.createLinearGradient(0, 190, 0, H);
  haze.addColorStop(0, "rgba(120,30,60,0)");
  haze.addColorStop(1, "rgba(120,30,60,0.14)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, 190, W, H - 190);
}

function drawNeon(ctx, x, y, text, color, t) {
  const c = color === "teal" ? PAL.teal : color === "gold" ? PAL.gold : PAL.blood2;
  const flicker = Math.sin(t * 13) > -0.92 ? 1 : 0.3;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  // bracket
  px(ctx, -2, -5, 2, 14, "#0a0810");
  // sign
  ctx.globalAlpha = 0.25 * flicker;
  ctx.fillStyle = c;
  ctx.fillRect(-4, -4, 44, 13);
  ctx.globalAlpha = 0.96 * flicker;
  ctx.fillStyle = "#0b0810";
  ctx.fillRect(-2, -2, 40, 9);
  ctx.fillStyle = c;
  ctx.font = '700 7px "DejaVu Sans Mono", monospace';
  ctx.textBaseline = "top";
  ctx.fillText(text, 1, 0);
  ctx.globalAlpha = 0.4 * flicker;
  ctx.strokeStyle = c;
  ctx.lineWidth = 1;
  ctx.strokeRect(-3, -3, 42, 11);
  ctx.restore();
}

function drawChain(ctx, x, y, len, t) {
  ctx.save();
  ctx.strokeStyle = "rgba(12,10,17,0.95)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < len; i += 6) {
    const sway = Math.sin(t * 0.6 + i * 0.1) * (i / len) * 2;
    if (i === 0) ctx.moveTo(x + sway, y + i);
    else ctx.lineTo(x + sway, y + i);
  }
  ctx.stroke();
  ctx.strokeStyle = "rgba(90,76,98,0.5)";
  ctx.lineWidth = 1;
  for (let i = 4; i < len; i += 7) {
    const sway = Math.sin(t * 0.6 + i * 0.1) * (i / len) * 2;
    ctx.beginPath();
    ctx.ellipse(x + sway, y + i, 2, 3, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSubway(ctx, game, t, cam) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#07070d");
  g.addColorStop(0.5, "#0d0d18");
  g.addColorStop(1, "#17101a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // tiled back wall
  ctx.save();
  ctx.globalAlpha = 0.5;
  const tile = 18;
  const off = -(cam * 0.25) % tile;
  for (let x = off - tile; x < W + tile; x += tile) {
    for (let y = 42; y < 220; y += tile) {
      const hv = hash(Math.floor((x + cam * 0.25) / tile) * 4.1 + y * 0.13);
      px(ctx, x, y, tile - 1, tile - 1, hv > 0.6 ? "#1a2030" : "#171b28");
      if (hv > 0.93) px(ctx, x + 3, y + 4, 5, 2, "#3c2a2b");
    }
  }
  ctx.restore();

  // far tunnel lights
  for (let i = 0; i < 6; i++) {
    const x = ((i * 190 - cam * 0.22) % 1140 + 1140) % 1140 - 120;
    const flicker = 0.35 + Math.abs(Math.sin(t * 3 + i * 2.2)) * 0.5;
    ctx.save();
    ctx.globalAlpha = flicker;
    ctx.fillStyle = "rgba(73,216,198,0.55)";
    px(ctx, x, 84, 2, 1, PAL.teal);
    ctx.globalAlpha = flicker * 0.16;
    ctx.fillStyle = PAL.teal;
    ctx.beginPath();
    ctx.arc(x, 84, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // arches
  for (let i = -1; i < 8; i++) {
    const x = Math.round(i * 148 - ((cam * 0.42) % 148));
    ctx.strokeStyle = "#242433";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x, 220);
    ctx.lineTo(x, 80);
    ctx.quadraticCurveTo(x, 42, x + 74, 42);
    ctx.quadraticCurveTo(x + 148, 42, x + 148, 80);
    ctx.lineTo(x + 148, 220);
    ctx.stroke();
    ctx.strokeStyle = "#11111b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 5, 220);
    ctx.lineTo(x + 5, 80);
    ctx.quadraticCurveTo(x + 5, 47, x + 74, 47);
    ctx.quadraticCurveTo(x + 143, 47, x + 143, 80);
    ctx.lineTo(x + 143, 220);
    ctx.stroke();
  }

  // cables / pipes
  ctx.strokeStyle = "#302a30";
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-10, 26 + i * 9);
    ctx.bezierCurveTo(140, 34 + i * 9, 300, 22 + i * 8, W + 10, 30 + i * 9);
    ctx.stroke();
  }

  // fluorescent lights
  for (let i = 0; i < 5; i++) {
    const x = Math.round(i * 210 - ((cam * 0.55) % 210));
    const flicker = Math.sin(t * 22 + i * 3.1) > -0.86 ? 1 : 0.25;
    ctx.save();
    px(ctx, x + 30, 24, 46, 3, "rgba(10,10,16,0.9)");
    ctx.globalAlpha = flicker;
    px(ctx, x + 32, 25, 42, 2, "#cfe8df");
    ctx.globalAlpha = flicker * 0.16;
    const lg = ctx.createLinearGradient(0, 26, 0, 240);
    lg.addColorStop(0, "rgba(170,255,235,0.5)");
    lg.addColorStop(1, "rgba(170,255,235,0)");
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(x + 33, 27);
    ctx.lineTo(x + 73, 27);
    ctx.lineTo(x + 106, 244);
    ctx.lineTo(x, 244);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // rails in the dark
  ctx.save();
  ctx.globalAlpha = 0.5;
  px(ctx, 0, 258, W, 2, "#3b3540");
  px(ctx, 0, 266, W, 2, "#2b2730");
  for (let i = -1; i < 24; i++) {
    const x = i * 44 - ((cam * 0.9) % 44);
    px(ctx, x, 258, 16, 10, "#1b1720");
  }
  ctx.restore();

  // grime / red emergency glows
  const rg = ctx.createLinearGradient(0, 190, 0, H);
  rg.addColorStop(0, "rgba(120,20,40,0)");
  rg.addColorStop(1, "rgba(120,20,40,0.18)");
  ctx.fillStyle = rg;
  ctx.fillRect(0, 190, W, H - 190);
}

function drawBossRoom(ctx, game, t, cam) {
  const g = ctx.createRadialGradient(W / 2, 70, 20, W / 2, 130, 340);
  g.addColorStop(0, "#4a1328");
  g.addColorStop(0.42, "#240b1c");
  g.addColorStop(1, "#08060e");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // writhing flesh walls
  for (let i = 0; i < 14; i++) {
    const x = hash(i * 2.3) * 560 - cam * 0.15;
    const y = 20 + hash(i * 5.1) * 190;
    const r = 18 + hash(i * 7.7) * 44;
    const pulse = 1 + Math.sin(t * 1.2 + i) * 0.06;
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = i % 2 ? "#8a2547" : "#5c1a3a";
    ctx.beginPath();
    ctx.ellipse(x, y, r * pulse, r * 0.7, hash(i) * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // giant watching eye
  const ex = W / 2 - cam * 0.1;
  const ey = 66;
  const lookX = game.player ? clamp((game.player.centerX - ex) * 0.04, -8, 8) : 0;
  const blink = Math.sin(t * 0.9) > 0.94 ? 0.1 : 1;
  ctx.save();
  ctx.fillStyle = "#0b0710";
  ctx.beginPath();
  ctx.ellipse(ex, ey, 58, 29 * blink, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#cdbfae";
  ctx.beginPath();
  ctx.ellipse(ex, ey, 54, 25 * blink, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7e1a2c";
  ctx.beginPath();
  ctx.arc(ex + lookX, ey, 18 * blink, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#170a10";
  ctx.beginPath();
  ctx.arc(ex + lookX, ey, 8 * blink, 0, Math.PI * 2);
  ctx.fill();
  // veins around the eye
  ctx.strokeStyle = "rgba(160,30,60,0.45)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const a = i * 0.79;
    ctx.beginPath();
    ctx.moveTo(ex + Math.cos(a) * 58, ey + Math.sin(a) * 27);
    ctx.quadraticCurveTo(
      ex + Math.cos(a + 0.2) * 90, ey + Math.sin(a + 0.2) * 45,
      ex + Math.cos(a) * 120, ey + Math.sin(a) * 66
    );
    ctx.stroke();
  }
  ctx.restore();

  // hanging chains with hooks
  for (let i = 0; i < 5; i++) {
    const x = 46 + i * 112 - cam * 0.3;
    drawChain(ctx, x, 0, 44 + (i % 3) * 18, t + i);
    px(ctx, x - 2, 44 + (i % 3) * 18, 4, 5, "#2a2032");
  }

  // gold coins suspended in the air
  for (let i = 0; i < 9; i++) {
    const x = (hash(i * 8.1) * 560 + Math.sin(t * 0.5 + i) * 8 - cam * 0.5 + 560) % 560;
    const y = 90 + hash(i * 3.3) * 120;
    ctx.save();
    ctx.globalAlpha = 0.35 + Math.abs(Math.sin(t + i)) * 0.3;
    px(ctx, x, y, 2, 3, PAL.gold2);
    ctx.restore();
  }

  // pulsing floor glow
  const fg = ctx.createLinearGradient(0, 205, 0, H);
  fg.addColorStop(0, "rgba(210,40,70,0)");
  fg.addColorStop(1, "rgba(150,20,50,0.3)");
  ctx.fillStyle = fg;
  ctx.fillRect(0, 205, W, H - 205);
}

// ------------------------------------------------------------- terrain

export function drawTerrain(ctx, game) {
  const theme = game.room.theme;
  for (const s of game.room.solids) drawBlock(ctx, s, theme, true, game);
  for (const p of game.room.platforms) drawBlock(ctx, p, theme, false, game);
  for (const hz of game.room.hazards) drawSpikes(ctx, hz, game);
}

function drawBlock(ctx, s, theme, isSolid, game) {
  const x = Math.round(s.x);
  const y = Math.round(s.y);
  const w = Math.round(s.w);
  const h = Math.round(s.h);
  if (theme === "city") {
    px(ctx, x, y, w, h, "#141019");
    px(ctx, x, y, w, 3, "#33283b");
    px(ctx, x, y, w, 1, "#58445f");
    // sidewalk seams
    for (let sx = x + 20; sx < x + w; sx += 36) px(ctx, sx, y + 3, 1, 6, "#221a2a");
    for (let sx = x + 8; sx < x + w; sx += 24) {
      const hv = hash(sx * 0.7 + game.roomIndex);
      if (hv > 0.72) px(ctx, sx, y + 9 + (hv * 8) % 8, 5, 1, "#2a2132");
    }
    if (!isSolid) {
      // AC unit / ledge underside
      px(ctx, x + 3, y + 4, w - 6, 2, "#1e1726");
      for (let sx = x + 8; sx < x + w - 6; sx += 18) {
        px(ctx, sx, y + 5, 6, 2, "#0d0a12");
        px(ctx, sx + 2, y + 7, 2, 1, "#3d3048");
      }
    } else {
      px(ctx, x, y + 6, w, 1, "#0d0a12");
    }
  } else if (theme === "subway") {
    px(ctx, x, y, w, h, "#15151f");
    px(ctx, x, y, w, 2, "#3e3b49");
    px(ctx, x, y, w, 1, "#6c6676");
    // warning stripe on edges
    for (let sx = x; sx < x + w; sx += 10) {
      px(ctx, sx, y + 2, 5, 2, (sx / 10) % 2 < 1 ? PAL.gold2 : "#1a1512");
    }
    for (let sx = x + 12; sx < x + w - 10; sx += 24) {
      px(ctx, sx, y + 6, 10, 1, "#24222d");
      px(ctx, sx + 2, y + 8, 6, 1, "#0c0b11");
    }
    if (!isSolid) {
      px(ctx, x + 2, y + 10, w - 4, 2, "#24222d");
      for (let sx = x + 6; sx < x + w - 4; sx += 12) px(ctx, sx, y + 11, 2, 2, "#4a4553");
    }
  } else {
    // boss: bone-wrapped meat
    px(ctx, x, y, w, h, "#180914");
    px(ctx, x, y, w, 3, "#d9bfa8");
    px(ctx, x, y, w, 1, "#f2e6d8");
    for (let sx = x + 8; sx < x + w; sx += 14) {
      const hv = hash(sx * 1.3 + game.roomIndex);
      if (hv > 0.4) {
        px(ctx, sx, y + 3, 2, 4 + hv * 6, "#9e1f3c");
        px(ctx, sx + 1, y + 4, 1, 2 + hv * 4, "#5c1028");
      }
    }
    if (!isSolid) {
      px(ctx, x, y + 9, w, 2, "#2a0f1f");
      for (let sx = x + 5; sx < x + w; sx += 11) {
        px(ctx, sx, y + 10, 2, 2, "#d9bfa8");
        px(ctx, sx + 1, y + 12, 1, 2, "#bda48f");
      }
    }
  }
}

function drawSpikes(ctx, hz, game) {
  const x = Math.round(hz.x);
  const y = Math.round(hz.y);
  const w = Math.round(hz.w);
  const h = Math.round(hz.h);
  // pit darkness
  px(ctx, x, y, w, h, "#09060d");
  px(ctx, x, y - 2, w, 2, "#3a0d17");
  for (let sx = x + 2; sx < x + w; sx += 9) {
    ctx.fillStyle = "#b7aea3";
    ctx.beginPath();
    ctx.moveTo(sx, y + h);
    ctx.lineTo(sx + 4, y - 5);
    ctx.lineTo(sx + 8, y + h);
    ctx.fill();
    ctx.fillStyle = "#6f6a67";
    ctx.beginPath();
    ctx.moveTo(sx + 1, y + h);
    ctx.lineTo(sx + 4, y - 5);
    ctx.lineTo(sx + 4, y + h);
    ctx.fill();
    ctx.fillStyle = game.time ? PAL.blood : PAL.blood;
    px(ctx, sx + 3, y - 7, 2, 2, PAL.blood);
  }
}

// ------------------------------------------------------------- props

export function drawProps(ctx, game, behind = true) {
  const room = game.room;
  if (behind) {
    for (const d of room.details) {
      if (d.type === "puddle") drawPuddle(ctx, d, room.theme, game.time);
      else if (d.type === "vending") drawVending(ctx, d, game.time);
      else if (d.type === "barrel") drawBarrel(ctx, d);
    }
    for (const cp of room.checkpoints) {
      const active = game.checkpoint.roomIndex === game.roomIndex &&
        Math.abs(game.checkpoint.x - cp.x) < 2;
      drawCheckpoint(ctx, cp, active, game.time, room.theme);
    }
    for (const a of room.altars) drawAltar(ctx, a, game.time, !game.contracts.size);
    for (const n of room.npcs) drawMakima(ctx, n, game.time);
    for (const door of room.doors) drawDoor(ctx, door, game.time, room.theme);
  }
}

function drawPuddle(ctx, d, theme, t) {
  const y = d.x === 180 ? 244 : 244;
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = theme === "subway" ? "#1b2b31" : "#241829";
  ctx.beginPath();
  ctx.ellipse(d.x + d.w / 2, y, d.w / 2, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = theme === "subway" ? PAL.teal : PAL.blood2;
  const shimmer = Math.sin(t * 1.4 + d.x) * 3;
  ctx.fillRect(d.x + d.w * 0.25 + shimmer, y - 1, d.w * 0.3, 1);
  ctx.restore();
}

function drawVending(ctx, d, t) {
  const x = d.x;
  px(ctx, x - 10, 192, 22, 48, PAL.ink);
  px(ctx, x - 9, 193, 20, 46, "#1b2b34");
  px(ctx, x - 7, 196, 16, 24, "#081217");
  // cans
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      px(ctx, x - 5 + c * 5, 199 + r * 5, 3, 3, (r + c) % 3 === 0 ? PAL.blood2 : (r + c) % 3 === 1 ? PAL.gold : PAL.teal);
    }
  }
  // glow
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.16 + Math.sin(t * 2.2) * 0.03;
  ctx.fillStyle = PAL.teal;
  ctx.fillRect(x - 12, 190, 26, 54);
  ctx.restore();
}

function drawBarrel(ctx, d) {
  const x = d.x;
  px(ctx, x - 7, 222, 14, 18, PAL.ink);
  px(ctx, x - 6, 223, 12, 16, "#262b28");
  px(ctx, x - 6, 226, 12, 2, "#3d4540");
  px(ctx, x - 6, 235, 12, 2, "#3d4540");
  px(ctx, x - 3, 229, 6, 4, PAL.gold2);
}

export function drawForeground(ctx, game) {
  const theme = game.room.theme;
  const t = game.time;
  if (theme === "city") {
    ctx.save();
    ctx.strokeStyle = "rgba(200,220,255,0.16)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 52; i++) {
      const x = (hash(i * 3.7) * 520 + t * 7) % 520 - 20;
      const y = (hash(i * 7.1) * 272 + t * 260) % 272;
      ctx.globalAlpha = 0.2 + hash(i) * 0.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 2, y + 7);
      ctx.stroke();
    }
    ctx.restore();
  } else if (theme === "subway") {
    // dripping ceiling water
    ctx.save();
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 12; i++) {
      const x = (hash(i * 5.3) * 520 - game.camera.x * 0.8 + 1040) % 520;
      const cycle = (t * 70 + hash(i) * 240) % 240;
      px(ctx, x, cycle, 1, 3, PAL.teal);
    }
    ctx.restore();
  } else {
    // embers
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 26; i++) {
      const x = (hash(i * 4.1) * 560 + Math.sin(t + i) * 14 - game.camera.x * 0.6 + 560) % 560;
      const y = (hash(i * 8.7) * 272 - t * (8 + hash(i) * 18)) % 272;
      ctx.globalAlpha = 0.15 + hash(i) * 0.4;
      px(ctx, x, y < 0 ? y + 272 : y, 1, 1, i % 3 === 0 ? PAL.gold : PAL.blood2);
    }
    ctx.restore();
  }

  // vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, 300);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}
