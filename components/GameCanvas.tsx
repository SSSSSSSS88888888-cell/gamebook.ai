import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  GameState, Player, Enemy, Projectile, Particle, ExpOrb, 
  WeaponType, DamageText, GameStats, WeaponInstance, UpgradeOption, UpgradeType 
} from '../types';
import { 
  CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, INITIAL_PLAYER_STATS, 
  WEAPON_DEFINITIONS, MAX_ENEMIES, SPRITES, SPRITE_PALETTE, SPRITE_SCALE, ENEMY_DEFINITIONS, WAVE_DURATION 
} from '../constants';
import { audioService } from '../services/audioService';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setStats: (stats: GameStats) => void;
  setPlayerState: (player: Player) => void;
  upgradeSelection: UpgradeOption | null; 
  onLevelUp: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ 
  gameState, setGameState, setStats, setPlayerState, upgradeSelection, onLevelUp 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const spriteCacheRef = useRef<{[key: string]: HTMLCanvasElement}>({});

  // 16x20 sprite size for Gakuran Player
  const playerRef = useRef<Player>({
    id: 0, x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, width: 16 * SPRITE_SCALE, height: 20 * SPRITE_SCALE, color: COLORS.player,
    hp: INITIAL_PLAYER_STATS.maxHp,
    stats: { ...INITIAL_PLAYER_STATS },
    level: 1, exp: 0, nextLevelExp: 5,
    weapons: [{ type: WeaponType.PEN, level: 1, cooldown: 0, maxCooldown: 25, baseDamage: 15 }],
    direction: 1, markedForDeletion: false,
    invincibility: 0, isDodging: false, dodgeCooldown: 0,
    debuffs: { guilt: 0, confused: 0, poison: 0 }
  });
  
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const atmosphereParticlesRef = useRef<{x: number, y: number, r: number, speed: number, alpha: number}[]>([]); // New: Ash/Snow
  const expOrbsRef = useRef<ExpOrb[]>([]);
  const textsRef = useRef<DamageText[]>([]);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const mouseRef = useRef<{ x: number, y: number, down: boolean }>({ x: 0, y: 0, down: false });
  
  // Touch refs
  const touchRefs = useRef<{
    joystick: { id: number, startX: number, startY: number, currX: number, currY: number, active: boolean, dx: number, dy: number },
    aim: { id: number, active: boolean }
  }>({
    joystick: { id: -1, startX: 0, startY: 0, currX: 0, currY: 0, active: false, dx: 0, dy: 0 },
    aim: { id: -1, active: false }
  });

  const frameCountRef = useRef(0);
  const waveRef = useRef(1);
  const waveTimerRef = useRef(WAVE_DURATION); 
  const scoreRef = useRef(0);
  const killsRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const hpRegenTimerRef = useRef(0);
  const bossActiveRef = useRef(false);

  // --- Sprite Initialization ---
  useEffect(() => {
    const createSpriteCanvas = (pixelMap: string[]): HTMLCanvasElement => {
      const h = pixelMap.length;
      const w = pixelMap[0].length;
      const c = document.createElement('canvas');
      c.width = w * SPRITE_SCALE;
      c.height = h * SPRITE_SCALE;
      const ctx = c.getContext('2d');
      if (!ctx) return c;

      for(let y=0; y<h; y++) {
        for(let x=0; x<w; x++) {
          const char = pixelMap[y][x];
          if (SPRITE_PALETTE[char] && SPRITE_PALETTE[char] !== 'transparent') {
            ctx.fillStyle = SPRITE_PALETTE[char];
            ctx.fillRect(x * SPRITE_SCALE, y * SPRITE_SCALE, SPRITE_SCALE, SPRITE_SCALE);
          }
        }
      }
      return c;
    };

    const cache: {[key: string]: HTMLCanvasElement} = {};
    Object.keys(SPRITES).forEach(key => {
        cache[key] = createSpriteCanvas(SPRITES[key as keyof typeof SPRITES]);
    });
    spriteCacheRef.current = cache;

    // Init atmosphere
    for(let i=0; i<50; i++) {
        atmosphereParticlesRef.current.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            r: Math.random() * 2 + 1,
            speed: Math.random() * 1 + 0.5,
            alpha: Math.random() * 0.5 + 0.1
        });
    }
  }, []);

  // --- BGM Control ---
  useEffect(() => {
      if (gameState === GameState.PLAYING) {
          audioService.startBgm();
      } else {
          audioService.stopBgm();
      }
  }, [gameState]);

  // --- Input ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;
      if (e.code === 'Escape') {
        if (gameState === GameState.PLAYING) setGameState(GameState.PAUSED);
        else if (gameState === GameState.PAUSED) setGameState(GameState.PLAYING);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      mouseRef.current.x = (e.clientX - rect.left) * scaleX;
      mouseRef.current.y = (e.clientY - rect.top) * scaleY;
    };
    const handleMouseDown = () => { mouseRef.current.down = true; };
    const handleMouseUp = () => { mouseRef.current.down = false; };

    // Touch Handlers
    const handleTouchStart = (e: TouchEvent) => {
      if (e.target !== canvasRef.current) return;
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const touchX = (t.clientX - rect.left) * scaleX;
        const touchY = (t.clientY - rect.top) * scaleY;

        // Left half for Joystick
        if (touchX < CANVAS_WIDTH / 2 && !touchRefs.current.joystick.active) {
            touchRefs.current.joystick.id = t.identifier;
            touchRefs.current.joystick.startX = touchX;
            touchRefs.current.joystick.startY = touchY;
            touchRefs.current.joystick.currX = touchX;
            touchRefs.current.joystick.currY = touchY;
            touchRefs.current.joystick.active = true;
            touchRefs.current.joystick.dx = 0;
            touchRefs.current.joystick.dy = 0;
        } 
        // Right half for Aim
        else if (touchX >= CANVAS_WIDTH / 2) {
            mouseRef.current.x = touchX;
            mouseRef.current.y = touchY;
            mouseRef.current.down = true;
            touchRefs.current.aim.id = t.identifier;
            touchRefs.current.aim.active = true;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.target !== canvasRef.current) return;
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const touchX = (t.clientX - rect.left) * scaleX;
        const touchY = (t.clientY - rect.top) * scaleY;

        if (t.identifier === touchRefs.current.joystick.id) {
          touchRefs.current.joystick.currX = touchX;
          touchRefs.current.joystick.currY = touchY;
          let dx = touchX - touchRefs.current.joystick.startX;
          let dy = touchY - touchRefs.current.joystick.startY;
          // Normalize if vector is too large (max 50px stick)
          const dist = Math.hypot(dx, dy);
          touchRefs.current.joystick.dx = dx;
          touchRefs.current.joystick.dy = dy;
        } 
        else if (t.identifier === touchRefs.current.aim.id) {
          mouseRef.current.x = touchX;
          mouseRef.current.y = touchY;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === touchRefs.current.joystick.id) {
          touchRefs.current.joystick.active = false;
          touchRefs.current.joystick.dx = 0;
          touchRefs.current.joystick.dy = 0;
          touchRefs.current.joystick.id = -1;
        }
        else if (t.identifier === touchRefs.current.aim.id) {
          mouseRef.current.down = false;
          touchRefs.current.aim.active = false;
          touchRefs.current.aim.id = -1;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    
    // Add non-passive listeners to canvas for preventDefault
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
      canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
      canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      if (canvas) {
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
        canvas.removeEventListener('touchcancel', handleTouchEnd);
      }
    };
  }, [gameState, setGameState]);

  // --- Upgrades ---
  useEffect(() => {
    if (upgradeSelection && gameState === GameState.LEVEL_UP) {
      applyUpgrade(upgradeSelection);
      setGameState(GameState.PLAYING);
    }
  }, [upgradeSelection]);

  // --- Wave Logic ---
  const startNextWave = useCallback(() => {
    waveRef.current += 1;
    waveTimerRef.current = WAVE_DURATION;
    bossActiveRef.current = false;
    enemiesRef.current = [];
    projectilesRef.current = [];
    setGameState(GameState.PLAYING);
  }, [setGameState]);

  const applyUpgrade = (opt: UpgradeOption) => {
    const player = playerRef.current;
    if (opt.type === UpgradeType.STAT && opt.statKey && opt.value) {
      player.stats[opt.statKey] += opt.value;
      if (opt.statKey === 'maxHp') player.hp += opt.value;
    } else if (opt.type === UpgradeType.WEAPON && opt.weaponType) {
      const existing = player.weapons.find(w => w.type === opt.weaponType);
      const def = WEAPON_DEFINITIONS[opt.weaponType];
      if (existing) {
        existing.level++;
        existing.baseDamage += Math.ceil(def.baseDamage * 0.2); 
      } else {
        player.weapons.push({
          type: opt.weaponType,
          level: 1,
          cooldown: 0,
          maxCooldown: def.baseCooldown,
          baseDamage: def.baseDamage
        });
      }
    }
    setPlayerState({...player});
  };

  // --- Game Logic ---
  const spawnEnemy = () => {
    if (enemiesRef.current.length >= MAX_ENEMIES) return;
    if (bossActiveRef.current) return;

    let x, y;
    const padding = 50;
    if (Math.random() < 0.5) {
      x = Math.random() < 0.5 ? -padding : CANVAS_WIDTH + padding;
      y = Math.random() * CANVAS_HEIGHT;
    } else {
      x = Math.random() * CANVAS_WIDTH;
      y = Math.random() < 0.5 ? -padding : CANVAS_HEIGHT + padding;
    }

    const currentWave = waveRef.current;
    
    if (currentWave % 10 === 0 && !bossActiveRef.current) {
       enemiesRef.current.forEach(e => {
        createParticles(e.x, e.y, 5, e.color);
       });
       enemiesRef.current = [];
       bossActiveRef.current = true;
       spawnBoss();
       return;
    }

    const availableEnemies = ENEMY_DEFINITIONS.filter(e => e.minWave <= currentWave);
    const totalWeight = availableEnemies.reduce((sum, e) => sum + e.weight, 0);
    let r = Math.random() * totalWeight;
    let selected = availableEnemies[0] || ENEMY_DEFINITIONS[0];
    
    for(const e of availableEnemies) {
        if (r < e.weight) {
            selected = e;
            break;
        }
        r -= e.weight;
    }

    const hpMult = 1 + (currentWave * 0.15); 
    
    enemiesRef.current.push({
      id: Math.random(), x, y, 
      width: selected.width * SPRITE_SCALE, 
      height: selected.width * SPRITE_SCALE,
      color: COLORS.shadow,
      hp: selected.hpBase * hpMult, 
      maxHp: selected.hpBase * hpMult,
      speed: selected.speed, 
      type: selected.name, 
      spriteKey: selected.spriteKey, 
      damage: selected.damage,
      markedForDeletion: false,
      debuffs: { slow: 0, defenseDown: 0 },
      knockback: { x: 0, y: 0 },
      attackCooldown: 0
    });
  };

  const spawnBoss = () => {
    const hpMult = 1 + (waveRef.current * 0.5);
    enemiesRef.current.push({
      id: 9999,
      x: CANVAS_WIDTH/2, y: -200, 
      width: 60 * SPRITE_SCALE, height: 60 * SPRITE_SCALE,
      color: COLORS.boss,
      hp: 3000 * hpMult, maxHp: 3000 * hpMult, 
      speed: 0.5, type: 'BOSS', spriteKey: 'BOSS',
      damage: 25, markedForDeletion: false,
      debuffs: { slow: 0, defenseDown: 0 },
      knockback: { x: 0, y: 0 }
    });
    audioService.playTone(100, 'sawtooth', 2.0); 
  };

  const fireWeapon = (weapon: WeaponInstance) => {
    const player = playerRef.current;
    const def = WEAPON_DEFINITIONS[weapon.type];
    const mouse = mouseRef.current;
    
    let finalDamage = weapon.baseDamage;
    if (def.scaling === 'meleeDamage') finalDamage += player.stats.meleeDamage;
    if (def.scaling === 'rangedDamage') finalDamage += player.stats.rangedDamage;

    if (player.debuffs.guilt > 0) {
        finalDamage = Math.max(1, Math.floor(finalDamage * 0.5));
    }

    const isCrit = Math.random() * 100 < player.stats.critChance;
    if (isCrit) finalDamage *= 1.5;

    const angleToMouse = Math.atan2(mouse.y - player.y, mouse.x - player.x);

    if (weapon.type === WeaponType.PEN) {
       const range = (def.range || 55) + player.stats.range;
       const swingArc = Math.PI * 0.7; 
       const startAngle = angleToMouse - (swingArc / 2);
       
       projectilesRef.current.push({
         id: Math.random(), x: player.x, y: player.y, width: range, height: range,
         color: def.color, vx: 0, vy: 0, life: 10, maxLife: 10, damage: finalDamage,
         penetration: 999, type: weapon.type, isMelee: true,
         rotation: angleToMouse, startAngle: startAngle, swingArc: swingArc,
         markedForDeletion: false, crit: isCrit
       });
       audioService.playSwing();
    }
    else if (weapon.type === WeaponType.KATANA) {
       const range = (def.range || 80) + player.stats.range;
       const swingArc = Math.PI; 
       const startAngle = angleToMouse - (swingArc / 2);
       projectilesRef.current.push({
         id: Math.random(), x: player.x, y: player.y, width: range, height: range,
         color: def.color, vx: 0, vy: 0, life: 12, maxLife: 12, damage: finalDamage,
         penetration: 999, type: weapon.type, isMelee: true,
         rotation: angleToMouse, startAngle: startAngle, swingArc: swingArc,
         markedForDeletion: false, crit: isCrit
       });
       audioService.playSwing();
    }
    else if (weapon.type === WeaponType.PISTOL) {
        const vx = Math.cos(angleToMouse) * 12;
        const vy = Math.sin(angleToMouse) * 12;
        projectilesRef.current.push({
            id: Math.random(), x: player.x, y: player.y, width: 8, height: 8,
            color: def.color, vx, vy, life: 60, maxLife: 60, damage: finalDamage,
            penetration: 1, type: weapon.type, markedForDeletion: false, crit: isCrit
        });
        audioService.playShoot();
    }
    else if (weapon.type === WeaponType.BOTTLE) {
      let targetX = player.x + Math.cos(angleToMouse) * 150;
      let targetY = player.y + Math.sin(angleToMouse) * 150;
      if (enemiesRef.current.length > 0) {
        const t = enemiesRef.current[Math.floor(Math.random() * enemiesRef.current.length)];
        if (t) { targetX = t.x; targetY = t.y; }
      }
      const angle = Math.atan2(targetY - player.y, targetX - player.x);
      projectilesRef.current.push({
        id: Math.random(), x: player.x, y: player.y, width: 12, height: 12, color: def.color,
        vx: Math.cos(angle) * 8, vy: Math.sin(angle) * 8,
        life: 40, maxLife: 40, damage: finalDamage, penetration: 999, 
        type: weapon.type, debuffType: 'SLOW', markedForDeletion: false, crit: isCrit
      });
      audioService.playShoot(); 
    }
    else if (weapon.type === WeaponType.BOOK) {
      const range = (def.range || 90) + player.stats.range;
      enemiesRef.current.forEach(e => {
        if (Math.hypot(e.x - player.x, e.y - player.y) < range) {
           e.debuffs.defenseDown = 60; 
           if (frameCountRef.current % 15 === 0) {
             const dmg = Math.max(1, finalDamage);
             e.hp -= dmg;
             createDamageText(e.x, e.y, dmg, isCrit);
             if (e.hp <= 0) handleEnemyDeath(e);
           }
        }
      });
    }
  };

  const handleEnemyDeath = (e: Enemy) => {
    if (e.markedForDeletion) return;
    e.markedForDeletion = true;
    
    if (e.type === 'BOSS') {
      bossActiveRef.current = false;
      projectilesRef.current = projectilesRef.current.filter(p => p.damage === 0 || p.type !== undefined); 
      for(let i=0; i<30; i++) {
        expOrbsRef.current.push({
            id: Math.random(), x: e.x + (Math.random()-0.5)*100, y: e.y + (Math.random()-0.5)*100,
            width: 8, height: 8, color: COLORS.exp, value: 10, markedForDeletion: false
        });
      }
      audioService.playLevelUp(); 
      waveTimerRef.current = 0;
    } else {
        scoreRef.current += 10;
        killsRef.current += 1;
        audioService.playHit();
        createParticles(e.x, e.y, 6, '#404040'); 
        
        const val = Math.ceil(e.maxHp / 5);
        expOrbsRef.current.push({
            id: Math.random(), x: e.x, y: e.y, width: 8, height: 8, color: COLORS.exp,
            value: Math.max(1, Math.min(10, val)), markedForDeletion: false
        });
    }
  };

  const createParticles = (x: number, y: number, count: number, color: string) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        id: Math.random(), x, y, width: 4, height: 4,
        vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
        life: 20 + Math.random() * 15, maxLife: 35, alpha: 1, color, markedForDeletion: false
      });
    }
  };

  const createDamageText = (x: number, y: number, damage: number, isCrit: boolean = false, color: string = COLORS.damage) => {
    textsRef.current.push({
      id: Math.random(), x, y: y - 20,
      text: damage.toFixed(0), life: 40, 
      color: isCrit ? COLORS.crit : color,
      isCrit
    });
  };

  const update = () => {
    if (gameState !== GameState.PLAYING) return;
    frameCountRef.current++;
    const player = playerRef.current;

    if (player.debuffs.confused > 0) player.debuffs.confused--;
    if (player.debuffs.guilt > 0) player.debuffs.guilt--;
    if (player.debuffs.poison > 0) {
        player.debuffs.poison--;
        if (frameCountRef.current % 60 === 0) {
            player.hp -= 2;
            createDamageText(player.x, player.y, 2, false, COLORS.debuffPoison);
        }
    }

    if (!bossActiveRef.current) {
        waveTimerRef.current--;
        if (waveTimerRef.current <= 0) {
            setGameState(GameState.WAVE_CLEARED);
            enemiesRef.current.forEach(e => { createParticles(e.x, e.y, 5, e.color); });
            enemiesRef.current = [];
            projectilesRef.current = [];
            player.hp = Math.min(player.stats.maxHp, player.hp + 20);
            player.debuffs = { guilt: 0, confused: 0, poison: 0 };
            setPlayerState({...player});
            return;
        }
    }

    hpRegenTimerRef.current++;
    if (hpRegenTimerRef.current >= 300) { 
      if (player.hp < player.stats.maxHp && player.stats.hpRegen > 0) {
        player.hp = Math.min(player.stats.maxHp, player.hp + player.stats.hpRegen);
        createDamageText(player.x, player.y - 10, player.stats.hpRegen, false);
      }
      hpRegenTimerRef.current = 0;
    }

    if (!bossActiveRef.current) {
        spawnTimerRef.current++;
        const spawnRate = Math.max(10, 60 - (waveRef.current * 3)); 
        if (spawnTimerRef.current > spawnRate) {
            spawnEnemy();
            spawnTimerRef.current = 0;
        }
    }

    const inputMult = player.debuffs.confused > 0 ? -1 : 1;

    if ((keysPressed.current['Space'] || keysPressed.current['KeyZ']) && player.dodgeCooldown <= 0) {
      player.isDodging = true;
      player.dodgeCooldown = 60; 
      player.invincibility = 20; 
      
      let dx = 0, dy = 0;
      if (keysPressed.current['ArrowUp'] || keysPressed.current['KeyW']) dy = -1 * inputMult;
      if (keysPressed.current['ArrowDown'] || keysPressed.current['KeyS']) dy = 1 * inputMult;
      if (keysPressed.current['ArrowLeft'] || keysPressed.current['KeyA']) dx = -1 * inputMult;
      if (keysPressed.current['ArrowRight'] || keysPressed.current['KeyD']) dx = 1 * inputMult;
      
      // Virtual joystick priority
      if (touchRefs.current.joystick.active) {
         dx = touchRefs.current.joystick.dx * inputMult;
         dy = touchRefs.current.joystick.dy * inputMult;
      }

      if (dx === 0 && dy === 0) {
          dx = Math.cos(Math.atan2(mouseRef.current.y - player.y, mouseRef.current.x - player.x));
          dy = Math.sin(Math.atan2(mouseRef.current.y - player.y, mouseRef.current.x - player.x));
      }
      
      const len = Math.hypot(dx, dy);
      if (len > 0) {
         player.x += (dx/len) * 120; 
         player.y += (dy/len) * 120;
         createParticles(player.x, player.y, 8, '#ffffff');
      }
      audioService.playDash();
    }

    if (player.dodgeCooldown > 0) player.dodgeCooldown--;
    if (player.invincibility > 0) player.invincibility--;
    if (player.invincibility <= 0) player.isDodging = false;

    if (!player.isDodging) {
      let dx = 0, dy = 0;
      if (keysPressed.current['ArrowUp'] || keysPressed.current['KeyW']) dy = -1 * inputMult;
      if (keysPressed.current['ArrowDown'] || keysPressed.current['KeyS']) dy = 1 * inputMult;
      if (keysPressed.current['ArrowLeft'] || keysPressed.current['KeyA']) { dx = -1 * inputMult; player.direction = -1 * inputMult; }
      if (keysPressed.current['ArrowRight'] || keysPressed.current['KeyD']) { dx = 1 * inputMult; player.direction = 1 * inputMult; }
      
      // Virtual Joystick Override
      if (touchRefs.current.joystick.active) {
          dx = touchRefs.current.joystick.dx * inputMult;
          dy = touchRefs.current.joystick.dy * inputMult;
          // Set direction based on joystick x
          if (touchRefs.current.joystick.dx !== 0) {
              player.direction = touchRefs.current.joystick.dx < 0 ? -1 * inputMult : 1 * inputMult;
          }
      }

      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        player.x += (dx / len) * player.stats.speed;
        player.y += (dy / len) * player.stats.speed;
      }
      player.direction = mouseRef.current.x < player.x ? -1 : 1;
    }
    
    player.x = Math.max(20, Math.min(CANVAS_WIDTH - 20, player.x));
    player.y = Math.max(20, Math.min(CANVAS_HEIGHT - 20, player.y));

    // Atmosphere update
    atmosphereParticlesRef.current.forEach(p => {
        p.y += p.speed;
        p.x += Math.sin(frameCountRef.current * 0.01 + p.y) * 0.5;
        if (p.y > CANVAS_HEIGHT) {
            p.y = -10;
            p.x = Math.random() * CANVAS_WIDTH;
        }
    });

    player.weapons.forEach(w => {
      const def = WEAPON_DEFINITIONS[w.type];
      if (w.cooldown > 0) w.cooldown--;
      if (w.type === WeaponType.YOSHIKO) {
          const orbitRadius = def.range;
          const orbitSpeed = 0.05 + (w.level * 0.01);
          const angle = frameCountRef.current * orbitSpeed;
          const ox = player.x + Math.cos(angle) * orbitRadius;
          const oy = player.y + Math.sin(angle) * orbitRadius;
          if (frameCountRef.current % 10 === 0) createParticles(ox, oy, 1, def.color);
          enemiesRef.current.forEach(e => {
             if (Math.hypot(e.x - ox, e.y - oy) < 20) {
                 if (frameCountRef.current % 15 === 0) {
                     let dmg = def.baseDamage + player.stats.rangedDamage + (w.level * 2);
                     e.hp -= dmg;
                     createDamageText(e.x, e.y, dmg);
                     if (e.hp <= 0) handleEnemyDeath(e);
                 }
             }
          });
          return;
      }

      if (def.isManual) {
          if (mouseRef.current.down && w.cooldown <= 0) {
              fireWeapon(w);
              const speedMult = 1 + (player.stats.attackSpeed / 100);
              w.cooldown = Math.max(5, w.maxCooldown / speedMult);
          }
      } 
      else if (!def.isManual) {
          if (w.cooldown <= 0) {
             if (w.type === WeaponType.BOOK || enemiesRef.current.length > 0) {
                 fireWeapon(w);
                 const speedMult = 1 + (player.stats.attackSpeed / 100);
                 w.cooldown = Math.max(5, w.maxCooldown / speedMult);
             }
          }
      }
    });

    enemiesRef.current.forEach(e => {
      if (e.debuffs.slow > 0) e.debuffs.slow--;
      if (e.debuffs.defenseDown > 0) e.debuffs.defenseDown--;
      const speedMod = e.debuffs.slow > 0 ? 0.5 : 1.0;
      e.x += e.knockback.x;
      e.y += e.knockback.y;
      e.knockback.x *= 0.8;
      e.knockback.y *= 0.8;

      if (e.type === 'BOSS') {
          if (e.y < 100) e.y += 1;
          else {
              e.x += Math.sin(frameCountRef.current * 0.02) * 2;
              if (frameCountRef.current % 60 === 0) {
                  const bullets = 12;
                  for(let i=0; i<bullets; i++) {
                    const angle = (Math.PI*2 / bullets) * i + frameCountRef.current;
                    projectilesRef.current.push({
                      id: Math.random(), x: e.x + e.width/2, y: e.y + e.height/2, width: 8, height: 8, color: '#ff0000',
                      vx: Math.cos(angle) * 4, vy: Math.sin(angle) * 4, life: 200, maxLife: 200, damage: 10,
                      penetration: 1, type: WeaponType.PEN, isMelee: false, markedForDeletion: false, isEnemy: true
                    });
                  }
              }
          }
      } 
      else if (e.type === '堕落 (Tempter)') {
          const dx = player.x - e.x;
          const dy = player.y - e.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 200) { e.x -= (dx / dist) * e.speed * speedMod; e.y -= (dy / dist) * e.speed * speedMod; } 
          else { e.x += Math.sin(frameCountRef.current * 0.05) * e.speed; }
          if (!e.attackCooldown) e.attackCooldown = 0;
          if (e.attackCooldown > 0) e.attackCooldown--;
          if (e.attackCooldown <= 0 && dist < 300) {
             const angle = Math.atan2(dy, dx);
             projectilesRef.current.push({
                 id: Math.random(), x: e.x, y: e.y, width: 8, height: 8, color: COLORS.debuffConfused,
                 vx: Math.cos(angle) * 3, vy: Math.sin(angle) * 3, life: 100, maxLife: 100, damage: 5, penetration: 1, type: WeaponType.BOTTLE,
                 isEnemy: true, playerDebuff: 'confused', markedForDeletion: false
             });
             e.attackCooldown = 180;
          }
      }
      else if (e.type === '薬鬼 (Morphine)') {
          if (!e.rageMode && e.hp < e.maxHp * 0.5) { e.rageMode = true; e.speed *= 2.5; createDamageText(e.x, e.y - 20, 0, false, '#ff0000'); }
          const dx = player.x - e.x;
          const dy = player.y - e.y;
          const dist = Math.hypot(dx, dy);
          e.x += (dx / dist) * e.speed * speedMod;
          e.y += (dy / dist) * e.speed * speedMod;
      }
      else {
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
            let pushX = 0, pushY = 0;
            enemiesRef.current.forEach(other => {
            if (e === other) return;
            const odx = e.x - other.x;
            const ody = e.y - other.y;
            const odist = Math.hypot(odx, ody);
            if (odist < e.width) { pushX += odx / (odist || 1); pushY += ody / (odist || 1); }
            });
            e.x += ((dx / dist) * e.speed * speedMod) + pushX * 0.2;
            e.y += ((dy / dist) * e.speed * speedMod) + pushY * 0.2;
        }

        if (dist < (player.width/2 + e.width/2)) {
            if (player.invincibility <= 0) {
                let dmg = Math.max(1, e.damage - player.stats.armor);
                if (e.type === '厳父 (Father)') {
                    player.debuffs.guilt = 180;
                    createDamageText(player.x, player.y - 30, 0, false, COLORS.debuffGuilt);
                    const kAng = Math.atan2(dy, dx);
                    player.x += Math.cos(kAng) * 100;
                    player.y += Math.sin(kAng) * 100;
                }
                else if (e.type === '薬鬼 (Morphine)') {
                    player.debuffs.poison = 300;
                    createDamageText(player.x, player.y - 30, 0, false, COLORS.debuffPoison);
                }
                player.hp -= dmg;
                player.invincibility = 30; 
                audioService.playHit();
                createDamageText(player.x, player.y, dmg);
                player.x += (dx/dist) * 20;
                player.y += (dy/dist) * 20;
            }
        }
      }
    });

    projectilesRef.current.forEach(p => {
      if (p.isMelee) { p.x = player.x; p.y = player.y; p.life--; } else { p.x += p.vx; p.y += p.vy; p.life--; }

      if (p.isEnemy) {
          const dist = Math.hypot(p.x - player.x, p.y - player.y);
          if (dist < 10 && player.invincibility <= 0) {
             player.hp -= p.damage;
             player.invincibility = 20;
             p.markedForDeletion = true;
             if (p.playerDebuff) {
                 player.debuffs[p.playerDebuff] = 180;
                 createDamageText(player.x, player.y - 30, 0, false, COLORS.debuffConfused);
             }
             createDamageText(player.x, player.y, p.damage);
          }
      } else {
            if (p.life <= 0) {
                p.markedForDeletion = true;
                if (p.type === WeaponType.BOTTLE) {
                    createParticles(p.x, p.y, 8, p.color);
                    enemiesRef.current.forEach(e => {
                        if (Math.hypot(e.x - p.x, e.y - p.y) < 80) {
                            let dmg = p.damage;
                            if (e.debuffs.defenseDown > 0) dmg += 5; 
                            e.hp -= dmg;
                            e.debuffs.slow = 120;
                            createDamageText(e.x, e.y, dmg, p.crit);
                            if (e.hp <= 0) handleEnemyDeath(e);
                        }
                    });
                }
            }
            if (!p.markedForDeletion) {
                enemiesRef.current.forEach(e => {
                if (e.markedForDeletion) return;
                let hit = false;
                if (p.isMelee) {
                    const dist = Math.hypot(e.x - p.x, e.y - p.y);
                    if (dist < p.width) {
                        const angleToEnemy = Math.atan2(e.y - p.y, e.x - p.x);
                        let diff = angleToEnemy - (p.rotation || 0);
                        while (diff > Math.PI) diff -= Math.PI*2;
                        while (diff < -Math.PI) diff += Math.PI*2;
                        const arc = p.swingArc || 0.2;
                        if (Math.abs(diff) < arc/2) hit = true;
                    }
                } else {
                    const dist = Math.hypot(p.x - e.x, p.y - e.y);
                    if (dist < (e.width/2 + p.width/2)) hit = true;
                }
                
                if (hit) {
                    if (!p.isMelee || (p.isMelee && p.life % 5 === 0)) {
                        let dmg = p.damage;
                        if (e.debuffs.defenseDown > 0) dmg += 3;
                        e.hp -= dmg;
                        createDamageText(e.x, e.y, dmg, p.crit);
                        
                        const kx = e.x - player.x; 
                        const ky = e.y - player.y;
                        const klen = Math.hypot(kx, ky);
                        const knockForce = p.isMelee ? (p.type === WeaponType.KATANA ? 15 : 10) : 4;
                        if (klen > 0 && e.type !== 'BOSS') {
                           const resist = e.width > 14 * SPRITE_SCALE ? 0.3 : 1.0;
                           e.knockback.x = (kx/klen) * knockForce * resist;
                           e.knockback.y = (ky/klen) * knockForce * resist;
                        }

                        if (!p.isMelee) {
                            p.penetration--;
                            if (p.penetration <= 0) { p.markedForDeletion = true; createParticles(p.x, p.y, 3, p.color); }
                        }
                        if (e.hp <= 0) handleEnemyDeath(e);
                    }
                }
                });
            }
      }
    });

    expOrbsRef.current.forEach(o => {
      const dist = Math.hypot(player.x - o.x, player.y - o.y);
      if (dist < 120) { o.x += (player.x - o.x) * 0.15; o.y += (player.y - o.y) * 0.15; }
      if (dist < 20) {
        o.markedForDeletion = true;
        player.exp += o.value;
        audioService.playExp();
        if (player.exp >= player.nextLevelExp) {
          player.level++;
          player.exp -= player.nextLevelExp;
          player.nextLevelExp = Math.floor(player.nextLevelExp * 1.3) + 5;
          setGameState(GameState.LEVEL_UP);
          audioService.playLevelUp();
          onLevelUp();
        }
        setPlayerState({...player}); 
      }
    });

    enemiesRef.current = enemiesRef.current.filter(e => !e.markedForDeletion);
    projectilesRef.current = projectilesRef.current.filter(p => !p.markedForDeletion && p.x > -100 && p.x < CANVAS_WIDTH + 100);
    particlesRef.current = particlesRef.current.filter(p => !p.markedForDeletion);
    expOrbsRef.current = expOrbsRef.current.filter(o => !o.markedForDeletion);
    textsRef.current = textsRef.current.filter(t => t.life > 0);

    particlesRef.current.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.life--; p.alpha = p.life / p.maxLife;
      if (p.life <= 0) p.markedForDeletion = true;
    });
    textsRef.current.forEach(t => { t.y -= 0.5; t.life--; });

    if (player.hp <= 0) { setGameState(GameState.GAME_OVER); audioService.playGameOver(); }

    if (frameCountRef.current % 30 === 0) { 
      const boss = enemiesRef.current.find(e => e.type === 'BOSS');
      setStats({
        wave: waveRef.current,
        score: scoreRef.current,
        kills: killsRef.current,
        timeElapsed: Math.ceil(waveTimerRef.current / 60), 
        bossHp: boss ? boss.hp : undefined,
        bossMaxHp: boss ? boss.maxHp : undefined
      });
      setPlayerState({...player});
    }
  };

  const drawSprite = (ctx: CanvasRenderingContext2D, key: string, x: number, y: number, w: number, h: number, flipX: boolean, alpha: number = 1.0) => {
    const sprite = spriteCacheRef.current[key];
    if (!sprite) return;
    ctx.save();
    ctx.translate(Math.floor(x), Math.floor(y));
    if (flipX) ctx.scale(-1, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.ellipse(0, h/2 - 2, w/2, h/4, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite, -w/2, -h/2, w, h);
    ctx.restore();
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    // 1. Background (Tatami Style - Desaturated)
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const TATAMI_W = 100; const TATAMI_H = 50;
    for (let y = -20; y < CANVAS_HEIGHT + 20; y += TATAMI_H) {
      const rowOffset = (Math.floor(y / TATAMI_H) % 2) * (TATAMI_W / 2);
      for (let x = -TATAMI_W; x < CANVAS_WIDTH + TATAMI_W; x += TATAMI_W) {
         const isLit = (Math.floor(x/TATAMI_W) + Math.floor(y/TATAMI_H)) % 2 === 0;
         ctx.fillStyle = isLit ? COLORS.tatamiLight : COLORS.tatamiDark;
         ctx.fillRect(x + rowOffset, y, TATAMI_W, TATAMI_H);
         ctx.strokeStyle = COLORS.tatamiBorder;
         ctx.lineWidth = 2;
         ctx.strokeRect(x + rowOffset, y, TATAMI_W, TATAMI_H);
      }
    }

    // Vignette / Lighting (Breathing)
    const p = playerRef.current;
    const breathe = Math.sin(frameCountRef.current * 0.05) * 10;
    const gradient = ctx.createRadialGradient(p.x, p.y, 40 + breathe, p.x, p.y, 350);
    gradient.addColorStop(0, 'rgba(255, 220, 180, 0.05)'); 
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.7)'); 
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. Objects
    expOrbsRef.current.forEach(o => {
      ctx.fillStyle = o.color; 
      ctx.beginPath();
      ctx.arc(o.x, o.y, 3, 0, Math.PI*2);
      ctx.fill();
    });

    enemiesRef.current.forEach(e => {
      const bob = Math.sin(frameCountRef.current * 0.15 + e.id) * 3;
      drawSprite(ctx, e.spriteKey, e.x, e.y + bob, e.width, e.height, e.x < p.x);
      if (e.debuffs.slow > 0) { ctx.fillStyle = COLORS.debuffSlow; ctx.font = '10px serif'; ctx.fillText("遅", e.x, e.y - e.height); }
      if (e.debuffs.defenseDown > 0) { ctx.fillStyle = COLORS.debuffDef; ctx.font = '10px serif'; ctx.fillText("脆", e.x + 10, e.y - e.height); }
    });

    if (!(p.invincibility > 0 && Math.floor(frameCountRef.current / 4) % 2 === 0)) {
      const bob = Math.sin(frameCountRef.current * 0.2) * 2;
      drawSprite(ctx, 'PLAYER', p.x, p.y + bob, p.width, p.height, p.direction < 0, p.isDodging ? 0.5 : 1.0);
      if (p.debuffs.confused > 0) { ctx.font = '20px serif'; ctx.fillStyle = COLORS.debuffConfused; ctx.fillText("酩酊", p.x, p.y - p.height - 10); }
      if (p.debuffs.guilt > 0) { ctx.font = '16px serif'; ctx.fillStyle = COLORS.debuffGuilt; ctx.fillText("罪", p.x + 10, p.y - p.height); }
      if (p.debuffs.poison > 0) { ctx.font = '16px serif'; ctx.fillStyle = COLORS.debuffPoison; ctx.fillText("毒", p.x - 10, p.y - p.height); }
    }

    p.weapons.forEach(w => {
        if (w.type === WeaponType.YOSHIKO) {
            const def = WEAPON_DEFINITIONS[w.type];
            const orbitRadius = def.range;
            const angle = frameCountRef.current * (0.05 + (w.level * 0.01));
            const ox = p.x + Math.cos(angle) * orbitRadius;
            const oy = p.y + Math.sin(angle) * orbitRadius;
            ctx.fillStyle = def.color;
            ctx.beginPath();
            ctx.arc(ox, oy, 5, 0, Math.PI*2);
            ctx.fill();
        }
    });

    projectilesRef.current.forEach(proj => {
      if (proj.isMelee && proj.startAngle !== undefined) {
        ctx.save();
        ctx.translate(p.x, p.y); 
        let currentRotation = proj.rotation || 0;
        if (proj.swingArc) {
             const progress = 1 - (proj.life / proj.maxLife);
             currentRotation = proj.startAngle + (proj.swingArc * progress);
        }
        if (proj.type === WeaponType.PEN) {
           ctx.rotate(currentRotation);
           ctx.fillStyle = '#fff'; ctx.fillRect(0, -2, proj.width, 4);
           ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(proj.width + 12, 0, 5, 0, Math.PI*2); ctx.fill();
        } 
        else if (proj.type === WeaponType.KATANA) {
            ctx.rotate(currentRotation);
            ctx.fillStyle = `rgba(200, 200, 200, ${proj.life/proj.maxLife})`;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, proj.width, -0.15, 0.15); ctx.fill();
            ctx.strokeStyle = `rgba(220, 38, 38, ${proj.life/proj.maxLife})`;
            ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, proj.width, -0.15, 0.15); ctx.stroke();
        }
        ctx.restore();
      } else {
        ctx.fillStyle = proj.color;
        ctx.beginPath(); ctx.arc(proj.x, proj.y, 4, 0, Math.PI*2); ctx.fill();
      }
    });

    particlesRef.current.forEach(part => {
      ctx.globalAlpha = part.alpha;
      ctx.fillStyle = part.color;
      ctx.fillRect(part.x, part.y, part.width, part.height);
      ctx.globalAlpha = 1.0;
    });

    // Draw Atmosphere (Ash/Snow) - Foreground
    ctx.fillStyle = 'rgba(20, 20, 20, 0.8)'; // Black ash
    atmosphereParticlesRef.current.forEach(pt => {
        ctx.globalAlpha = pt.alpha;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI*2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Draw Joystick if active
    if (touchRefs.current.joystick.active) {
        const j = touchRefs.current.joystick;
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(j.startX, j.startY, 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(j.currX, j.currY, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    ctx.font = '10px "Press Start 2P"';
    ctx.textAlign = 'center';
    textsRef.current.forEach(t => {
      ctx.lineWidth = 3; ctx.strokeStyle = 'black'; ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y);
    });

    const mouse = mouseRef.current;
    // Hide mouse cursor if joystick is active (likely mobile)
    if (!touchRefs.current.joystick.active) {
        ctx.strokeStyle = 'rgba(200, 50, 50, 0.6)'; 
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 10, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mouse.x - 15, mouse.y); ctx.lineTo(mouse.x + 15, mouse.y);
        ctx.moveTo(mouse.x, mouse.y - 15); ctx.lineTo(mouse.x, mouse.y + 15); ctx.stroke();
    }
  };

  const loop = useCallback(() => {
    update();
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) { ctx.imageSmoothingEnabled = false; draw(ctx); }
    requestRef.current = requestAnimationFrame(loop);
  }, [gameState]); 

  const prevGameState = useRef(gameState);
  useEffect(() => {
     if (prevGameState.current === GameState.WAVE_CLEARED && gameState === GameState.PLAYING) {
         startNextWave();
     }
     prevGameState.current = gameState;
  }, [gameState, startNextWave]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [gameState, loop]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="block bg-neutral-950 shadow-2xl mx-auto rounded-sm cursor-none"
      style={{ 
        width: '100%', 
        maxWidth: '800px',
        imageRendering: 'pixelated',
        boxShadow: '0 0 50px rgba(0,0,0,0.8)',
        touchAction: 'none'
      }}
    />
  );
};