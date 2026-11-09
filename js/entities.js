import {
  PAL, clamp, approach, overlap, rand, randInt, sign, dist,
} from "./util.js";

const GRAVITY = 1050;
const MAX_FALL = 540;

function solidsFor(room) {
  return room.solids;
}

export class Player {
  constructor(x, surfaceY) {
    this.w = 12;
    this.h = 20;
    this.x = x - this.w / 2;
    this.y = surfaceY - this.h;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.onGround = false;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.jumps = 0;
    this.maxJumps = 1;
    this.animTime = 0;
    this.invuln = 0;
    this.hurtFlash = 0;
    this.dashTimer = 0;
    this.dashCd = 0;
    this.dashDir = 1;
    this.attackTimer = 0;
    this.attackDur = 0.22;
    this.attackIndex = 0;
    this.comboTimer = 0;
    this.meleeTimer = 0;
    this.meleeDone = true;
    this.specialCd = 0;
    this.weapon = "chainsaw";
    this.ammo = 6;
    this.maxAmmo = 6;
    this.reload = 0;
    this.hp = 5;
    this.maxHp = 5;
    this.dead = false;
    this.trailTimer = 0;
  }

  get centerX() { return this.x + this.w / 2; }
  get centerY() { return this.y + this.h / 2; }
  get rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  update(dt, game) {
    const input = game.input;
    this.animTime += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 5);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.specialCd = Math.max(0, this.specialCd - dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);

    if (this.attackTimer > 0) {
      this.attackTimer -= dt;
      if (this.meleeTimer > 0) {
        this.meleeTimer -= dt;
        if (this.meleeTimer <= 0 && !this.meleeDone) {
          this.meleeDone = true;
          game.meleeHit(this);
        }
      }
    }

    const canAct = game.mode === "play";
    const axis = canAct ? input.axis() : 0;
    if (axis !== 0 && this.dashTimer <= 0) this.facing = axis;
    if (axis !== 0) this.facing = axis;

    // --- dash
    if (canAct && input.pressed("dash") && game.hasContract("dash") && this.dashCd <= 0 && this.dashTimer <= 0) {
      this.dashTimer = 0.16;
      this.dashCd = 0.62;
      this.dashDir = this.facing;
      this.invuln = Math.max(this.invuln, 0.24);
      this.vx = this.dashDir * 340;
      this.vy = 0;
      game.sfx.dash();
      game.shake(2.5, 0.12);
      game.addEffect({ type: "dash", x: this.centerX, y: this.centerY, facing: this.dashDir, t: 0, dur: 0.22 });
    }

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.vx = this.dashDir * 340;
      this.vy = 0;
      this.trailTimer -= dt;
      if (this.trailTimer <= 0) {
        this.trailTimer = 0.035;
        game.addEffect({ type: "afterimage", x: this.x, y: this.y, facing: this.facing, t: 0, dur: 0.28 });
      }
      if (this.dashTimer <= 0) this.vx = this.dashDir * 120;
    } else {
      // --- ground movement
      const accel = this.onGround ? 1500 : 900;
      const speed = this.attackTimer > 0 ? 70 : 132;
      if (axis !== 0) {
        this.vx = approach(this.vx, axis * speed, accel * dt);
      } else {
        this.vx = approach(this.vx, 0, (this.onGround ? 1900 : 300) * dt);
      }

      // --- jumping
      if (canAct && input.pressed("jump")) this.jumpBuffer = 0.12;
      this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
      if (this.onGround) { this.coyote = 0.1; this.jumps = this.maxJumps; }
      else this.coyote = Math.max(0, this.coyote - dt);

      if (this.jumpBuffer > 0) {
        if (this.coyote > 0) {
          this.vy = -352;
          this.onGround = false;
          this.coyote = 0;
          this.jumpBuffer = 0;
          this.jumps = game.hasContract("doubleJump") ? 1 : 0;
          game.sfx.jump();
          game.spawnDust(this.centerX, this.y + this.h, 5);
        } else if (game.hasContract("doubleJump") && this.jumps > 0) {
          this.jumps--;
          this.vy = -315;
          this.jumpBuffer = 0;
          game.sfx.doubleJump();
          game.addEffect({ type: "doublejump", x: this.centerX, y: this.y + this.h, t: 0, dur: 0.3 });
          game.spawnDust(this.centerX, this.y + this.h, 7);
        }
      }
      if (!input.down("jump") && this.vy < -120) this.vy += 1500 * dt;

      // --- attacks
      if (canAct && input.pressed("attack") && this.attackTimer <= 0) this.startAttack(game);
      if (canAct && input.pressed("special")) this.special(game);

      this.vy = Math.min(this.vy + GRAVITY * dt, MAX_FALL);
    }

    // ammo regeneration
    if (this.weapon === "shotgun" && this.ammo < this.maxAmmo) {
      this.reload += dt;
      if (this.reload >= 0.72) {
        this.reload = 0;
        this.ammo++;
        game.sfx.click();
      }
    }

    this.moveAndCollide(dt, game);

    if (this.y > game.room.height + 40) game.handleFall();
    if (this.invuln > 0) this.hurtFlash = 1;
  }

  startAttack(game) {
    const weapon = this.weapon;
    if (weapon === "shotgun") {
      if (this.ammo <= 0) {
        game.sfx.deny();
        game.addText(this.centerX, this.y - 4, "EMPTY", PAL.steel, 0.7);
        return;
      }
      this.ammo--;
      this.reload = 0;
      this.attackTimer = 0.24;
      this.attackDur = 0.24;
      this.attackIndex = 0;
      this.meleeDone = true;
      this.vx -= this.facing * 70;
      game.sfx.shotgun();
      game.shake(3.5, 0.18);
      game.fireShotgun(this);
      return;
    }

    if (this.comboTimer > 0) this.attackIndex = (this.attackIndex + 1) % 3;
    else this.attackIndex = 0;
    const heavy = this.attackIndex === 2;
    this.attackDur = weapon === "katana" ? (heavy ? 0.34 : 0.25) : heavy ? 0.34 : 0.23;
    this.attackTimer = this.attackDur;
    this.meleeTimer = 0.06;
    this.meleeDone = false;
    this.comboTimer = 0;
    this.vx += this.facing * (heavy ? 110 : 55);
    game.sfx.slash();
    if (heavy) game.sfx.rev();
    if (weapon === "katana") game.slashWave(this);
  }

  special(game) {
    if (!game.hasContract("fox")) {
      game.addText(this.centerX, this.y - 6, "NO PACT", PAL.steel2, 0.8);
      return;
    }
    if (this.specialCd > 0 || this.hp <= 1) {
      game.sfx.deny();
      return;
    }
    this.hp -= 1;
    this.specialCd = 8;
    this.invuln = Math.max(this.invuln, 0.35);
    game.foxBite(this);
    game.sfx.bossRoar();
    game.shake(7, 0.5);
    game.hitstop = 0.09;
  }

  moveAndCollide(dt, game) {
    const room = game.room;
    const prevBottom = this.y + this.h;
    this.x += this.vx * dt;
    this.x = clamp(this.x, 0, room.width - this.w);
    for (const s of solidsFor(room)) {
      if (!overlap(this, s)) continue;
      if (this.vx > 0) this.x = s.x - this.w;
      else if (this.vx < 0) this.x = s.x + s.w;
      this.vx = 0;
    }

    this.y += this.vy * dt;
    this.onGround = false;
    for (const s of solidsFor(room)) {
      if (!overlap(this, s)) continue;
      if (this.vy >= 0 && prevBottom <= s.y + 4) {
        this.y = s.y - this.h;
        this.vy = 0;
        this.onGround = true;
      } else if (this.vy < 0) {
        this.y = s.y + s.h;
        this.vy = 0;
      } else {
        if (this.x + this.w / 2 < s.x + s.w / 2) this.x = s.x - this.w;
        else this.x = s.x + s.w;
      }
    }
    for (const p of room.platforms) {
      if (!overlap(this, p)) continue;
      if (this.vy >= 0 && prevBottom <= p.y + 3) {
        this.y = p.y - this.h;
        this.vy = 0;
        this.onGround = true;
      }
    }
    if (this.onGround && this.jumpBuffer > 0) this.jumps = game.hasContract("doubleJump") ? 1 : 0;
  }

  hurt(amount, sourceX, game) {
    if (game.debugGod) return false;
    if (this.invuln > 0 || this.dashTimer > 0) return false;
    this.hp -= amount;
    this.invuln = 1.05;
    this.hurtFlash = 1;
    this.vx = sign(this.x - sourceX) * 170;
    this.vy = -200;
    this.attackTimer = 0;
    game.sfx.hurt();
    game.shake(6, 0.32);
    game.hitstop = 0.07;
    game.spawnBlood(this.centerX, this.centerY, 14, PAL.blood);
    game.addText(this.centerX, this.y - 4, `-${amount}`, PAL.blood2, 0.9);
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      game.onPlayerDeath();
    }
    return true;
  }

  heal(n) {
    this.hp = Math.min(this.maxHp, this.hp + n);
  }
}

// ------------------------------------------------------------------ enemies

function walkerPhysics(e, dt, room) {
  const prevBottom = e.y + e.h;
  e.x += e.vx * dt;
  for (const s of solidsFor(room)) {
    if (!overlap(e, s)) continue;
    if (e.vx > 0) e.x = s.x - e.w;
    else if (e.vx < 0) e.x = s.x + s.w;
    e.vx = 0;
  }
  e.vy = Math.min(e.vy + GRAVITY * dt, MAX_FALL);
  e.y += e.vy * dt;
  e.onGround = false;
  for (const s of solidsFor(room)) {
    if (!overlap(e, s)) continue;
    if (e.vy >= 0 && prevBottom <= s.y + 4) {
      e.y = s.y - e.h;
      e.vy = 0;
      e.onGround = true;
    } else if (e.vy < 0) {
      e.y = s.y + s.h;
      e.vy = 0;
    }
  }
  for (const p of room.platforms) {
    if (!overlap(e, p)) continue;
    if (e.vy >= 0 && prevBottom <= p.y + 3) {
      e.y = p.y - e.h;
      e.vy = 0;
      e.onGround = true;
    }
  }
}

function roomFloorAt(room, x, y) {
  for (const s of room.solids) {
    if (x >= s.x && x <= s.x + s.w && Math.abs(y - s.y) < 8) return true;
  }
  return false;
}

class Enemy {
  constructor(def) {
    this.type = def.type;
    this.spawnX = def.x;
    this.x = def.x;
    this.y = def.y;
    this.vx = 0;
    this.vy = 0;
    this.w = 14;
    this.h = 20;
    this.hp = 24;
    this.maxHp = 24;
    this.facing = -1;
    this.flash = 0;
    this.dead = false;
    this.onGround = false;
    this.animTime = Math.random() * 10;
    this.seed = Math.random() * 10;
    this.contactDamage = 1;
    this.lungeTimer = 0;
    this.lungeCd = 0;
    this.shootCd = 1.2;
    this.state = "idle";
    this.stateTimer = 0;
    this.dashDir = -1;
    this.deathBurst = 10;
  }

  get rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  get centerX() { return this.x + this.w / 2; }
  get centerY() { return this.y + this.h / 2; }

  update(dt, game) {
    this.flash = Math.max(0, this.flash - dt);
    this.animTime += dt;
    this.lungeCd = Math.max(0, this.lungeCd - dt);
    if (this.type === "zombie") this.updateZombie(dt, game);
    else if (this.type === "bat") this.updateBat(dt, game);
    else if (this.type === "katana") this.updateKatana(dt, game);
    else if (this.type === "collector") this.updateCollector(dt, game);
    else if (this.type === "leech") this.updateLeech(dt, game);
    else if (this.type === "spitter") this.updateSpitter(dt, game);

    if (overlap(this.rect, game.player.rect)) {
      game.enemyContact(this);
    }
  }

  updateZombie(dt, game) {
    const p = game.player;
    const dx = p.centerX - this.centerX;
    const d = Math.abs(dx);
    if (d < 170 && Math.abs(p.centerY - this.centerY) < 70) {
      this.facing = sign(dx);
      if (this.lungeTimer > 0) {
        this.lungeTimer -= dt;
        this.vx = this.facing * 190;
      } else if (d > 26) {
        this.vx = approach(this.vx, this.facing * 46, 500 * dt);
        if (this.lungeCd <= 0 && d < 48) {
          this.lungeTimer = 0.2;
          this.lungeCd = 1.5;
          this.vx = this.facing * 190;
        }
      } else {
        this.vx = approach(this.vx, 0, 700 * dt);
      }
    } else {
      if (this.vx === 0) this.vx = this.facing * 18;
      if (this.centerX < this.spawnX - 36) this.facing = 1;
      if (this.centerX > this.spawnX + 36) this.facing = -1;
      this.vx = approach(this.vx, this.facing * 22, 300 * dt);
      const ahead = this.centerX + this.facing * 12;
      if (this.onGround && !roomFloorAt(game.room, ahead, this.y + this.h + 2)) {
        this.facing *= -1;
        this.vx = 0;
      }
    }
    walkerPhysics(this, dt, game.room);
    this.contactDamage = 1;
  }

  updateBat(dt, game) {
    const p = game.player;
    this.facing = sign(p.centerX - this.centerX);
    const d = dist(this.centerX, this.centerY, p.centerX, p.centerY);
    const targetY = d < 210
      ? p.y - 34 + Math.sin(this.animTime * 3.2 + this.seed) * 10
      : this.y + Math.sin(this.animTime * 2 + this.seed) * 16;
    const speed = d < 210 ? 68 : 26;
    this.vx = approach(this.vx, this.facing * speed, 260 * dt);
    this.vy = approach(this.vy, clamp((targetY - this.y) * 2.2, -90, 90), 300 * dt);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.x = clamp(this.x, 4, game.room.width - this.w - 4);
    this.y = clamp(this.y, 46, 220);
    this.contactDamage = 1;
  }

  updateKatana(dt, game) {
    const p = game.player;
    const dx = p.centerX - this.centerX;
    const d = Math.abs(dx);
    this.facing = sign(dx);
    this.stateTimer -= dt;
    if (this.state === "idle") {
      if (d < 150 && Math.abs(p.centerY - this.centerY) < 70) {
        if (d > 42) this.vx = approach(this.vx, this.facing * 58, 500 * dt);
        else this.vx = approach(this.vx, 0, 800 * dt);
        if (d < 112 && this.stateTimer <= 0) {
          this.state = "windup";
          this.stateTimer = 0.46;
          this.vx = 0;
        }
      } else {
        this.vx = approach(this.vx, 0, 500 * dt);
      }
    } else if (this.state === "windup") {
      this.vx = 0;
      if (this.stateTimer <= 0) {
        this.state = "dash";
        this.stateTimer = 0.2;
        this.dashDir = this.facing;
        game.sfx.dash();
      }
    } else if (this.state === "dash") {
      this.vx = this.dashDir * 370;
      if (this.stateTimer <= 0) {
        this.state = "recover";
        this.stateTimer = 0.55;
        this.vx = 0;
      }
    } else if (this.state === "recover") {
      this.vx = approach(this.vx, 0, 800 * dt);
      if (this.stateTimer <= 0) {
        this.state = "idle";
        this.stateTimer = 1.15;
      }
    }
    walkerPhysics(this, dt, game.room);
    this.contactDamage = this.state === "dash" ? 2 : 1;
    this.vx = clamp(this.vx, -400, 400);
  }

  updateLeech(dt, game) {
    const p = game.player;
    const dx = p.centerX - this.centerX;
    const d = Math.abs(dx);
    this.facing = sign(dx);
    this.stateTimer = Math.max(0, this.stateTimer - dt);
    if (this.state === "leap") {
      this.vx = this.facing * 118;
      if (this.onGround && this.vy === 0 && this.stateTimer < 0.34) {
        this.state = "recover";
        this.stateTimer = 0.55;
      }
    } else if (this.state === "recover") {
      this.vx = approach(this.vx, 0, 500 * dt);
      if (this.stateTimer <= 0) this.state = "stalk";
    } else {
      if (d < 175 && Math.abs(p.centerY - this.centerY) < 70) {
        this.vx = approach(this.vx, this.facing * 30, 320 * dt);
        if (d < 112 && this.stateTimer <= 0 && this.onGround) {
          this.state = "leap";
          this.stateTimer = 0.62;
          this.vy = -215;
        }
      } else {
        this.vx = approach(this.vx, this.facing * 14, 180 * dt);
        if (this.centerX < this.spawnX - 40 || this.centerX > this.spawnX + 40) this.facing *= -1;
      }
    }
    walkerPhysics(this, dt, game.room);
    this.contactDamage = this.state === "leap" ? 2 : 1;
  }

  updateSpitter(dt, game) {
    const p = game.player;
    const dx = p.centerX - this.centerX;
    const d = Math.abs(dx);
    this.facing = sign(dx);
    const targetY = p.y - 28 + Math.sin(this.animTime * 2.4 + this.seed) * 13;
    const targetX = p.centerX - this.w / 2 - this.facing * 112;
    this.vx = approach(this.vx, clamp((targetX - this.x) * 1.15, -52, 52), 180 * dt);
    this.vy = approach(this.vy, clamp((targetY - this.y) * 1.5, -46, 46), 220 * dt);
    this.x = clamp(this.x + this.vx * dt, 8, game.room.width - this.w - 8);
    this.y = clamp(this.y + this.vy * dt, 52, 196);
    this.shootCd -= dt;
    if (this.shootCd <= 0 && d < 280) {
      this.shootCd = 1.8;
      const a = Math.atan2(p.centerY - this.centerY, p.centerX - this.centerX);
      game.spawnProjectile({
        x: this.centerX, y: this.centerY,
        vx: Math.cos(a) * 118, vy: Math.sin(a) * 118,
        damage: 1, type: "thorn", friendly: false, gravity: 28, life: 3,
      });
    }
    this.contactDamage = 1;
  }

  updateCollector(dt, game) {
    const p = game.player;
    this.facing = sign(p.centerX - this.centerX);
    const targetX = p.centerX - this.w / 2 + Math.sin(this.animTime * 1.3 + this.seed) * 50;
    const targetY = p.y - 70 + Math.sin(this.animTime * 1.7 + this.seed) * 12;
    this.vx = approach(this.vx, clamp((targetX - this.x) * 1.4, -65, 65), 200 * dt);
    this.vy = approach(this.vy, clamp((targetY - this.y) * 1.6, -55, 55), 240 * dt);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.x = clamp(this.x, 6, game.room.width - this.w - 6);
    this.y = clamp(this.y, 40, 200);
    this.shootCd -= dt;
    if (this.shootCd <= 0 && Math.abs(p.centerX - this.centerX) < 260) {
      this.shootCd = 1.45;
      game.sfx.coin();
      for (let i = -1; i <= 1; i++) {
        const a = Math.atan2(p.centerY - this.centerY, p.centerX - this.centerX) + i * 0.14;
        game.spawnProjectile({
          x: this.centerX, y: this.centerY + 6,
          vx: Math.cos(a) * 145, vy: Math.sin(a) * 145,
          damage: 1, type: "coin", friendly: false, gravity: 150, life: 3.4,
        });
      }
    }
    this.contactDamage = 2;
  }

  hurt(dmg, game, dir = 1) {
    if (this.dead) return;
    this.hp -= dmg;
    this.flash = 0.09;
    this.vx += dir * 50;
    game.addText(this.centerX, this.y - 2, String(dmg), PAL.gold, 0.65, 1.2);
    game.spawnBlood(this.centerX, this.centerY, 5, PAL.blood);
    if (this.hp <= 0) this.die(game);
  }

  die(game) {
    if (this.dead) return;
    this.dead = true;
    game.onEnemyKilled(this);
  }
}

export function createEnemy(def) {
  const e = new Enemy(def);
  if (def.type === "zombie") {
    e.w = 14; e.h = 20; e.hp = 26; e.maxHp = 26;
    e.y = def.y - e.h;
    e.x = def.x - e.w / 2;
    e.blood = 10;
  } else if (def.type === "bat") {
    e.w = 16; e.h = 12; e.hp = 18; e.maxHp = 18;
    e.x = def.x; e.y = def.y;
    e.blood = 8;
  } else if (def.type === "katana") {
    e.w = 16; e.h = 24; e.hp = 70; e.maxHp = 70;
    e.y = def.y - e.h;
    e.x = def.x - e.w / 2;
    e.blood = 24;
    e.stateTimer = 0;
  } else if (def.type === "collector") {
    e.w = 18; e.h = 22; e.hp = 55; e.maxHp = 55;
    e.x = def.x; e.y = def.y;
    e.blood = 45;
    e.shootCd = 1.1;
  } else if (def.type === "leech") {
    e.w = 18; e.h = 14; e.hp = 34; e.maxHp = 34;
    e.x = def.x - e.w / 2; e.y = def.y - e.h;
    e.blood = 14;
    e.state = "stalk";
  } else if (def.type === "spitter") {
    e.w = 20; e.h = 20; e.hp = 38; e.maxHp = 38;
    e.x = def.x - e.w / 2; e.y = def.y;
    e.blood = 18;
    e.shootCd = 1.4;
  }
  return e;
}

// ------------------------------------------------------------------ boss

export class Boss {
  constructor(x, ground) {
    this.w = 88;
    this.h = 100;
    this.x = x - this.w / 2;
    this.y = 118;
    this.hp = 300;
    this.maxHp = 300;
    this.phase = 1;
    this.state = "intro";
    this.stateTimer = 2.2;
    this.attackCd = 1.4;
    this.flash = 0;
    this.dead = false;
    this.facing = 1;
    this.ground = ground;
    this.vx = 0;
    this.beamTimer = 0;
    this.beamTick = 0;
    this.dyingTimer = 0;
    this.lastAttack = "";
    this.contactDamage = 1;
    this.explodeTimer = 0;
    this.roar = 0;
    this.entered = false;
  }

  get rect() {
    return { x: this.x + 6, y: this.y + 8, w: this.w - 12, h: this.h - 8 };
  }
  get centerX() { return this.x + this.w / 2; }
  get centerY() { return this.y + this.h / 2; }

  update(dt, game) {
    this.flash = Math.max(0, this.flash - dt);
    this.stateTimer -= dt;
    this.roar = Math.max(0, this.roar - dt);
    const p = game.player;
    this.facing = sign(p.centerX - this.centerX);
    this.x = clamp(this.x, 8, game.room.width - this.w - 8);

    if (this.state === "intro") {
      if (this.stateTimer <= 0) {
        this.state = "idle";
        this.attackCd = 1.2;
      }
    } else if (this.state === "idle") {
      this.vx = approach(this.vx, 0, 400 * dt);
      this.y = 118 + Math.sin(game.time * 2.1) * 3;
      this.attackCd -= dt;
      if (this.attackCd <= 0) this.chooseAttack(game);
    } else if (this.state === "coinRain") {
      this.y = 118 + Math.sin(game.time * 3) * 4;
      if (this.stateTimer <= 0) this.toIdle(1.35);
    } else if (this.state === "summon") {
      if (this.stateTimer <= 0) this.toIdle(1.5);
    } else if (this.state === "chargeWind") {
      this.vx = 0;
      if (this.stateTimer <= 0) {
        this.state = "charge";
        this.stateTimer = 0.85;
        this.vx = this.facing * 255;
        game.sfx.bossRoar();
        game.shake(5, 0.5);
      }
    } else if (this.state === "charge") {
      this.x += this.vx * dt;
      game.spawnDust(this.centerX, this.ground, 2);
      if (this.stateTimer <= 0 || this.x <= 8 || this.x >= game.room.width - this.w - 8) {
        this.state = "stunned";
        this.stateTimer = 1.1;
        this.vx = 0;
        game.shake(9, 0.5);
        game.sfx.hit();
        game.spawnDust(this.centerX, this.ground, 16);
      }
    } else if (this.state === "stunned") {
      this.vx = 0;
      if (this.stateTimer <= 0) this.toIdle(0.9);
    } else if (this.state === "beamWind") {
      this.vx = 0;
      if (this.stateTimer <= 0) {
        this.state = "beam";
        this.stateTimer = 0.5;
        this.beamTimer = 0.5;
        game.sfx.beam();
        game.shake(8, 0.6);
      }
    } else if (this.state === "beam") {
      this.beamTimer = Math.max(0, this.beamTimer - dt);
      if (this.stateTimer <= 0) {
        this.beamTimer = 0;
        this.toIdle(1.15);
      }
    } else if (this.state === "phase") {
      if (this.stateTimer <= 0) {
        this.phase = 2;
        this.state = "idle";
        this.attackCd = 0.7;
        game.sfx.bossRoar();
        game.shake(12, 0.8);
        game.flashScreen(0.6, PAL.blood);
      }
    } else if (this.state === "dying") {
      this.dyingTimer -= dt;
      this.vx = 0;
      this.explodeTimer -= dt;
      if (this.explodeTimer <= 0) {
        this.explodeTimer = 0.24;
        const ex = this.x + rand(10, this.w - 10);
        const ey = this.y + rand(10, this.h - 10);
        game.spawnBlood(ex, ey, 12, PAL.blood2);
        game.addEffect({ type: "explosion", x: ex, y: ey, t: 0, dur: 0.45 });
        game.shake(4, 0.2);
        game.sfx.hit();
      }
      if (this.dyingTimer <= 0) game.onBossDefeated();
    }

    if (this.state === "coinRain") {
      this.coinTimer = (this.coinTimer || 0) - dt;
      if (this.coinTimer <= 0) {
        this.coinTimer = 0.16;
        const cx = rand(40, game.room.width - 40);
        game.spawnWarning(cx - 9, this.ground - 56, 18, 56, 0.55);
        game.spawnProjectile({
          x: cx, y: this.y - 10, vx: rand(-30, 30), vy: 60,
          damage: 1, type: "bossCoin", friendly: false, gravity: 360, life: 4,
        });
      }
    }

    if (this.state === "beam") {
      const beam = { x: 0, y: this.ground - 18, w: game.room.width, h: 18 };
      if (overlap(beam, p.rect)) {
        p.hurt(2, this.centerX, game);
        p.vy = -180;
      }
    }

    if (!["dying", "stunned"].includes(this.state) && overlap(this.rect, p.rect)) {
      game.enemyContact(this);
    }
    this.contactDamage = this.state === "charge" ? 2 : 1;
  }

  chooseAttack(game) {
    const attacks = ["coinRain", "charge", "beam", "summon"];
    let pick = attacks[Math.floor(Math.random() * attacks.length)];
    if (pick === this.lastAttack) pick = attacks[(attacks.indexOf(pick) + 1) % attacks.length];
    this.lastAttack = pick;
    game.sfx.bossRoar();
    if (pick === "coinRain") {
      this.state = "coinRain";
      this.stateTimer = 1.9;
      this.coinTimer = 0;
      this.roar = 0.5;
    } else if (pick === "charge") {
      this.state = "chargeWind";
      this.stateTimer = 0.6;
      this.roar = 0.6;
    } else if (pick === "beam") {
      this.state = "beamWind";
      this.stateTimer = 0.75;
      this.roar = 0.7;
      game.spawnWarning(0, this.ground - 18, game.room.width, 18, 0.75, "beam");
    } else {
      this.state = "summon";
      this.stateTimer = 1.1;
      for (const side of [-1, 1]) {
        const sx = clamp(this.centerX + side * 90, 30, game.room.width - 30);
        game.spawnEnemyAt("zombie", sx, this.ground, true);
      }
    }
  }

  toIdle(cd) {
    this.state = "idle";
    this.attackCd = cd;
  }

  hurt(dmg, game) {
    if (this.dead || this.state === "dying") return;
    this.hp -= dmg;
    this.flash = 0.07;
    game.addText(this.centerX + rand(-16, 16), this.y + 30, String(dmg), PAL.gold, 0.7, 1.3);
    game.spawnBlood(this.centerX + rand(-20, 20), this.y + rand(20, 70), 6, PAL.blood);
    if (this.state === "stunned") {
      // bonus damage window
      this.hp -= Math.floor(dmg * 0.25);
      game.addText(this.centerX, this.y + 12, "OPEN!", PAL.gold, 0.8, 1.3);
    }
    if (this.phase === 1 && this.hp <= this.maxHp * 0.5 && this.state !== "phase") {
      this.state = "phase";
      this.stateTimer = 1.6;
      this.vx = 0;
      this.beamTimer = 0;
      game.flashScreen(0.5, PAL.blood);
      game.shake(10, 1.2);
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = "dying";
      this.dyingTimer = 3.2;
      // Keep updating/rendering the death animation; the boss is removed by
      // onBossDefeated() when the timer expires.
      this.beamTimer = 0;
      game.flashScreen(0.8, PAL.bone);
      game.shake(14, 1.5);
      game.sfx.death();
    }
  }
}

// ------------------------------------------------------------------ props

export class Projectile {
  constructor(o) {
    Object.assign(this, {
      w: 6, h: 4, life: 2, gravity: 0, friendly: false,
      type: "coin", damage: 1, dead: false, pierce: false,
    }, o);
    if (this.type === "pellet") { this.w = 8; this.h = 3; this.damage = 4; this.friendly = true; this.gravity = 0; }
    if (this.type === "wave") { this.w = 12; this.h = 16; this.damage = 10; this.friendly = true; this.gravity = 0; }
    if (this.type === "coin") { this.w = 5; this.h = 5; this.gravity = 140; }
    if (this.type === "bossCoin") { this.w = 6; this.h = 6; this.damage = 1; this.gravity = 360; }
  }

  get rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }

  update(dt, game) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    if (this.gravity) this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.x < -30 || this.x > game.room.width + 30 || this.y > game.room.height + 30) {
      this.dead = true;
      return;
    }
    if (this.friendly) {
      if (this.type === "pellet" || this.type === "wave") {
        for (const s of game.room.solids) {
          if (overlap(this.rect, s)) { this.dead = true; game.spawnSpark(this.x, this.y, 3); return; }
        }
        for (const e of game.enemies) {
          if (!e.dead && overlap(this.rect, e.rect)) {
            e.hurt(this.damage, game, sign(this.vx));
            game.sfx.hit();
            game.hitstop = 0.025;
            this.dead = true;
            return;
          }
        }
        const b = game.boss;
        if (b && !b.dead && overlap(this.rect, b.rect)) {
          b.hurt(this.damage, game);
          game.sfx.hit();
          game.hitstop = 0.025;
          this.dead = true;
        }
      }
    } else {
      const p = game.player;
      if (overlap(this.rect, p.rect)) {
        const hit = p.hurt(this.damage, this.x, game);
        if (hit) {
          game.spawnSpark(this.x, this.y, 5);
          this.dead = true;
        }
      }
    }
  }
}

export class Pickup {
  constructor(x, y, value, type = "blood") {
    this.x = x; this.y = y; this.vx = rand(-65, 65); this.vy = rand(-170, -70);
    this.w = 5; this.h = 5; this.value = value; this.type = type;
    this.life = 9; this.magnet = false; this.dead = false; this.landed = false;
    this.phase = rand(0, 6);
  }
  get rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  update(dt, game) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    this.phase += dt;
    const p = game.player;
    const d = dist(this.x, this.y, p.centerX, p.centerY);
    if (this.life < 7.4 || d < 90) this.magnet = true;
    if (this.magnet) {
      const a = Math.atan2(p.centerY - this.y, p.centerX - this.x);
      const pull = 380;
      this.vx = approach(this.vx, Math.cos(a) * pull, 900 * dt);
      this.vy = approach(this.vy, Math.sin(a) * pull, 900 * dt);
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (d < 13) {
        this.dead = true;
        if (this.type === "heart") {
          game.player.heal(1);
          game.addText(p.centerX, p.y - 6, "+1", PAL.blood2, 0.9);
          game.sfx.pickup();
        } else {
          game.addBlood(this.value);
          game.sfx.pickup();
        }
        game.spawnSpark(this.x, this.y, 2);
      }
      return;
    }
    this.vy = Math.min(this.vy + 700 * dt, 400);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx = approach(this.vx, 0, 160 * dt);
    const prevBottom = this.y - this.vy * dt + this.h;
    for (const s of game.room.solids) {
      if (overlap(this.rect, s) && this.vy > 0 && prevBottom <= s.y + 3) {
        this.y = s.y - this.h;
        this.vy = -this.vy * 0.28;
        this.vx *= 0.5;
        this.landed = true;
        if (Math.abs(this.vy) < 20) this.vy = 0;
      }
    }
  }
}
