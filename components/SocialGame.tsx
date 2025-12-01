
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameState, GameStats } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, SPRITES, SPRITE_PALETTE, SPRITE_SCALE } from '../constants';
import { audioService } from '../services/audioService';

interface SocialGameProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setStats: (stats: GameStats) => void;
}

interface Unit {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  active: boolean;
}

export const SocialGame: React.FC<SocialGameProps> = ({ gameState, setGameState, setStats }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const spriteCacheRef = useRef<{[key: string]: HTMLCanvasElement}>({});

  const citizensRef = useRef<Unit[]>([]);
  const kingRef = useRef<Unit>({ id: 999, x: CANVAS_WIDTH/2, y: 100, vx: 0, vy: 0, hp: 1000, active: true });
  const cursorRef = useRef<{x: number, y: number}>({ x: CANVAS_WIDTH/2, y: CANVAS_HEIGHT/2 });
  const particlesRef = useRef<{x: number, y: number, life: number, color: string}[]>([]);
  const scoreRef = useRef(0);

  useEffect(() => {
      // Sprite Cache
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
      ['CITIZEN', 'KING', 'FLAG'].forEach(key => {
          if (SPRITES[key as keyof typeof SPRITES]) cache[key] = createSpriteCanvas(SPRITES[key as keyof typeof SPRITES]);
      });
      spriteCacheRef.current = cache;

      // Spawn Citizens
      const initialCitizens: Unit[] = [];
      for(let i=0; i<30; i++) {
          initialCitizens.push({
              id: i,
              x: Math.random() * CANVAS_WIDTH,
              y: CANVAS_HEIGHT - 50 - Math.random() * 100,
              vx: 0, vy: 0, hp: 1, active: true
          });
      }
      citizensRef.current = initialCitizens;
      kingRef.current = { id: 999, x: CANVAS_WIDTH/2, y: 100, vx: 0, vy: 0, hp: 1000, active: true };
      
      const handleMouseMove = (e: MouseEvent) => {
          if (canvasRef.current) {
              const rect = canvasRef.current.getBoundingClientRect();
              const scaleX = CANVAS_WIDTH / rect.width;
              const scaleY = CANVAS_HEIGHT / rect.height;
              cursorRef.current.x = (e.clientX - rect.left) * scaleX;
              cursorRef.current.y = (e.clientY - rect.top) * scaleY;
          }
      };
      const handleTouchMove = (e: TouchEvent) => {
        if (canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const scaleX = CANVAS_WIDTH / rect.width;
            const scaleY = CANVAS_HEIGHT / rect.height;
            cursorRef.current.x = (e.touches[0].clientX - rect.left) * scaleX;
            cursorRef.current.y = (e.touches[0].clientY - rect.top) * scaleY;
        }
      };

      window.addEventListener('mousemove', handleMouseMove);
      const cvs = canvasRef.current;
      if (cvs) cvs.addEventListener('touchmove', handleTouchMove);

      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          if (cvs) cvs.removeEventListener('touchmove', handleTouchMove);
      };
  }, []);

  const update = () => {
      if (gameState !== GameState.PLAYING) return;
      
      const target = cursorRef.current;
      const king = kingRef.current;

      // King Logic
      if (king.active) {
          king.x += Math.sin(Date.now() * 0.001) * 2;
          if (Math.random() < 0.02) {
              // Stomp attack
              const stompX = king.x + (Math.random()-0.5)*100;
              const stompY = king.y + 100;
              particlesRef.current.push({ x: stompX, y: stompY, life: 30, color: '#ff0000' });
              citizensRef.current.forEach(c => {
                  if (Math.hypot(c.x - stompX, c.y - stompY) < 50) {
                      c.active = false;
                      audioService.playHit();
                  }
              });
          }
      }

      // Swarm Logic
      citizensRef.current.forEach(c => {
          if (!c.active) return;
          
          // Seek Target
          const dx = target.x - c.x;
          const dy = target.y - c.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 10) {
              c.vx += (dx / dist) * 0.5;
              c.vy += (dy / dist) * 0.5;
          }

          // Attack King
          if (king.active) {
              const kdx = king.x + 30 - c.x;
              const kdy = king.y + 30 - c.y;
              if (Math.hypot(kdx, kdy) < 60) {
                  king.hp -= 1;
                  scoreRef.current += 10;
                  if (Math.random() < 0.1) particlesRef.current.push({ x: king.x+30, y: king.y+30, life: 10, color: '#fff' });
                  if (king.hp <= 0) {
                      king.active = false;
                      setGameState(GameState.VICTORY);
                      audioService.playLevelUp();
                  }
              }
          }

          // Friction
          c.vx *= 0.9;
          c.vy *= 0.9;
          c.x += c.vx;
          c.y += c.vy;

          // Separation
          citizensRef.current.forEach(other => {
              if (c === other || !other.active) return;
              const odx = c.x - other.x;
              const ody = c.y - other.y;
              const odist = Math.hypot(odx, ody);
              if (odist < 15) {
                  c.vx += odx * 0.1;
                  c.vy += ody * 0.1;
              }
          });
      });

      // Spawn reinforcements
      if (Math.random() < 0.02) {
           citizensRef.current.push({
              id: Math.random(),
              x: Math.random() < 0.5 ? -10 : CANVAS_WIDTH + 10,
              y: CANVAS_HEIGHT - 50,
              vx: 0, vy: 0, hp: 1, active: true
          });
      }

      citizensRef.current = citizensRef.current.filter(c => c.active);
      particlesRef.current.forEach(p => p.life--);
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);

      if (citizensRef.current.length === 0) {
          setGameState(GameState.GAME_OVER);
          audioService.playGameOver();
      }

      setStats({
        wave: 1,
        score: scoreRef.current,
        kills: 0,
        timeElapsed: 0,
        bossHp: king.hp,
        bossMaxHp: 1000
      });
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
      // BG
      ctx.fillStyle = '#1e3a8a'; // Social Contract Blue
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // King
      if (kingRef.current.active) {
          const s = spriteCacheRef.current['KING'];
          const k = kingRef.current;
          if (s) {
              const scale = 5;
              ctx.drawImage(s, k.x, k.y, 16*scale, 16*scale);
          }
      }

      // Citizens
      citizensRef.current.forEach(c => {
          const s = spriteCacheRef.current['CITIZEN'];
          if (s) ctx.drawImage(s, c.x, c.y, 16*2, 16*2);
      });

      // Flag (Cursor)
      const f = spriteCacheRef.current['FLAG'];
      if (f) ctx.drawImage(f, cursorRef.current.x, cursorRef.current.y - 30, 16*2, 16*2);

      // Particles
      particlesRef.current.forEach(p => {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI*2);
          ctx.fill();
      });
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
      className="block bg-blue-900 shadow-2xl mx-auto rounded-sm cursor-none"
      style={{ width: '100%', maxWidth: '800px', imageRendering: 'pixelated' }}
    />
  );
};
