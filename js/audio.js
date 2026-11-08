// Tiny procedural sound engine. Everything is synthesized, so the build has
// no external assets and still has kicks, chainsaw growls and boss roars.
export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.musicTimer = null;
    this.step = 0;
    this.mode = "city";
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);
    this.noiseBuf = this.makeNoise(1.2);
  }

  get ok() {
    return !!this.ctx && !this.muted;
  }

  makeNoise(seconds) {
    const rate = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, rate * seconds, rate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  toggle() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.55;
    return this.muted;
  }

  tone(freq, dur, type = "square", vol = 0.12, slide = 0, delay = 0) {
    if (!this.ok) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(dur = 0.15, vol = 0.18, filter = 1200, delay = 0, type = "lowpass", sweep = 0) {
    if (!this.ok) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(filter, t);
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(80, filter + sweep), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  jump() { this.tone(240, 0.12, "square", 0.05, 160); }
  doubleJump() { this.tone(330, 0.16, "triangle", 0.06, 240); }
  slash() {
    this.noise(0.08, 0.1, 2200, 0, "bandpass", -1200);
    this.tone(130, 0.07, "sawtooth", 0.05, -60);
  }
  rev() {
    this.tone(70, 0.28, "sawtooth", 0.09, 90);
    this.noise(0.25, 0.06, 500, 0, "lowpass", 500);
  }
  shotgun() {
    this.noise(0.22, 0.28, 1700, 0, "lowpass", -1500);
    this.tone(70, 0.2, "square", 0.12, -40);
  }
  hit() {
    this.noise(0.07, 0.16, 1700, 0, "bandpass", -900);
    this.tone(180, 0.05, "square", 0.07, -90);
  }
  hurt() {
    this.noise(0.24, 0.2, 900, 0, "lowpass", -650);
    this.tone(120, 0.28, "sawtooth", 0.1, -70);
  }
  pickup() { this.tone(740, 0.06, "triangle", 0.05, 240); this.tone(1110, 0.09, "triangle", 0.035, 180, 0.045); }
  dash() { this.noise(0.18, 0.14, 2800, 0, "bandpass", -2200); this.tone(200, 0.1, "sawtooth", 0.04, 120); }
  coin() { this.tone(980, 0.06, "square", 0.04, 0); this.tone(1320, 0.1, "square", 0.03, 0, 0.04); }
  contract() {
    [196, 247, 294, 392].forEach((f, i) => this.tone(f, 0.55, "triangle", 0.055, 0, i * 0.08));
    this.noise(0.5, 0.05, 500, 0, "lowpass", 900);
  }
  deny() { this.tone(110, 0.18, "square", 0.08, -40); this.tone(105, 0.2, "square", 0.06, -30, 0.1); }
  checkpoint() {
    [392, 523, 659].forEach((f, i) => this.tone(f, 0.4, "sine", 0.05, 0, i * 0.09));
  }
  death() {
    this.tone(220, 0.9, "sawtooth", 0.11, -170);
    this.noise(0.9, 0.14, 800, 0, "lowpass", -600);
  }
  bossRoar() {
    this.tone(52, 1.2, "sawtooth", 0.16, 24);
    this.tone(78, 1.0, "square", 0.08, -22, 0.08);
    this.noise(1.1, 0.12, 380, 0, "lowpass", 500);
  }
  win() {
    [262, 330, 392, 523, 659].forEach((f, i) => this.tone(f, 0.8, "triangle", 0.07, 0, i * 0.13));
  }
  click() { this.tone(520, 0.05, "square", 0.035, 80); }
  beam() {
    this.tone(90, 0.55, "sawtooth", 0.12, 30);
    this.noise(0.5, 0.12, 2400, 0, "bandpass", -1000);
  }

  startMusic(mode = "city") {
    this.init();
    this.mode = mode;
    if (this.musicTimer) return;
    this.step = 0;
    this.musicTimer = setInterval(() => this.tick(), 250);
  }

  tick() {
    if (!this.ok || !this.ctx) return;
    this.step = (this.step + 1) % 32;
    const s = this.step;
    const boss = this.mode === "boss";
    const root = boss ? 55 : 49; // A1 / G1-ish
    const pattern = boss
      ? [0, 0, 3, 0, 5, 3, 0, -2]
      : [0, 0, 7, 0, 3, 0, 5, 3];
    if (s % 2 === 0) {
      const semi = pattern[(s / 2) % pattern.length];
      const f = root * Math.pow(2, semi / 12);
      this.tone(f, boss ? 0.22 : 0.3, "triangle", boss ? 0.06 : 0.045);
    }
    if (boss && s % 4 === 0) this.tone(root * 2, 0.1, "square", 0.025, 0);
    if (!boss && s % 8 === 4) this.tone(root * 4, 0.5, "sine", 0.02, 12);
  }

  setMusic(mode) {
    this.mode = mode;
  }
}
