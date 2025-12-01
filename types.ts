
export enum GameState {
  MENU = 'MENU',
  GAME_SELECT = 'GAME_SELECT', // New state for choosing the game theme
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  LEVEL_UP = 'LEVEL_UP',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY',
  WAVE_CLEARED = 'WAVE_CLEARED',
  NOVEL_READER = 'NOVEL_READER' 
}

export enum WeaponType {
  PEN = 'PEN',       // Melee: Mouse Aim Stab
  KATANA = 'KATANA', // Melee: Mouse Aim Slash
  PISTOL = 'PISTOL', // Ranged: Mouse Aim Shot
  BOTTLE = 'BOTTLE', // Ranged: Auto AOE Slow
  BOOK = 'BOOK',     // Passive: Defense Down Aura
  YOSHIKO = 'YOSHIKO', // Passive: Orbiting Shield
  SHUKI = 'SHUKI',   // 手記: Auto-targeting memoir pages, stronger when hurt
  KAMEN = 'KAMEN'    // 仮面: Defensive mask that absorbs and reflects
}

export interface PlayerStats {
  maxHp: number;
  hpRegen: number; // HP per 5 sec
  meleeDamage: number;
  rangedDamage: number;
  attackSpeed: number; // % bonus (0 = base, 100 = 2x speed)
  speed: number;
  armor: number; // Reduces damage flat
  critChance: number; // %
  range: number; // Weapon reach
}

export interface Entity {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  markedForDeletion: boolean;
}

export interface PlayerDebuffs {
  guilt: number;    // Halves damage dealt
  confused: number; // Inverts controls
  poison: number;   // DOT damage
}

export interface Player extends Entity {
  hp: number;
  stats: PlayerStats;
  level: number;
  exp: number;
  nextLevelExp: number;
  weapons: WeaponInstance[];
  direction: number; // -1 left, 1 right
  invincibility: number; 
  isDodging: boolean;
  dodgeCooldown: number;
  debuffs: PlayerDebuffs;
}

export interface WeaponInstance {
  type: WeaponType;
  level: number;
  cooldown: number;
  maxCooldown: number; // Base cooldown frames
  baseDamage: number;
}

export interface Debuff {
  slow: number; // frames
  defenseDown: number; // frames
}

export interface Enemy extends Entity {
  hp: number;
  maxHp: number;
  speed: number;
  // String allows for dynamic expansion of 20+ types without strict enum limits
  type: string; 
  damage: number;
  spriteKey: string;
  debuffs: Debuff;
  knockback: { x: number, y: number };
  // AI Flags
  rageMode?: boolean;
  attackCooldown?: number;
}

export interface Projectile extends Entity {
  vx: number;
  vy: number;
  life: number;
  maxLife: number; // Used for animation
  damage: number;
  penetration: number;
  type: WeaponType;
  isMelee?: boolean;
  rotation?: number; // Current rotation
  startAngle?: number; // For melee swing
  swingArc?: number; // Total swing arc
  crit?: boolean;
  debuffType?: 'SLOW' | 'DEFENSE_DOWN';
  orbitAngle?: number; // For orbiting weapons
  // Enemy Projectile properties
  isEnemy?: boolean;
  playerDebuff?: keyof PlayerDebuffs;
}

export interface Particle extends Entity {
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  alpha: number;
  color: string;
}

export interface ExpOrb extends Entity {
  value: number; // XP & Money combined concept
}

export interface DamageText {
  id: number;
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
  isCrit?: boolean;
}

export interface GameStats {
  wave: number;
  score: number;
  kills: number;
  timeElapsed: number; // Time remaining in current wave actually
  bossHp?: number;
  bossMaxHp?: number;
}

// Upgrade Types
export enum UpgradeType {
  WEAPON = 'WEAPON',
  STAT = 'STAT'
}

export interface UpgradeOption {
  type: UpgradeType;
  weaponType?: WeaponType;
  statKey?: keyof PlayerStats;
  value?: number;
  name: string;
  description: string;
  rarity: 'COMMON' | 'RARE' | 'LEGENDARY';
}

export interface EnemyDefinition {
  name: string;
  hpBase: number;
  damage: number;
  speed: number;
  spriteKey: string;
  width: number;
  minWave: number; // Wave required to spawn
  weight: number; // Spawn probability weight
}

export interface WeaponDefinition {
  name: string;
  description: string;
  baseDamage: number;
  baseCooldown: number;
  scaling: 'meleeDamage' | 'rangedDamage';
  color: string;
  range: number;
  isManual?: boolean; // True if aimed with mouse
}

// Novel Data Types
export interface Chapter {
  title: string;
  content: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  color: string; // Cover color
  chapters: Chapter[];
}
