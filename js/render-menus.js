import { W, H, PAL, clamp } from "./util.js";
import { text, panel, px } from "./render-ui.js";
import { CONTRACTS, SHOP_ITEMS } from "./game.js";
import { drawMakima } from "./sprites.js";

function dim(ctx, color = "rgba(4,3,8,0.74)") {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
}

function keyHints(ctx, bits, y) {
  ctx.save();
  ctx.globalAlpha = 0.75;
  text(ctx, bits, W / 2, y, { size: 6, color: PAL.bone2, align: "center", shadow: false });
  ctx.restore();
}

function sigil(ctx, x, y, signed, selected) {
  ctx.save();
  ctx.translate(x, y);
  const col = signed ? PAL.gold : selected ? PAL.blood2 : PAL.steel2;
  ctx.strokeStyle = col;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
  ctx.stroke();
  if (signed) {
    px(ctx, -3, 0, 2, 2, PAL.gold);
    px(ctx, -1, 2, 2, 2, PAL.gold);
    px(ctx, 1, 0, 2, 2, PAL.gold);
    px(ctx, 3, -2, 2, 2, PAL.gold);
  } else {
    px(ctx, -2, -2, 2, 4, col);
    px(ctx, 1, -2, 2, 4, col);
  }
  ctx.restore();
}

export function drawContracts(ctx, game) {
  dim(ctx);
  const x = 50;
  const y = 24;
  const w = 380;
  const h = 224;
  panel(ctx, x, y, w, h, PAL.blood);

  text(ctx, "DEVIL CONTRACTS", x + 16, y + 11, { size: 15, color: PAL.bone, glow: 5, spacing: 1 });
  text(ctx, "POWER NOW. INTEREST FOREVER.", x + 16, y + 29, { size: 6, color: PAL.steel2, shadow: false, spacing: 1 });

  // wallet
  text(ctx, `${game.blood} BLOOD`, x + w - 16, y + 12, { size: 8, color: PAL.blood3, align: "right", glow: 2 });
  text(ctx, `DEBT ${game.debt}`, x + w - 16, y + 23, { size: 7, color: game.debt >= 50 ? PAL.blood2 : PAL.gold, align: "right" });

  const rowY = y + 44;
  CONTRACTS.forEach((item, i) => {
    const ry = rowY + i * 36;
    const selected = i === game.menuIndex;
    const signed = game.contracts.has(item.id);
    const afford = game.blood >= item.cost;
    if (selected) {
      ctx.fillStyle = "rgba(210,31,60,0.16)";
      ctx.fillRect(x + 10, ry - 2, w - 20, 32);
      px(ctx, x + 10, ry - 2, 2, 32, PAL.blood2);
    }
    sigil(ctx, x + 24, ry + 12, signed, selected);
    const nameCol = signed ? PAL.gold : selected ? PAL.bone : PAL.bone2;
    text(ctx, item.name, x + 38, ry, { size: 9, color: nameCol, glow: selected ? 2 : 0 });
    if (signed) {
      text(ctx, "SIGNED", x + w - 18, ry, { size: 7, color: PAL.gold, align: "right", glow: 2 });
    } else {
      const col = afford ? PAL.blood3 : PAL.blood;
      text(ctx, `${item.cost} BLOOD`, x + w - 18, ry, { size: 7, color: col, align: "right" });
      text(ctx, `DEBT +${item.debt}`, x + w - 18, ry + 11, { size: 6, color: PAL.gold2, align: "right", shadow: false });
    }
    text(ctx, item.desc, x + 38, ry + 12, { size: 6, color: signed ? PAL.steel2 : PAL.bone2, shadow: false });
    text(ctx, signed ? item.flavor : (item.id === "katana" && !signed ? "UNLOCKS A WEAPON" : ""), x + 38, ry + 21, {
      size: 6, color: signed ? "rgba(255,200,87,0.55)" : "rgba(242,230,216,0.36)", shadow: false,
    });
  });

  // footer message
  if (game.menuMessage) {
    text(ctx, game.menuMessage, x + 16, y + h - 27, { size: 7, color: PAL.gold, glow: 2 });
  } else {
    text(ctx, "↑ ↓  SELECT      ENTER  SIGN", x + 16, y + h - 27, { size: 7, color: PAL.bone2, shadow: false });
  }
  text(ctx, "ESC  CLOSE", x + w - 16, y + h - 27, { size: 7, color: PAL.steel2, align: "right", shadow: false });
  text(ctx, "Every contract is legally binding in Hell.", x + 16, y + h - 14, { size: 6, color: "rgba(242,230,216,0.3)", shadow: false });
}

export function drawShop(ctx, game) {
  dim(ctx);
  const x = 34;
  const y = 20;
  const w = 412;
  const h = 232;
  panel(ctx, x, y, w, h, PAL.gold2);

  text(ctx, "MAKIMA", x + 14, y + 10, { size: 14, color: PAL.bone, glow: 4, spacing: 2 });
  text(ctx, "PUBLIC SAFETY  ·  DEVIL HUNTER", x + 14, y + 27, { size: 6, color: PAL.steel2, shadow: false });
  text(ctx, `${game.blood} BLOOD`, x + w - 14, y + 12, { size: 8, color: PAL.blood3, align: "right", glow: 2 });

  // portrait
  ctx.save();
  ctx.translate(x + 10, y + 40);
  drawMakima(ctx, null, game.time, true);
  ctx.restore();
  ctx.strokeStyle = "rgba(255,200,87,0.28)";
  ctx.strokeRect(x + 13.5, y + 57.5, 78, 93);
  text(ctx, "“SIGN HERE.”", x + 18, y + 156, { size: 7, color: PAL.bone2, shadow: false });

  // items
  const listX = x + 108;
  const listW = w - 122;
  SHOP_ITEMS.forEach((item, i) => {
    const ry = y + 44 + i * 31;
    const selected = i === game.menuIndex;
    const sold = !item.repeat && game.shopBought.has(item.id);
    const afford = game.blood >= item.cost;
    if (selected) {
      ctx.fillStyle = "rgba(255,200,87,0.10)";
      ctx.fillRect(listX - 6, ry - 2, listW + 2, 28);
      px(ctx, listX - 6, ry - 2, 2, 28, PAL.gold);
    }
    text(ctx, item.name, listX, ry, {
      size: 8, color: sold ? PAL.steel2 : selected ? PAL.bone : PAL.bone2, glow: selected ? 1 : 0,
    });
    if (sold) {
      text(ctx, "SOLD OUT", listX + listW, ry, { size: 6, color: PAL.steel2, align: "right", shadow: false });
    } else {
      text(ctx, `${item.cost}`, listX + listW, ry, {
        size: 8, color: afford ? PAL.gold : PAL.rust, align: "right",
      });
      text(ctx, "BLOOD", listX + listW, ry + 8, { size: 5, color: PAL.steel2, align: "right", shadow: false });
    }
    text(ctx, item.desc, listX, ry + 11, { size: 6, color: sold ? "rgba(242,230,216,0.3)" : PAL.steel2, shadow: false });
  });

  if (game.menuMessage) {
    text(ctx, game.menuMessage, x + 14, y + h - 28, { size: 7, color: PAL.gold, glow: 2 });
  } else {
    text(ctx, "↑ ↓  SELECT      ENTER  BUY", x + 14, y + h - 28, { size: 7, color: PAL.bone2, shadow: false });
  }
  text(ctx, "ESC  LEAVE", x + w - 14, y + h - 28, { size: 7, color: PAL.steel2, align: "right", shadow: false });
  text(ctx, "Makima does not offer refunds. Neither does Hell.", x + 14, y + h - 14, { size: 6, color: "rgba(242,230,216,0.28)", shadow: false });
}

export function drawPause(ctx, game) {
  dim(ctx, "rgba(4,3,8,0.72)");
  const x = 88;
  const y = 36;
  const w = 304;
  const h = 200;
  panel(ctx, x, y, w, h, PAL.steel2);
  text(ctx, "PAUSED", x + w / 2, y + 12, { size: 18, color: PAL.bone, align: "center", glow: 5, spacing: 4 });
  text(ctx, "THE CHAINSAW CAN WAIT.", x + w / 2, y + 33, { size: 6, color: PAL.steel2, align: "center", shadow: false });

  const rows = [
    ["SECTOR", `${game.room.sector} — ${game.room.name}`],
    ["TIME", game.timeText],
    ["BLOOD", String(game.blood)],
    ["DEBT", String(game.debt)],
    ["KILLS / DEATHS", `${game.kills} / ${game.deaths}`],
    ["BEST CLEAR", game.bestText],
  ];
  rows.forEach(([k, v], i) => {
    const ry = y + 50 + i * 12;
    text(ctx, k, x + 20, ry, { size: 7, color: PAL.steel2, shadow: false });
    text(ctx, v, x + w - 20, ry, { size: 7, color: i === 3 ? PAL.gold : PAL.bone2, align: "right", shadow: false });
  });

  text(ctx, "A/D MOVE   SPACE JUMP   J ATTACK   K DASH", x + w / 2, y + 133, { size: 6, color: PAL.bone2, align: "center", shadow: false });
  text(ctx, "L FOX BITE   Q SWAP   E INTERACT   TAB CONTRACTS", x + w / 2, y + 145, { size: 6, color: PAL.bone2, align: "center", shadow: false });
  text(ctx, "M SOUND   ESC RESUME", x + w / 2, y + 161, { size: 7, color: PAL.gold, align: "center", glow: 2 });

  // pacts owned
  const owned = [...game.contracts];
  text(ctx, owned.length ? `PACTS: ${owned.map((id) => CONTRACTS.find((c) => c.id === id)?.name).join(" · ")}` : "NO PACTS SIGNED. YET.",
    x + w / 2, y + h - 16, { size: 5, color: "rgba(242,230,216,0.45)", align: "center", shadow: false });
}

export function drawDead(ctx, game) {
  const t = game.time;
  ctx.fillStyle = "rgba(10,2,6,0.82)";
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, H / 2, 30, W / 2, H / 2, 300);
  g.addColorStop(0, "rgba(160,20,45,0.22)");
  g.addColorStop(1, "rgba(0,0,0,0.75)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // broken chains
  ctx.save();
  ctx.strokeStyle = "rgba(160,40,60,0.35)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 2; i++) {
    const sx = i === 0 ? 76 : W - 76;
    for (let j = 0; j < 7; j++) {
      ctx.beginPath();
      ctx.ellipse(sx + Math.sin(t + j) * 2, 30 + j * 13, 2, 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();

  const shake = Math.sin(t * 20) * 0.6;
  text(ctx, "YOU DIED", W / 2 + 2, 58 + shake, { size: 38, color: PAL.rust, align: "center", glow: 10, spacing: 3 });
  text(ctx, "YOU DIED", W / 2, 56 + shake, { size: 38, color: PAL.blood2, align: "center", glow: 16, spacing: 3 });
  text(ctx, "THE DEBT OUTLIVES YOU.", W / 2, 104, { size: 8, color: PAL.bone2, align: "center", spacing: 2 });

  const cp = game.checkpoint;
  const roomName = game.rooms[cp.roomIndex]?.name || "UNKNOWN";
  text(ctx, `DEBT +3   BLOOD LOST 30%`, W / 2, 128, { size: 7, color: PAL.gold, align: "center", shadow: false });
  text(ctx, `LAST LAMP: ${roomName}`, W / 2, 140, { size: 6, color: PAL.steel2, align: "center", shadow: false });

  const blink = Math.sin(t * 4.5) > -0.3 ? 1 : 0.4;
  ctx.save();
  ctx.globalAlpha = blink;
  text(ctx, "ENTER — RISE AGAIN", W / 2, 174, { size: 10, color: PAL.bone, align: "center", glow: 4, spacing: 2 });
  ctx.restore();
  text(ctx, "ESC — ABANDON RUN", W / 2, 193, { size: 6, color: PAL.steel2, align: "center", shadow: false });

  text(ctx, `BLOOD ${game.blood}   ·   DEBT ${game.debt}   ·   KILLS ${game.kills}`, W / 2, 220, { size: 6, color: "rgba(242,230,216,0.4)", align: "center", shadow: false });
}

export function drawWin(ctx, game) {
  const t = game.time;
  ctx.fillStyle = "rgba(6,4,10,0.8)";
  ctx.fillRect(0, 0, W, H);
  // golden rays
  ctx.save();
  ctx.translate(W / 2, 100);
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + t * 0.08;
    ctx.strokeStyle = i % 2 ? "rgba(255,200,87,0.10)" : "rgba(210,31,60,0.10)";
    ctx.lineWidth = i % 2 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 30, Math.sin(a) * 18);
    ctx.lineTo(Math.cos(a) * 320, Math.sin(a) * 220);
    ctx.stroke();
  }
  ctx.restore();

  const x = 50;
  const y = 24;
  const w = 380;
  const h = 224;
  panel(ctx, x, y, w, h, PAL.gold2);

  text(ctx, "DEBT COLLECTED", x + w / 2, y + 12, { size: 24, color: PAL.gold, align: "center", glow: 9, spacing: 2 });
  text(ctx, "THE DEBT DEVIL IS DEAD. THE PAPERWORK IS NOT.", x + w / 2, y + 40, { size: 6, color: PAL.bone2, align: "center", shadow: false });

  // rank
  const rank = game.rank;
  ctx.save();
  ctx.strokeStyle = "rgba(255,200,87,0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x + w - 56, y + 82, 28, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(x + w - 56, y + 82, 23, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  text(ctx, rank, x + w - 56, y + 58, { size: 34, color: PAL.gold, align: "center", glow: 10 });
  text(ctx, "RANK", x + w - 56, y + 97, { size: 5, color: PAL.steel2, align: "center", shadow: false });

  const stats = [
    ["CLEAR TIME", game.timeText],
    ["BLOOD", String(game.blood)],
    ["DEBT", String(game.debt)],
    ["KILLS", String(game.kills)],
    ["DEATHS", String(game.deaths)],
    ["PACTS", `${game.contracts.size} / ${CONTRACTS.length}`],
  ];
  stats.forEach(([k, v], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const sx = x + 18 + col * 136;
    const sy = y + 64 + row * 22;
    text(ctx, k, sx, sy, { size: 6, color: PAL.steel2, shadow: false });
    text(ctx, v, sx, sy + 8, { size: 10, color: i === 2 ? (game.debt > 40 ? PAL.blood2 : PAL.gold) : PAL.bone, glow: 1 });
  });

  text(ctx, game.rankFlavor, x + w / 2, y + 140, { size: 7, color: PAL.gold2, align: "center", shadow: false });
  const newBest = game.best && Math.abs(game.best - game.elapsed) < 0.01;
  text(ctx, newBest ? "NEW BEST TIME" : `BEST  ${game.bestText}`, x + w / 2, y + 153, {
    size: 7, color: newBest ? PAL.gold : PAL.steel2, align: "center", glow: newBest ? 3 : 0,
  });

  const blink = Math.sin(t * 4.2) > -0.2 ? 1 : 0.4;
  ctx.save();
  ctx.globalAlpha = blink;
  text(ctx, "ENTER — SIGN ANOTHER CONTRACT", x + w / 2, y + 174, { size: 9, color: PAL.bone, align: "center", glow: 4 });
  ctx.restore();
  text(ctx, "ESC — TITLE", x + w / 2, y + 192, { size: 6, color: PAL.steel2, align: "center", shadow: false });
  text(ctx, "THE HOUSE ALWAYS WINS. UNTIL IT DOESN'T.", x + w / 2, y + h - 13, { size: 5, color: "rgba(242,230,216,0.3)", align: "center", shadow: false });
}
