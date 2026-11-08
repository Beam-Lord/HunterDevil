import { W, H, PAL, clamp, rand } from "./util.js";
import {
  drawBackground, drawTerrain, drawProps, drawForeground,
} from "./render-bg.js";
import {
  drawPlayer, drawZombie, drawBat, drawKatana, drawCollector, drawBoss,
} from "./sprites.js";
import {
  text, px, drawHud, drawWorldUi, drawBanner, drawTitle,
} from "./render-ui.js";
import {
  drawContracts, drawShop, drawPause, drawDead, drawWin,
} from "./render-menus.js";

export function render(ctx, game) {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, W, H);

  let sx = 0;
  let sy = 0;
  if (game.shakeTime > 0) {
    const m = game.shakeMag * Math.min(1, game.shakeTime * 5);
    sx = (Math.random() * 2 - 1) * m;
    sy = (Math.random() * 2 - 1) * m * 0.6;
  }

  ctx.save();
  ctx.translate(Math.round(sx), Math.round(sy));
  if (game.mode === "title") drawTitleScene(ctx, game);
  else drawWorld(ctx, game);
  ctx.restore();

  // HUD and world prompts stay steady.
  if (game.mode !== "title" && game.player) {
    drawHud(ctx, game);
    drawWorldUi(ctx, game);
    drawBanner(ctx, game);
  }

  // fade / flash / full-screen overlays
  if (game.fade > 0) {
    ctx.fillStyle = `rgba(4,3,8,${clamp(game.fade, 0, 1)})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (game.flashTime > 0) {
    ctx.save();
    ctx.globalAlpha = clamp(game.flashTime * 1.8, 0, 0.65);
    ctx.fillStyle = game.flashColor;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  if (game.mode === "contracts") drawContracts(ctx, game);
  else if (game.mode === "shop") drawShop(ctx, game);
  else if (game.mode === "pause") drawPause(ctx, game);
  else if (game.mode === "dead") drawDead(ctx, game);
  else if (game.mode === "win") drawWin(ctx, game);
  else if (game.mode === "title") drawTitle(ctx, game);

  if (game.mode === "play" && game.menuMessageTime > 0 && game.menuMessage) {
    ctx.save();
    ctx.globalAlpha = clamp(game.menuMessageTime * 2, 0, 1);
    text(ctx, game.menuMessage, W / 2, 52, { size: 7, color: PAL.gold, align: "center", glow: 3 });
    ctx.restore();
  }
}

function drawTitleScene(ctx, game) {
  const oldX = game.camera.x;
  game.camera.x = 250 + Math.sin(game.titleTime * 0.08) * 160;
  drawBackground(ctx, game);
  game.camera.x = oldX;

  // low rooftop foreground
  ctx.save();
  ctx.fillStyle = "#07050b";
  ctx.fillRect(0, 244, W, H - 244);
  ctx.fillStyle = "#191222";
  ctx.fillRect(0, 244, W, 3);
  ctx.fillStyle = "#2a2132";
  ctx.fillRect(0, 244, W, 1);
  // vents and parapet details
  for (let i = 0; i < 7; i++) {
    const x = 24 + i * 71;
    px(ctx, x, 232, 18, 12, "#0a0810");
    px(ctx, x + 2, 234, 14, 2, "#211a2a");
    px(ctx, x + 2, 239, 14, 1, "#120e18");
  }
  // hanging chain
  ctx.strokeStyle = "rgba(100,85,110,0.5)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.ellipse(431 + Math.sin(game.titleTime * 0.8 + i * 0.3) * 2, 4 + i * 8, 2, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // hero silhouette
  const fake = {
    x: 0, y: -20, w: 12, h: 20, facing: -1, onGround: true,
    animTime: game.titleTime, vx: 0, attackTimer: 0, attackDur: 1,
    attackIndex: 0, weapon: "chainsaw", dashTimer: 0, invuln: 0,
  };
  ctx.save();
  ctx.translate(424, 246);
  ctx.scale(2, 2);
  drawPlayer(ctx, fake, game.titleTime, game);
  ctx.restore();
  // red rim light
  const rim = ctx.createRadialGradient(424, 230, 4, 424, 230, 60);
  rim.addColorStop(0, "rgba(255,59,82,0.16)");
  rim.addColorStop(1, "rgba(255,59,82,0)");
  ctx.fillStyle = rim;
  ctx.fillRect(360, 170, 130, 100);
  ctx.restore();
}

function drawWorld(ctx, game) {
  const cam = game.camera.x;
  drawBackground(ctx, game);

  ctx.save();
  ctx.translate(-Math.round(cam), 0);

  drawTerrain(ctx, game);
  drawProps(ctx, game, true);
  drawWarnings(ctx, game);

  // pickups behind actors
  for (const p of game.pickups) drawPickup(ctx, p, game.time);
  for (const e of game.effects) if (e.type === "afterimage") drawEffect(ctx, e, game);
  for (const e of game.effects) if (e.type === "portal" || e.type === "dash") drawEffect(ctx, e, game);

  for (const e of game.enemies) {
    if (e.dead) continue;
    drawEnemy(ctx, e, game);
  }
  if (game.boss && !game.boss.dead) drawBoss(ctx, game.boss, game.time, game.player);

  if (game.player && !game.player.dead) {
    drawPlayer(ctx, game.player, game.time, game);
  }

  for (const pr of game.projectiles) drawProjectile(ctx, pr, game.time);

  for (const e of game.effects) {
    if (e.type === "fox" || e.type === "explosion" || e.type === "death" || e.type === "doublejump" || e.type === "muzzle") {
      drawEffect(ctx, e, game);
    }
  }

  drawParticles(ctx, game);
  drawTexts(ctx, game);
  ctx.restore();

  drawForeground(ctx, game);

  // screen-space beam? world warning
  if (game.boss && game.boss.state === "beam") {
    drawBeam(ctx, game);
  }
}

function drawEnemy(ctx, e, game) {
  const t = game.time;
  if (e.flash > 0) {
    // small hit flash aura
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = PAL.white;
    ctx.fillRect(e.x - 2, e.y - 2, e.w + 4, e.h + 4);
    ctx.restore();
  }
  if (e.type === "zombie") drawZombie(ctx, e, t);
  else if (e.type === "bat") drawBat(ctx, e, t);
  else if (e.type === "katana") drawKatana(ctx, e, t);
  else if (e.type === "collector") drawCollector(ctx, e, t);

  // tiny hp bar for tough enemies
  if (e.hp < e.maxHp && (e.type === "katana" || e.type === "collector")) {
    const w = 20;
    px(ctx, e.centerX - w / 2, e.y - 7, w, 2, "#170c12");
    px(ctx, e.centerX - w / 2, e.y - 7, (e.hp / e.maxHp) * w, 2, PAL.blood2);
  }
}

function drawPickup(ctx, p, t) {
  const bob = Math.sin(t * 5 + p.phase) * 1.5;
  if (p.type === "heart") {
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = PAL.blood2;
    ctx.beginPath();
    ctx.arc(2, 2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    px(ctx, 0, 0, 5, 2, PAL.blood2);
    px(ctx, 0, 2, 5, 3, PAL.blood);
    px(ctx, 1, 5, 3, 1, PAL.rust);
    px(ctx, 1, 0, 1, 1, PAL.blood3);
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.translate(p.x, p.y + bob);
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = PAL.blood;
  ctx.beginPath();
  ctx.arc(2, 3, 6 + Math.sin(t * 7 + p.phase) * 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  px(ctx, 1, 0, 2, 2, PAL.blood2);
  px(ctx, 0, 2, 4, 3, PAL.blood);
  px(ctx, 1, 5, 2, 1, PAL.rust);
  ctx.restore();
}

function drawProjectile(ctx, pr, t) {
  if (pr.type === "pellet") {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = PAL.gold;
    ctx.fillRect(pr.x - Math.sign(pr.vx) * 8, pr.y + 1, 10, 1);
    ctx.globalAlpha = 1;
    px(ctx, pr.x, pr.y, 7, 3, PAL.gold);
    px(ctx, pr.x + 2, pr.y + 1, 3, 1, PAL.white);
    ctx.restore();
  } else if (pr.type === "wave") {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = PAL.bone;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pr.x, pr.y + 8, 12, -1.1, 1.1);
    ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = PAL.blood2;
    ctx.beginPath();
    ctx.arc(pr.x, pr.y + 8, 8, -1.0, 1.0);
    ctx.stroke();
    ctx.restore();
  } else {
    const flip = Math.floor(t * 10 + pr.x) % 2 === 0;
    ctx.save();
    if (pr.type === "bossCoin") {
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = PAL.blood2;
      ctx.beginPath();
      ctx.arc(pr.x + 3, pr.y + 3, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    px(ctx, pr.x, pr.y, 6, 6, PAL.gold2);
    px(ctx, pr.x + 1, pr.y + 1, 4, 4, PAL.gold);
    if (flip) px(ctx, pr.x + 2, pr.y + 2, 1, 2, PAL.gold2);
    ctx.restore();
  }
}

function drawWarnings(ctx, game) {
  for (const w of game.warnings) {
    const a = 0.3 + Math.abs(Math.sin((w.t + w.dur) * 12)) * 0.5;
    ctx.save();
    ctx.globalAlpha = a;
    if (w.type === "beam") {
      ctx.fillStyle = PAL.blood;
      ctx.fillRect(w.x, w.y + w.h - 3, w.w, 3);
      for (let x = 0; x < w.w; x += 16) {
        ctx.fillStyle = PAL.blood2;
        ctx.fillRect(w.x + x, w.y + w.h - 5, 8, 2);
      }
      text(ctx, "! ! !", game.player.centerX, w.y - 10, { size: 7, color: PAL.blood2, align: "center", glow: 4 });
    } else {
      ctx.strokeStyle = PAL.gold;
      ctx.beginPath();
      ctx.ellipse(w.x + w.w / 2, w.y + w.h, w.w / 2, 3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = PAL.blood2;
      ctx.fillRect(w.x + w.w / 2 - 1, w.y, 2, w.h);
    }
    ctx.restore();
  }
}

function drawBeam(ctx, game) {
  const b = game.boss;
  if (!b) return;
  const y = game.room.ground - 18;
  const a = 0.65 + Math.sin(game.time * 40) * 0.2;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = a;
  const g = ctx.createLinearGradient(0, y, 0, y + 18);
  g.addColorStop(0, "rgba(255,59,82,0.9)");
  g.addColorStop(0.5, "rgba(255,200,87,0.9)");
  g.addColorStop(1, "rgba(255,59,82,0.85)");
  ctx.fillStyle = g;
  ctx.fillRect(0, y, W, 18);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = PAL.white;
  ctx.fillRect(0, y + 7, W, 4);
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 20; i++) {
    const x = (i * 41 + game.time * 200) % W;
    ctx.fillRect(x, y - 4 + Math.random() * 26, 2, 1);
  }
  ctx.restore();
}

function drawEffect(ctx, e, game) {
  if (e.type === "afterimage") {
    ctx.save();
    ctx.globalAlpha = (1 - e.t / e.dur) * 0.35;
    const fake = {
      x: e.x, y: e.y, w: 12, h: 20, facing: e.facing, onGround: true,
      animTime: game.time, vx: 0, attackTimer: 0, attackDur: 1, attackIndex: 0,
      weapon: "chainsaw", dashTimer: 0, invuln: 0,
    };
    drawPlayer(ctx, fake, game.time, game);
    ctx.restore();
  } else if (e.type === "dash") {
    ctx.save();
    ctx.globalAlpha = 0.5 * (1 - e.t / e.dur);
    ctx.strokeStyle = PAL.blood2;
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(e.x + (e.facing > 0 ? -14 - i * 5 : 14 + i * 5), e.y - 6 + i * 3);
      ctx.lineTo(e.x + (e.facing > 0 ? -30 - i * 7 : 30 + i * 7), e.y - 6 + i * 3);
      ctx.stroke();
    }
    ctx.restore();
  } else if (e.type === "portal") {
    ctx.save();
    ctx.globalAlpha = 1 - e.t / e.dur;
    ctx.strokeStyle = PAL.blood2;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(e.x, e.y, 10 + e.t * 40, 20 + e.t * 50, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else if (e.type === "doublejump") {
    ctx.save();
    ctx.globalAlpha = 1 - e.t / e.dur;
    ctx.strokeStyle = PAL.blood2;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(e.x, e.y, 9 + e.t * 26, 3 + e.t * 5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else if (e.type === "explosion") {
    const k = e.t / e.dur;
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = PAL.blood2;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(e.x, e.y, 4 + k * 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = PAL.gold;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(e.x, e.y, 2 + k * 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else if (e.type === "death") {
    const k = e.t / e.dur;
    ctx.save();
    ctx.globalAlpha = (1 - k) * 0.6;
    ctx.fillStyle = PAL.blood;
    ctx.beginPath();
    ctx.ellipse(e.x, e.y, 8 + k * 18, 5 + k * 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (e.type === "fox") {
    drawFox(ctx, e);
  } else if (e.type === "muzzle") {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 1 - e.t / e.dur;
    ctx.fillStyle = PAL.gold;
    ctx.beginPath();
    ctx.arc(e.x, e.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawFox(ctx, e) {
  const k = e.t / e.dur;
  const open = Math.sin(Math.min(1, k * 1.6) * Math.PI) * 22;
  ctx.save();
  ctx.translate(e.x, e.y);
  if (e.facing < 0) ctx.scale(-1, 1);
  ctx.globalAlpha = 1 - Math.max(0, k - 0.7) / 0.3;
  // fox head jaw
  ctx.fillStyle = "rgba(255,59,82,0.16)";
  ctx.beginPath();
  ctx.ellipse(4, 8, 44, 40 + open, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PAL.bone;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, 8 - open);
  ctx.quadraticCurveTo(30, -18 - open, 56, 4 - open);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-10, 8 + open);
  ctx.quadraticCurveTo(30, 30 + open, 56, 8 + open);
  ctx.stroke();
  // teeth
  ctx.fillStyle = PAL.bone;
  for (let i = 0; i < 5; i++) {
    const x = 4 + i * 10;
    ctx.beginPath();
    ctx.moveTo(x, 7 - open);
    ctx.lineTo(x + 4, 14 - open);
    ctx.lineTo(x + 8, 7 - open);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, 9 + open);
    ctx.lineTo(x + 4, 2 + open);
    ctx.lineTo(x + 8, 9 + open);
    ctx.fill();
  }
  // eye
  ctx.fillStyle = PAL.gold;
  ctx.fillRect(22, -8 - open * 0.3, 4, 2);
  ctx.fillStyle = PAL.blood2;
  ctx.fillRect(12, 10, 40, 2);
  ctx.restore();
}

function drawParticles(ctx, game) {
  for (const p of game.particles) {
    const a = clamp(p.life / p.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    if (p.type === "spark") ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    if (p.type === "blood" && p.size > 1) {
      ctx.globalAlpha = a * 0.5;
      ctx.fillRect(Math.round(p.x) + 1, Math.round(p.y) + 2, 1, 1);
    }
    ctx.restore();
  }
}

function drawTexts(ctx, game) {
  for (const t of game.texts) {
    const a = clamp((t.dur - t.t) * 3, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    text(ctx, t.text, t.x, t.y - t.t * 18, {
      size: 6 * t.size, color: t.color, align: "center", glow: 2, shadow: true,
    });
    ctx.restore();
  }
}
