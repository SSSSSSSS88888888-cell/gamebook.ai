import { Player, Enemy, Projectile, WeaponType, WeaponInstance } from '../types';
import { WEAPON_DEFINITIONS } from '../constants';

interface WeaponContext {
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  mouseX: number;
  mouseY: number;
  mouseDown: boolean;
  frameCount: number;
  createParticles: (x: number, y: number, count: number, color: string) => void;
  createDamageText: (x: number, y: number, damage: number, isCrit?: boolean, color?: string) => void;
  handleEnemyDeath: (enemy: Enemy) => void;
  playShoot: () => void;
  playSwing: () => void;
  playHit: () => void;
}

export const processWeapon = (
  weapon: WeaponInstance,
  ctx: WeaponContext
): Projectile[] => {
  const { player, enemies, projectiles, mouseX, mouseY, mouseDown, frameCount } = ctx;
  const def = WEAPON_DEFINITIONS[weapon.type];
  const newProjectiles: Projectile[] = [];

  if (weapon.cooldown > 0) weapon.cooldown--;

  // YOSHIKO - Orbiting guardian spirit
  if (weapon.type === WeaponType.YOSHIKO) {
    const orbitRadius = def.range;
    const orbitSpeed = 0.05 + (weapon.level * 0.01);
    const angle = frameCount * orbitSpeed;
    const ox = player.x + Math.cos(angle) * orbitRadius;
    const oy = player.y + Math.sin(angle) * orbitRadius;

    if (frameCount % 10 === 0) {
      ctx.createParticles(ox, oy, 1, def.color);
    }

    enemies.forEach(e => {
      if (Math.hypot(e.x - ox, e.y - oy) < 20) {
        if (frameCount % 15 === 0) {
          const dmg = def.baseDamage + player.stats.rangedDamage + (weapon.level * 2);
          e.hp -= dmg;
          ctx.createDamageText(e.x, e.y, dmg);
          if (e.hp <= 0) ctx.handleEnemyDeath(e);
        }
      }
    });
    return newProjectiles;
  }

  // SHUKI - Memoir pages that get stronger when hurt
  if (weapon.type === WeaponType.SHUKI) {
    if (weapon.cooldown <= 0 && enemies.length > 0) {
      const hpRatio = player.hp / player.stats.maxHp;
      const damageMultiplier = 1 + (1 - hpRatio) * 2;

      let nearest = enemies[0];
      let minDist = Infinity;
      enemies.forEach(e => {
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        if (d < minDist) { minDist = d; nearest = e; }
      });

      if (nearest && minDist < def.range) {
        const angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
        const pageCount = 1 + Math.floor(weapon.level / 2);

        for (let i = 0; i < pageCount; i++) {
          const spreadAngle = angle + (Math.random() - 0.5) * 0.5;
          const baseDmg = (def.baseDamage + player.stats.rangedDamage) * damageMultiplier;
          newProjectiles.push({
            id: Math.random(),
            x: player.x, y: player.y,
            width: 10, height: 10,
            color: def.color,
            vx: Math.cos(spreadAngle) * 7,
            vy: Math.sin(spreadAngle) * 7,
            life: 50, maxLife: 50,
            damage: baseDmg,
            penetration: 2,
            type: weapon.type,
            markedForDeletion: false,
            crit: hpRatio < 0.3
          });
        }
        ctx.playShoot();
        const speedMult = 1 + (player.stats.attackSpeed / 100);
        weapon.cooldown = Math.max(20, weapon.maxCooldown / speedMult);
      }
    }
    return newProjectiles;
  }

  // KAMEN - Mask that absorbs and reflects enemy projectiles
  if (weapon.type === WeaponType.KAMEN) {
    const absorbRange = def.range + (weapon.level * 10);
    projectiles.forEach(p => {
      if (p.isEnemy && !p.markedForDeletion) {
        const dist = Math.hypot(p.x - player.x, p.y - player.y);
        if (dist < absorbRange) {
          p.isEnemy = false;
          p.damage = p.damage * (1 + weapon.level * 0.5);
          p.color = def.color;
          p.vx = -p.vx * 1.5;
          p.vy = -p.vy * 1.5;
          p.life = 60;
          ctx.createParticles(p.x, p.y, 3, def.color);
          ctx.playHit();
        }
      }
    });
    return newProjectiles;
  }

  // Manual weapons
  if (def.isManual) {
    if (mouseDown && weapon.cooldown <= 0) {
      const projectile = fireWeapon(weapon, player, mouseX, mouseY, ctx);
      if (projectile) newProjectiles.push(...projectile);
      const speedMult = 1 + (player.stats.attackSpeed / 100);
      weapon.cooldown = Math.max(5, weapon.maxCooldown / speedMult);
    }
  } else if (!def.isManual) {
    if (weapon.cooldown <= 0) {
      if (weapon.type === WeaponType.BOOK || enemies.length > 0) {
        const projectile = fireWeapon(weapon, player, mouseX, mouseY, ctx);
        if (projectile) newProjectiles.push(...projectile);
        const speedMult = 1 + (player.stats.attackSpeed / 100);
        weapon.cooldown = Math.max(5, weapon.maxCooldown / speedMult);
      }
    }
  }

  return newProjectiles;
};

const fireWeapon = (
  weapon: WeaponInstance,
  player: Player,
  mouseX: number,
  mouseY: number,
  ctx: WeaponContext
): Projectile[] | null => {
  const def = WEAPON_DEFINITIONS[weapon.type];
  const projectiles: Projectile[] = [];

  let finalDamage = weapon.baseDamage;
  if (def.scaling === 'meleeDamage') finalDamage += player.stats.meleeDamage;
  if (def.scaling === 'rangedDamage') finalDamage += player.stats.rangedDamage;

  if (player.debuffs.guilt > 0) {
    finalDamage = Math.max(1, Math.floor(finalDamage * 0.5));
  }

  const isCrit = Math.random() * 100 < player.stats.critChance;
  if (isCrit) finalDamage *= 1.5;

  const angleToMouse = Math.atan2(mouseY - player.y, mouseX - player.x);

  if (weapon.type === WeaponType.PEN) {
    const range = (def.range || 55) + player.stats.range;
    const swingArc = Math.PI * 0.7;
    const startAngle = angleToMouse - (swingArc / 2);

    projectiles.push({
      id: Math.random(),
      x: player.x, y: player.y,
      width: range, height: range,
      color: def.color,
      vx: 0, vy: 0,
      life: 10, maxLife: 10,
      damage: finalDamage,
      penetration: 999,
      type: weapon.type,
      isMelee: true,
      rotation: angleToMouse,
      startAngle: startAngle,
      swingArc: swingArc,
      markedForDeletion: false,
      crit: isCrit
    });
    ctx.playSwing();
  } else if (weapon.type === WeaponType.KATANA) {
    const range = (def.range || 80) + player.stats.range;
    const swingArc = Math.PI;
    const startAngle = angleToMouse - (swingArc / 2);

    projectiles.push({
      id: Math.random(),
      x: player.x, y: player.y,
      width: range, height: range,
      color: def.color,
      vx: 0, vy: 0,
      life: 12, maxLife: 12,
      damage: finalDamage,
      penetration: 999,
      type: weapon.type,
      isMelee: true,
      rotation: angleToMouse,
      startAngle: startAngle,
      swingArc: swingArc,
      markedForDeletion: false,
      crit: isCrit
    });
    ctx.playSwing();
  } else if (weapon.type === WeaponType.PISTOL) {
    const vx = Math.cos(angleToMouse) * 12;
    const vy = Math.sin(angleToMouse) * 12;

    projectiles.push({
      id: Math.random(),
      x: player.x, y: player.y,
      width: 8, height: 8,
      color: def.color,
      vx, vy,
      life: 60, maxLife: 60,
      damage: finalDamage,
      penetration: 1,
      type: weapon.type,
      markedForDeletion: false,
      crit: isCrit
    });
    ctx.playShoot();
  } else if (weapon.type === WeaponType.BOTTLE) {
    let targetX = player.x + Math.cos(angleToMouse) * 150;
    let targetY = player.y + Math.sin(angleToMouse) * 150;

    if (ctx.enemies.length > 0) {
      const t = ctx.enemies[Math.floor(Math.random() * ctx.enemies.length)];
      if (t) { targetX = t.x; targetY = t.y; }
    }

    const angle = Math.atan2(targetY - player.y, targetX - player.x);
    projectiles.push({
      id: Math.random(),
      x: player.x, y: player.y,
      width: 12, height: 12,
      color: def.color,
      vx: Math.cos(angle) * 8,
      vy: Math.sin(angle) * 8,
      life: 40, maxLife: 40,
      damage: finalDamage,
      penetration: 999,
      type: weapon.type,
      debuffType: 'SLOW',
      markedForDeletion: false,
      crit: isCrit
    });
    ctx.playShoot();
  } else if (weapon.type === WeaponType.BOOK) {
    const range = (def.range || 90) + player.stats.range;
    ctx.enemies.forEach(e => {
      if (Math.hypot(e.x - player.x, e.y - player.y) < range) {
        e.debuffs.defenseDown = 60;
        if (ctx.frameCount % 15 === 0) {
          const dmg = Math.max(1, finalDamage);
          e.hp -= dmg;
          ctx.createDamageText(e.x, e.y, dmg, isCrit);
          if (e.hp <= 0) ctx.handleEnemyDeath(e);
        }
      }
    });
    return null;
  }

  return projectiles;
};
