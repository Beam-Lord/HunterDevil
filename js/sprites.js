import { PAL, clamp } from "./util.js";

const px = (ctx, x, y, w, h, c) => {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

export function shadow(ctx, x, y, w, alpha = 0.35) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.ellipse(x, y, w / 2, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function outlineRect(ctx, x, y, w, h, color, outline = PAL.ink) {
  px(ctx, x - 1, y - 1, w + 2, h + 2, outline);
  px(ctx, x, y, w, h, color);
}

export function drawPlayer(ctx, p, t, game) {
  const cx = Math.round(p.x + p.w / 2);
  const feet = Math.round(p.y + p.h);
  const moving = Math.abs(p.vx) > 14 && p.onGround;
  const run = moving ? Math.sin(p.animTime * 18) : 0;
  const bob = moving ? Math.abs(Math.sin(p.animTime * 18)) * -1 : Math.sin(t * 3.2) * 0.5;
  const dashLean = p.dashTimer > 0 ? 3 : 0;
  const hurt = p.invuln > 0 && Math.floor(t * 24) % 2 === 0;

  shadow(ctx, cx, feet + 1, 16, 0.4);
  ctx.save();
  ctx.translate(cx, feet);
  if (p.facing < 0) ctx.scale(-1, 1);
  ctx.translate(0, bob);
  if (dashLean) ctx.translate(1, 0);

  const suit = hurt ? PAL.white : "#17121f";
  const suit2 = hurt ? PAL.bone : "#241b30";
  const skin = hurt ? PAL.white : PAL.skin;
  const hair = hurt ? PAL.white : PAL.hair;

  // legs
  if (!p.onGround) {
    px(ctx, -4, -7, 3, 6, suit);
    px(ctx, 2, -5, 3, 5, suit);
    px(ctx, -4, -2, 4, 2, PAL.ink);
    px(ctx, 2, -1, 4, 2, PAL.ink);
  } else if (moving) {
    px(ctx, -5 + run * 2, -6, 3, 6, suit);
    px(ctx, 2 - run * 2, -6, 3, 6, suit);
    px(ctx, -6 + run * 2, -1, 5, 2, PAL.ink);
    px(ctx, 1 - run * 2, -1, 5, 2, PAL.ink);
  } else {
    px(ctx, -4, -6, 3, 6, suit);
    px(ctx, 1, -6, 3, 6, suit);
    px(ctx, -5, -1, 4, 2, PAL.ink);
    px(ctx, 1, -1, 5, 2, PAL.ink);
  }

  // torso / suit
  outlineRect(ctx, -5, -15, 10, 10, suit, PAL.ink);
  px(ctx, -5, -14, 1, 7, suit2);
  // shirt + tie
  px(ctx, -2, -14, 4, 5, PAL.bone);
  px(ctx, 0, -14, 1, 6, PAL.blood);
  px(ctx, 1, -13, 1, 3, PAL.blood);
  // lapels
  px(ctx, -3, -14, 1, 3, PAL.bone2);
  px(ctx, 2, -14, 1, 3, PAL.bone2);
  // belt
  px(ctx, -5, -7, 10, 1, PAL.ink);
  px(ctx, -1, -7, 2, 1, PAL.gold);

  // arms
  px(ctx, -7, -14, 2, 6, suit);
  px(ctx, 5, -14, 2, 6, suit);
  px(ctx, -7, -9, 2, 2, skin);
  px(ctx, 5, -9, 2, 2, skin);

  // head
  outlineRect(ctx, -4, -21, 8, 7, skin, PAL.ink);
  // face details
  px(ctx, 1, -19, 1, 1, PAL.ink);
  px(ctx, -2, -19, 1, 1, PAL.ink);
  px(ctx, 2, -17, 1, 1, PAL.rust);
  // messy blonde hair
  px(ctx, -5, -22, 10, 4, hair);
  px(ctx, -5, -20, 2, 2, hair);
  px(ctx, 4, -21, 2, 3, hair);
  px(ctx, -4, -23, 2, 2, hair);
  px(ctx, 0, -24, 2, 2, hair);
  px(ctx, 3, -23, 2, 2, hair);
  px(ctx, -5, -18, 1, 2, hair);
  px(ctx, 4, -18, 1, 1, hair);
  px(ctx, -3, -22, 2, 1, PAL.hair2);

  // weapon in hand when idle
  if (p.attackTimer <= 0) {
    if (p.weapon === "shotgun") {
      px(ctx, 4, -11, 9, 2, PAL.ink);
      px(ctx, 5, -11, 7, 1, PAL.steel2);
      px(ctx, 8, -10, 1, 2, PAL.rust);
      px(ctx, 12, -11, 2, 2, PAL.steel);
    } else if (p.weapon === "katana") {
      ctx.save();
      ctx.translate(5, -10);
      ctx.rotate(-0.35);
      px(ctx, 0, -1, 13, 2, PAL.ink);
      px(ctx, 1, -1, 11, 1, PAL.steel);
      px(ctx, 12, -1, 2, 1, PAL.white);
      px(ctx, -1, -2, 2, 3, PAL.gold2);
      ctx.restore();
    } else {
      // idle pull-cord
      px(ctx, 5, -11, 1, 4, PAL.rust);
      px(ctx, 5, -7, 2, 1, PAL.steel2);
    }
  }

  // attacks
  if (p.attackTimer > 0) {
    const prog = 1 - p.attackTimer / p.attackDur;
    drawAttack(ctx, p, prog, t);
  }

  ctx.restore();

  if (p.dashTimer > 0) {
    ctx.save();
    ctx.globalAlpha = 0.3;
    px(ctx, p.x + 2, p.y + 4, p.w - 4, p.h - 6, PAL.blood);
    ctx.restore();
  }
}

function drawAttack(ctx, p, prog, t) {
  const swing = Math.sin(prog * Math.PI);
  if (p.weapon === "chainsaw") {
    // arm + motor
    px(ctx, 5, -14, 6, 4, "#17121f");
    px(ctx, 10, -15, 5, 6, PAL.rust);
    px(ctx, 11, -14, 3, 4, PAL.blood);
    px(ctx, 9, -16, 2, 2, PAL.steel2);
    // blade
    ctx.save();
    ctx.translate(15, -12);
    ctx.rotate(-0.25 + swing * 0.55);
    px(ctx, 0, -3, 23, 6, PAL.ink);
    px(ctx, 1, -2, 21, 4, PAL.steel);
    px(ctx, 2, -2, 19, 1, PAL.white);
    for (let i = 0; i < 7; i++) {
      const x = 2 + i * 3;
      ctx.fillStyle = PAL.steel;
      ctx.beginPath();
      ctx.moveTo(x, -3);
      ctx.lineTo(x + 2, -6);
      ctx.lineTo(x + 2, -3);
      ctx.fill();
    }
    ctx.fillStyle = PAL.blood;
    px(ctx, 4, 0, 13, 1, PAL.blood);
    ctx.restore();

    // motion arcs
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.55 * (1 - prog * 0.4);
    ctx.strokeStyle = PAL.blood2;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(2, -12, 24 + p.attackIndex * 3, -1.0 + prog * 0.3, 0.75 + prog * 0.3);
    ctx.stroke();
    ctx.globalAlpha *= 0.8;
    ctx.strokeStyle = PAL.white;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(2, -12, 20 + p.attackIndex * 3, -0.8, 0.55);
    ctx.stroke();
    ctx.restore();

    if (Math.random() < 0.5) {
      ctx.save();
      ctx.globalAlpha = 0.7;
      px(ctx, 24 + Math.random() * 9, -17 + Math.random() * 10, 1, 1, PAL.gold);
      ctx.restore();
    }
  } else if (p.weapon === "katana") {
    ctx.save();
    ctx.translate(4, -13);
    ctx.rotate(-1.15 + prog * 1.9);
    px(ctx, 0, -1, 28, 2, PAL.ink);
    px(ctx, 1, -1, 26, 1, PAL.steel);
    px(ctx, 24, -1, 3, 1, PAL.white);
    px(ctx, -2, -2, 3, 3, PAL.gold2);
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.65 * (1 - prog * 0.5);
    ctx.strokeStyle = PAL.bone;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(3, -12, 29, -1.0 + prog * 0.4, 0.7 + prog * 0.4);
    ctx.stroke();
    ctx.restore();
  } else if (p.weapon === "shotgun") {
    px(ctx, 4, -13, 13, 3, PAL.ink);
    px(ctx, 5, -13, 11, 1, PAL.steel2);
    px(ctx, 15, -13, 3, 3, PAL.steel);
    if (prog < 0.3) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.9 - prog * 2;
      px(ctx, 17, -15, 8, 7, PAL.gold);
      px(ctx, 20, -13, 7, 3, PAL.white);
      ctx.restore();
    }
  }
}

export function drawZombie(ctx, e, t) {
  const cx = Math.round(e.x + e.w / 2);
  const feet = Math.round(e.y + e.h);
  const walk = Math.sin(e.animTime * 9) * 1.4;
  const flash = e.flash > 0;
  shadow(ctx, cx, feet + 1, 14, 0.35);
  ctx.save();
  ctx.translate(cx + walk * 0.2, feet);
  if (e.facing < 0) ctx.scale(-1, 1);
  const skin = flash ? PAL.white : PAL.green;
  const suit = flash ? PAL.white : "#1d1a24";

  // legs
  px(ctx, -4 + walk, -6, 3, 6, suit);
  px(ctx, 2 - walk, -6, 3, 6, suit);
  px(ctx, -5 + walk, 0, 4, 1, PAL.ink);
  px(ctx, 2 - walk, 0, 4, 1, PAL.ink);

  // torso hunched
  px(ctx, -5, -14, 10, 9, PAL.ink);
  px(ctx, -4, -14, 9, 8, suit);
  px(ctx, -4, -12, 2, 2, flash ? PAL.white : PAL.blood);
  px(ctx, 2, -11, 2, 1, PAL.ink);

  // arms
  px(ctx, 4, -13, 7, 2, suit);
  px(ctx, 10, -13, 3, 2, skin);
  px(ctx, -5, -13, 2, 5, suit);

  // head
  px(ctx, -2, -20, 9, 7, PAL.ink);
  px(ctx, -1, -19, 7, 6, skin);
  px(ctx, -2, -20, 3, 2, skin);
  px(ctx, 2, -20, 4, 2, skin);
  px(ctx, 1, -18, 2, 2, PAL.ink);
  px(ctx, 5, -17, 1, 1, PAL.gold);
  px(ctx, 2, -15, 4, 1, PAL.ink);
  px(ctx, 1, -14, 1, 1, PAL.bone);
  // exposed brain
  px(ctx, -1, -22, 5, 3, flash ? PAL.white : "#d97d94");
  px(ctx, 0, -23, 2, 2, flash ? PAL.white : "#f0a6b6");
  px(ctx, 2, -22, 1, 1, PAL.blood);
  // collar tags
  px(ctx, 0, -14, 2, 1, PAL.gold2);
  ctx.restore();
}

export function drawBat(ctx, e, t) {
  const cx = Math.round(e.x + e.w / 2);
  const cy = Math.round(e.y + e.h / 2);
  const flap = Math.sin(t * 12 + e.seed) * 6;
  const flash = e.flash > 0;
  const body = flash ? PAL.white : "#2b1533";
  const wing = flash ? PAL.white : "#4a1f4e";
  ctx.save();
  ctx.translate(cx, cy);
  if (e.facing < 0) ctx.scale(-1, 1);
  // wings
  ctx.beginPath();
  ctx.moveTo(-1, -2);
  ctx.lineTo(-16, -5 - flap);
  ctx.lineTo(-12, 1 - flap * 0.5);
  ctx.lineTo(-15, 4);
  ctx.lineTo(-4, 4);
  ctx.closePath();
  ctx.fillStyle = wing;
  ctx.fill();
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1, -2);
  ctx.lineTo(16, -5 - flap);
  ctx.lineTo(12, 1 - flap * 0.5);
  ctx.lineTo(15, 4);
  ctx.lineTo(4, 4);
  ctx.closePath();
  ctx.fillStyle = wing;
  ctx.fill();
  ctx.stroke();
  // body
  px(ctx, -4, -5, 8, 9, PAL.ink);
  px(ctx, -3, -4, 6, 7, body);
  px(ctx, -3, -6, 2, 2, body);
  px(ctx, 1, -7, 2, 3, body);
  // ears
  px(ctx, -4, -7, 2, 3, body);
  px(ctx, 2, -8, 2, 4, body);
  // eyes / fangs
  px(ctx, -2, -3, 1, 1, PAL.blood2);
  px(ctx, 2, -3, 1, 1, PAL.blood2);
  px(ctx, 0, 1, 1, 2, PAL.bone);
  px(ctx, 2, 1, 1, 2, PAL.bone);
  ctx.restore();
}

export function drawKatana(ctx, e, t) {
  const cx = Math.round(e.x + e.w / 2);
  const feet = Math.round(e.y + e.h);
  const flash = e.flash > 0;
  const telegraph = e.state === "windup";
  const dash = e.state === "dash";
  shadow(ctx, cx, feet + 1, 14, 0.4);
  ctx.save();
  ctx.translate(cx, feet);
  if (e.facing < 0) ctx.scale(-1, 1);
  if (dash) ctx.translate(2, 1);
  const suit = flash ? PAL.white : "#111019";
  const suit2 = flash ? PAL.white : "#292138";
  // legs
  if (dash) {
    px(ctx, -7, -6, 5, 3, suit);
    px(ctx, 2, -4, 5, 3, suit);
  } else {
    px(ctx, -4, -7, 3, 7, suit);
    px(ctx, 1, -7, 3, 7, suit);
  }
  px(ctx, -5, -1, 4, 2, PAL.ink);
  px(ctx, 1, -1, 5, 2, PAL.ink);
  // coat tails
  ctx.fillStyle = suit2;
  ctx.beginPath();
  ctx.moveTo(-5, -15);
  ctx.lineTo(-9, -3);
  ctx.lineTo(-4, -6);
  ctx.closePath();
  ctx.fill();
  // torso
  px(ctx, -5, -16, 10, 10, PAL.ink);
  px(ctx, -4, -15, 8, 9, suit);
  px(ctx, -1, -15, 3, 6, PAL.bone);
  px(ctx, 0, -15, 1, 6, PAL.blood);
  // arms
  px(ctx, 4, -14, 3, 6, suit);
  px(ctx, 5, -9, 2, 2, PAL.skin);
  // head - porcelain katana mask
  px(ctx, -4, -24, 9, 8, PAL.ink);
  px(ctx, -3, -23, 7, 7, flash ? PAL.white : "#d9d4c7");
  px(ctx, -2, -21, 2, 2, PAL.ink);
  px(ctx, 2, -21, 1, 2, PAL.ink);
  px(ctx, 0, -20, 1, 4, PAL.blood);
  px(ctx, -3, -24, 2, 2, PAL.blood);
  px(ctx, 3, -25, 2, 3, PAL.blood);
  // katana arm
  ctx.save();
  ctx.translate(5, -13);
  const ang = telegraph ? -1.9 : dash ? 0.05 : -0.55;
  ctx.rotate(ang);
  px(ctx, 0, -1, 27, 2, PAL.ink);
  px(ctx, 1, -1, 25, 1, telegraph ? PAL.white : PAL.steel);
  px(ctx, -2, -2, 3, 3, PAL.gold2);
  ctx.restore();
  if (telegraph) {
    ctx.save();
    ctx.globalAlpha = 0.35 + Math.sin(t * 30) * 0.2;
    ctx.globalCompositeOperation = "lighter";
    px(ctx, 2, -22, 26, 2, PAL.white);
    ctx.restore();
  }
  ctx.restore();
}

export function drawCollector(ctx, e, t) {
  const cx = Math.round(e.x + e.w / 2);
  const cy = Math.round(e.y + e.h / 2);
  const bob = Math.sin(t * 3 + e.seed) * 2;
  const flash = e.flash > 0;
  ctx.save();
  ctx.translate(cx, cy + bob);
  if (e.facing < 0) ctx.scale(-1, 1);
  // chains
  ctx.strokeStyle = flash ? PAL.white : PAL.gold2;
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-8 + i * 7, -14);
    ctx.lineTo(-10 + i * 6, -26);
    ctx.stroke();
  }
  // coat body
  ctx.fillStyle = flash ? PAL.white : "#1b1623";
  ctx.beginPath();
  ctx.moveTo(-7, -10);
  ctx.lineTo(-10, 14);
  ctx.lineTo(0, 10);
  ctx.lineTo(10, 14);
  ctx.lineTo(7, -10);
  ctx.closePath();
  ctx.fill();
  // coin head
  px(ctx, -7, -24, 14, 14, PAL.ink);
  px(ctx, -6, -23, 12, 12, flash ? PAL.white : PAL.gold2);
  px(ctx, -5, -22, 10, 10, flash ? PAL.white : PAL.gold);
  px(ctx, -3, -20, 6, 5, PAL.ink);
  px(ctx, -2, -19, 2, 2, PAL.blood2);
  px(ctx, 2, -19, 1, 2, PAL.blood2);
  px(ctx, -4, -15, 8, 1, PAL.gold2);
  // ledger
  px(ctx, 7, -8, 7, 9, PAL.ink);
  px(ctx, 8, -7, 5, 7, PAL.bone2);
  px(ctx, 9, -6, 3, 1, PAL.rust);
  px(ctx, 9, -4, 3, 1, PAL.rust);
  ctx.restore();
}

export function drawLeech(ctx, e, t) {
  const cx = Math.round(e.x + e.w / 2);
  const feet = Math.round(e.y + e.h);
  const pulse = Math.sin(t * 11 + e.seed) * 1.2;
  const flash = e.flash > 0;
  shadow(ctx, cx, feet + 1, 17, 0.3);
  ctx.save();
  ctx.translate(cx, feet);
  if (e.facing < 0) ctx.scale(-1, 1);
  // Low, segmented body with hooked legs: a blood-fed alley parasite.
  px(ctx, -8, -8, 16, 7, PAL.ink);
  px(ctx, -7, -7, 14, 5, flash ? PAL.white : "#64213c");
  px(ctx, -5, -9 - pulse, 10, 4, flash ? PAL.white : "#a43858");
  px(ctx, -3, -8 - pulse, 6, 2, flash ? PAL.white : "#d45c73");
  px(ctx, 3, -6, 4, 2, PAL.ink);
  px(ctx, 5, -6, 2, 1, PAL.gold);
  // hooked mandibles and six twitching feet
  px(ctx, 7, -4, 3, 2, flash ? PAL.white : PAL.bone2);
  px(ctx, 9, -3, 2, 2, flash ? PAL.white : PAL.blood2);
  for (let i = 0; i < 3; i++) {
    const leg = Math.sin(t * 16 + i * 1.7) * 1.5;
    px(ctx, -6 + i * 4, -2, 1, 3 + leg, flash ? PAL.white : "#30121f");
    px(ctx, -7 + i * 4, 0 + leg, 2, 1, flash ? PAL.white : PAL.blood2);
    px(ctx, -5 + i * 4, -2, 1, 3 - leg, flash ? PAL.white : "#30121f");
    px(ctx, -4 + i * 4, 0 - leg, 2, 1, flash ? PAL.white : PAL.blood2);
  }
  if (e.state === "leap") {
    px(ctx, -12, -10, 3, 1, PAL.blood2);
    px(ctx, -15, -12, 2, 1, PAL.blood);
  }
  ctx.restore();
}

export function drawSpitter(ctx, e, t) {
  const cx = Math.round(e.x + e.w / 2);
  const cy = Math.round(e.y + e.h / 2);
  const hover = Math.sin(t * 4 + e.seed) * 1.5;
  const flash = e.flash > 0;
  ctx.save();
  ctx.translate(cx, cy + hover);
  if (e.facing < 0) ctx.scale(-1, 1);
  // Ragged floating sac and thorny feelers.
  ctx.strokeStyle = flash ? PAL.white : "#6e3852";
  ctx.lineWidth = 1;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 4, 5);
    ctx.lineTo(i * 7 + Math.sin(t * 7 + i) * 2, 12);
    ctx.stroke();
  }
  px(ctx, -8, -8, 16, 14, PAL.ink);
  px(ctx, -7, -9, 14, 13, flash ? PAL.white : "#382034");
  px(ctx, -6, -7, 12, 8, flash ? PAL.white : "#71304a");
  px(ctx, -5, -12, 4, 5, flash ? PAL.white : "#501f38");
  px(ctx, 1, -13, 5, 6, flash ? PAL.white : "#501f38");
  px(ctx, -4, -5, 3, 2, PAL.ink);
  px(ctx, 2, -5, 3, 2, PAL.ink);
  px(ctx, -3, -5, 1, 1, PAL.gold);
  px(ctx, 3, -5, 1, 1, PAL.gold);
  // The throat sac glows before each thorn volley.
  const charging = e.shootCd < 0.35;
  ctx.save();
  ctx.globalAlpha = charging ? 0.9 : 0.55;
  ctx.globalCompositeOperation = "lighter";
  px(ctx, 5, -1, 5, 4, flash ? PAL.white : charging ? PAL.blood2 : "#9e3554");
  px(ctx, 7, 0, 3, 2, PAL.bone2);
  ctx.restore();
  px(ctx, -9, -10, 3, 2, flash ? PAL.white : "#a34861");
  px(ctx, 5, -11, 3, 2, flash ? PAL.white : "#a34861");
  ctx.restore();
}

export function drawBoss(ctx, b, t, player) {
  const cx = b.x + b.w / 2;
  const base = b.y + b.h;
  const bob = Math.sin(t * 2.1) * 3;
  const phase2 = b.phase === 2;
  const flash = b.flash > 0;
  const flesh = flash ? PAL.white : phase2 ? "#7c1734" : "#5c2346";
  const flesh2 = flash ? PAL.white : phase2 ? "#b32246" : "#8c3b5e";
  const dark = PAL.ink;

  // ground shadow
  shadow(ctx, cx, base + 2, 100, 0.5);

  ctx.save();
  ctx.translate(cx, base + bob);
  const squash = 1 + Math.sin(t * 2.1) * 0.025;

  // hanging chains
  ctx.strokeStyle = "#6b5a44";
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 26, -112);
    ctx.lineTo(i * 22 + Math.sin(t + i) * 2, -84);
    ctx.stroke();
  }

  // back scales / arms
  ctx.fillStyle = flash ? PAL.white : "#2a1424";
  ctx.beginPath();
  ctx.ellipse(-48, -48, 20, 30, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(48, -48, 20, 30, 0.25, 0, Math.PI * 2);
  ctx.fill();
  // claws
  for (const s of [-1, 1]) {
    px(ctx, s * 58 - 3, -26, 5, 12, PAL.bone2);
    px(ctx, s * 64 - 3, -30, 4, 9, PAL.bone2);
    px(ctx, s * 52 - 2, -33, 4, 8, PAL.bone2);
  }

  // main body
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(0, -54 * squash, 42, 54 * squash, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = flesh;
  ctx.beginPath();
  ctx.ellipse(0, -55 * squash, 38, 50 * squash, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = flesh2;
  ctx.beginPath();
  ctx.ellipse(-8, -62, 26, 34, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // pulsing veins
  ctx.strokeStyle = phase2 ? "#ff4d63" : "#3c1328";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const a = i * 1.27 + Math.sin(t * 1.5 + i) * 0.08;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 6, -55 + Math.sin(a) * 8);
    ctx.quadraticCurveTo(
      Math.cos(a) * 24, -55 + Math.sin(a) * 30,
      Math.cos(a + 0.3) * 36, -55 + Math.sin(a + 0.3) * 46
    );
    ctx.stroke();
  }

  // eyes track the player
  const pxp = player ? player.x + player.w / 2 - cx : 0;
  const pyp = player ? player.y + player.h / 2 - base : -40;
  const eyes = [
    [-22, -82, 8],
    [16, -88, 10],
    [-5, -69, 6],
    [28, -67, 6],
    [-30, -63, 5],
  ];
  eyes.forEach(([ex, ey, r], i) => {
    const blink = Math.sin(t * 1.3 + i * 2.1) > 0.97 ? 0.2 : 1;
    ctx.fillStyle = flash ? PAL.white : PAL.bone;
    ctx.beginPath();
    ctx.ellipse(ex, ey, r, r * 0.66 * blink, 0, 0, Math.PI * 2);
    ctx.fill();
    if (blink > 0.5) {
      const dx = clamp(pxp / 80, -1, 1) * r * 0.35;
      const dy = clamp(pyp / 40, -1, 1) * r * 0.25;
      ctx.fillStyle = phase2 ? "#ff2038" : PAL.blood;
      ctx.beginPath();
      ctx.arc(ex + dx, ey + dy, r * 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PAL.ink;
      ctx.beginPath();
      ctx.arc(ex + dx, ey + dy, r * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // mouth
  const open = 6 + Math.sin(t * 3.1) * 3 + (b.state === "roar" ? 8 : 0);
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(2, -34, 17, open, 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5b0d20";
  ctx.beginPath();
  ctx.ellipse(2, -33, 14, open * 0.7, 0.04, 0, Math.PI * 2);
  ctx.fill();
  for (let i = -2; i <= 2; i++) {
    px(ctx, i * 6 - 2, -34 - open * 0.55, 3, 5, PAL.bone);
    px(ctx, i * 6 - 1, -34 + open * 0.35, 2, 4, PAL.bone);
  }

  // suit collar / tie at the bottom
  px(ctx, -26, -18, 52, 12, flash ? PAL.white : "#17121f");
  px(ctx, -26, -18, 8, 7, flash ? PAL.white : "#241b30");
  px(ctx, 18, -18, 8, 7, flash ? PAL.white : "#241b30");
  px(ctx, -3, -17, 6, 4, PAL.bone);
  px(ctx, -1, -15, 2, 9, PAL.blood);

  // orbiting coins
  for (let i = 0; i < 4; i++) {
    const a = t * 0.8 + i * Math.PI / 2;
    const ox = Math.cos(a) * 58;
    const oy = -58 + Math.sin(a) * 14;
    px(ctx, ox - 3, oy - 3, 6, 6, PAL.gold2);
    px(ctx, ox - 2, oy - 2, 4, 4, PAL.gold);
    px(ctx, ox - 1, oy - 1, 1, 1, PAL.white);
  }

  // phase transition aura
  if (b.state === "phase") {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.4 + Math.sin(t * 22) * 0.2;
    ctx.strokeStyle = PAL.blood2;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -55, 58 + Math.sin(t * 8) * 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- props

export function drawCheckpoint(ctx, cp, active, t, theme) {
  const x = Math.round(cp.x);
  const y = Math.round(cp.y);
  const glow = active ? 1 : 0.45;
  ctx.save();
  // pole
  px(ctx, x - 1, y - 38, 3, 38, PAL.ink);
  px(ctx, x, y - 37, 1, 35, PAL.steel2);
  // lamp head
  px(ctx, x - 6, y - 44, 13, 6, PAL.ink);
  px(ctx, x - 5, y - 43, 11, 4, active ? PAL.gold : PAL.steel2);
  px(ctx, x - 4, y - 42, 3, 2, active ? PAL.white : PAL.steel);
  // light cone
  ctx.globalCompositeOperation = "lighter";
  const flicker = 0.82 + Math.sin(t * 14 + cp.x) * 0.08;
  const grad = ctx.createLinearGradient(0, y - 42, 0, y + 4);
  grad.addColorStop(0, active ? "rgba(255,200,87,0.28)" : "rgba(140,150,170,0.14)");
  grad.addColorStop(1, "rgba(255,200,87,0)");
  ctx.fillStyle = grad;
  ctx.globalAlpha = flicker * glow;
  ctx.beginPath();
  ctx.moveTo(x - 5, y - 42);
  ctx.lineTo(x + 5, y - 42);
  ctx.lineTo(x + 26, y + 5);
  ctx.lineTo(x - 26, y + 5);
  ctx.closePath();
  ctx.fill();
  // base
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  px(ctx, x - 5, y - 2, 11, 2, PAL.ink);
  ctx.restore();
}

export function drawAltar(ctx, altar, t, active) {
  const x = Math.round(altar.x);
  const y = Math.round(altar.y);
  ctx.save();
  // stone slab
  px(ctx, x - 14, y - 12, 28, 12, PAL.ink);
  px(ctx, x - 13, y - 11, 26, 9, "#2a2032");
  px(ctx, x - 12, y - 12, 24, 2, "#4a3d58");
  px(ctx, x - 10, y - 4, 3, 2, "#1a1420");
  px(ctx, x + 6, y - 5, 3, 2, "#1a1420");
  // candles
  for (const ox of [-9, -2, 8]) {
    px(ctx, x + ox, y - 20, 2, 8, PAL.bone2);
    const f = Math.sin(t * 9 + ox) * 1;
    px(ctx, x + ox, y - 24 - f, 2, 4, PAL.gold);
    px(ctx, x + ox, y - 23 - f, 1, 2, PAL.white);
  }
  // floating scroll
  px(ctx, x - 8, y - 30 + Math.sin(t * 2) * 1, 16, 10, PAL.ink);
  px(ctx, x - 7, y - 29 + Math.sin(t * 2) * 1, 14, 8, PAL.bone2);
  px(ctx, x - 5, y - 27 + Math.sin(t * 2) * 1, 10, 1, PAL.rust);
  px(ctx, x - 5, y - 24 + Math.sin(t * 2) * 1, 7, 1, PAL.rust);
  // red seal
  px(ctx, x + 4, y - 27 + Math.sin(t * 2) * 1, 3, 3, PAL.blood);
  // aura
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = active ? 0.32 : 0.16;
  ctx.fillStyle = PAL.blood;
  ctx.beginPath();
  ctx.ellipse(x, y - 16, 20, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawDoor(ctx, door, t, theme) {
  const x = Math.round(door.x);
  const y = Math.round(door.y);
  ctx.save();
  // frame
  px(ctx, x - 17, y - 52, 34, 52, PAL.ink);
  px(ctx, x - 15, y - 50, 30, 50, theme === "subway" ? "#253040" : "#211a2d");
  px(ctx, x - 13, y - 48, 26, 46, "#0b0812");
  // light from inside
  const pulse = 0.6 + Math.sin(t * 3.3 + x) * 0.15;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = pulse;
  const grad = ctx.createLinearGradient(0, y - 46, 0, y);
  grad.addColorStop(0, "rgba(73,216,198,0.32)");
  grad.addColorStop(1, "rgba(73,216,198,0.02)");
  ctx.fillStyle = grad;
  ctx.fillRect(x - 12, y - 46, 24, 44);
  ctx.globalCompositeOperation = "source-over";
  // stripes
  for (let i = 0; i < 5; i++) px(ctx, x - 10, y - 44 + i * 9, 20, 1, "rgba(73,216,198,0.16)");
  // arrow / label marker
  px(ctx, x - 3, y - 30, 6, 1, PAL.teal);
  px(ctx, x, y - 33, 3, 1, PAL.teal);
  px(ctx, x, y - 27, 3, 1, PAL.teal);
  ctx.restore();
}

export function drawMakima(ctx, npc, t, portrait = false) {
  if (portrait) {
    drawMakimaPortrait(ctx, t);
    return;
  }
  const x = Math.round(npc.x);
  const y = Math.round(npc.y);
  ctx.save();
  shadow(ctx, x, y + 1, 16, 0.35);
  ctx.translate(x, y);
  // legs
  px(ctx, -4, -10, 3, 10, "#141019");
  px(ctx, 1, -10, 3, 10, "#141019");
  px(ctx, -5, -1, 4, 1, PAL.ink);
  px(ctx, 1, -1, 4, 1, PAL.ink);
  // long coat
  px(ctx, -6, -24, 12, 15, "#17121f");
  px(ctx, -5, -23, 10, 13, "#231a2c");
  px(ctx, -2, -22, 4, 9, PAL.bone);
  px(ctx, 0, -22, 1, 7, PAL.blood);
  // collar
  px(ctx, -6, -26, 12, 3, "#17121f");
  // arms
  px(ctx, -8, -22, 2, 10, "#17121f");
  px(ctx, 6, -22, 2, 10, "#17121f");
  // head + hair
  px(ctx, -5, -34, 10, 9, PAL.ink);
  px(ctx, -4, -33, 8, 8, PAL.skin);
  px(ctx, -4, -36, 8, 4, PAL.rust);
  px(ctx, -5, -34, 2, 9, PAL.rust);
  px(ctx, 3, -35, 3, 10, PAL.rust);
  px(ctx, -6, -32, 2, 8, PAL.rust);
  px(ctx, -2, -31, 2, 1, PAL.ink);
  px(ctx, 2, -31, 1, 1, PAL.ink);
  px(ctx, 0, -29, 2, 1, PAL.rust);
  // eyes glow
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.5 + Math.sin(t * 2) * 0.12;
  px(ctx, -3, -31, 2, 1, PAL.gold);
  px(ctx, 2, -31, 2, 1, PAL.gold);
  ctx.restore();
}

function drawMakimaPortrait(ctx, t) {
  ctx.save();
  // portrait frame drawn by overlay; this is just the bust
  px(ctx, 4, 18, 76, 92, "#100d16");
  // neck / shoulders
  px(ctx, 20, 76, 44, 30, "#17121f");
  px(ctx, 30, 84, 24, 20, "#241b30");
  px(ctx, 38, 84, 8, 12, PAL.bone);
  px(ctx, 41, 86, 2, 9, PAL.blood);
  // face
  px(ctx, 24, 30, 36, 46, "#0a0810");
  px(ctx, 26, 32, 32, 42, PAL.skin);
  px(ctx, 28, 28, 28, 8, PAL.skin);
  // hair
  px(ctx, 18, 20, 48, 18, PAL.rust);
  px(ctx, 16, 26, 10, 52, PAL.rust);
  px(ctx, 58, 26, 10, 54, PAL.rust);
  px(ctx, 22, 16, 38, 12, "#a32a3f");
  px(ctx, 24, 18, 34, 5, PAL.rust);
  px(ctx, 26, 22, 4, 48, "#a32a3f");
  px(ctx, 56, 24, 3, 46, "#a32a3f");
  // eyes - unsettling halo
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.5 + Math.sin(t * 1.7) * 0.12;
  px(ctx, 30, 50, 8, 3, PAL.gold);
  px(ctx, 46, 50, 8, 3, PAL.gold);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  px(ctx, 32, 50, 4, 3, PAL.rust);
  px(ctx, 48, 50, 4, 3, PAL.rust);
  px(ctx, 33, 50, 2, 1, PAL.ink);
  px(ctx, 49, 50, 2, 1, PAL.ink);
  // nose / mouth
  px(ctx, 41, 56, 2, 4, PAL.skin2);
  px(ctx, 36, 64, 10, 2, PAL.rust);
  px(ctx, 39, 65, 4, 1, "#6d1627");
  // earrings
  px(ctx, 20, 56, 2, 2, PAL.gold);
  px(ctx, 60, 56, 2, 2, PAL.gold);
  // collar chain
  px(ctx, 28, 78, 28, 2, PAL.gold2);
  for (let i = 0; i < 5; i++) px(ctx, 30 + i * 6, 80, 2, 3, PAL.gold2);
  ctx.restore();
}
