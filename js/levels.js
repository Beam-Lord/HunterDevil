// Hand-authored rooms. Coordinates are in pixels at the internal 480x272
// resolution. Platform `y` is the walkable top surface; entity `y` is the
// ground surface unless noted otherwise.
export function buildLevels() {
  const rooms = [];

  rooms.push({
    name: "SHIBUYA BACKSTREETS",
    sector: "SECTOR 01",
    flavor: "The yakuza are dead. Their debts are not.",
    theme: "city",
    width: 1120,
    height: 272,
    ground: 240,
    solids: [{ x: 0, y: 240, w: 1120, h: 32 }],
    platforms: [
      { x: 198, y: 196, w: 76, h: 8 },
      { x: 304, y: 164, w: 62, h: 8 },
      { x: 430, y: 198, w: 96, h: 8 },
      { x: 562, y: 158, w: 74, h: 8 },
      { x: 680, y: 200, w: 78, h: 8 },
      { x: 810, y: 166, w: 108, h: 8 },
      { x: 962, y: 198, w: 62, h: 8 },
    ],
    hazards: [],
    checkpoints: [{ x: 74, y: 240 }],
    altars: [{ x: 350, y: 240 }],
    npcs: [{ x: 188, y: 240, type: "makima" }],
    doors: [{ x: 1090, y: 240, to: 1, label: "LINE 13" }],
    spawn: { x: 62, y: 240 },
    enemies: [
      { type: "zombie", x: 470, y: 240 },
      { type: "bat", x: 566, y: 116 },
      { type: "zombie", x: 736, y: 240 },
      { type: "katana", x: 872, y: 240 },
      { type: "bat", x: 1016, y: 98 },
    ],
    neon: [
      { x: 232, y: 112, text: "PAWN", color: "teal" },
      { x: 544, y: 84, text: "DEVIL", color: "blood" },
      { x: 932, y: 122, text: "24H", color: "gold" },
    ],
    details: [
      { type: "puddle", x: 150, w: 58 },
      { type: "puddle", x: 640, w: 74 },
      { type: "puddle", x: 900, w: 46 },
      { type: "vending", x: 690 },
      { type: "barrel", x: 1030 },
    ],
  });

  rooms.push({
    name: "MEAT GRINDER LINE",
    sector: "SECTOR 02",
    flavor: "The last train runs on blood.",
    theme: "subway",
    width: 1440,
    height: 272,
    ground: 240,
    solids: [
      { x: 0, y: 240, w: 288, h: 32 },
      { x: 352, y: 240, w: 256, h: 32 },
      { x: 672, y: 240, w: 304, h: 32 },
      { x: 1040, y: 240, w: 400, h: 32 },
    ],
    platforms: [
      { x: 118, y: 196, w: 66, h: 8 },
      { x: 230, y: 156, w: 56, h: 8 },
      { x: 408, y: 194, w: 82, h: 8 },
      { x: 518, y: 150, w: 64, h: 8 },
      { x: 700, y: 196, w: 72, h: 8 },
      { x: 810, y: 154, w: 96, h: 8 },
      { x: 922, y: 196, w: 54, h: 8 },
      { x: 1090, y: 194, w: 80, h: 8 },
      { x: 1192, y: 150, w: 72, h: 8 },
      { x: 1300, y: 194, w: 64, h: 8 },
    ],
    hazards: [
      { x: 288, y: 248, w: 64, h: 24 },
      { x: 608, y: 248, w: 64, h: 24 },
      { x: 976, y: 248, w: 64, h: 24 },
    ],
    checkpoints: [{ x: 760, y: 240 }],
    altars: [{ x: 1180, y: 240 }],
    npcs: [],
    doors: [
      { x: 24, y: 240, to: 0, label: "SURFACE" },
      { x: 1410, y: 240, to: 2, label: "FORECLOSURE" },
    ],
    spawn: { x: 46, y: 240 },
    enemies: [
      { type: "zombie", x: 430, y: 240 },
      { type: "bat", x: 480, y: 104 },
      { type: "zombie", x: 552, y: 240 },
      { type: "katana", x: 724, y: 240 },
      { type: "bat", x: 850, y: 90 },
      { type: "zombie", x: 906, y: 240 },
      { type: "bat", x: 1120, y: 108 },
      { type: "zombie", x: 1210, y: 240 },
      { type: "katana", x: 1332, y: 240 },
    ],
    neon: [
      { x: 370, y: 100, text: "LINE 13", color: "teal" },
      { x: 1090, y: 96, text: "NO REFUNDS", color: "blood" },
    ],
    details: [
      { type: "puddle", x: 180, w: 60 },
      { type: "puddle", x: 740, w: 50 },
      { type: "puddle", x: 1240, w: 64 },
    ],
  });

  rooms.push({
    name: "THE FORECLOSURE",
    sector: "SECTOR 03",
    flavor: "Every contract comes due.",
    theme: "boss",
    width: 560,
    height: 272,
    ground: 240,
    boss: "debtDevil",
    solids: [{ x: 0, y: 240, w: 560, h: 32 }],
    platforms: [
      { x: 62, y: 194, w: 100, h: 8 },
      { x: 398, y: 194, w: 100, h: 8 },
    ],
    hazards: [],
    checkpoints: [{ x: 40, y: 240 }],
    altars: [],
    npcs: [],
    doors: [],
    spawn: { x: 54, y: 240 },
    enemies: [],
    neon: [],
    details: [],
  });

  return rooms;
}
