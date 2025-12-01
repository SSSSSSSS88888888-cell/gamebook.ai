
import { PlayerStats, WeaponType, EnemyDefinition, WeaponDefinition, Book } from "./types";

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const COLORS = {
  bg: '#1c1917', // Dark warm black (Fallback)
  tatamiLight: '#4a4036', // Worn Tatami (lit)
  tatamiDark: '#352e26', // Worn Tatami (shadow)
  tatamiBorder: '#1a1512', // Tatami border
  player: '#dc2626', // Red accent
  shadow: '#171717', 
  kempei: '#3f4c3b', // Drab military green
  boss: '#7f1d1d', 
  text: '#e5e5e5', 
  uiBg: 'rgba(10, 10, 12, 0.9)',
  exp: '#34d399', // Spirit Orb Green
  damage: '#ffffff',
  crit: '#fbbf24',
  dignityBar: '#991b1b',
  debuffSlow: '#60a5fa',
  debuffDef: '#f59e0b',
  debuffGuilt: '#737373',
  debuffPoison: '#a21caf',
  debuffConfused: '#ec4899'
};

// Buffed Initial Stats
export const INITIAL_PLAYER_STATS: PlayerStats = {
  maxHp: 50, 
  hpRegen: 1, 
  meleeDamage: 5, 
  rangedDamage: 0,
  attackSpeed: 0,
  speed: 3.2, 
  armor: 0,
  critChance: 5,
  range: 15
};

export const WEAPON_DEFINITIONS: {[key in WeaponType]: WeaponDefinition} = {
  [WeaponType.PEN]: {
    name: 'G-Pen (Gペン)',
    description: '【手動】インクを振り撒き、広範囲を切り裂く。',
    baseDamage: 15, 
    baseCooldown: 25, 
    scaling: 'meleeDamage',
    color: '#ffffff',
    range: 55, // Shortened slightly
    isManual: true
  },
  [WeaponType.KATANA]: {
    name: 'Cursed Blade (妖刀)',
    description: '【手動】怨念を纏った広範囲斬撃。',
    baseDamage: 30,
    baseCooldown: 45,
    scaling: 'meleeDamage',
    color: '#ef4444',
    range: 110,
    isManual: true
  },
  [WeaponType.PISTOL]: {
    name: 'Type-14 (南部十四年式)',
    description: '【手動】将校用拳銃による射撃。',
    baseDamage: 15,
    baseCooldown: 20,
    scaling: 'rangedDamage',
    color: '#fbbf24',
    range: 450,
    isManual: true
  },
  [WeaponType.BOTTLE]: {
    name: 'Medicinal Sake (薬酒)',
    description: '【自動】毒霧を撒き、敵を鈍らせる。',
    baseDamage: 8,
    baseCooldown: 80,
    scaling: 'rangedDamage',
    color: '#60a5fa',
    range: 200,
    isManual: false
  },
  [WeaponType.BOOK]: {
    name: 'Forbidden Text (禁書)',
    description: '【自動】読む者の精神を蝕み防御を下げる。',
    baseDamage: 3,
    baseCooldown: 0, // Constant
    scaling: 'rangedDamage', 
    color: '#a855f7',
    range: 120,
    isManual: false
  },
  [WeaponType.YOSHIKO]: {
    name: 'Guardian Spirit (守護霊)',
    description: '【自動】白い幻影が周囲を回転し守る。',
    baseDamage: 6,
    baseCooldown: 0, // Constant orbit
    scaling: 'rangedDamage',
    color: '#f472b6',
    range: 70,
    isManual: false
  },
  [WeaponType.SHUKI]: {
    name: 'Memoir Pages (手記)',
    description: '【自動】傷つくほど強くなる手記の切れ端。',
    baseDamage: 8,
    baseCooldown: 50,
    scaling: 'rangedDamage',
    color: '#fef3c7',
    range: 300,
    isManual: false
  },
  [WeaponType.KAMEN]: {
    name: 'False Mask (仮面)',
    description: '【自動】敵弾を吸収し反射する道化の仮面。',
    baseDamage: 0,
    baseCooldown: 0,
    scaling: 'rangedDamage',
    color: '#e879f9',
    range: 50,
    isManual: false
  }
};

export const WAVE_DURATION_SECONDS = 45; // Shortened waves for better pacing
export const WAVE_DURATION = 60 * WAVE_DURATION_SECONDS; 
export const MAX_ENEMIES = 800; 

// Sprite Scale
export const SPRITE_SCALE = 3; 

// High Contrast Dark Fantasy Palette
export const SPRITE_PALETTE: {[key: string]: string} = {
  '.': 'transparent',
  'X': '#050505', // Deep Black (Uniform)
  'W': '#e5e5e5', // Pale Skin / White
  'R': '#991b1b', // Dark Red / Scarf
  'B': '#172554', // Dark Blue
  'H': '#1a1a1a', // Hair / Black
  'G': '#525252', // Grey/Metal
  'Y': '#fbbf24', // Gold / Buttons / Eyes
  'S': '#3f4c3b', // Military Green
  'P': '#a855f7', // Spirit Purple
  'C': '#713f12', // Leather/Wood
  'F': '#e0c0a0', // Skin (Slightly pale)
  'M': '#be185d', // Pink/Magenta
  'D': '#374151', // Dark Grey (Shadows)
  'L': '#16a34a', // Leaf/Bottle Green
  'V': '#7f1d1d', // Vivid Red (Blood/Enrage)
};

// 20+ Enemy Types Sprites (Redesigned for Clarity)
export const SPRITES = {
  // Player: Gakuran Student (Based on provided image, holding items, slightly hunched)
  PLAYER: [
    "......HHHH......",
    ".....HHHHHH.....",
    "....HHHHHHHH....",
    "...HHHFFFFHHH...", 
    "...HHFBFBFFFH...", // Face with dark eyes
    "....HFFFFFHH....", 
    ".....WWWWW......", // White Collar
    "....XXXXXXX.....", // Gakuran Shoulders
    "...XXXXXXXXX....", 
    "..L...XYX..C....", // L=Bottle, C=Pen/Brush
    "..LL..XYX..C....", // Holding items
    "..LL..XYX..CC...", 
    "..LLXXXXXXXX....",
    "...XXXXXXXXX....",
    "...XXXXXXXXX....", // Long coat
    "...XXXXXXXXX....",
    "....XX...XX.....", // Legs
    "....XX...XX.....", 
    "....XX...XX.....", 
    "...BB.....BB....", // Shoes
  ],
  // Shadow: Ink Blot Monster with Red Eyes
  SHADOW: [
    "......XXX.......",
    "....XXXXXXX.....",
    "...XXRRXRXXXX...",
    "..XXXXXXXXXXX...",
    "..XXXXXXXXXXX...",
    "...XXXXXXXXX....",
    "....XXXXXXX.....",
    ".....XX.XX......" 
  ],
  // Kempei: Distinct Hat & Sword
  KEMPEI: [
    ".....SSSSS......",
    "....SSSSSSS.....",
    "....SSYYYSS.....", // Gold badge
    "....FFFFFFF.....",
    "...SSSSSSSSS....",
    "..SSSYSSSYSSS...",
    "..SSSGSSSSGSS...", // Sword
    "..SSSSSSSSSSS...",
    "..CCCC..CCCC...." // Boots
  ],
  // Ghost: Pale & Wispy
  GHOST: [
    "................",
    ".....WWWWW......",
    "....WWWWWWW.....",
    "...WWXWWWXWW....",
    "...WWWWWWWWW....",
    "...WWWWWWWWW....",
    "....WW...WW.....",
    ".....W...W......"
  ],
  EDITOR: [ 
    ".....HHHHH......",
    "....HHFFFHH.....",
    "....GGGGG.......", // Glasses
    "...SSSSSSSSS....", // Suit
    "..SSWWWSWWWSS...",
    "..SSWWWSWWWSS...",
    "..SSSSSSSSSSS...",
    "..SSSS.SSSS....."
  ],
  DEBT: [
    ".....HHHHH......",
    "....HHHHHHH.....",
    "....FFFFFFF.....",
    "....XXXXXXX.....", // Black Kimono
    "...XXXXXXXXX....",
    "..XXXXXXXXXXX...",
    "..XXXXXXXXXXX...",
    "...XXXX.XXXX...." 
  ],
  // Hannya: Red Mask
  HANNYA: [
    "................",
    "..M..M...M..M...", // Horns
    "..MMMMMMMMMMM...",
    ".MMMYYYMYYYMMM..",
    ".MMMMMMMMMMMMM..",
    "..MMMMMMMMMMM...",
    "...MM.....MM....",
    "................"
  ],
  DOG: [ 
    "................",
    "................",
    "....XXXX........",
    "..XXXXXXXXX.....",
    ".XXXXXXXXXX.....",
    ".XX..XXXXXX.....",
    ".....X...X......",
    ".....X...X......" 
  ], 
  CROW: [ 
    "................",
    "...XXX..........",
    "..XXXXX.........",
    ".XXXXXXX........",
    "....XXX.........",
    "....X.X.........",
    "................" 
  ], 
  RICKSHAW: [ 
    "....HHH.........",
    "...HHHHH........",
    "..BBBBBBB.......", // Blue Happi
    "..BBEBEBB.......",
    "...BBBBB........",
    "..F.F.F.F.......",
    ".F..F.F..F......",
    "C...C.C...C....." 
  ], 
  SOLDIER: [ 
    ".....KKK........",
    "....KKKKK.......",
    "....FFFFF.......",
    "....KKKKK.......", // Khaki
    "...KKKKKKK......",
    "..KKKKKKKKK.....",
    "..KKK...KKK.....",
    "..CC.....CC....." 
  ], 
  GEISHA: [ 
    ".....HHH........",
    "....HHHHH.......",
    "....WWWWW.......", // White face
    "....MMMMM.......", // Pink Kimono
    "...MMMMMMM......",
    "..MMMMMMMMM.....",
    "..MMM...MMM.....",
    "................" 
  ], 
  BURGLAR: [ 
    ".....GGG........", // Tenugui
    "....GGGGG.......",
    "....GGGGG.......", 
    "....FFFFF.......",
    "....GGGGG.......", // Karakusa pattern
    "...GGGGGGG......",
    "..GGG...GGG.....",
    "................" 
  ], 
  STUDENT: [ 
    ".....HHH........",
    "....HHHHH.......",
    "....FFFFF.......",
    "....BBBBB.......", // Student Uniform
    "...BBBBBBB......",
    "..BBB...BBB.....",
    "..BB.....BB.....",
    "................" 
  ], 
  DETECTIVE: [ 
    ".....CCC........", // Brown hat
    "....CCCCC.......",
    "....FFFFF.......",
    "....CCCCC.......", // Brown coat
    "...CCCCCCC......",
    "..CCC...CCC.....",
    "..CC.....CC.....",
    "................" 
  ],
  WIFE: [ ".....HHH........", "....HHHHH.......", "....FFFFF.......", "....PPPPP.......", "...PPPPPPP......", "..PPP...PPP.....", "................", "................" ], 
  FATHER: [ ".....HHH........", "....HHHHH.......", "....FFFFF.......", "....XXXXX.......", "...XXXXXXX......", "..XXX...XXX.....", "..XX.....XX.....", "................" ], 
  CRITIC: [ ".....HHH........", "....HHHHH.......", "....GGGGG.......", "....GGGGG.......", "....FFFFF.......", "....SSSSS.......", "...SSSSSSS......", "..SS.....SS....." ], 
  MOGA: [ ".....HHH........", "....HHHHH.......", "....FFFFF.......", "....MMMMM.......", "...MMMMMMM......", "..MM.....MM.....", ".MM.......MM....", "................" ], 
  TEACHER: [ ".....HHH........", "....HHHHH.......", "....FFFFF.......", "....GGGGG.......", "...GGGGGGG......", "..GGG...GGG.....", "..GG.....GG.....", "................" ], 
  POLICE: [ ".....HHH........", "....HHHHH.......", "....FFFFF.......", "....SSSSS.......", "...SSSSSSS......", "..SSS...SSS.....", "..SS.....SS.....", "................" ], 
  // New Enemies
  TEMPTER: [
    ".....HHHHH......",
    "....HHH.HH......",
    "....FFFFFF......",
    "...M.MMMM.M.....", // Flashy kimono
    "..M.MMMMMM.M....",
    "..LL.MMMM.LL....", // Holding bottle (LL)
    "..MM.MMMM.MM....",
    ".....MM.MM......"
  ],
  MORPHINE: [
    "................",
    ".....HHHH.......",
    "....HHHHHH......",
    "....SSSSSS......", // Skinny/Skeleton (Using S for grey-ish tone)
    "...SS.SS.SS.....",
    "...SS.SS.SS.....",
    "...SS....G......", // Needle (Grey)
    "..DD......DD...."
  ],
  
  // Big Boss Sprite
  BOSS: [ 
    "......XXXX......",
    "....XXXXXXXX....",
    "...XXRRXXRRXX...", // Big Red Eyes
    "..XXRRXXRRXXXX..", 
    "..XXXXXXXXXXXX..",
    "..XXXXXXXXXXXX..",
    "RRRRRRRRRRRRRRRR", // Blood/Tentacles
    "RRRRRRRRRRRRRRRR",
    "RRR..RRRRRR..RRR",
    ".....RR..RR....."
  ],

  // --- LEMON GAME SPRITES ---
  LEMON: [
    "................",
    "......LLLL......",
    ".....YYYYYY.....",
    "....YYYYYYYY....",
    "....YYYYYYYY....",
    "....YYYYYYYY....",
    ".....YYYYYY.....",
    "......LLLL......"
  ],
  EXPLOSION: [
    "..Y...V..V...Y..",
    "...Y..V..V..Y...",
    "....YYYYYYYY....",
    "...YYYYYYYYYY...",
    "..YYYYYYYYYYYY..",
    "..VVVVVVVVVVVV..",
    "...YYYYYYYYYY...",
    "....YYYYYYYY...."
  ],
  BOX: [
    "................",
    "....CCCCCCCC....",
    "...CCCCCCCCCC...",
    "...C.C.C.C.CC...", // Bookshelf pattern
    "...CCCCCCCCCC...",
    "...C.C.C.C.CC...",
    "...CCCCCCCCCC...",
    "................"
  ],
  WALL: [
    "................",
    ".GGGGGGGGGGGGGG.",
    ".GGGGGGGGGGGGGG.",
    ".GGGGGGGGGGGGGG.",
    ".GGGGGGGGGGGGGG.",
    ".GGGGGGGGGGGGGG.",
    ".GGGGGGGGGGGGGG.",
    "................"
  ],
  
  // --- SOCIAL GAME SPRITES ---
  CITIZEN: [
    "................",
    "......HHHH......",
    ".....HHHHHH.....",
    ".....FFFFFF.....",
    ".....BBBBBB.....", // Blue Clothes
    ".....BBBBBB.....",
    ".....BBBBBB.....",
    "......B..B......"
  ],
  FLAG: [
    "G...............",
    "GRRRRRRR........",
    "GRRRRRR.........",
    "GRRRRR..........",
    "G...............",
    "G...............",
    "G...............",
    "G..............."
  ],
  KING: [
    "......YYYY......", // Crown
    ".....YYYYYY.....",
    "....HHHHHHHH....",
    "....HHFHFHHH....", // Face
    "...VVVVVVVVVV...", // Royal Robe (Vivid Red)
    "..VVVVVVVVVVVV..",
    "..VVV..VV..VVV..",
    "..VV...VV...VV.."
  ],
  // --- NEW WEAPON SPRITES ---
  SHUKI_PAGE: [
    "................",
    "....WWWWWW......",
    "....WHHHHHW.....",
    "....WHHHHHW.....",
    "....WHHHHHW.....",
    "....WHHHHHW.....",
    "....WWWWWW......",
    "................"
  ],
  KAMEN_MASK: [
    "................",
    ".....MMMM.......",
    "....MMMMMMM.....",
    "...MMXMMXMMM....",
    "...MMMMMMMM.....",
    "....MMWWMM......",
    ".....MMMM.......",
    "................"
  ]
};

// Enemy Stats Definition
export const ENEMY_DEFINITIONS: EnemyDefinition[] = [
  { name: '不安 (Shadow)', hpBase: 8, damage: 4, speed: 0.8, spriteKey: 'SHADOW', width: 12, minWave: 1, weight: 10 },
  { name: '野良犬 (Dog)', hpBase: 5, damage: 3, speed: 1.6, spriteKey: 'DOG', width: 10, minWave: 1, weight: 8 },
  { name: 'カラス (Crow)', hpBase: 4, damage: 3, speed: 1.8, spriteKey: 'CROW', width: 10, minWave: 2, weight: 6 },
  { name: '編集者 (Editor)', hpBase: 12, damage: 6, speed: 1.2, spriteKey: 'EDITOR', width: 14, minWave: 3, weight: 5 },
  { name: '堕落 (Tempter)', hpBase: 15, damage: 5, speed: 1.3, spriteKey: 'TEMPTER', width: 14, minWave: 3, weight: 6 }, // New
  { name: '憲兵 (Kempei)', hpBase: 20, damage: 8, speed: 0.9, spriteKey: 'KEMPEI', width: 14, minWave: 4, weight: 5 },
  { name: '薬鬼 (Morphine)', hpBase: 20, damage: 5, speed: 1.0, spriteKey: 'MORPHINE', width: 12, minWave: 5, weight: 5 }, // New
  { name: '借金取 (Debt)', hpBase: 35, damage: 10, speed: 0.6, spriteKey: 'DEBT', width: 16, minWave: 5, weight: 4 },
  { name: '車夫 (Rickshaw)', hpBase: 25, damage: 10, speed: 1.4, spriteKey: 'RICKSHAW', width: 16, minWave: 6, weight: 4 },
  { name: '亡霊 (Ghost)', hpBase: 15, damage: 8, speed: 0.5, spriteKey: 'GHOST', width: 12, minWave: 2, weight: 3 },
  { name: '般若 (Hannya)', hpBase: 30, damage: 12, speed: 1.1, spriteKey: 'HANNYA', width: 14, minWave: 8, weight: 3 },
  { name: '老兵 (Soldier)', hpBase: 18, damage: 15, speed: 0.7, spriteKey: 'SOLDIER', width: 14, minWave: 5, weight: 4 },
  { name: '芸者 (Geisha)', hpBase: 15, damage: 5, speed: 1.0, spriteKey: 'GEISHA', width: 13, minWave: 4, weight: 3 },
  { name: '泥棒 (Burglar)', hpBase: 10, damage: 10, speed: 1.5, spriteKey: 'BURGLAR', width: 13, minWave: 3, weight: 4 },
  { name: '学友 (Student)', hpBase: 22, damage: 9, speed: 1.1, spriteKey: 'STUDENT', width: 13, minWave: 7, weight: 3 },
  { name: '刑事 (Detective)', hpBase: 28, damage: 8, speed: 0.9, spriteKey: 'DETECTIVE', width: 14, minWave: 6, weight: 3 },
  { name: '妻 (Wife)', hpBase: 20, damage: 6, speed: 0.8, spriteKey: 'WIFE', width: 12, minWave: 5, weight: 2 },
  { name: '厳父 (Father)', hpBase: 80, damage: 25, speed: 0.3, spriteKey: 'FATHER', width: 18, minWave: 9, weight: 3 }, // Buffed
  { name: '批評家 (Critic)', hpBase: 15, damage: 5, speed: 0.7, spriteKey: 'CRITIC', width: 14, minWave: 3, weight: 4 },
  { name: 'モガ (Moga)', hpBase: 12, damage: 6, speed: 1.5, spriteKey: 'MOGA', width: 12, minWave: 4, weight: 4 },
  { name: '恩師 (Teacher)', hpBase: 30, damage: 10, speed: 0.6, spriteKey: 'TEACHER', width: 14, minWave: 8, weight: 2 },
  { name: '巡査 (Police)', hpBase: 18, damage: 8, speed: 1.0, spriteKey: 'POLICE', width: 14, minWave: 2, weight: 5 },
];

export const BOOK_QUOTES: {[key: string]: {chapter: string, text: string}[]} = {
  "ningen": [
    { chapter: "第一の手記", text: "恥の多い生涯を送って来ました。\n自分には、人間の生活というものが、見当つかないのです。" },
    { chapter: "第二の手記", text: "「世間」とは、いったい、何の事でしょう。\n人間の複数でしょうか。" },
    { chapter: "第三の手記", text: "人間は、恋と革命のために生れて来たのだ。" },
    { chapter: "あとがき", text: "ただ、一さいは過ぎて行きます。" }
  ],
  "lemon": [
    { chapter: "第一章", text: "えたいの知れない不吉な塊が私の心を始終圧えつけていた。\n焦躁と言おうか、嫌悪と言おうか。" },
    { chapter: "第二章", text: "私自身がこの店を出て行く時、この爆弾が破裂するのだ。" },
    { chapter: "終章", text: "私は京極へ出て行った。\n何もかも面白く、何もかも可笑しかった。" }
  ],
  "social_contract": [
    { chapter: "第一巻", text: "人間は自由なものとして生れた、\nしかし、いたるところで鎖につながれている。" },
    { chapter: "第二巻", text: "権利は自然から生じたものではない。\n合意にもとづいているのである。" },
    { chapter: "第三巻", text: "力こそ正義なりや。\n服従を強制され、しかも服従しているあいだは、それはそれでよい。" }
  ]
};

// LIBRARY: Multi-book support
export const LIBRARY: Book[] = [
  {
    id: "ningen",
    title: "人間失格",
    author: "太宰 治",
    description: "恥の多い生涯を送って来ました。自分には、人間の生活というものが、見当つかないのです。",
    color: "#991b1b",
    chapters: [
      {
        title: "はしがき",
        content: `　私わたくしは、その男の写真を三葉、見たことがある。
　一葉は、その男の幼年時代、とでも言うべきであろうか、十歳前後かと推定される頃の写真であって、その子供が大勢の女のひとに取りかこまれ、（それは、その子供の姉たち、妹たち、それから、従姉妹いとこたちかと想像される）庭園の池の畔ほとりに、荒い縞の袴はかまをはいて立ち、首を三十度くらい左に傾け、醜く笑っている写真である。醜く？　けれども、鈍感な（つまり、美醜になど関心を持たぬ）人たちが、面白くも何とも無いような顔をして、
「可愛い坊ちゃんですね」
　とお世辞を言っても、それはまんざらお世辞に聞えないくらいの、謂いわば通俗な「可愛らしさ」みたいな影もその子供の笑顔に無いわけではないのだが、しかし、いささかでも美醜に就いての訓練を経て来たひとなら、ひとめ見て直ぐ、
「なんて、厭いやな子供だ」
　と頗すこぶる不快そうに呟つぶやき、毛虫でも払いのける時のような手つきで、その写真を抛ほうり投げるかも知れない。
　まったく、その子供の笑顔は、よく見れば見るほど、何とも知れず、イヤな薄気味悪いものが感ぜられて来る。どだい、それは笑顔でない。この子は、少しも笑ってはいないのである。その証拠には、その子は、両方の拳こぶしを固く握っている。人間は、拳を固く握りながら笑えるものでは無い。猿だ。猿の笑顔だ。ただ、顔に醜い皺しわを寄せているだけである。「皺くちゃ坊ちゃん」とでも言いたくなるような、まことに奇妙な、そうして、どこか穢けがらわしい、へんに気持の悪くなる表情の写真であった。私はこれまで、こんな不思議な表情の子供を見た事が、いちども無かった。`
      },
      {
        title: "第一の手記",
        content: `　恥の多い生涯を送って来ました。
　自分には、人間の生活というものが、見当つかないのです。自分は東北の田舎に生れましたので、汽車をはじめて見たのは、よほど大きくなってからでした。自分は停車場のブリッジを、上って、降りて、そうしてそれが線路を跨またいで向う側へ渡るために造られた絶好の複雑な構築物の一つであるという事には気がつかず、ただそれは停車場の構内を外国の遊戯場みたいに、複雑に楽しく、ハイカラにするためにのみ、設備せられてあるものだとばかり思っていました。しかも、かなり永い間そう思っていたのです。ブリッジの上り下りは、自分には、むしろずいぶん垢抜あかぬけのした遊戯で、それは鉄道のサーヴィスの中でも、最も気のきいたサーヴィスの一つだと思っていたのですが、のちにそれはただ旅客が線路を跨いで向う側へ渡るための実利的な階段に過ぎないのを発見して、にわかに興が覚めました。
　また、自分は子供の頃、絵本で地下鉄道というものを見て、これもやはり、実利的な必要から案出せられたものではなく、地上の車に乗るよりは、地下の車に乗ったほうが一風変って面白い遊びだから、とばかり思っていました。
　自分は、子供の頃、病弱で、よく寝込みましたが、寝ながら、敷布、枕のカバア、掛蒲団のカバア、それらを、つまらない装飾だとばかり思っていて、それが案外、実用品だった事を知った時には、人間の実直さに意外の感を抱き、黒い気持になりました。
　また、自分は、空腹という事を知りませんでした。いや、空腹という意味ではなく、おなかが空いた、という感覚を覚えていないのです。へんな言い方ですが、おなかが空いても、自分でそれに気がつかないのです。小学校、中学校を通じて、自分は学校から帰って来て、周囲の人たちが、おなかが空いたろう、自分たちも覚えているが、学校から帰って来た時の空腹というものは、ひどいからな、甘納豆あるよ、カステラもパンもあるよ、などと言って騒いでも、自分は、そのお世辞に乗せられて、おなかが空いたような気持になり、甘納豆を十粒ばかり口に放り込みますが、空腹感とは、どんなものだか、ちっともわかっていませんでした。
　だから自分は、自分の食欲というものを少しも重んじませんでした。家では、めいめいのお膳ぜんでご飯を食べましたが、自分は、お膳の上のものさえ残さず食べれば、それでいいものと極きめて、その子供のお膳の上のものを、食べたくなかろうが、美味おいしくなかろうが、全部、平らげてしまいました。`
      },
      {
        title: "第二の手記",
        content: `（※第二の手記、全文割愛。あらすじ：葉蔵は中学校に入り、竹一という友人を得る。「お化け」という本性を見抜かれ、戦慄する。やがて上京し、画塾に通う。酒と煙草と女を知り、心中事件を起すが、自分だけ生き残る。）

「世間」とは、いったい、何の事でしょう。人間の複数でしょうか。どこに、その「世間」というものの実体があるのでしょう。けれども、何だか、強く、きびしく、恐ろしいもの、とばかり思って、これまで生きて来ましたけれど、堀木にそう言われて、ふと、
「世間というものは、君じゃないか」
　という言葉が、舌の先まで出かかって、堀木を怒らせるのがイヤで、引込めました。
（それは世間が、ゆるさない）
（世間じゃない。あなたが、ゆるさないのでしょう？）
（そんな事をすると、世間からひどい目にあうぞ）
（世間じゃない。あなたでしょう？）
（いまに世間から葬ほうむられる）
（世間じゃない。あなたから葬られるのでしょう？）
　さまざまの事が、胸に去来したけれども、自分はただ、顔の汗をハンケチで拭いて、笑って、「いやな汗ですねえ」と言っただけでありました。
　けれども、その時以来、自分は、（世間とは個人じゃないか）という、思想めいたものを抱くようになり、世間というものは、個人の集合体であって、そうして、その個人というものは、……`
      },
      {
        title: "第三の手記",
        content: `（※第三の手記、全文割愛。あらすじ：葉蔵は、ヨシ子という無垢な女性と結婚し、一時的な平穏を得る。しかし、ヨシ子が他人に犯される現場を目撃し、絶望する。モルヒネ中毒となり、精神病院へ入れられる。）

　人間は、恋と革命のために生れて来たのだ。
　神に問う。信頼は罪なりや。
　無垢の信頼心は、罪なりや。
　自分は、あの、か弱い、やさしいお方（ヨシ子）の肉体を、汚された事よりも、あのお方の信頼が、汚された事が、それが、いっそ、うっとうしく、永生きも何もしたくなくなったほど、激しい嘆きでございました。
　
　いまは自分には、幸福も不幸もありません。
　ただ、一さいは過ぎて行きます。
　自分がいままで阿鼻叫喚あびきょうかんで生きて来た、いわゆる「人間」の世界に於いて、たった一つ、真理らしく思われたのは、それだけでした。
　ただ、一さいは過ぎて行きます。`
      },
      {
        title: "あとがき",
        content: `　私が、その狂人（？）の手記を、東京の友人から手渡されたのは、昭和×年のことである。
　私は、その手記を書き綴った男と、会ったことはない。しかし、その手記に出て来る京橋のスタンド・バアのマダムとは、私は知合いである。その友人と一緒に、そのマダムの店へ行って、二、三杯カクテルを飲んだ。
「あのノートは、小説になりますかね」
　友人は、マダムに尋ねた。
「さあ、どうでしょうか。あの時分、あの人があのノートを持って遊びに見えて、あたしにあずけて行ったきり、とうとうそれっきりになってしまいましたけど、……」
「あのひとは、亡くなったのですか」
「さあ、それは分りません。生きていれば、もう三十七、八でございましょうか」
「これを読んでも、あのひとの現在の消息は、ちっとも分らないのですがね」
「そうでございますとも。何もしらない中には、お京さんの所へ時たま行ってあげたりなんかして、とてもいいところもあったのですけど、お酒さえ飲まなければ、いいえ、飲んでも、……神様みたいないい子でした」`
      }
    ]
  },
  {
    id: "lemon",
    title: "檸檬",
    author: "梶井 基次郎",
    description: "えたいの知れない不吉な塊が私の心を始終圧えつけていた。",
    color: "#ca8a04",
    chapters: [
      {
        title: "檸檬",
        content: `　えたいの知れない不吉な塊が私の心を始終圧おさえつけていた。焦躁しょうそうと言おうか、嫌悪と言おうか――酒を飲んだあとに宿酔ふつかよいがあるように、酒を毎日飲んでいると宿酔に相当した時期がやって来る。それが来たのだ。これはちょっといけなかった。結果した肺尖はいせんカタルや神経衰弱がいけないのではない。また背を焼くような借金などがいけないのではない。いけないのはその不吉な塊だ。以前私を喜ばせたどんな美しい音楽も、どんな美しい詩の一節も、辛抱がならなくなった。蓄音器を聴かせてもらいにわざわざ出かけて行っても、最初の二三小節で不意に立ち上がってしまいたくなる。何かが私を居堪いたたまらずさせるのだ。それで始終私は街から街へ浮浪し続けていた。
　何故なぜだかその頃私は見すぼらしくて美しいものに強く惹ひきつけられた。風景にしても壊れかかった街だとか、その街にしても他所よそよそしい表通りよりも、どこか親しみのある、汚い洗濯物が干してあったり、がらくたが転がしてあったり、むさくるしい部屋が覗のぞいていたりする裏通りが好きであった。雨や風が蝕むしばんでやがて土に帰ってしまう、と言ったような趣おもむきのある街で、土塀どべいが崩れていたり家並がいえなみが傾いていたり――勢いのいいのは植物だけで、時とするとびっくりするような向日葵ひまわりがあったりカンナが咲いていたりする。
　時どき私はそんな路を歩きながら、ふと、そこが京都ではなくて仙台とか長崎とか、そのような市まちへ今自分が来ているのだという錯覚を起こそうと努める。私は、できることなら京都から逃げ出して誰一人知らないような市へ行ってしまいたかった。第一に安静。がらんとした旅館の一室。清浄な蒲団ふとん。匂においのいい蚊帳かやと糊のりのきいた浴衣ゆかた。そこで一月ひとつきほど何も思わず横になりたい。――希ねがいがもっとあつかましくなると、もうそこが日本ではなくて、どこか遠い南洋の島ででもありたい。……
　しかし私の錯覚はそう長く続かない。私は直ぐに、また、我に返って、私の舌先で審理されるのを待っている憂鬱ゆううつな二つの執着を見逃すわけにはゆかなくなる。一つは眼。一つは丸善まるぜん。`
      },
      {
        title: "果物屋",
        content: `　ある朝、――その頃私は甲の友達から乙の友達へという風に友達の下宿を転々として暮らしていたのだが――友達が学校へ出てしまったあとの空虚な空気の中にぽつねんと一人取り残された。私はまたそこから彷徨さまよい出でなければならなかった。何かが私を追いたてる。そして街から街へ、先に言ったような裏通りを歩いたり、駄菓子屋の前で立ち止ったり、乾物屋の乾海老ほしえびや棒鱈ぼうだらや湯葉ゆばを眺めたり、遂ついには京極きょうごくを下って行って、或ある一軒の果物屋の前で立ち止った。ここでちょっとその果物屋を紹介したいのだが、その果物屋は私の知っている範囲で最も好きな店であった。そこは決して立派な店ではなかったのだが、果物屋固有の美しさが最も露骨に感ぜられた。果物はかなり勾配こうばいの急な台の上に並べてあって、その台というのも古びた黒い漆塗うるしぬりの板だったように思える。何か華やかな美しい音楽の快速調アッレグロの流れが、見る人を石に化したというゴルゴンの鬼面――的なものを差しつけられて、あんな色彩やあんなヴォリュームに凝り固まったというふうに果物は並んでいる。青物もやはり奥へ行けば行くほど堆うずたかく積まれている。――実際あそこの人参にんじんの葉の美しさなどは素晴すばらしかった。それから水に漬つけてある豆だとか慈姑くわいだとか。
　またそこの家の美しいのは夜だった。寺町通てらまちどおりは一体に賑にぎやかな通りで――と言っても感じは東京や大阪よりはずっと澄んでいるが――飾窓の光が溢あふれんばかりに路面へ浸し出しているのだが、どうしたわけかその店のある周囲だけが妙に暗いのだ。もともと片側は暗い二条通にじょうどおりへ曲る角になっているし、ふさわしい家並も並んでいないからでもあるが、その隣家が寺町通にある家とは思えないような暗い一種の小間物屋商売をしているせいもあった。その店は電灯をつけたことがなくていつも蝋燭ろうそくを立てていた。――そんなわけで、桜の葉の陰で電球が森閑しんかんと燃えているその果物屋が、逆なその周囲の暗さのために、店頭の眺めが、まるで湯槽ゆぶねのふちを彩る風景のように、または豪奢ごうしゃな饗宴きょうえんのテーブルの上を見るように人目を惹くのである。`
      },
      {
        title: "爆弾",
        content: `　私は、あの重い塊から解放されたような軽やかな昂奮こうふんの中にいた。友達の処とことへ行ってみようかな、誰か私の慶よろこびを分ってくれる人はいないかしら。――その時私は袂たもとの中の檸檬を憶いだした。本の色彩をゴルジュに積み重ねて、一度黒い風呂敷に包んでしまってからまた解いてみる。それからまた一つ一つ積み下ろして、また積み上げる。
　その時突拍子もない考えが私の心を襲った。
「そうだ。一つこれで奇抜な悪戯いたずらをやってやろう」
　私は興奮して立上がった。それから檸檬を、城壁のように積み上げられた本の、丁度真ん中に据えつけた。恐らくそれは、あざやかな黄色の色で、注意を引く城壁の頂きに恐るべき爆弾を仕掛けたように見えたろう。
「出て行こう。――私自身がこの店を出て行く時、この爆弾が破裂するのだ」
　私は何食わぬ顔をして、澄まして店を出て行った。変にこそばゆいような気がした。「おい、爆弾だぞ。爆発するぞ」と、私は独りごちた。
　私は京極へ出て行った。そして活動写真の看板の絵を眺めたり、鮨屋すしやの暖簾のれんをくぐったり、何もかも面白く、何もかも可笑おかしかった。`
      }
    ]
  },
  {
    id: "social_contract",
    title: "社会契約論",
    author: "ルソー",
    description: "人間は自由なものとして生れた、しかし、いたるところで鎖につながれている。",
    color: "#1e3a8a",
    chapters: [
      {
        title: "第一巻　第一章",
        content: `　第一章　第一巻の主題

　人間は自由なものとして生れた、しかし、いたるところで鎖につながれている。自分が他人の主人であると思っているようなものも、実はその人々以上に奴隷なのだ。どうしてこの変化が生じたのか？　私は知らない。何がそれを正当なものとしうるか？　私はこの問題を解きうると信ずる。
　もし私が、力と、力から生ずる結果とだけを考えるならば、私はこう言うだろう。「ある国民が服従を強制され、しかも服従しているあいだは、それはそれでよい。しかし、その国民が軛くびきをふりほどくことができて、しかもそれをふりほどくならば、なおよい。なぜなら、その国民は、奪われたのと同様の権利によって自由をとりもどしたのだから、彼らが自由を回復するのは当然だし、さもなくば、そもそも彼らから自由を奪ったのが不当だったのだ」と。しかし社会秩序は、他のすべての権利の基礎となる神聖な権利である。しかも、この権利は自然から生じたものではない。したがって、それは合意にもとづいているのである。`
      },
      {
        title: "第一巻　第六章",
        content: `　第六章　社会契約について

　人間が自然状態において存続するのを危うくする障害が、各人がその状態にとどまろうとして用いうる力の抵抗を、その抵抗力において凌駕りょうがする時点にまで、人類が到達したと仮定しよう。そのとき、この原始状態はもはや存続しえず、人類は、その存在のあり方を変えなければ、滅びてしまうであろう。
　ところで、人間は新しい力を生みだすことはできず、ただ既存の力を結びつけ、指導しうるだけであるから、自己保存のためには、抵抗に打ちかちうるような力の総和を団結によってつくりだし、たった一つの原動力によってそれらを動かし、協調させて働かせるよりほかに方法がない。
　この力の総和は、多数の協力からしか生れない。しかし、各人の力と自由とは、その自己保存のための第一の手段であるが、どうして彼は、自分を害したり、自分自身に対して払うべき配慮を怠ったりすることなしに、力と自由とを供出しうるであろうか？　私の主題に関連するこの困難は、次の言葉で言い表わすことができる。
「各構成員の身体と財産を、共同の力のすべてを挙げて守り保護するような、結合の一形式を見出すこと。そうしてそれによって各人が、すべての人々と結びつきながら、しかも自分自身にしか服従せず、以前と同じように自由であること」これこそが根本的な問題であり、社会契約がその解決を与える。`
      }
    ]
  }
];
