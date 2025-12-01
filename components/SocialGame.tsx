
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
  fear: number; // Individual fear level
}

type SocialState = 'NATURAL' | 'CONTRACT' | 'TYRANNY';

export const SocialGame: React.FC<SocialGameProps> = ({ gameState, setGameState, setStats }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const spriteCacheRef = useRef<{[key: string]: HTMLCanvasElement}>({});

  const citizensRef = useRef<Unit[]>([]);
  const kingRef = useRef<Unit>({ id: 999, x: CANVAS_WIDTH/2, y: 80, vx: 0, vy: 0, hp: 1500, active: true, fear: 0 });
  const cursorRef = useRef<{x: number, y: number}>({ x: CANVAS_WIDTH/2, y: CANVAS_HEIGHT/2 });
  const particlesRef = useRef<{x: number, y: number, life: number, color: string, text?: string}[]>([]);
  const scoreRef = useRef(0);

  // New: Social Contract mechanics
  const generalWillRef = useRef(50); // 0-100: General Will gauge
  const socialStateRef = useRef<SocialState>('CONTRACT');
  const cohesionRef = useRef(50); // How close citizens are to each other
  const freedomRef = useRef(50); // How spread out citizens are
  const initialCitizenCount = useRef(30);
  const citizensSavedRef = useRef(0);

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
              x: CANVAS_WIDTH/2 + (Math.random()-0.5) * 200,
              y: CANVAS_HEIGHT - 80 - Math.random() * 100,
              vx: 0, vy: 0, hp: 1, active: true, fear: 0
          });
      }
      citizensRef.current = initialCitizens;
      initialCitizenCount.current = 30;
      kingRef.current = { id: 999, x: CANVAS_WIDTH/2, y: 80, vx: 0, vy: 0, hp: 1500, active: true, fear: 0 };
      generalWillRef.current = 50;
      socialStateRef.current = 'CONTRACT';

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

  const calculateSocialState = () => {
      const citizens = citizensRef.current.filter(c => c.active);
      if (citizens.length < 3) return;

      // Calculate cohesion (average distance between citizens)
      let totalDist = 0;
      let count = 0;
      let centerX = 0, centerY = 0;

      citizens.forEach(c => {
          centerX += c.x;
          centerY += c.y;
      });
      centerX /= citizens.length;
      centerY /= citizens.length;

      citizens.forEach(c => {
          const dist = Math.hypot(c.x - centerX, c.y - centerY);
          totalDist += dist;
          count++;
      });

      const avgDist = count > 0 ? totalDist / count : 0;

      // Freedom: higher when spread out (avgDist > 100)
      // Cohesion: higher when close together (avgDist < 50)
      freedomRef.current = Math.min(100, avgDist / 1.5);
      cohesionRef.current = Math.max(0, 100 - avgDist);

      // General Will is optimal when balanced (not too spread, not too clustered)
      // Ideal: avgDist between 40-80
      if (avgDist < 30) {
          // Too clustered -> TYRANNY state (easier for king to attack)
          socialStateRef.current = 'TYRANNY';
          generalWillRef.current = Math.max(0, generalWillRef.current - 0.3);
      } else if (avgDist > 120) {
          // Too spread -> NATURAL state (less coordinated attacks)
          socialStateRef.current = 'NATURAL';
          generalWillRef.current = Math.max(0, generalWillRef.current - 0.2);
      } else {
          // Perfect balance -> CONTRACT state (optimal)
          socialStateRef.current = 'CONTRACT';
          generalWillRef.current = Math.min(100, generalWillRef.current + 0.1);
      }
  };

  const update = () => {
      if (gameState !== GameState.PLAYING) return;

      const target = cursorRef.current;
      const king = kingRef.current;

      calculateSocialState();

      // King Logic - More aggressive based on social state
      if (king.active) {
          // King movement
          king.x += Math.sin(Date.now() * 0.0015) * 3;
          king.x = Math.max(60, Math.min(CANVAS_WIDTH - 60, king.x));

          // Attack frequency based on social state
          let attackChance = 0.02;
          let attackRadius = 50;

          if (socialStateRef.current === 'TYRANNY') {
              attackChance = 0.05; // Much more frequent attacks when citizens are clustered
              attackRadius = 80; // Larger attack area
          } else if (socialStateRef.current === 'NATURAL') {
              attackChance = 0.015;
              attackRadius = 40;
          }

          // Stomp attack
          if (Math.random() < attackChance) {
              // Target the center of citizen mass
              const citizens = citizensRef.current.filter(c => c.active);
              if (citizens.length > 0) {
                  let avgX = 0, avgY = 0;
                  citizens.forEach(c => { avgX += c.x; avgY += c.y; });
                  avgX /= citizens.length;
                  avgY /= citizens.length;

                  const stompX = avgX + (Math.random()-0.5)*80;
                  const stompY = avgY + (Math.random()-0.5)*40;

                  // Visual warning
                  particlesRef.current.push({ x: stompX, y: stompY, life: 45, color: 'rgba(255,0,0,0.5)' });

                  // Delayed damage
                  setTimeout(() => {
                      citizensRef.current.forEach(c => {
                          if (c.active && Math.hypot(c.x - stompX, c.y - stompY) < attackRadius) {
                              c.active = false;
                              audioService.playHit();
                              particlesRef.current.push({ x: c.x, y: c.y, life: 20, color: '#ff0000', text: '!' });
                          }
                      });
                  }, 300);
              }
          }

          // Chain attack in TYRANNY state
          if (socialStateRef.current === 'TYRANNY' && Math.random() < 0.01) {
              // Lightning chain that hits multiple clustered citizens
              const citizens = citizensRef.current.filter(c => c.active);
              let hitCount = 0;
              citizens.forEach(c => {
                  if (hitCount < 3 && Math.random() < 0.3) {
                      c.active = false;
                      hitCount++;
                      particlesRef.current.push({ x: c.x, y: c.y, life: 30, color: '#ffea00', text: 'CHAIN!' });
                  }
              });
              if (hitCount > 0) audioService.playHit();
          }
      }

      // Swarm Logic with social contract mechanics
      citizensRef.current.forEach(c => {
          if (!c.active) return;

          // Seek Target (flag)
          const dx = target.x - c.x;
          const dy = target.y - c.y;
          const dist = Math.hypot(dx, dy);

          // Movement speed affected by social state
          let moveSpeed = 0.5;
          if (socialStateRef.current === 'NATURAL') {
              moveSpeed = 0.3; // Slower when uncoordinated
          } else if (socialStateRef.current === 'CONTRACT') {
              moveSpeed = 0.6; // Faster when united
          }

          if (dist > 15) {
              c.vx += (dx / dist) * moveSpeed;
              c.vy += (dy / dist) * moveSpeed;
          }

          // Attack King - damage affected by general will
          if (king.active) {
              const kdx = king.x + 40 - c.x;
              const kdy = king.y + 50 - c.y;
              const kingDist = Math.hypot(kdx, kdy);

              if (kingDist < 70) {
                  // Damage multiplier based on general will
                  let damageMultiplier = 1;
                  if (socialStateRef.current === 'CONTRACT') {
                      damageMultiplier = 1.5 + (generalWillRef.current / 100); // Up to 2.5x damage
                  } else if (socialStateRef.current === 'NATURAL') {
                      damageMultiplier = 0.5; // Half damage when scattered
                  }

                  const damage = Math.floor(1 * damageMultiplier);
                  king.hp -= damage;
                  scoreRef.current += damage * 10;

                  if (Math.random() < 0.1) {
                      const color = socialStateRef.current === 'CONTRACT' ? '#39ff14' : '#fff';
                      particlesRef.current.push({ x: king.x+40, y: king.y+50, life: 15, color });
                  }

                  if (king.hp <= 0) {
                      king.active = false;
                      // Victory bonus based on citizens saved
                      citizensSavedRef.current = citizensRef.current.filter(c => c.active).length;
                      const survivalRate = citizensSavedRef.current / initialCitizenCount.current;
                      scoreRef.current += Math.floor(survivalRate * 1000);
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

          // Bounds
          c.x = Math.max(10, Math.min(CANVAS_WIDTH - 10, c.x));
          c.y = Math.max(150, Math.min(CANVAS_HEIGHT - 10, c.y));

          // Separation (repulsion from other citizens)
          citizensRef.current.forEach(other => {
              if (c === other || !other.active) return;
              const odx = c.x - other.x;
              const ody = c.y - other.y;
              const odist = Math.hypot(odx, ody);
              if (odist < 20 && odist > 0) {
                  c.vx += (odx / odist) * 0.3;
                  c.vy += (ody / odist) * 0.3;
              }
          });
      });

      // Spawn reinforcements (slower in NATURAL state)
      const spawnChance = socialStateRef.current === 'CONTRACT' ? 0.025 : 0.01;
      if (Math.random() < spawnChance && citizensRef.current.filter(c => c.active).length < 50) {
           citizensRef.current.push({
              id: Math.random(),
              x: Math.random() < 0.5 ? 10 : CANVAS_WIDTH - 10,
              y: CANVAS_HEIGHT - 50 - Math.random() * 50,
              vx: 0, vy: 0, hp: 1, active: true, fear: 0
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
        kills: citizensRef.current.filter(c => c.active).length,
        timeElapsed: 0,
        bossHp: king.hp,
        bossMaxHp: 1500
      });
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
      // Background gradient based on social state
      let bgColor1 = '#1e3a8a';
      let bgColor2 = '#0f172a';

      if (socialStateRef.current === 'NATURAL') {
          bgColor1 = '#1a1a2e'; // Darker, chaotic
          bgColor2 = '#0a0a15';
      } else if (socialStateRef.current === 'TYRANNY') {
          bgColor1 = '#4a1a1a'; // Red tint, oppressive
          bgColor2 = '#1a0a0a';
      } else {
          bgColor1 = '#1e4a8a'; // Bright blue, harmonious
          bgColor2 = '#0f2a5a';
      }

      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      gradient.addColorStop(0, bgColor1);
      gradient.addColorStop(1, bgColor2);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Grid pattern
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      for (let i = 0; i < CANVAS_WIDTH; i += 40) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, CANVAS_HEIGHT);
          ctx.stroke();
      }
      for (let i = 0; i < CANVAS_HEIGHT; i += 40) {
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(CANVAS_WIDTH, i);
          ctx.stroke();
      }

      // King
      if (kingRef.current.active) {
          const s = spriteCacheRef.current['KING'];
          const k = kingRef.current;
          if (s) {
              const scale = 5;
              // King shadow
              ctx.fillStyle = 'rgba(0,0,0,0.3)';
              ctx.fillRect(k.x + 5, k.y + 5, 16*scale, 16*scale);
              ctx.drawImage(s, k.x, k.y, 16*scale, 16*scale);
          }

          // HP bar for king
          const hpPercent = k.hp / 1500;
          ctx.fillStyle = '#333';
          ctx.fillRect(k.x, k.y - 15, 80, 8);
          ctx.fillStyle = hpPercent > 0.5 ? '#ff2d95' : '#ff0000';
          ctx.fillRect(k.x, k.y - 15, 80 * hpPercent, 8);
      }

      // Connection lines between citizens (shows cohesion)
      if (socialStateRef.current === 'CONTRACT') {
          ctx.strokeStyle = 'rgba(57, 255, 20, 0.2)';
          ctx.lineWidth = 1;
          citizensRef.current.forEach((c, i) => {
              if (!c.active) return;
              citizensRef.current.slice(i + 1).forEach(other => {
                  if (!other.active) return;
                  const dist = Math.hypot(c.x - other.x, c.y - other.y);
                  if (dist < 60) {
                      ctx.beginPath();
                      ctx.moveTo(c.x + 8, c.y + 8);
                      ctx.lineTo(other.x + 8, other.y + 8);
                      ctx.stroke();
                  }
              });
          });
      }

      // Citizens
      citizensRef.current.forEach(c => {
          if (!c.active) return;
          const s = spriteCacheRef.current['CITIZEN'];
          if (s) {
              // Citizen glow based on state
              if (socialStateRef.current === 'CONTRACT') {
                  ctx.shadowBlur = 10;
                  ctx.shadowColor = '#39ff14';
              }
              ctx.drawImage(s, c.x, c.y, 16*2, 16*2);
              ctx.shadowBlur = 0;
          }
      });

      // Flag (Cursor)
      const f = spriteCacheRef.current['FLAG'];
      if (f) {
          ctx.drawImage(f, cursorRef.current.x - 8, cursorRef.current.y - 40, 16*2.5, 16*2.5);
      }

      // Particles
      particlesRef.current.forEach(p => {
          if (p.text) {
              ctx.font = '12px "Press Start 2P", monospace';
              ctx.fillStyle = p.color;
              ctx.fillText(p.text, p.x, p.y - (30 - p.life));
          } else {
              ctx.fillStyle = p.color;
              ctx.beginPath();
              ctx.arc(p.x, p.y, 5 + (30 - p.life) * 0.5, 0, Math.PI*2);
              ctx.fill();
          }
      });

      // UI Panel
      drawUI(ctx);
  };

  const drawUI = (ctx: CanvasRenderingContext2D) => {
      // General Will gauge
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(10, 10, 180, 120);
      ctx.strokeStyle = '#00f5ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, 180, 120);

      ctx.font = '10px "Press Start 2P", monospace';

      // Social State indicator
      let stateColor = '#39ff14';
      let stateText = 'CONTRACT';
      if (socialStateRef.current === 'NATURAL') {
          stateColor = '#888';
          stateText = 'NATURAL';
      } else if (socialStateRef.current === 'TYRANNY') {
          stateColor = '#ff2d95';
          stateText = 'TYRANNY!';
      }

      ctx.fillStyle = stateColor;
      ctx.fillText(stateText, 20, 30);

      // General Will bar
      ctx.fillStyle = '#fff';
      ctx.fillText('GENERAL WILL', 20, 50);
      ctx.fillStyle = '#333';
      ctx.fillRect(20, 55, 150, 12);

      const willPercent = generalWillRef.current / 100;
      const willColor = willPercent > 0.6 ? '#39ff14' : willPercent > 0.3 ? '#ffea00' : '#ff2d95';
      ctx.fillStyle = willColor;
      ctx.fillRect(20, 55, 150 * willPercent, 12);

      // Citizens count
      const citizenCount = citizensRef.current.filter(c => c.active).length;
      ctx.fillStyle = '#00f5ff';
      ctx.fillText(`CITIZENS: ${citizenCount}`, 20, 85);

      // Cohesion/Freedom indicators
      ctx.fillStyle = '#bf00ff';
      ctx.fillText(`COHESION: ${Math.floor(cohesionRef.current)}%`, 20, 100);
      ctx.fillStyle = '#ffea00';
      ctx.fillText(`FREEDOM: ${Math.floor(freedomRef.current)}%`, 20, 115);

      // Hint text
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '8px "Press Start 2P", monospace';
      if (socialStateRef.current === 'NATURAL') {
          ctx.fillText('GATHER CITIZENS!', 20, 128);
      } else if (socialStateRef.current === 'TYRANNY') {
          ctx.fillText('SPREAD OUT!', 20, 128);
      } else {
          ctx.fillText('PERFECT BALANCE!', 20, 128);
      }

      // Score
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(CANVAS_WIDTH - 120, 10, 110, 40);
      ctx.strokeStyle = '#ffea00';
      ctx.strokeRect(CANVAS_WIDTH - 120, 10, 110, 40);
      ctx.fillStyle = '#ffea00';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText('SCORE', CANVAS_WIDTH - 110, 28);
      ctx.fillStyle = '#fff';
      ctx.fillText(`${scoreRef.current}`, CANVAS_WIDTH - 110, 43);
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
