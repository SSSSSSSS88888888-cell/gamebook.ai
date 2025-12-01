import { useRef, useEffect, useCallback } from 'react';
import { GameState } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';

interface TouchState {
  joystick: {
    id: number;
    startX: number;
    startY: number;
    currX: number;
    currY: number;
    active: boolean;
    dx: number;
    dy: number;
  };
  aim: {
    id: number;
    active: boolean;
  };
}

interface InputState {
  keys: { [key: string]: boolean };
  mouse: { x: number; y: number; down: boolean };
  touch: TouchState;
}

export const useInput = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  gameState: GameState,
  setGameState: (state: GameState) => void
) => {
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const mouseRef = useRef<{ x: number; y: number; down: boolean }>({ x: 0, y: 0, down: false });
  const touchRefs = useRef<TouchState>({
    joystick: { id: -1, startX: 0, startY: 0, currX: 0, currY: 0, active: false, dx: 0, dy: 0 },
    aim: { id: -1, active: false }
  });

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

        if (touchX < CANVAS_WIDTH / 2 && !touchRefs.current.joystick.active) {
          touchRefs.current.joystick = {
            id: t.identifier,
            startX: touchX,
            startY: touchY,
            currX: touchX,
            currY: touchY,
            active: true,
            dx: 0,
            dy: 0
          };
        } else if (touchX >= CANVAS_WIDTH / 2) {
          mouseRef.current.x = touchX;
          mouseRef.current.y = touchY;
          mouseRef.current.down = true;
          touchRefs.current.aim = { id: t.identifier, active: true };
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
          touchRefs.current.joystick.dx = touchX - touchRefs.current.joystick.startX;
          touchRefs.current.joystick.dy = touchY - touchRefs.current.joystick.startY;
        } else if (t.identifier === touchRefs.current.aim.id) {
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
          touchRefs.current.joystick = {
            ...touchRefs.current.joystick,
            active: false,
            dx: 0,
            dy: 0,
            id: -1
          };
        } else if (t.identifier === touchRefs.current.aim.id) {
          mouseRef.current.down = false;
          touchRefs.current.aim = { id: -1, active: false };
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

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
  }, [gameState, setGameState, canvasRef]);

  const getMovementInput = useCallback((confusedMultiplier: number = 1) => {
    let dx = 0, dy = 0;

    if (keysPressed.current['ArrowUp'] || keysPressed.current['KeyW']) dy = -1 * confusedMultiplier;
    if (keysPressed.current['ArrowDown'] || keysPressed.current['KeyS']) dy = 1 * confusedMultiplier;
    if (keysPressed.current['ArrowLeft'] || keysPressed.current['KeyA']) dx = -1 * confusedMultiplier;
    if (keysPressed.current['ArrowRight'] || keysPressed.current['KeyD']) dx = 1 * confusedMultiplier;

    if (touchRefs.current.joystick.active) {
      dx = touchRefs.current.joystick.dx * confusedMultiplier;
      dy = touchRefs.current.joystick.dy * confusedMultiplier;
    }

    return { dx, dy };
  }, []);

  const isDodgePressed = useCallback(() => {
    return keysPressed.current['Space'] || keysPressed.current['KeyZ'];
  }, []);

  return {
    keysPressed,
    mouseRef,
    touchRefs,
    getMovementInput,
    isDodgePressed
  };
};
