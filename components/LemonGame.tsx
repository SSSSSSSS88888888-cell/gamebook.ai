
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameState, GameStats } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, SPRITE_PALETTE, SPRITE_SCALE } from '../constants';
import { audioService } from '../services/audioService';

interface LemonGameProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setStats: (stats: GameStats) => void;
}

// Book block types with different colors and point values
interface BookBlock {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  bookType: string;
  points: number;
  velocity: { x: number; y: number };
  rotation: number;
  settled: boolean;
}

interface Lemon {
  x: number;
  y: number;
  placed: boolean;
}

const BOOK_TYPES = [
  { name: '画集', width: 60, height: 20, color: '#8B4513', points: 10 },
  { name: '詩集', width: 45, height: 15, color: '#2F4F4F', points: 15 },
  { name: '洋書', width: 50, height: 25, color: '#800020', points: 12 },
  { name: '文庫', width: 35, height: 12, color: '#1a365d', points: 8 },
  { name: '辞書', width: 55, height: 30, color: '#374151', points: 20 },
  { name: '雑誌', width: 40, height: 10, color: '#065f46', points: 5 },
];

const GRAVITY = 0.3;
const FRICTION = 0.95;
const GROUND_Y = CANVAS_HEIGHT - 80;
const SHELF_HEIGHT = 60;

export const LemonGame: React.FC<LemonGameProps> = ({ gameState, setGameState, setStats }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);

  // Game state refs
  const blocksRef = useRef<BookBlock[]>([]);
  const currentBlockRef = useRef<BookBlock | null>(null);
  const lemonRef = useRef<Lemon>({ x: CANVAS_WIDTH / 2, y: 50, placed: false });
  const scoreRef = useRef(0);
  const heightRef = useRef(0);
  const balanceRef = useRef(100); // 0-100, higher is better
  const gamePhaseRef = useRef<'building' | 'placing_lemon' | 'exploding' | 'result'>('building');
  const explosionTimerRef = useRef(0);
  const blockIdRef = useRef(0);

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const mousePos = useRef({ x: CANVAS_WIDTH / 2, y: 100 });

  // Initialize game
  useEffect(() => {
    resetGame();

    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;

      if (e.code === 'Space' || e.code === 'KeyZ') {
        if (gamePhaseRef.current === 'building' && currentBlockRef.current) {
          dropCurrentBlock();
        } else if (gamePhaseRef.current === 'placing_lemon' && !lemonRef.current.placed) {
          placeLemon();
        }
      }

      if (e.code === 'Enter' && gamePhaseRef.current === 'building') {
        // Finish building, place lemon
        gamePhaseRef.current = 'placing_lemon';
        currentBlockRef.current = null;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mousePos.current.x = ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
      mousePos.current.y = ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
    };

    const handleClick = () => {
      if (gamePhaseRef.current === 'building' && currentBlockRef.current) {
        dropCurrentBlock();
      } else if (gamePhaseRef.current === 'placing_lemon' && !lemonRef.current.placed) {
        placeLemon();
      }
    };

    const handleTouch = (e: TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      mousePos.current.x = ((touch.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
      mousePos.current.y = ((touch.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvasRef.current?.addEventListener('mousemove', handleMouseMove);
    canvasRef.current?.addEventListener('click', handleClick);
    canvasRef.current?.addEventListener('touchmove', handleTouch);
    canvasRef.current?.addEventListener('touchstart', handleClick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvasRef.current?.removeEventListener('mousemove', handleMouseMove);
      canvasRef.current?.removeEventListener('click', handleClick);
      canvasRef.current?.removeEventListener('touchmove', handleTouch);
      canvasRef.current?.removeEventListener('touchstart', handleClick);
    };
  }, []);

  const resetGame = () => {
    blocksRef.current = [];
    scoreRef.current = 0;
    heightRef.current = 0;
    balanceRef.current = 100;
    gamePhaseRef.current = 'building';
    explosionTimerRef.current = 0;
    lemonRef.current = { x: CANVAS_WIDTH / 2, y: 50, placed: false };
    blockIdRef.current = 0;
    spawnNewBlock();
    setGameState(GameState.PLAYING);
  };

  const spawnNewBlock = () => {
    const type = BOOK_TYPES[Math.floor(Math.random() * BOOK_TYPES.length)];
    currentBlockRef.current = {
      id: blockIdRef.current++,
      x: CANVAS_WIDTH / 2,
      y: 80,
      width: type.width,
      height: type.height,
      color: type.color,
      bookType: type.name,
      points: type.points,
      velocity: { x: 0, y: 0 },
      rotation: 0,
      settled: false,
    };
  };

  const dropCurrentBlock = () => {
    if (!currentBlockRef.current) return;

    const block = currentBlockRef.current;
    block.x = mousePos.current.x;
    blocksRef.current.push(block);
    audioService.playShoot();

    setTimeout(() => {
      spawnNewBlock();
    }, 500);
    currentBlockRef.current = null;
  };

  const placeLemon = () => {
    // Find the highest point to place lemon
    let highestY = GROUND_Y;
    let lemonX = mousePos.current.x;

    blocksRef.current.forEach(block => {
      if (block.settled) {
        const blockTop = block.y - block.height / 2;
        if (blockTop < highestY &&
            mousePos.current.x > block.x - block.width / 2 &&
            mousePos.current.x < block.x + block.width / 2) {
          highestY = blockTop;
          lemonX = block.x;
        }
      }
    });

    lemonRef.current = {
      x: lemonX,
      y: highestY - 15,
      placed: true
    };

    audioService.playExp();

    // Start explosion sequence
    setTimeout(() => {
      gamePhaseRef.current = 'exploding';
      explosionTimerRef.current = 180; // 3 seconds
    }, 1000);
  };

  const calculateScore = () => {
    // Calculate tower height
    let minY = GROUND_Y;
    blocksRef.current.forEach(block => {
      if (block.settled) {
        const blockTop = block.y - block.height / 2;
        if (blockTop < minY) minY = blockTop;
      }
    });

    const height = GROUND_Y - minY;
    heightRef.current = Math.floor(height);

    // Calculate balance (how centered the tower is)
    let totalX = 0;
    let count = 0;
    blocksRef.current.forEach(block => {
      if (block.settled) {
        totalX += block.x;
        count++;
      }
    });
    const avgX = count > 0 ? totalX / count : CANVAS_WIDTH / 2;
    const centerOffset = Math.abs(avgX - CANVAS_WIDTH / 2);
    balanceRef.current = Math.max(0, 100 - centerOffset / 2);

    // Final score
    const baseScore = blocksRef.current.reduce((sum, b) => sum + (b.settled ? b.points : 0), 0);
    const heightBonus = Math.floor(height * 2);
    const balanceBonus = Math.floor(balanceRef.current);
    const lemonBonus = lemonRef.current.placed ? 100 : 0;

    scoreRef.current = baseScore + heightBonus + balanceBonus + lemonBonus;
  };

  const update = () => {
    if (gameState !== GameState.PLAYING) return;

    // Update current block position
    if (currentBlockRef.current && gamePhaseRef.current === 'building') {
      currentBlockRef.current.x = mousePos.current.x;
      // Clamp to canvas
      currentBlockRef.current.x = Math.max(
        currentBlockRef.current.width / 2,
        Math.min(CANVAS_WIDTH - currentBlockRef.current.width / 2, currentBlockRef.current.x)
      );
    }

    // Update lemon position before placed
    if (gamePhaseRef.current === 'placing_lemon' && !lemonRef.current.placed) {
      lemonRef.current.x = mousePos.current.x;
    }

    // Physics for dropped blocks
    blocksRef.current.forEach(block => {
      if (block.settled) return;

      // Apply gravity
      block.velocity.y += GRAVITY;
      block.y += block.velocity.y;
      block.x += block.velocity.x;
      block.velocity.x *= FRICTION;

      // Ground collision
      if (block.y + block.height / 2 >= GROUND_Y) {
        block.y = GROUND_Y - block.height / 2;
        block.velocity.y = 0;
        block.settled = true;
        audioService.playHit();
      }

      // Collision with other blocks
      blocksRef.current.forEach(other => {
        if (other.id === block.id || !other.settled) return;

        // Simple AABB collision
        const dx = block.x - other.x;
        const dy = block.y - other.y;
        const overlapX = (block.width + other.width) / 2 - Math.abs(dx);
        const overlapY = (block.height + other.height) / 2 - Math.abs(dy);

        if (overlapX > 0 && overlapY > 0) {
          // Collision detected
          if (overlapY < overlapX) {
            // Vertical collision (landing on top)
            if (dy < 0) {
              block.y = other.y - other.height / 2 - block.height / 2;
              block.velocity.y = 0;
              block.settled = true;
              audioService.playHit();
            }
          } else {
            // Horizontal collision (slide off)
            block.x += dx > 0 ? overlapX : -overlapX;
            block.velocity.x = dx > 0 ? 2 : -2;
          }
        }
      });

      // Wall collision
      if (block.x - block.width / 2 < 0) {
        block.x = block.width / 2;
        block.velocity.x = Math.abs(block.velocity.x) * 0.5;
      }
      if (block.x + block.width / 2 > CANVAS_WIDTH) {
        block.x = CANVAS_WIDTH - block.width / 2;
        block.velocity.x = -Math.abs(block.velocity.x) * 0.5;
      }
    });

    // Explosion phase
    if (gamePhaseRef.current === 'exploding') {
      explosionTimerRef.current--;
      if (explosionTimerRef.current <= 0) {
        calculateScore();
        gamePhaseRef.current = 'result';

        if (scoreRef.current >= 300) {
          setGameState(GameState.VICTORY);
        } else {
          // Continue or show result
          setGameState(GameState.VICTORY);
        }
      }
    }

    // Update stats
    calculateScore();
    setStats({
      wave: 1,
      score: scoreRef.current,
      kills: blocksRef.current.filter(b => b.settled).length,
      timeElapsed: 0,
    });
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    // Background - Maruzen bookstore atmosphere (melancholic blue-grey)
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f0f1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Bookshelf pattern in background
    ctx.fillStyle = 'rgba(139, 69, 19, 0.1)';
    for (let y = 0; y < CANVAS_HEIGHT; y += 100) {
      ctx.fillRect(0, y, CANVAS_WIDTH, 3);
    }
    for (let x = 0; x < CANVAS_WIDTH; x += 50) {
      ctx.fillStyle = `rgba(139, 69, 19, ${0.05 + Math.random() * 0.05})`;
      ctx.fillRect(x, 0, 30, CANVAS_HEIGHT);
    }

    // Ground / Shelf
    ctx.fillStyle = '#4a3728';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, SHELF_HEIGHT);
    ctx.fillStyle = '#2d1f14';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 5);

    // Draw settled blocks
    blocksRef.current.forEach(block => {
      drawBook(ctx, block);
    });

    // Draw current block (preview)
    if (currentBlockRef.current && gamePhaseRef.current === 'building') {
      ctx.globalAlpha = 0.7;
      drawBook(ctx, currentBlockRef.current);
      ctx.globalAlpha = 1;

      // Drop guide line
      ctx.strokeStyle = '#ffea00';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(currentBlockRef.current.x, currentBlockRef.current.y + currentBlockRef.current.height / 2);
      ctx.lineTo(currentBlockRef.current.x, GROUND_Y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw lemon
    if (gamePhaseRef.current === 'placing_lemon' || lemonRef.current.placed) {
      drawLemon(ctx, lemonRef.current.x, lemonRef.current.y, lemonRef.current.placed);
    }

    // Explosion effect
    if (gamePhaseRef.current === 'exploding') {
      const progress = 1 - explosionTimerRef.current / 180;

      // Radial explosion from lemon
      const radius = progress * 400;
      const explosionGradient = ctx.createRadialGradient(
        lemonRef.current.x, lemonRef.current.y, 0,
        lemonRef.current.x, lemonRef.current.y, radius
      );
      explosionGradient.addColorStop(0, `rgba(255, 234, 0, ${0.8 * (1 - progress)})`);
      explosionGradient.addColorStop(0.3, `rgba(255, 165, 0, ${0.6 * (1 - progress)})`);
      explosionGradient.addColorStop(0.6, `rgba(255, 69, 0, ${0.4 * (1 - progress)})`);
      explosionGradient.addColorStop(1, 'transparent');

      ctx.fillStyle = explosionGradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Flying particles
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2 + progress * 2;
        const dist = radius * 0.8;
        const px = lemonRef.current.x + Math.cos(angle) * dist;
        const py = lemonRef.current.y + Math.sin(angle) * dist;

        ctx.fillStyle = `rgba(255, 234, 0, ${1 - progress})`;
        ctx.fillRect(px - 3, py - 3, 6, 6);
      }
    }

    // UI overlay
    drawUI(ctx);
  };

  const drawBook = (ctx: CanvasRenderingContext2D, block: BookBlock) => {
    const { x, y, width, height, color } = block;

    // Book shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x - width / 2 + 3, y - height / 2 + 3, width, height);

    // Book body
    ctx.fillStyle = color;
    ctx.fillRect(x - width / 2, y - height / 2, width, height);

    // Book spine highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(x - width / 2, y - height / 2, 4, height);

    // Book edge shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x + width / 2 - 3, y - height / 2, 3, height);

    // Book lines (pages)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(x - width / 2 + 6, y - height / 2 + 2, width - 10, 1);
    ctx.fillRect(x - width / 2 + 6, y + height / 2 - 3, width - 10, 1);
  };

  const drawLemon = (ctx: CanvasRenderingContext2D, x: number, y: number, placed: boolean) => {
    // Lemon glow
    if (placed) {
      const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 40);
      glowGradient.addColorStop(0, 'rgba(255, 234, 0, 0.5)');
      glowGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGradient;
      ctx.fillRect(x - 40, y - 40, 80, 80);
    }

    // Lemon body
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.ellipse(x, y, 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lemon highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.ellipse(x - 5, y - 3, 6, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Lemon tips
    ctx.fillStyle = '#9acd32';
    ctx.beginPath();
    ctx.ellipse(x - 18, y, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 18, y, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pulsing effect when not placed
    if (!placed) {
      const pulse = Math.sin(Date.now() * 0.005) * 0.2 + 0.8;
      ctx.strokeStyle = `rgba(255, 234, 0, ${pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y, 25, 18, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  const drawUI = (ctx: CanvasRenderingContext2D) => {
    // Phase indicator
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 200, 80);
    ctx.strokeStyle = '#00f5ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 200, 80);

    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillStyle = '#00f5ff';

    if (gamePhaseRef.current === 'building') {
      ctx.fillText('STACK BOOKS', 20, 35);
      ctx.fillStyle = '#ffea00';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText('CLICK/SPACE: DROP', 20, 55);
      ctx.fillText('ENTER: PLACE LEMON', 20, 75);
    } else if (gamePhaseRef.current === 'placing_lemon') {
      ctx.fillText('PLACE LEMON', 20, 35);
      ctx.fillStyle = '#ff2d95';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText('ON TOP OF TOWER', 20, 55);
      ctx.fillText('CLICK TO PLACE', 20, 75);
    } else if (gamePhaseRef.current === 'exploding') {
      ctx.fillStyle = '#ffea00';
      ctx.fillText('EXPLOSION!', 20, 50);
    }

    // Score display
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(CANVAS_WIDTH - 160, 10, 150, 100);
    ctx.strokeStyle = '#ff2d95';
    ctx.strokeRect(CANVAS_WIDTH - 160, 10, 150, 100);

    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = '#ffea00';
    ctx.fillText(`SCORE`, CANVAS_WIDTH - 150, 30);
    ctx.fillStyle = '#fff';
    ctx.fillText(`${scoreRef.current}`, CANVAS_WIDTH - 150, 50);

    ctx.fillStyle = '#00f5ff';
    ctx.fillText(`HEIGHT`, CANVAS_WIDTH - 150, 70);
    ctx.fillStyle = '#fff';
    ctx.fillText(`${heightRef.current}px`, CANVAS_WIDTH - 150, 90);

    ctx.fillStyle = '#39ff14';
    ctx.fillText(`BOOKS: ${blocksRef.current.filter(b => b.settled).length}`, CANVAS_WIDTH - 150, 105);
  };

  const loop = useCallback(() => {
    update();
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      draw(ctx);
    }
    requestRef.current = requestAnimationFrame(loop);
  }, [gameState]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameState, loop]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="block bg-neutral-900 shadow-2xl mx-auto rounded-sm cursor-crosshair"
      style={{ width: '100%', maxWidth: '800px', imageRendering: 'pixelated' }}
    />
  );
};
