import { Enemy, Player, Projectile, WeaponType, PlayerDebuffs } from '../types';
import { COLORS } from '../constants';

interface EnemyAIContext {
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  frameCount: number;
  currentWave: number;
  createParticles: (x: number, y: number, count: number, color: string) => void;
  createDamageText: (x: number, y: number, damage: number, isCrit?: boolean, color?: string) => void;
}

export const updateEnemyAI = (
  enemy: Enemy,
  ctx: EnemyAIContext
): { newProjectiles: Projectile[] } => {
  const { player, frameCount, currentWave, createParticles, createDamageText } = ctx;
  const newProjectiles: Projectile[] = [];

  const speedMod = enemy.debuffs.slow > 0 ? 0.5 : 1.0;
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.hypot(dx, dy);

  // Boss AI
  if (enemy.type === 'BOSS') {
    if (enemy.y < 100) {
      enemy.y += 1;
    } else {
      const bossPhase = Math.floor(enemy.hp / enemy.maxHp * 3);
      enemy.x += Math.sin(frameCount * 0.02) * (2 + (3 - bossPhase));

      const attackInterval = Math.max(30, 60 - (currentWave * 2));
      if (frameCount % attackInterval === 0) {
        if (bossPhase === 2) {
          const bullets = 12 + currentWave;
          for (let i = 0; i < bullets; i++) {
            const angle = (Math.PI * 2 / bullets) * i + frameCount * 0.1;
            newProjectiles.push({
              id: Math.random(),
              x: enemy.x + enemy.width / 2,
              y: enemy.y + enemy.height / 2,
              width: 8, height: 8,
              color: '#ff0000',
              vx: Math.cos(angle) * 4,
              vy: Math.sin(angle) * 4,
              life: 200, maxLife: 200,
              damage: 10,
              penetration: 1,
              type: WeaponType.PEN,
              isMelee: false,
              markedForDeletion: false,
              isEnemy: true
            });
          }
        } else if (bossPhase === 1) {
          for (let i = 0; i < 3; i++) {
            const angle = (frameCount * 0.15) + (i * Math.PI * 2 / 3);
            newProjectiles.push({
              id: Math.random(),
              x: enemy.x + enemy.width / 2,
              y: enemy.y + enemy.height / 2,
              width: 10, height: 10,
              color: '#ff4444',
              vx: Math.cos(angle) * 5,
              vy: Math.sin(angle) * 5,
              life: 250, maxLife: 250,
              damage: 15,
              penetration: 1,
              type: WeaponType.PEN,
              isMelee: false,
              markedForDeletion: false,
              isEnemy: true
            });
          }
        } else {
          const angleToPlayer = Math.atan2(dy, dx);
          for (let i = -2; i <= 2; i++) {
            newProjectiles.push({
              id: Math.random(),
              x: enemy.x + enemy.width / 2,
              y: enemy.y + enemy.height / 2,
              width: 12, height: 12,
              color: '#ff0000',
              vx: Math.cos(angleToPlayer + i * 0.2) * 6,
              vy: Math.sin(angleToPlayer + i * 0.2) * 6,
              life: 180, maxLife: 180,
              damage: 20,
              penetration: 1,
              type: WeaponType.PEN,
              isMelee: false,
              markedForDeletion: false,
              isEnemy: true
            });
          }
        }
      }
    }
    return { newProjectiles };
  }

  // Tempter AI
  if (enemy.type === '堕落 (Tempter)') {
    if (dist < 200) {
      enemy.x -= (dx / dist) * enemy.speed * speedMod;
      enemy.y -= (dy / dist) * enemy.speed * speedMod;
    } else {
      enemy.x += Math.sin(frameCount * 0.05 + enemy.id) * enemy.speed;
    }

    if (!enemy.attackCooldown) enemy.attackCooldown = 0;
    if (enemy.attackCooldown > 0) enemy.attackCooldown--;

    if (enemy.attackCooldown <= 0 && dist < 300) {
      const angle = Math.atan2(dy, dx);
      const shotCount = currentWave >= 5 ? 3 : 1;
      for (let i = 0; i < shotCount; i++) {
        const spreadAngle = angle + (i - Math.floor(shotCount / 2)) * 0.3;
        newProjectiles.push({
          id: Math.random(),
          x: enemy.x, y: enemy.y,
          width: 8, height: 8,
          color: COLORS.debuffConfused,
          vx: Math.cos(spreadAngle) * 3,
          vy: Math.sin(spreadAngle) * 3,
          life: 100, maxLife: 100,
          damage: 5,
          penetration: 1,
          type: WeaponType.BOTTLE,
          isEnemy: true,
          playerDebuff: 'confused',
          markedForDeletion: false
        });
      }
      enemy.attackCooldown = Math.max(90, 180 - currentWave * 10);
    }
    return { newProjectiles };
  }

  // Morphine AI
  if (enemy.type === '薬鬼 (Morphine)') {
    const rageThreshold = currentWave >= 8 ? 0.7 : 0.5;
    if (!enemy.rageMode && enemy.hp < enemy.maxHp * rageThreshold) {
      enemy.rageMode = true;
      enemy.speed *= 2.5;
      createDamageText(enemy.x, enemy.y - 20, 0, false, '#ff0000');
    }

    if (enemy.rageMode) {
      enemy.x += (dx / dist) * enemy.speed * speedMod + Math.sin(frameCount * 0.2 + enemy.id) * 2;
      enemy.y += (dy / dist) * enemy.speed * speedMod + Math.cos(frameCount * 0.2 + enemy.id) * 2;
    } else {
      enemy.x += (dx / dist) * enemy.speed * speedMod;
      enemy.y += (dy / dist) * enemy.speed * speedMod;
    }
    return { newProjectiles };
  }

  // Ghost AI
  if (enemy.type === '亡霊 (Ghost)') {
    if (currentWave >= 6 && frameCount % 180 === Math.floor(enemy.id * 100) % 180) {
      const teleportDist = 100;
      const teleportAngle = Math.atan2(dy, dx);
      enemy.x += Math.cos(teleportAngle) * teleportDist;
      enemy.y += Math.sin(teleportAngle) * teleportDist;
      createParticles(enemy.x, enemy.y, 5, '#ffffff');
    }
    enemy.x += (dx / dist) * enemy.speed * speedMod;
    enemy.y += (dy / dist) * enemy.speed * speedMod;
    return { newProjectiles };
  }

  // Hannya AI
  if (enemy.type === '般若 (Hannya)') {
    if (!enemy.attackCooldown) enemy.attackCooldown = 60;
    if (enemy.attackCooldown > 0) enemy.attackCooldown--;

    if (enemy.attackCooldown <= 0 && dist < 200) {
      enemy.x += (dx / dist) * 80;
      enemy.y += (dy / dist) * 80;
      createParticles(enemy.x, enemy.y, 4, '#be185d');
      enemy.attackCooldown = 120;
    } else {
      enemy.x += (dx / dist) * enemy.speed * speedMod * 0.5;
      enemy.y += (dy / dist) * enemy.speed * speedMod * 0.5;
    }
    return { newProjectiles };
  }

  // Father AI
  if (enemy.type === '厳父 (Father)') {
    enemy.x += (dx / dist) * enemy.speed * speedMod;
    enemy.y += (dy / dist) * enemy.speed * speedMod;

    if (currentWave >= 10 && dist < 100) {
      if (player.debuffs.guilt < 60) {
        player.debuffs.guilt = 60;
        createDamageText(player.x, player.y - 40, 0, false, COLORS.debuffGuilt);
      }
    }
    return { newProjectiles };
  }

  // Kempei AI
  if (enemy.type === '憲兵 (Kempei)') {
    const formationOffset = Math.sin(frameCount * 0.03 + enemy.id) * 30;
    const perpX = -dy / (dist || 1);
    const perpY = dx / (dist || 1);

    enemy.x += ((dx / dist) * enemy.speed * speedMod) + perpX * formationOffset * 0.02;
    enemy.y += ((dy / dist) * enemy.speed * speedMod) + perpY * formationOffset * 0.02;
    return { newProjectiles };
  }

  // Default enemy behavior
  if (dist > 0) {
    let pushX = 0, pushY = 0;
    ctx.enemies.forEach(other => {
      if (enemy === other) return;
      const odx = enemy.x - other.x;
      const ody = enemy.y - other.y;
      const odist = Math.hypot(odx, ody);
      if (odist < enemy.width) {
        pushX += odx / (odist || 1);
        pushY += ody / (odist || 1);
      }
    });
    enemy.x += ((dx / dist) * enemy.speed * speedMod) + pushX * 0.2;
    enemy.y += ((dy / dist) * enemy.speed * speedMod) + pushY * 0.2;
  }

  return { newProjectiles };
};

export const checkEnemyCollision = (
  enemy: Enemy,
  player: Player,
  createDamageText: (x: number, y: number, damage: number, isCrit?: boolean, color?: string) => void,
  playHit: () => void
): { damage: number; knockback: { x: number; y: number } } | null => {
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.hypot(dx, dy);

  if (dist < (player.width / 2 + enemy.width / 2) && player.invincibility <= 0) {
    let dmg = Math.max(1, enemy.damage - player.stats.armor);

    if (enemy.type === '厳父 (Father)') {
      player.debuffs.guilt = 180;
      createDamageText(player.x, player.y - 30, 0, false, COLORS.debuffGuilt);
      return {
        damage: dmg,
        knockback: { x: Math.cos(Math.atan2(dy, dx)) * 100, y: Math.sin(Math.atan2(dy, dx)) * 100 }
      };
    } else if (enemy.type === '薬鬼 (Morphine)') {
      player.debuffs.poison = 300;
      createDamageText(player.x, player.y - 30, 0, false, COLORS.debuffPoison);
    }

    playHit();
    createDamageText(player.x, player.y, dmg);

    return {
      damage: dmg,
      knockback: { x: (dx / dist) * 20, y: (dy / dist) * 20 }
    };
  }

  return null;
};
