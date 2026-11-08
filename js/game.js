import {
  W, H, clamp, lerp, rand, randInt, overlap, sign, formatTime, PAL,
} from "./util.js";
import { buildLevels } from "./levels.js";
import { Player, Boss, createEnemy, Projectile, Pickup } from "./entities.js";

export const CONTRACTS = [
  {
    id: "dash", name: "BLOOD DASH", cost: 40, debt: 8,
    desc: "K — vanish in a spray of blood. Brief invincibility.",
    flavor: "The Blood Devil asks only for a little.",
  },
  {
    id: "doubleJump", name: "DEVIL WINGS", cost: 55, debt: 10,
    desc: "SPACE — a second jump in mid-air.",
    flavor: "Something flutters where your shadow should be.",
  },
  {
    id: "fox", name: "FOX BITE", cost: 90, debt: 16,
    desc: "L — a monstrous jaw. Costs 1 heart. 8s cooldown.",
    flavor: "The Fox Devil wants your face. Later.",
  },
  {
    id: "katana", name: "KON BLADE", cost: 120, debt: 22,
    desc: "Unlocks the cursed katana and its flying edge. Q to swap.",
    flavor: "A dead man's sword. It still remembers.",
  },
];

export const SHOP_ITEMS = [
  {
    id: "shotgun", name: "BLOOD SHOTGUN", cost: 60,
    desc: "6 shells. Auto-reloads. Q to swap.", repeat: false,
  },
  {
    id: "heart", name: "SPARE HEART", cost: 85,
    desc: "+1 maximum heart. Fully heals.", repeat: false,
  },
  {
    id: "tune", name: "CHAIN TUNE-UP", cost: 70,
    desc: "Chainsaw and katana hit +5 harder.", repeat: false,
  },
  {
    id: "debt", name: "PAY THE DEBT", cost: 45,
    desc: "Reduce debt by 10. Makima keeps the receipt.", repeat: true,
  },
  {
    id: "heal", name: "FIELD STITCHES", cost: 25,
    desc: "Restore 2 hearts.", repeat: true,
  },
];

export class Game {
  constructor(input, sfx) {
    this.input = input;
    this.sfx = sfx;
    this.rooms = buildLevels();
    this.mode = "title";
    this.time = 0;
    this.titleTime = 0;
    this.roomIndex = 0;
    this.room = this.rooms[0];
    this.player = null;
    this.enemies = [];
    this.boss = null;
    this.projectiles = [];
    this.pickups = [];
    this.particles = [];
    this.effects = [];
    this.texts = [];
    this.warnings = [];
    this.camera = { x: 0, y: 0 };
    this.shakeMag = 0;
    this.shakeTime = 0;
    this.flashTime = 0;
    this.flashColor = PAL.white;
    this.hitstop = 0;
    this.fade = 0;
    this.banner = null;
    this.hint = null;
    this.prompt = null;
    this.menuIndex = 0;
    this.message = null;
    this.menuMessage = "";
    this.menuMessageTime = 0;
    this.bossDefeated = false;
    this.best = 0;
    try { this.best = Number(localStorage.getItem("chainsawdebt.best") || 0); } catch {}
    this.debugGod = false;
    this.frame = 0;
    this.resetRunState();
  }

  resetRunState() {
    this.blood = 0;
    this.debt = 0;
    this.kills = 0;
    this.deaths = 0;
    this.elapsed = 0;
    this.contracts = new Set();
    this.weapons = new Set(["chainsaw"]);
    this.weapon = "chainsaw";
    this.upgrades = 0;
    this.interestTimer = 20;
    this.collectorMarks = new Set();
    this.shopBought = new Set();
    this.checkpoint = { roomIndex: 0, x: 74, y: 240 };
    this.bossDefeated = false;
    this.boss = null;
    this.player = null;
    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.particles = [];
    this.effects = [];
    this.texts = [];
    this.warnings = [];
    this.hint = null;
    this.banner = null;
    this.prompt = null;
    this.fade = 0;
    this.hitstop = 0;
    this.menuIndex = 0;
    this.menuMessage = "";
    this.seenHints = new Set();
  }

  startRun() {
    this.sfx.init();
    this.sfx.startMusic("city");
    this.resetRunState();
    this.mode = "play";
    this.loadRoom(0);
    this.player.hp = 5;
    this.player.maxHp = 5;
    this.setHint("A / D  MOVE      SPACE  JUMP      J  ATTACK", 8);
    this.flashScreen(0.35, PAL.bone);
    this.sfx.contract();
  }

  toTitle() {
    this.mode = "title";
    this.sfx.setMusic("city");
  }

  loadRoom(index, spawnOverride) {
    this.roomIndex = index;
    this.room = this.rooms[index];
    this.enemies = this.room.enemies.map((d) => createEnemy({ ...d }));
    this.projectiles = [];
    this.pickups = [];
    this.warnings = [];
    this.boss = null;
    if (this.room.boss && !this.bossDefeated) {
      this.boss = new Boss(this.room.width / 2, this.room.ground);
      this.boss.entered = false;
    }
    const spawn = spawnOverride || this.room.spawn;
    if (!this.player) {
      this.player = new Player(spawn.x, spawn.y);
    } else {
      this.player.x = spawn.x - this.player.w / 2;
      this.player.y = spawn.y - this.player.h;
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.dead = false;
      this.player.attackTimer = 0;
      this.player.dashTimer = 0;
    }
    this.camera.x = clamp(this.player.centerX - W / 2, 0, Math.max(0, this.room.width - W));
    this.camera.y = 0;
    this.banner = {
      title: this.room.name,
      sector: this.room.sector,
      flavor: this.room.flavor,
      t: 0, dur: 3.2,
    };
    this.fade = Math.max(this.fade, 0.7);
    this.sfx.setMusic(index === 2 ? "boss" : "city");
    if (index === 2) {
      setTimeout(() => {
        if (this.mode === "play" && this.roomIndex === 2 && this.boss && !this.boss.dead) {
          this.sfx.bossRoar();
          this.shake(8, 0.8);
        }
      }, 700);
    }
    if (index === 1 && !this.seenHints.has("subway")) {
      this.seenHints.add("subway");
      this.setHint("TAB — OPEN CONTRACTS. POWER NOW. INTEREST LATER.", 7);
    }
  }

  hasContract(id) { return this.contracts.has(id); }

  setHint(text, dur = 5) {
    this.hint = { text, t: 0, dur };
  }

  update(dt) {
    this.time += dt;
    this.frame++;
    if (this.mode === "title") {
      this.titleTime += dt;
      if (this.input.pressed("confirm") || this.input.pressed("jump")) this.startRun();
      if (this.input.pressed("mute")) this.sfx.toggle();
      return;
    }

    if (this.input.pressed("mute")) {
      const muted = this.sfx.toggle();
      this.menuMessage = muted ? "SOUND OFF" : "SOUND ON";
      this.menuMessageTime = 1.2;
    }

    if (this.mode === "play") this.updateWorld(dt);
    else if (this.mode === "contracts") this.updateContracts(dt);
    else if (this.mode === "shop") this.updateShop(dt);
    else if (this.mode === "pause") {
      if (this.input.pressed("pause") || this.input.pressed("back") || this.input.pressed("confirm")) this.mode = "play";
    } else if (this.mode === "dead") {
      this.updateParticles(dt);
      this.texts = this.texts.filter((t) => { t.t += dt; return t.t < t.dur; });
      if (this.input.pressed("confirm") || this.input.pressed("restart") || this.input.pressed("jump")) this.respawn();
      if (this.input.pressed("back")) this.toTitle();
    } else if (this.mode === "win") {
      this.updateParticles(dt);
      if (this.input.pressed("confirm") || this.input.pressed("restart") || this.input.pressed("jump")) this.startRun();
      if (this.input.pressed("back")) this.toTitle();
    }

    this.updateBanner(dt);
    this.menuMessageTime = Math.max(0, this.menuMessageTime - dt);
    this.shakeTime = Math.max(0, this.shakeTime - dt);
    if (this.shakeTime <= 0) this.shakeMag = 0;
    this.flashTime = Math.max(0, this.flashTime - dt);
    this.fade = Math.max(0, this.fade - dt * 2.4);
  }

  updateBanner(dt) {
    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t > this.banner.dur) this.banner = null;
    }
    if (this.hint) {
      this.hint.t += dt;
      if (this.hint.t > this.hint.dur) this.hint = null;
    }
  }

  updateWorld(dt) {
    if (this.hitstop > 0) {
      this.hitstop = Math.max(0, this.hitstop - dt);
      this.updateParticles(dt * 0.25);
      this.texts.forEach((t) => (t.t += dt * 0.3));
      return;
    }
    this.elapsed += dt;
    const p = this.player;
    if (!p) return;

    if (this.input.pressed("contracts")) {
      this.openContracts();
      return;
    }
    if (this.input.pressed("pause")) {
      this.mode = "pause";
      return;
    }

    // weapon swap
    if (this.input.pressed("swap") && this.weapons.size > 1) {
      const list = [...this.weapons];
      const i = list.indexOf(this.player.weapon);
      this.player.weapon = list[(i + 1) % list.length];
      this.player.attackTimer = 0;
      this.sfx.click();
      this.addText(p.centerX, p.y - 8, this.player.weapon.toUpperCase(), PAL.gold, 0.8);
    }

    p.update(dt, this);

    for (const e of this.enemies) if (!e.dead) e.update(dt, this);
    this.enemies = this.enemies.filter((e) => !e.dead);

    if (this.boss && !this.boss.dead) {
      const activeBoss = this.boss;
      activeBoss.update(dt, this);
      if (this.boss === activeBoss && !activeBoss.entered && activeBoss.state !== "intro") {
        activeBoss.entered = true;
        this.banner = { title: "THE DEBT DEVIL", sector: "COLLECTOR CLASS", flavor: "It has come to collect.", t: 0, dur: 2.8 };
      }
    }

    for (const pr of this.projectiles) pr.update(dt, this);
    this.projectiles = this.projectiles.filter((pr) => !pr.dead);

    for (const pk of this.pickups) pk.update(dt, this);
    this.pickups = this.pickups.filter((pk) => !pk.dead);

    this.updateParticles(dt);
    this.updateEffects(dt);
    this.texts = this.texts.filter((t) => { t.t += dt; return t.t < t.dur; });
    this.warnings = this.warnings.filter((w) => { w.t += dt; return w.t < w.dur; });

    // hazards
    for (const hz of this.room.hazards) {
      if (overlap(p.rect, hz) && p.invuln <= 0) {
        p.hurt(1, p.centerX, this);
        p.y = hz.y - p.h - 2;
        p.vy = -310;
      }
    }

    // debt interest
    if (this.debt > 0 && this.debt < 99) {
      this.interestTimer -= dt;
      if (this.interestTimer <= 0) {
        this.interestTimer = 20;
        this.debt = Math.min(99, this.debt + 1);
        this.addText(p.centerX, p.y - 18, "INTEREST +1 DEBT", PAL.gold2, 1.5);
        this.checkCollector();
      }
    }

    // interaction
    this.prompt = this.findInteractable();
    if (this.prompt && this.input.pressed("interact")) this.interact(this.prompt);

    // camera
    const target = clamp(p.centerX - W / 2 + p.facing * 26, 0, Math.max(0, this.room.width - W));
    this.camera.x = lerp(this.camera.x, target, 1 - Math.pow(0.0008, dt));
    this.camera.y = 0;

    // tutorial beats
    if (this.roomIndex === 0 && !this.seenHints.has("intro") && this.elapsed > 1.2) {
      this.seenHints.add("intro");
    }
    if (this.roomIndex === 0 && !this.seenHints.has("altar") && p.x > 260) {
      this.seenHints.add("altar");
      this.setHint("TAB — SIGN A CONTRACT. BLOOD NOW, DEBT FOREVER.", 7);
    }
    if (this.roomIndex === 0 && !this.seenHints.has("talk") && p.x > 150 && p.x < 230) {
      this.seenHints.add("talk");
      this.setHint("E — TALK TO MAKIMA / REST AT LAMPS", 6);
    }
    if (this.roomIndex === 2 && !this.seenHints.has("boss") && this.elapsed > 2) {
      this.seenHints.add("boss");
      this.setHint("IT FLOATS. IT LIES. CUT IT DOWN.", 6);
    }
  }

  updateContracts(dt) {
    const items = CONTRACTS;
    if (this.input.pressed("back") || this.input.pressed("contracts")) { this.mode = "play"; return; }
    if (this.input.pressed("up")) { this.menuIndex = (this.menuIndex - 1 + items.length) % items.length; this.sfx.click(); }
    if (this.input.pressed("down")) { this.menuIndex = (this.menuIndex + 1) % items.length; this.sfx.click(); }
    if (this.input.pressed("confirm") || this.input.pressed("interact") || this.input.pressed("attack")) {
      this.signContract(items[this.menuIndex]);
    }
    this.updateParticles(dt * 0.4);
  }

  signContract(item) {
    if (this.contracts.has(item.id)) {
      this.menuMessage = "ALREADY SIGNED.";
      this.menuMessageTime = 1.4;
      this.sfx.deny();
      return;
    }
    if (this.blood < item.cost) {
      this.menuMessage = `NOT ENOUGH BLOOD — NEED ${item.cost}`;
      this.menuMessageTime = 1.6;
      this.sfx.deny();
      this.shake(2, 0.12);
      return;
    }
    this.blood -= item.cost;
    this.debt = Math.min(99, this.debt + item.debt);
    this.contracts.add(item.id);
    if (item.id === "katana") {
      this.weapons.add("katana");
      this.player.weapon = "katana";
    }
    this.sfx.contract();
    this.flashScreen(0.35, PAL.blood);
    this.shake(4, 0.3);
    this.spawnBlood(this.player.centerX, this.player.centerY, 20, PAL.blood2);
    this.menuMessage = `${item.name} SIGNED. DEBT +${item.debt}.`;
    this.menuMessageTime = 2;
    this.checkCollector();
  }

  openContracts() {
    this.mode = "contracts";
    this.menuIndex = 0;
    this.menuMessage = "";
    this.sfx.click();
  }

  updateShop(dt) {
    const items = SHOP_ITEMS;
    if (this.input.pressed("back") || this.input.pressed("interact")) { this.mode = "play"; return; }
    if (this.input.pressed("up")) { this.menuIndex = (this.menuIndex - 1 + items.length) % items.length; this.sfx.click(); }
    if (this.input.pressed("down")) { this.menuIndex = (this.menuIndex + 1) % items.length; this.sfx.click(); }
    if (this.input.pressed("confirm") || this.input.pressed("attack")) this.buy(items[this.menuIndex]);
    this.updateParticles(dt * 0.4);
  }

  buy(item) {
    const sold = !item.repeat && this.shopBought.has(item.id);
    if (sold) {
      this.menuMessage = "SOLD OUT.";
      this.menuMessageTime = 1.2;
      this.sfx.deny();
      return;
    }
    if (item.id === "heal" && this.player.hp >= this.player.maxHp) {
      this.menuMessage = "YOU'RE ALREADY STITCHED.";
      this.menuMessageTime = 1.4;
      this.sfx.deny();
      return;
    }
    if (item.id === "debt" && this.debt <= 0) {
      this.menuMessage = "NO DEBT. SUSPICIOUS.";
      this.menuMessageTime = 1.4;
      this.sfx.deny();
      return;
    }
    if (this.blood < item.cost) {
      this.menuMessage = `NOT ENOUGH BLOOD — NEED ${item.cost}`;
      this.menuMessageTime = 1.5;
      this.sfx.deny();
      return;
    }
    this.blood -= item.cost;
    if (!item.repeat) this.shopBought.add(item.id);
    if (item.id === "shotgun") {
      this.weapons.add("shotgun");
      this.player.weapon = "shotgun";
      this.player.ammo = 6;
    } else if (item.id === "heart") {
      this.player.maxHp++;
      this.player.hp = this.player.maxHp;
    } else if (item.id === "tune") {
      this.upgrades++;
    } else if (item.id === "debt") {
      this.debt = Math.max(0, this.debt - 10);
    } else if (item.id === "heal") {
      this.player.heal(2);
    }
    this.sfx.coin();
    this.sfx.pickup();
    this.menuMessage = `${item.name} — DONE.`;
    this.menuMessageTime = 1.8;
    this.spawnSpark(this.player.centerX, this.player.centerY, 8);
  }

  findInteractable() {
    const p = this.player;
    const px = p.centerX;
    let best = null;
    let bestD = 30;
    for (const cp of this.room.checkpoints) {
      const d = Math.abs(px - cp.x) + Math.abs(p.y + p.h - cp.y) * 0.35;
      if (d < bestD) { best = { type: "checkpoint", x: cp.x, y: cp.y, label: "REST  [E]" }; bestD = d; }
    }
    for (const a of this.room.altars) {
      const d = Math.abs(px - a.x) + Math.abs(p.y + p.h - a.y) * 0.35;
      if (d < bestD) { best = { type: "altar", x: a.x, y: a.y, label: "DEVIL CONTRACTS  [E]" }; bestD = d; }
    }
    for (const n of this.room.npcs) {
      const d = Math.abs(px - n.x) + Math.abs(p.y + p.h - n.y) * 0.35;
      if (d < bestD) { best = { type: "npc", x: n.x, y: n.y, label: "MAKIMA  [E]" }; bestD = d; }
    }
    for (const door of this.room.doors) {
      const d = Math.abs(px - door.x) + Math.abs(p.y + p.h - door.y) * 0.35;
      if (d < bestD) { best = { type: "door", x: door.x, y: door.y, to: door.to, label: `${door.label}  [E]` }; bestD = d; }
    }
    return best;
  }

  interact(it) {
    if (it.type === "checkpoint") {
      this.checkpoint = { roomIndex: this.roomIndex, x: it.x, y: it.y };
      this.player.heal(this.player.maxHp);
      this.sfx.checkpoint();
      this.spawnSpark(it.x, it.y - 30, 14);
      this.addText(it.x, it.y - 44, "CHECKPOINT", PAL.gold, 1.4);
      if (this.room.boss && !this.bossDefeated) {
        this.boss = new Boss(this.room.width / 2, this.room.ground);
      }
      this.enemies = this.room.enemies.map((d) => createEnemy({ ...d }));
      this.fade = 0.25;
    } else if (it.type === "altar") {
      this.openContracts();
    } else if (it.type === "npc") {
      this.mode = "shop";
      this.menuIndex = 0;
      this.menuMessage = "";
      this.sfx.click();
    } else if (it.type === "door") {
      this.fade = 0.8;
      this.loadRoom(it.to);
    }
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += (p.gravity || 0) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === "dust") p.vx *= 0.96;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    if (this.particles.length > 420) this.particles.splice(0, this.particles.length - 420);
  }

  updateEffects(dt) {
    for (const e of this.effects) e.t += dt;
    this.effects = this.effects.filter((e) => e.t < e.dur);
  }

  spawnParticle(x, y, vx, vy, life, color, size = 1, gravity = 0, type = "blood") {
    this.particles.push({ x, y, vx, vy, life, maxLife: life, color, size, gravity, type });
  }

  spawnBlood(x, y, n = 8, color = PAL.blood) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(30, 170);
      this.spawnParticle(
        x + rand(-4, 4), y + rand(-4, 4),
        Math.cos(a) * s, Math.sin(a) * s - 50,
        rand(0.3, 0.85), Math.random() < 0.25 ? PAL.blood2 : color,
        randInt(1, 2), 620, "blood"
      );
    }
  }

  spawnSpark(x, y, n = 5) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(30, 130);
      this.spawnParticle(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.12, 0.35), Math.random() < 0.5 ? PAL.gold : PAL.bone, 1, 180, "spark");
    }
  }

  spawnDust(x, y, n = 6) {
    for (let i = 0; i < n; i++) {
      this.spawnParticle(
        x + rand(-6, 6), y - rand(0, 4),
        rand(-40, 40), rand(-60, -10),
        rand(0.25, 0.6), PAL.bone2, randInt(1, 2), -10, "dust"
      );
    }
  }

  addText(x, y, text, color = PAL.bone, dur = 0.8, size = 1) {
    this.texts.push({ x, y, text, color, t: 0, dur, size });
  }

  addEffect(e) {
    e.t = e.t || 0;
    e.dur = e.dur || 0.3;
    this.effects.push(e);
  }

  spawnWarning(x, y, w, h, dur, type = "coin") {
    this.warnings.push({ x, y, w, h, t: 0, dur, type });
  }

  shake(mag, time) {
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeTime = Math.max(this.shakeTime, time);
  }

  flashScreen(time, color = PAL.white) {
    this.flashTime = time;
    this.flashColor = color;
  }

  enemyContact(enemy) {
    if (!this.player || this.player.dead || this.mode !== "play") return false;
    return this.player.hurt(enemy.contactDamage || 1, enemy.centerX, this);
  }

  meleeHit(player) {
    const weapon = player.weapon;
    if (weapon === "shotgun") return;
    const heavy = player.attackIndex === 2;
    let range = weapon === "katana" ? 43 : 31 + player.attackIndex * 3;
    if (heavy) range += 4;
    let damage = weapon === "katana"
      ? (heavy ? 26 : 17)
      : (heavy ? 16 : 9);
    damage += this.upgrades * 5;
    const box = {
      x: player.facing > 0 ? player.x + player.w - 2 : player.x - range + 2,
      y: player.y + 1,
      w: range,
      h: 19,
    };
    let hits = 0;
    for (const e of this.enemies) {
      if (e.dead || !overlap(box, e.rect)) continue;
      e.hurt(damage, this, player.facing);
      hits++;
    }
    if (this.boss && !this.boss.dead && overlap(box, this.boss.rect)) {
      this.boss.hurt(damage, this);
      hits++;
    }
    for (const pr of this.projectiles) {
      if (!pr.friendly && overlap(box, pr.rect)) {
        pr.dead = true;
        this.spawnSpark(pr.x, pr.y, 3);
      }
    }
    if (hits) {
      this.sfx.hit();
      this.hitstop = 0.045;
      this.shake(weapon === "katana" ? 3 : 2, 0.1);
      this.spawnSpark(box.x + box.w * 0.6, box.y + 8, 3);
    }
  }

  fireShotgun(player) {
    const x = player.centerX + player.facing * 10;
    const y = player.y + 9;
    for (let i = -1; i <= 1; i++) {
      this.projectiles.push(new Projectile({
        x, y: y + i * 1.5,
        vx: player.facing * 430,
        vy: i * 26,
        type: "pellet", friendly: true, life: 0.5,
      }));
    }
    for (let i = 0; i < 8; i++) {
      this.spawnParticle(
        x, y,
        player.facing * rand(60, 220), rand(-60, 60),
        rand(0.08, 0.22), Math.random() < 0.5 ? PAL.gold : PAL.white,
        1, 0, "spark"
      );
    }
    this.addEffect({ type: "muzzle", x, y, facing: player.facing, t: 0, dur: 0.1 });
  }

  slashWave(player) {
    if (player.attackIndex !== 2) return;
    this.projectiles.push(new Projectile({
      x: player.centerX + player.facing * 16,
      y: player.y + 2,
      vx: player.facing * 300,
      vy: 0,
      type: "wave", friendly: true, life: 0.55,
    }));
   }

  foxBite(player) {
    const cx = player.centerX + player.facing * 48;
    const cy = player.y + 6;
    this.addEffect({ type: "fox", x: cx, y: cy, facing: player.facing, t: 0, dur: 0.55 });
    const box = {
      x: player.facing > 0 ? player.centerX : player.centerX - 96,
      y: player.y - 34,
      w: 96,
      h: 90,
    };
    for (const e of this.enemies) {
      if (!e.dead && overlap(box, e.rect)) e.hurt(55 + this.upgrades * 4, this, player.facing);
    }
    if (this.boss && !this.boss.dead && overlap(box, this.boss.rect)) {
      this.boss.hurt(60 + this.upgrades * 4, this);
    }
    for (let i = 0; i < 26; i++) {
      this.spawnParticle(cx + rand(-50, 50), cy + rand(-20, 40), rand(-90, 90), rand(-150, 60), rand(0.2, 0.7), Math.random() < 0.5 ? PAL.blood : PAL.bone, randInt(1, 2), 500);
    }
    this.hitstop = 0.08;
  }

  spawnProjectile(o) {
    this.projectiles.push(new Projectile(o));
  }

  spawnEnemyAt(type, x, ground, fromBoss = false) {
    const e = createEnemy({ type, x, y: ground });
    if (type === "collector") {
      e.x = clamp(x, 40, this.room.width - 40);
      e.y = 70;
    }
    this.enemies.push(e);
    this.spawnBlood(e.centerX, e.centerY, 8, PAL.blood);
    if (fromBoss) this.addEffect({ type: "portal", x: e.centerX, y: e.centerY, t: 0, dur: 0.45 });
    return e;
  }

  checkCollector() {
    const marks = [25, 55, 85];
    for (const mark of marks) {
      if (this.debt >= mark && !this.collectorMarks.has(mark) && this.roomIndex !== 2) {
        this.collectorMarks.add(mark);
        const p = this.player;
        this.spawnEnemyAt("collector", clamp(p.centerX + (p.facing > 0 ? 140 : -140), 50, this.room.width - 50), 0, true);
        this.banner = { title: "DEBT COLLECTOR", sector: "INTEREST DUE", flavor: "It can smell your credit.", t: 0, dur: 3 };
        this.sfx.bossRoar();
        this.shake(6, 0.5);
        this.flashScreen(0.25, PAL.gold);
        break;
      }
    }
  }

  onEnemyKilled(enemy) {
    this.kills++;
    const n = clamp(Math.round((enemy.blood || 10) / 3), 2, 5);
    let left = enemy.blood || 10;
    for (let i = 0; i < n; i++) {
      const val = i === n - 1 ? left : Math.max(1, Math.floor((enemy.blood || 10) / n));
      left -= val;
      this.pickups.push(new Pickup(enemy.centerX + rand(-6, 6), enemy.centerY + rand(-6, 6), val, "blood"));
    }
    if (Math.random() < (enemy.type === "katana" ? 0.3 : 0.12)) {
      this.pickups.push(new Pickup(enemy.centerX, enemy.centerY, 1, "heart"));
    }
    this.spawnBlood(enemy.centerX, enemy.centerY, 20, PAL.blood);
    this.spawnDust(enemy.centerX, enemy.y + enemy.h, 6);
    this.addEffect({ type: "death", x: enemy.centerX, y: enemy.centerY, t: 0, dur: 0.3 });
    this.shake(3.5, 0.16);
    this.sfx.hit();
    this.sfx.rev();
  }

  onPlayerDeath() {
    if (this.mode !== "play") return;
    this.mode = "dead";
    this.deaths++;
    this.debt = Math.min(99, this.debt + 3);
    this.blood = Math.floor(this.blood * 0.7);
    this.sfx.death();
    this.flashScreen(0.7, PAL.blood);
    this.shake(12, 0.8);
    this.spawnBlood(this.player.centerX, this.player.centerY, 34, PAL.blood2);
  }

  respawn() {
    const cp = this.checkpoint;
    if (cp.roomIndex !== this.roomIndex) {
      this.loadRoom(cp.roomIndex);
    } else {
      this.loadRoom(this.roomIndex);
    }
    this.player.hp = this.player.maxHp;
    this.player.invuln = 1.4;
    this.player.x = cp.x - this.player.w / 2;
    this.player.y = cp.y - this.player.h;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.facing = 1;
    this.player.dead = false;
    this.mode = "play";
    this.fade = 0.9;
    this.flashScreen(0.3, PAL.bone);
    this.banner = { title: "RISE AGAIN", sector: "DEBT OUTLIVES YOU", flavor: "The devil keeps the change.", t: 0, dur: 2.6 };
    this.sfx.checkpoint();
  }

  onBossDefeated() {
    if (this.mode !== "play") return;
    this.bossDefeated = true;
    this.mode = "win";
    this.blood += 150;
    this.boss = null;
    this.flashScreen(1.1, PAL.bone);
    this.shake(16, 1.5);
    this.sfx.win();
    if (!this.best || this.elapsed < this.best) {
      this.best = this.elapsed;
      try { localStorage.setItem("chainsawdebt.best", String(this.best)); } catch {}
    }
  }

  get rank() {
    if (this.debt <= 24 && this.deaths === 0) return "S";
    if (this.debt <= 40) return "A";
    if (this.debt <= 60) return "B";
    if (this.debt <= 80) return "C";
    return "D";
  }

  get rankFlavor() {
    const r = this.rank;
    return {
      S: "THE CHAINSAW HEART BEATS CLEAN.",
      A: "A GOOD DEAL. ALMOST.",
      B: "THE INTEREST IS MANAGEABLE.",
      C: "YOU PAID IN PIECES.",
      D: "YOU ARE THE COLLATERAL.",
    }[r];
  }

  get timeText() { return formatTime(this.elapsed); }
  get bestText() { return this.best ? formatTime(this.best) : "--:--"; }
}
