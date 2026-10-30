import * as THREE from 'three';
import { VoxelWorld } from '../world/VoxelWorld';
import { VOXEL_SIZE, VoxelType, VOXEL_MATERIALS } from '../world/VoxelTypes';
import { ParticleSystem } from '../systems/ParticleSystem';
import { RPGSystem } from '../systems/RPGSystem';

export type EnemyType = 'raider' | 'wild_dog' | 'runner' | 'digger' | 'armored' | 'screamer';

export interface EnemyEntity {
  id: number;
  type: EnemyType;
  name: string;
  isNightCreature: boolean;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  mesh: THREE.Group;
  attackCooldown: number;
  digProgress: number;
  colorRGB: [number, number, number];
}

export class EnemyManager {
  public scene: THREE.Scene;
  public enemies: EnemyEntity[] = [];
  private nextId = 1;
  private spawnTimer = 6.0;
  private turretCooldown = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public spawnInitialDayPatrols(): void {
    // Spawn day raiders & wild dogs near surface POIs
    this.spawnEnemy('raider', new THREE.Vector3(-2.5, 0.3, -10.5));
    this.spawnEnemy('raider', new THREE.Vector3(9.5, 0.3, -1.5));
    this.spawnEnemy('wild_dog', new THREE.Vector3(-8.5, 0.3, 3.0));
    this.spawnEnemy('wild_dog', new THREE.Vector3(3.5, 0.3, 8.5));
  }

  public spawnEnemy(type: EnemyType, pos: THREE.Vector3): EnemyEntity {
    const group = new THREE.Group();
    let name = 'Yağmacı';
    let hp = 60;
    let speed = 1.95;
    let damage = 10;
    let isNight = false;
    let colorRGB: [number, number, number] = [0.75, 0.25, 0.2];

    if (type === 'raider') {
      name = 'Silahlı Yağmacı';
      hp = 65;
      speed = 1.85;
      damage = 11;
      colorRGB = [0.72, 0.28, 0.18];
    } else if (type === 'wild_dog') {
      name = 'Vahşi Köpek';
      hp = 42;
      speed = 2.75;
      damage = 8;
      colorRGB = [0.48, 0.34, 0.22];
    } else if (type === 'runner') {
      name = 'Gece Koşucusu';
      hp = 45;
      speed = 3.1;
      damage = 9;
      isNight = true;
      colorRGB = [0.65, 0.12, 0.25];
    } else if (type === 'digger') {
      name = 'Kazıcı Yaratık (Duvar Delici)';
      hp = 75;
      speed = 1.9;
      damage = 13;
      isNight = true;
      colorRGB = [0.78, 0.45, 0.12];
    } else if (type === 'armored') {
      name = 'Zırhlı Dev Mutasyon';
      hp = 145;
      speed = 1.25;
      damage = 22;
      isNight = true;
      colorRGB = [0.32, 0.38, 0.46];
    } else if (type === 'screamer') {
      name = 'Çığlıkçı (Sürü Çağıran)';
      hp = 55;
      speed = 2.1;
      damage = 10;
      isNight = true;
      colorRGB = [0.55, 0.15, 0.85];
    }

    const bodyMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorRGB[0], colorRGB[1], colorRGB[2]),
      roughness: 0.7,
      metalness: type === 'armored' ? 0.65 : 0.1,
    });
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xff2200,
      emissive: isNight ? 0xff1100 : 0xaa4400,
      emissiveIntensity: isNight ? 1.5 : 0.5,
    });

    if (type === 'wild_dog') {
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.20, 0.42), bodyMat);
      torso.position.y = 0.22;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.18), bodyMat);
      head.position.set(0, 0.30, -0.24);
      group.add(torso, head);
    } else {
      const scale = type === 'armored' ? 1.35 : 1.0;
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.28 * scale, 0.38 * scale, 0.18 * scale), bodyMat);
      torso.position.y = 0.36 * scale;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.20 * scale, 0.20 * scale, 0.20 * scale), bodyMat);
      head.position.y = 0.65 * scale;
      const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.14 * scale, 0.05 * scale, 0.04), eyeMat);
      eyes.position.set(0, 0.66 * scale, -0.10 * scale);
      group.add(torso, head, eyes);
    }

    group.position.copy(pos);
    this.scene.add(group);

    const ent: EnemyEntity = {
      id: this.nextId++,
      type,
      name,
      isNightCreature: isNight,
      hp,
      maxHp: hp,
      speed,
      damage,
      position: pos.clone(),
      velocity: new THREE.Vector3(),
      mesh: group,
      attackCooldown: 0,
      digProgress: 0,
      colorRGB,
    };
    this.enemies.push(ent);
    return ent;
  }

  public handleRayAttack(
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    range: number,
    damage: number,
    particles: ParticleSystem,
    rpg: RPGSystem,
    onAlert: (msg: string) => void
  ): boolean {
    let bestEnemy: EnemyEntity | null = null;
    let bestDist = range;

    for (const e of this.enemies) {
      const center = e.position.clone().add(new THREE.Vector3(0, 0.38, 0));
      const toEnemy = center.clone().sub(origin);
      const proj = toEnemy.dot(dir);
      if (proj < 0 || proj > bestDist) continue;
      const perpSq = toEnemy.lengthSq() - proj * proj;
      if (perpSq <= 0.36 * 0.36) {
        bestDist = proj;
        bestEnemy = e;
      }
    }

    if (!bestEnemy) return false;

    const nightBonus = rpg.unlockedPerks.has('night_owl') && bestEnemy.isNightCreature ? 1.15 : 1.0;
    const armPenalty = rpg.limbs.arms < 50 ? 0.7 : 1.0;
    const finalDmg = damage * nightBonus * armPenalty;

    bestEnemy.hp -= finalDmg;
    particles.spawnVoxelBurst(
      bestEnemy.position.clone().add(new THREE.Vector3(0, 0.4, 0)),
      bestEnemy.colorRGB,
      16,
      2.4,
      0.07
    );

    if (bestEnemy.hp <= 0) {
      this.killEnemy(bestEnemy, particles, rpg, onAlert);
    }
    return true;
  }

  private killEnemy(
    e: EnemyEntity,
    particles: ParticleSystem,
    rpg: RPGSystem,
    onAlert: (msg: string) => void
  ): void {
    // Voxel shatter death burst!
    particles.spawnVoxelBurst(
      e.position.clone().add(new THREE.Vector3(0, 0.35, 0)),
      e.colorRGB,
      36,
      3.4,
      0.09
    );
    this.scene.remove(e.mesh);
    const idx = this.enemies.indexOf(e);
    if (idx >= 0) this.enemies.splice(idx, 1);

    // Loot drops
    rpg.addItem('scrap_metal', 1 + Math.floor(Math.random() * 2));
    if (Math.random() < 0.5) rpg.addItem('cloth', 1);
    if (Math.random() < 0.35) rpg.addItem('chemicals', 1);
    onAlert(`💀 ${e.name} parçalandı! (+Hurda Metal / Malzeme)`);
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    isNight: boolean,
    dayCount: number,
    flashlightOn: boolean,
    generatorOn: boolean,
    world: VoxelWorld,
    rpg: RPGSystem,
    particles: ParticleSystem,
    onAlert: (msg: string) => void
  ): void {
    this.spawnTimer -= dt;
    const maxEnemies = isNight ? Math.min(14, 4 + dayCount + (dayCount % 7 === 0 ? 5 : 0)) : 5;

    if (this.spawnTimer <= 0 && this.enemies.length < maxEnemies) {
      this.spawnTimer = isNight ? (dayCount % 7 === 0 ? 5.0 : 8.5) : 14.0;
      const angle = Math.random() * Math.PI * 2;
      const dist = isNight ? 6.5 + Math.random() * 4.0 : 9.0 + Math.random() * 5.0;
      const sx = playerPos.x + Math.cos(angle) * dist;
      const sz = playerPos.z + Math.sin(angle) * dist;

      if (isNight) {
        const types: EnemyType[] = ['runner', 'digger', 'armored', 'screamer'];
        const pick = types[Math.floor(Math.random() * types.length)];
        this.spawnEnemy(pick, new THREE.Vector3(sx, 0.25, sz));
        if (dayCount % 7 === 0 && Math.random() < 0.4) {
          onAlert('🚨 7. GECE BÜYÜK DALGASI: Sürü sığınağın zayıf duvarlarına yükleniyor!');
        }
      } else {
        const pick: EnemyType = Math.random() < 0.55 ? 'raider' : 'wild_dog';
        this.spawnEnemy(pick, new THREE.Vector3(sx, 0.25, sz));
      }
    }

    // Automated Defense Turret logic (when generator is running)
    this.turretCooldown = Math.max(0, this.turretCooldown - dt);
    if (generatorOn && this.turretCooldown <= 0 && this.enemies.length > 0) {
      this.turretCooldown = 1.1;
      for (const e of this.enemies) {
        if (e.position.distanceTo(playerPos) < 7.5) {
          const engBoost = rpg.unlockedPerks.has('fortress_engineer') ? 1.35 : 1.0;
          e.hp -= 18 * engBoost;
          particles.spawnVoxelBurst(e.position.clone().add(new THREE.Vector3(0, 0.4, 0)), [0.2, 0.9, 1.0], 8, 2.0, 0.06);
          if (e.hp <= 0) {
            this.killEnemy(e, particles, rpg, onAlert);
            break;
          }
        }
      }
    }

    // Update each enemy AI, wall-cost pathfinding & trap interactions
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.attackCooldown = Math.max(0, e.attackCooldown - dt);

      // Day sunlight burns night creatures if dawn arrives
      if (!isNight && e.isNightCreature && e.position.y > -0.4) {
        e.hp -= dt * 15;
        if (e.hp <= 0) {
          this.killEnemy(e, particles, rpg, onAlert);
          continue;
        }
      }

      // Detection radius boosted by player flashlight & generator noise!
      let detectRange = e.isNightCreature ? 16.0 : 11.0;
      if (flashlightOn) detectRange += 4.5;
      if (generatorOn) detectRange += 4.0;

      const toPlayer = playerPos.clone().sub(e.position);
      const dist = toPlayer.length();

      if (dist <= detectRange) {
        // Screamer calls a runner reinforcement occasionally
        if (e.type === 'screamer' && e.attackCooldown <= 0 && this.enemies.length < maxEnemies + 2) {
          e.attackCooldown = 9.0;
          this.spawnEnemy('runner', e.position.clone().add(new THREE.Vector3(0.5, 0, 0.5)));
          onAlert('🔊 Çığlıkçı uludu ve yeni bir Gece Koşucusu çağırdı!');
        }

        const dir = new THREE.Vector3(toPlayer.x, 0, toPlayer.z).normalize();
        e.mesh.rotation.y = Math.atan2(-dir.x, -dir.z);

        if (dist > 0.55) {
          const nextX = e.position.x + dir.x * e.speed * dt;
          const nextZ = e.position.z + dir.z * e.speed * dt;

          // Check voxel ahead at waist height
          const vx = Math.floor(nextX / VOXEL_SIZE);
          const vy = Math.floor((e.position.y + 0.25) / VOXEL_SIZE);
          const vz = Math.floor(nextZ / VOXEL_SIZE);
          const vAhead = world.getVoxel(vx, vy, vz);
          const matAhead = VOXEL_MATERIALS[vAhead];

          // Check traps underfoot
          const vFoot = world.getVoxel(vx, Math.floor(e.position.y / VOXEL_SIZE), vz);
          if (vFoot === VoxelType.TRAP_SPIKE) {
            e.hp -= dt * 28;
            if (e.hp <= 0) {
              this.killEnemy(e, particles, rpg, onAlert);
              continue;
            }
          } else if (vFoot === VoxelType.TRAP_SHOCK && generatorOn) {
            e.hp -= dt * 45;
            if (e.hp <= 0) {
              this.killEnemy(e, particles, rpg, onAlert);
              continue;
            }
          } else if (vFoot === VoxelType.TRAP_ALARM) {
            onAlert('🔔 ALARM TELİ TETİKLENDİ! Sığınak girişinde düşman var!');
            world.setVoxel(vx, Math.floor(e.position.y / VOXEL_SIZE), vz, VoxelType.AIR, true, true);
          }

          if (!matAhead || matAhead.passable) {
            e.position.x = nextX;
            e.position.z = nextZ;
          } else {
            // Creature encounters a wall! Evaluate wallCost / dig through weak walls (Topsoil < Brick < Concrete < Steel)
            const canDig = e.isNightCreature || e.type === 'digger';
            if (canDig && vAhead !== VoxelType.BEDROCK && (matAhead.wallCost || 999) < 120) {
              const digSpeed = e.type === 'digger' ? 18.0 : 7.0;
              e.digProgress += (dt * digSpeed) / Math.max(4, matAhead.wallCost || 10);
              if (e.digProgress >= 1.0) {
                e.digProgress = 0;
                // Breach a 2x3x2 hole in the weak wall
                for (let dz = -1; dz <= 1; dz++) {
                  for (let dy = -1; dy <= 2; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                      const tv = world.getVoxel(vx + dx, vy + dy, vz + dz);
                      if (tv !== VoxelType.BEDROCK && tv !== VoxelType.STEEL_WALL) {
                        world.setVoxel(vx + dx, vy + dy, vz + dz, VoxelType.AIR, true, true);
                      }
                    }
                  }
                }
                particles.spawnVoxelBurst(e.position, matAhead.color, 18, 2.2, 0.07);
                onAlert(`⚠️ ${e.name} zayıf duvarı (${matAhead.name}) delerek ilerliyor!`);
              }
            } else {
              // Step up if low obstacle
              e.position.y += VOXEL_SIZE * 1.5;
            }
          }
        } else if (e.attackCooldown <= 0) {
          e.attackCooldown = 1.15;
          rpg.applyDamage(e.damage, e.name);
          onAlert(`🩸 ${e.name} saldırdı! (-${e.damage} Sağlık)`);
        }
      }

      // Simple gravity settle for enemy
      const footVY = Math.floor((e.position.y - 0.05) / VOXEL_SIZE);
      const footVX = Math.floor(e.position.x / VOXEL_SIZE);
      const footVZ = Math.floor(e.position.z / VOXEL_SIZE);
      const below = world.getVoxel(footVX, footVY, footVZ);
      if (below === VoxelType.AIR && e.position.y > -2.4) {
        e.position.y -= 4.5 * dt;
      }

      e.mesh.position.copy(e.position);
    }
  }
}
