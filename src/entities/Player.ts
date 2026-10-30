import * as THREE from 'three';
import { VoxelWorld } from '../world/VoxelWorld';
import { VOXEL_SIZE, VoxelType, VOXEL_MATERIALS } from '../world/VoxelTypes';
import { InputManager } from '../core/InputManager';
import { RPGSystem, LORE_NOTES } from '../systems/RPGSystem';
import { ParticleSystem } from '../systems/ParticleSystem';
import { BUILD_BLUEPRINTS } from '../systems/ShelterSystem';

export class Player {
  public position = new THREE.Vector3(0, -2.2, 0); // Starts inside underground shelter!
  public velocity = new THREE.Vector3();
  public yaw = 0;
  public pitch = -0.15;
  public onGround = false;

  public meshGroup: THREE.Group;
  private bodyMesh: THREE.Mesh;
  private headMesh: THREE.Mesh;
  private rightArm: THREE.Mesh;
  private leftArm: THREE.Mesh;
  private rightLeg: THREE.Mesh;
  private leftLeg: THREE.Mesh;

  public flashlight: THREE.SpotLight;
  public flashlightTarget: THREE.Object3D;
  public flashlightOn = true;
  public torchLight: THREE.PointLight;

  // Mining & Building state
  public buildMode = false;
  public selectedBlueprintIdx = 0;
  public miningTargetKey = '';
  public miningProgress = 0;
  public attackCooldown = 0;
  private walkAnimTime = 0;

  // Target voxel highlight box
  public highlightBox: THREE.LineSegments;

  constructor(scene: THREE.Scene) {
    this.meshGroup = new THREE.Group();

    const suitMat = new THREE.MeshStandardMaterial({ color: 0x3b4d3e, roughness: 0.75 });
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x7c4d2b, roughness: 0.6, metalness: 0.4 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0xd6b496, roughness: 0.65 });
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.5,
      roughness: 0.2,
    });

    // Procedural Voxel Survivor Character (Height ~0.75m = 7.5 voxels)
    this.bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, 0.16), suitMat);
    this.bodyMesh.position.y = 0.38;
    this.bodyMesh.castShadow = true;
    this.meshGroup.add(this.bodyMesh);

    // Backpack
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.12), armorMat);
    pack.position.set(0, 0.39, 0.13);
    this.meshGroup.add(pack);

    this.headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.20, 0.20), headMat);
    this.headMesh.position.y = 0.66;
    this.headMesh.castShadow = true;
    this.meshGroup.add(this.headMesh);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 0.04), visorMat);
    visor.position.set(0, 0.67, -0.10);
    this.meshGroup.add(visor);

    this.rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.28, 0.09), armorMat);
    this.rightArm.position.set(0.19, 0.38, 0);
    this.meshGroup.add(this.rightArm);

    this.leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.28, 0.09), armorMat);
    this.leftArm.position.set(-0.19, 0.38, 0);
    this.meshGroup.add(this.leftArm);

    this.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.22, 0.10), suitMat);
    this.rightLeg.position.set(0.08, 0.11, 0);
    this.meshGroup.add(this.rightLeg);

    this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.22, 0.10), suitMat);
    this.leftLeg.position.set(-0.08, 0.11, 0);
    this.meshGroup.add(this.leftLeg);

    scene.add(this.meshGroup);

    // Flashlight (key light source at pitch-black night)
    this.flashlight = new THREE.SpotLight(0xfff4d6, 4.2, 16.0, Math.PI / 4.5, 0.45, 1.4);
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.set(512, 512);
    this.flashlightTarget = new THREE.Object3D();
    scene.add(this.flashlight);
    scene.add(this.flashlightTarget);
    this.flashlight.target = this.flashlightTarget;

    // Subtle personal lantern so player character silhouette is always readable
    this.torchLight = new THREE.PointLight(0xffa447, 0.75, 3.2, 1.8);
    scene.add(this.torchLight);

    // Target Voxel Selection Wireframe
    const boxGeom = new THREE.EdgesGeometry(new THREE.BoxGeometry(VOXEL_SIZE * 1.04, VOXEL_SIZE * 1.04, VOXEL_SIZE * 1.04));
    const boxMat = new THREE.LineBasicMaterial({ color: 0xf59e0b });
    this.highlightBox = new THREE.LineSegments(boxGeom, boxMat);
    this.highlightBox.visible = false;
    scene.add(this.highlightBox);
  }

  public isInsideShelter(): boolean {
    return this.position.y < -0.65 && Math.abs(this.position.x) < 3.0 && Math.abs(this.position.z) < 3.0;
  }

  public getEyePosition(): THREE.Vector3 {
    return new THREE.Vector3(this.position.x, this.position.y + 0.68, this.position.z);
  }

  public getAimDirection(): THREE.Vector3 {
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    return dir.normalize();
  }

  public update(
    dt: number,
    input: InputManager,
    world: VoxelWorld,
    camera: THREE.PerspectiveCamera,
    rpg: RPGSystem,
    particles: ParticleSystem,
    onAlert: (msg: string) => void,
    onOpenStation: (tabId: string) => void,
    onSleep: () => void,
    onAttackRay: (origin: THREE.Vector3, dir: THREE.Vector3, range: number, damage: number, isRanged: boolean) => boolean
  ): void {
    const { dx, dy } = input.consumeLookDelta();
    const sens = 0.0024;
    this.yaw -= dx * sens;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * sens, -1.35, 1.25);

    this.attackCooldown = Math.max(0, this.attackCooldown - dt);

    // Movement vector relative to yaw
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const moveDir = new THREE.Vector3();
    moveDir.addScaledVector(right, input.moveX);
    moveDir.addScaledVector(forward, -input.moveZ);
    if (moveDir.lengthSq() > 1) moveDir.normalize();

    let speed = 2.6 * rpg.getMoveSpeedMultiplier();
    if (input.sprint && rpg.stamina > 8 && !input.crouch) {
      speed *= 1.5;
      if (moveDir.lengthSq() > 0.01) {
        rpg.stamina = Math.max(0, rpg.stamina - dt * 11);
      }
    } else {
      rpg.stamina = Math.min(100, rpg.stamina + dt * 9);
    }

    if (input.crouch) {
      speed *= 0.55;
      if (moveDir.lengthSq() > 0.01) {
        rpg.gainSkillXP('stealth', dt * 4);
      }
    }

    this.velocity.x = moveDir.x * speed;
    this.velocity.z = moveDir.z * speed;

    // Gravity & Jump
    this.velocity.y -= 9.8 * dt;
    if (input.jump && this.onGround && rpg.stamina > 6) {
      this.velocity.y = 3.9;
      this.onGround = false;
      rpg.stamina = Math.max(0, rpg.stamina - 5);
    }

    this.moveWithVoxelCollision(dt, world);

    // Check if player reached Deep Facility (Y <= -5.5m)
    if (!rpg.reachedDeepFacility && this.position.y <= -5.5) {
      rpg.reachedDeepFacility = true;
      LORE_NOTES[5].unlocked = true;
      onAlert('🎉 PROJE AETHER DERİN TESİSİNE ULAŞTINIZ! Kayıt #06 açıldı!');
    }

    // Update character transform & limb animations
    this.meshGroup.position.copy(this.position);
    this.meshGroup.rotation.y = this.yaw;
    this.meshGroup.scale.y = input.crouch ? 0.72 : 1.0;

    const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (horizSpeed > 0.15) {
      this.walkAnimTime += dt * horizSpeed * 4.2;
      const swing = Math.sin(this.walkAnimTime) * 0.55;
      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;
      this.leftArm.rotation.x = -swing * 0.7;
      this.rightArm.rotation.x = swing * 0.7;
    } else {
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.leftArm.rotation.x = 0;
      this.rightArm.rotation.x = 0;
    }

    if (this.miningProgress > 0 || this.attackCooldown > 0.15) {
      this.rightArm.rotation.x = -1.2 + Math.sin(performance.now() * 0.03) * 0.6;
    }

    // Over-the-shoulder Third-Person Camera with wall collision pullback
    const camRight = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const aimDir = this.getAimDirection();
    const isAiming = input.secondaryDown && !this.buildMode;
    const camDist = isAiming ? 0.85 : 1.55;
    const shoulderOffset = isAiming ? 0.24 : 0.30;

    const pivot = new THREE.Vector3(
      this.position.x + camRight.x * shoulderOffset,
      this.position.y + (input.crouch ? 0.52 : 0.72),
      this.position.z + camRight.z * shoulderOffset
    );

    const desiredCamPos = pivot.clone().addScaledVector(aimDir, -camDist);
    // Simple camera collision check so camera doesn't clip into tunnel ceilings/walls
    let actualDist = camDist;
    for (let t = 0.2; t <= camDist; t += 0.15) {
      const testPt = pivot.clone().addScaledVector(aimDir, -t);
      if (world.isSolidAtWorld(testPt.x, testPt.y, testPt.z)) {
        actualDist = Math.max(0.25, t - 0.15);
        break;
      }
    }
    camera.position.copy(pivot).addScaledVector(aimDir, -actualDist);
    const lookTarget = pivot.clone().addScaledVector(aimDir, 6.0);
    camera.lookAt(lookTarget);

    // Update Flashlight
    const hasNightOwl = rpg.unlockedPerks.has('night_owl');
    this.flashlight.visible = this.flashlightOn;
    this.flashlight.distance = hasNightOwl ? 23.0 : 16.0;
    this.flashlight.intensity = hasNightOwl ? 5.6 : 4.2;
    this.flashlight.position.copy(this.getEyePosition());
    this.flashlightTarget.position.copy(this.getEyePosition().addScaledVector(aimDir, 8.0));
    this.torchLight.position.set(this.position.x, this.position.y + 0.55, this.position.z);

    // Raycast from camera through crosshair
    const rayOrigin = camera.position.clone().addScaledVector(aimDir, actualDist * 0.85);
    const hit = world.raycast(rayOrigin, aimDir, 3.8);

    const targetInfoEl = document.getElementById('target-info');
    const promptEl = document.getElementById('interaction-prompt');
    const mineWrapEl = document.getElementById('mining-progress-wrap');
    const mineBarEl = document.getElementById('mining-progress-bar');

    if (hit) {
      const mat = VOXEL_MATERIALS[hit.voxel];
      this.highlightBox.visible = true;
      this.highlightBox.position.set(
        (hit.vx + 0.5) * VOXEL_SIZE,
        (hit.vy + 0.5) * VOXEL_SIZE,
        (hit.vz + 0.5) * VOXEL_SIZE
      );
      if (targetInfoEl && mat) {
        targetInfoEl.textContent = `${mat.name}`;
      }

      // Context interaction prompt [E]
      if (promptEl) {
        if (
          hit.voxel === VoxelType.DOOR_CLOSED ||
          hit.voxel === VoxelType.DOOR_OPEN ||
          hit.voxel === VoxelType.TERMINAL_LORE ||
          hit.voxel === VoxelType.BED_BLOCK ||
          hit.voxel === VoxelType.WORKBENCH_BLOCK ||
          hit.voxel === VoxelType.GENERATOR_BLOCK ||
          hit.voxel === VoxelType.BURIED_CHEST ||
          hit.voxel === VoxelType.FACILITY_CORE
        ) {
          promptEl.style.display = 'block';
          promptEl.textContent = `[E] ${mat.name}`;
        } else {
          promptEl.style.display = 'none';
        }
      }
    } else {
      this.highlightBox.visible = false;
      if (targetInfoEl) targetInfoEl.textContent = '';
      if (promptEl) promptEl.style.display = 'none';
    }

    // Handle Left Click: Build Mode OR Combat Attack OR Voxel Mining
    if (input.primaryDown) {
      if (this.buildMode && hit && this.attackCooldown <= 0) {
        this.attackCooldown = 0.25;
        this.placeBlueprintAt(hit.vx + hit.nx, hit.vy + hit.ny, hit.vz + hit.nz, world, rpg, onAlert);
      } else if (!this.buildMode) {
        const equipped = rpg.getEquippedItem();
        // First check if attacking an enemy or firing ranged weapon
        if (equipped.isRanged && this.attackCooldown <= 0) {
          this.attackCooldown = 0.42;
          const hitEnemy = onAttackRay(this.getEyePosition(), aimDir, equipped.range || 20, equipped.damage || 35, true);
          if (hitEnemy) {
            rpg.gainSkillXP('marksmanship', 18, (s, l) => onAlert(`⭐ Yetenek Yükseldi: ${s} Seviye ${l}!`));
          } else if (hit) {
            particles.spawnVoxelBurst(this.highlightBox.position, [0.9, 0.8, 0.4], 10, 2.2, 0.05);
          }
        } else {
          // Try melee attack on enemy first
          if (this.attackCooldown <= 0) {
            const hitEnemy = onAttackRay(this.getEyePosition(), aimDir, equipped.range || 2.8, equipped.damage || 20, false);
            if (hitEnemy) {
              this.attackCooldown = 0.45;
              rpg.gainSkillXP('combat', 16, (s, l) => onAlert(`⭐ Yetenek Yükseldi: ${s} Seviye ${l}!`));
              return;
            }
          }

          // Otherwise Mine Voxels!
          if (hit) {
            const mat = VOXEL_MATERIALS[hit.voxel];
            if (mat && mat.hardness < Infinity) {
              const key = `${hit.vx},${hit.vy},${hit.vz}`;
              if (this.miningTargetKey !== key) {
                this.miningTargetKey = key;
                this.miningProgress = 0;
              }
              const speedMult = rpg.getMiningSpeedMultiplier();
              this.miningProgress += (dt * speedMult) / Math.max(0.12, mat.hardness);

              if (mineWrapEl && mineBarEl) {
                mineWrapEl.style.display = 'block';
                mineBarEl.style.width = `${Math.min(100, this.miningProgress * 100)}%`;
              }

              // Carve a 3x3x3 micro-voxel cluster around hit when mining completes for satisfying tunnel excavation
              if (this.miningProgress >= 1.0) {
                this.miningProgress = 0;
                this.excavateCluster(hit.vx, hit.vy, hit.vz, world, rpg, particles, onAlert);
              }
            }
          }
        }
      }
    } else {
      this.miningProgress = 0;
      if (mineWrapEl) mineWrapEl.style.display = 'none';
    }

    // Right click in Build Mode removes voxel
    if (this.buildMode && input.secondaryDown && hit && this.attackCooldown <= 0) {
      this.attackCooldown = 0.22;
      if (hit.voxel !== VoxelType.BEDROCK) {
        world.setVoxel(hit.vx, hit.vy, hit.vz, VoxelType.AIR, true, true);
      }
    }

    void onOpenStation;
    void onSleep;
  }

  private excavateCluster(
    vx: number,
    vy: number,
    vz: number,
    world: VoxelWorld,
    rpg: RPGSystem,
    particles: ParticleSystem,
    onAlert: (msg: string) => void
  ): void {
    const centerVoxel = world.getVoxel(vx, vy, vz);
    const mat = VOXEL_MATERIALS[centerVoxel] || VOXEL_MATERIALS[VoxelType.TOPSOIL];

    const worldPos = new THREE.Vector3(
      (vx + 0.5) * VOXEL_SIZE,
      (vy + 0.5) * VOXEL_SIZE,
      (vz + 0.5) * VOXEL_SIZE
    );
    particles.spawnVoxelBurst(worldPos, mat.color, 22, 2.5, 0.07);

    // If it's a buried chest, grant special loot bundle!
    if (centerVoxel === VoxelType.BURIED_CHEST) {
      world.setVoxel(vx, vy, vz, VoxelType.AIR, true, true);
      rpg.addItem('scrap_metal', 3);
      rpg.addItem('canned_food', 2);
      rpg.addItem('purified_water', 2);
      rpg.addItem('chemicals', 2);
      rpg.addItem('electronics', 2);
      rpg.addItem('bandage', 1);
      onAlert('📦 Yağma Sandığı Açıldı: +Hurda Metal, +Konserve, +Su, +Elektronik, +Kimyasal!');
      return;
    }

    // Excavate 3x3x3 micro-voxels (0.3m x 0.3m x 0.3m) so player can dig walkable tunnels smoothly
    let minedCount = 0;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tv = world.getVoxel(vx + dx, vy + dy, vz + dz);
          const tmat = VOXEL_MATERIALS[tv];
          if (
            tv !== VoxelType.AIR &&
            tv !== VoxelType.BEDROCK &&
            tv !== VoxelType.FACILITY_CORE &&
            tv !== VoxelType.TERMINAL_LORE &&
            tmat &&
            tmat.hardness <= mat.hardness * 1.25
          ) {
            world.setVoxel(vx + dx, vy + dy, vz + dz, VoxelType.AIR, true, true);
            minedCount++;
          }
        }
      }
    }

    if (mat.dropItem) {
      const bonus = rpg.unlockedPerks.has('mole') && Math.random() < 0.45 ? 1 : 0;
      rpg.addItem(mat.dropItem, (mat.dropCount || 1) + bonus);
    }

    if (minedCount > 0) {
      rpg.gainSkillXP('mining', 10, (s, l) => onAlert(`⭐ Yetenek Yükseldi: ${s} Seviye ${l}!`));
    }
  }

  private placeBlueprintAt(
    vx: number,
    vy: number,
    vz: number,
    world: VoxelWorld,
    rpg: RPGSystem,
    onAlert: (msg: string) => void
  ): void {
    const bp = BUILD_BLUEPRINTS[this.selectedBlueprintIdx] || BUILD_BLUEPRINTS[0];
    const have = rpg.inventory.get(bp.costItem) || 0;
    if (have < bp.costQty) {
      onAlert(`⚠️ Yetersiz Malzeme: ${bp.name} için ${bp.costQty}x ${bp.costItem} gerekli!`);
      return;
    }

    rpg.removeItem(bp.costItem, bp.costQty);
    const [w, h, d] = bp.size;
    for (let dz = 0; dz < d; dz++) {
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          world.setVoxel(vx + dx, vy + dy, vz + dz, bp.voxelType, true, true);
        }
      }
    }
    rpg.gainSkillXP('crafting', 8);
  }

  private moveWithVoxelCollision(dt: number, world: VoxelWorld): void {
    const radius = 0.14;
    const height = 0.70;

    const checkCollision = (px: number, py: number, pz: number): boolean => {
      const minVX = Math.floor((px - radius) / VOXEL_SIZE);
      const maxVX = Math.floor((px + radius) / VOXEL_SIZE);
      const minVY = Math.floor(py / VOXEL_SIZE);
      const maxVY = Math.floor((py + height) / VOXEL_SIZE);
      const minVZ = Math.floor((pz - radius) / VOXEL_SIZE);
      const maxVZ = Math.floor((pz + radius) / VOXEL_SIZE);

      for (let vz = minVZ; vz <= maxVZ; vz++) {
        for (let vy = minVY; vy <= maxVY; vy++) {
          for (let vx = minVX; vx <= maxVX; vx++) {
            const v = world.getVoxel(vx, vy, vz);
            const mat = VOXEL_MATERIALS[v];
            if (mat && !mat.passable) return true;
          }
        }
      }
      return false;
    };

    // X axis with 2-voxel auto-step (0.2m) so climbing micro-voxel stairs/terrain is effortless
    const nextX = this.position.x + this.velocity.x * dt;
    if (!checkCollision(nextX, this.position.y, this.position.z)) {
      this.position.x = nextX;
    } else if (this.onGround && !checkCollision(nextX, this.position.y + VOXEL_SIZE * 2.1, this.position.z)) {
      this.position.x = nextX;
      this.position.y += VOXEL_SIZE * 2.1;
    } else {
      this.velocity.x = 0;
    }

    // Z axis with 2-voxel auto-step
    const nextZ = this.position.z + this.velocity.z * dt;
    if (!checkCollision(this.position.x, this.position.y, nextZ)) {
      this.position.z = nextZ;
    } else if (this.onGround && !checkCollision(this.position.x, this.position.y + VOXEL_SIZE * 2.1, nextZ)) {
      this.position.z = nextZ;
      this.position.y += VOXEL_SIZE * 2.1;
    } else {
      this.velocity.z = 0;
    }

    // Y axis
    const nextY = this.position.y + this.velocity.y * dt;
    if (!checkCollision(this.position.x, nextY, this.position.z)) {
      this.position.y = nextY;
      this.onGround = false;
    } else {
      if (this.velocity.y < 0) {
        this.onGround = true;
      }
      this.velocity.y = 0;
    }
  }
}
