
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameState, GameStats, Player, WeaponType } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, SPRITES, SPRITE_PALETTE, SPRITE_SCALE } from '../constants';
import { audioService } from '../services/audioService';

interface LemonGameProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setStats: (stats: GameStats) => void;
}

interface GridEntity {
  x: number;
  y: number;
  type: 'PLAYER' | 'ENEMY' | 'BOMB' | 'EXPLOSION' | 'BOX' | 'WALL';
  life?: number;
  id?: number;
}

export const LemonGame: React.FC<LemonGameProps> = ({ gameState, setGameState, setStats }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const spriteCacheRef = useRef<{[key: string]: HTMLCanvasElement}>({});

  const CELL_SIZE = 40;
  const GRID_W = Math.floor(CANVAS_WIDTH / CELL_SIZE);
  const GRID_H = Math.floor(CANVAS_HEIGHT / CELL_SIZE);

  // Game State Refs
  const playerRef = useRef<{x: number, y: number, alive: boolean}>({ x: 1, y: 1, alive: true });
  const gridRef = useRef<(string | null)[][]>([]); // 'BOX', 'WALL', null
  const enemiesRef = useRef<{id: number, x: number, y: number, alive: boolean, dir: number}[]>([]);
  const bombsRef = useRef<{id: number, x: number, y: number, timer: number}[]>([]);
  const explosionsRef = useRef<{x: number, y: number, life: number}[]>([]);
  
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const lastMoveTime = useRef(0);
  const scoreRef = useRef(0);

  // Initialize
  useEffect(() => {
    // Cache Sprites
    const createSpriteCanvas = (pixelMap: string[]): HTMLCanvasElement => {
      const h = pixelMap.length;
      const w = pixelMap[0].length;
      const c = document.createElement('canvas');
      c.width = w * SPRITE_SCALE;
      c.height = h * SPRITE_SCALE;
      const ctx = c.getContext('2d');
      if (ctx) {
        for(let y=0; y<h; y++) {
            for(let x=0; x<w; x++) {
            const char = pixelMap[y][x];
            if (SPRITE_PALETTE[char] && SPRITE_PALETTE[char] !== 'transparent') {
                ctx.fillStyle = SPRITE_PALETTE[char];
                ctx.fillRect(x * SPRITE_SCALE, y * SPRITE_SCALE, SPRITE_SCALE, SPRITE_SCALE);
            }
            }
        }
      }
      return c;
    };
    const cache: {[key: string]: HTMLCanvasElement} = {};
    ['PLAYER', 'LEMON', 'EXPLOSION', 'BOX', 'WALL', 'CRITIC'].forEach(key => {
        const spriteKey = key === 'CRITIC' ? 'CRITIC' : key; 
        if (SPRITES[spriteKey as keyof typeof SPRITES]) {
             cache[key] = createSpriteCanvas(SPRITES[spriteKey as keyof typeof SPRITES]);
        }
    });
    spriteCacheRef.current = cache;

    // Reset Level
    resetLevel();

    const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const resetLevel = () => {
      playerRef.current = { x: 1, y: 1, alive: true };
      enemiesRef.current = [];
      bombsRef.current = [];
      explosionsRef.current = [];
      scoreRef.current = 0;
      
      const newGrid: (string | null)[][] = [];
      for(let y=0; y<GRID_H; y++) {
          const row: (string | null)[] = [];
          for(let x=0; x<GRID_W; x++) {
              if (x===0 || x===GRID_W-1 || y===0 || y===GRID_H-1 || (x%2===0 && y%2===0)) {
                  row.push('WALL');
              } else if (Math.random() < 0.3 && !(x<3 && y<3)) {
                  row.push('BOX');
              } else {
                  row.push(null);
                  if (Math.random() < 0.05 && !(x<3 && y<3)) {
                      enemiesRef.current.push({ id: Math.random(), x, y, alive: true, dir: Math.floor(Math.random()*4) });
                  }
              }
          }
          newGrid.push(row);
      }
      gridRef.current = newGrid;
      setGameState(GameState.PLAYING);
  };

  const placeBomb = () => {
      const p = playerRef.current;
      if (bombsRef.current.some(b => b.x === p.x && b.y === p.y)) return;
      bombsRef.current.push({ id: Math.random(), x: p.x, y: p.y, timer: 120 }); // 2 seconds
      audioService.playShoot();
  };

  const explode = (bx: number, by: number) => {
      const range = 2;
      const hits: {x: number, y: number}[] = [{x: bx, y: by}];
      
      [[0,1], [0,-1], [1,0], [-1,0]].forEach(([dx, dy]) => {
          for(let i=1; i<=range; i++) {
              const tx = bx + dx*i;
              const ty = by + dy*i;
              if (tx < 0 || tx >= GRID_W || ty < 0 || ty >= GRID_H) break;
              if (gridRef.current[ty][tx] === 'WALL') break;
              hits.push({x: tx, y: ty});
              if (gridRef.current[ty][tx] === 'BOX') {
                  gridRef.current[ty][tx] = null;
                  scoreRef.current += 10;
                  break; // Stop at box
              }
          }
      });

      hits.forEach(h => {
          explosionsRef.current.push({ x: h.x, y: h.y, life: 30 });
          // Check Player
          if (playerRef.current.x === h.x && playerRef.current.y === h.y) {
              playerRef.current.alive = false;
              setGameState(GameState.GAME_OVER);
              audioService.playGameOver();
          }
          // Check Enemies
          enemiesRef.current.forEach(e => {
              if (e.alive && e.x === h.x && e.y === h.y) {
                  e.alive = false;
                  scoreRef.current += 100;
                  audioService.playHit();
              }
          });
      });
      audioService.playExp();
  };

  const update = () => {
      if (gameState !== GameState.PLAYING) return;
      const now = Date.now();
      
      // Player Move
      if (now - lastMoveTime.current > 150 && playerRef.current.alive) {
          let dx = 0, dy = 0;
          if (keysPressed.current['ArrowUp'] || keysPressed.current['KeyW']) dy = -1;
          else if (keysPressed.current['ArrowDown'] || keysPressed.current['KeyS']) dy = 1;
          else if (keysPressed.current['ArrowLeft'] || keysPressed.current['KeyA']) dx = -1;
          else if (keysPressed.current['ArrowRight'] || keysPressed.current['KeyD']) dx = 1;
          
          if (dx !== 0 || dy !== 0) {
              const nx = playerRef.current.x + dx;
              const ny = playerRef.current.y + dy;
              if (nx >=0 && nx < GRID_W && ny >=0 && ny < GRID_H && !gridRef.current[ny][nx] && !bombsRef.current.some(b => b.x === nx && b.y === ny)) {
                  playerRef.current.x = nx;
                  playerRef.current.y = ny;
                  lastMoveTime.current = now;
              }
          }
      }

      if (keysPressed.current['Space'] || keysPressed.current['KeyZ']) {
          if (playerRef.current.alive) placeBomb();
          keysPressed.current['Space'] = false; // Prevent spam
          keysPressed.current['KeyZ'] = false;
      }

      // Bombs
      bombsRef.current.forEach(b => {
          b.timer--;
          if (b.timer <= 0) explode(b.x, b.y);
      });
      bombsRef.current = bombsRef.current.filter(b => b.timer > 0);

      // Explosions
      explosionsRef.current.forEach(e => e.life--);
      explosionsRef.current = explosionsRef.current.filter(e => e.life > 0);

      // Enemies
      if (Math.random() < 0.05) {
          enemiesRef.current.forEach(e => {
              if (!e.alive) return;
              const dirs = [[0,1], [0,-1], [1,0], [-1,0]];
              // 50% chance to follow player
              if (Math.random() < 0.5) {
                  if (playerRef.current.x > e.x) e.dir = 2;
                  if (playerRef.current.x < e.x) e.dir = 3;
                  if (playerRef.current.y > e.y) e.dir = 0;
                  if (playerRef.current.y < e.y) e.dir = 1;
              } else if (Math.random() < 0.2) {
                  e.dir = Math.floor(Math.random()*4);
              }

              const [dx, dy] = dirs[e.dir];
              const nx = e.x + dx;
              const ny = e.y + dy;
              
              if (nx >=0 && nx < GRID_W && ny >=0 && ny < GRID_H && !gridRef.current[ny][nx] && !bombsRef.current.some(b => b.x === nx && b.y === ny)) {
                   e.x = nx;
                   e.y = ny;
                   if (e.x === playerRef.current.x && e.y === playerRef.current.y) {
                       playerRef.current.alive = false;
                       setGameState(GameState.GAME_OVER);
                       audioService.playGameOver();
                   }
              }
          });
      }
      enemiesRef.current = enemiesRef.current.filter(e => e.alive);

      // Win Condition
      if (enemiesRef.current.length === 0) {
           setGameState(GameState.VICTORY);
      }

      // Stats Update
      setStats({
          wave: 1,
          score: scoreRef.current,
          kills: 0,
          timeElapsed: 0,
      });
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
      // BG
      ctx.fillStyle = '#2d2a26';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Grid
      for(let y=0; y<GRID_H; y++) {
          for(let x=0; x<GRID_W; x++) {
              const px = x * CELL_SIZE;
              const py = y * CELL_SIZE;
              const cell = gridRef.current[y][x];
              
              if (cell === 'WALL') {
                  const s = spriteCacheRef.current['WALL'];
                  if(s) ctx.drawImage(s, px, py, CELL_SIZE, CELL_SIZE);
                  else { ctx.fillStyle = '#555'; ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE); }
              } else if (cell === 'BOX') {
                  const s = spriteCacheRef.current['BOX'];
                  if(s) ctx.drawImage(s, px, py, CELL_SIZE, CELL_SIZE);
                  else { ctx.fillStyle = '#8b4513'; ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE); }
              }
          }
      }

      // Bombs
      bombsRef.current.forEach(b => {
          const s = spriteCacheRef.current['LEMON'];
          const px = b.x * CELL_SIZE;
          const py = b.y * CELL_SIZE;
          const scale = 1 + Math.sin(Date.now() * 0.02) * 0.1;
          if(s) ctx.drawImage(s, px, py, CELL_SIZE, CELL_SIZE);
      });

      // Explosions
      explosionsRef.current.forEach(e => {
          const s = spriteCacheRef.current['EXPLOSION'];
          const px = e.x * CELL_SIZE;
          const py = e.y * CELL_SIZE;
          if(s) ctx.drawImage(s, px, py, CELL_SIZE, CELL_SIZE);
      });

      // Enemies
      enemiesRef.current.forEach(e => {
          const s = spriteCacheRef.current['CRITIC'];
          const px = e.x * CELL_SIZE;
          const py = e.y * CELL_SIZE;
          if(s) ctx.drawImage(s, px, py, CELL_SIZE, CELL_SIZE);
      });

      // Player
      if (playerRef.current.alive) {
          const s = spriteCacheRef.current['PLAYER'];
          const px = playerRef.current.x * CELL_SIZE;
          const py = playerRef.current.y * CELL_SIZE;
          if(s) ctx.drawImage(s, px, py - 5, CELL_SIZE, CELL_SIZE + 5);
      }
  };

  const loop = useCallback(() => {
    update();
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) { ctx.imageSmoothingEnabled = false; draw(ctx); }
    requestRef.current = requestAnimationFrame(loop);
  }, [gameState]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [gameState, loop]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="block bg-neutral-900 shadow-2xl mx-auto rounded-sm"
      style={{ width: '100%', maxWidth: '800px', imageRendering: 'pixelated' }}
    />
  );
};
