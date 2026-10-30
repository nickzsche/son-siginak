import * as THREE from 'three';
import { CHUNK_SIZE, VOXEL_SIZE, VoxelType, VOXEL_MATERIALS } from './VoxelTypes';
import { buildChunkGreedyMesh, MesherInput, MesherOutput } from './GreedyMesher';

export interface POIInfo {
  name: string;
  x: number;
  z: number;
  danger: number;
}

export class VoxelWorld {
  public scene: THREE.Scene;
  public chunks = new Map<string, Uint8Array>();
  public meshes = new Map<string, THREE.Mesh>();
  public dirtyChunks = new Set<string>();
  public ImmediateDirtyChunks = new Set<string>();
  public modifiedVoxels = new Map<string, number>(); // key "x,y,z" -> VoxelType (for delta save)
  public sharedMaterial: THREE.MeshStandardMaterial;
  public pointLights: THREE.PointLight[] = [];
  public pois: POIInfo[] = [
    { name: 'Yıkık Kasaba & Market', x: 0, z: -11.5, danger: 1 },
    { name: 'Paslı Benzin İstasyonu', x: 11.5, z: 0, danger: 2 },
    { name: 'Terk Edilmiş Hastane', x: -11.8, z: 2.5, danger: 3 },
    { name: 'Eski Askerî Üs', x: 0, z: 12.2, danger: 4 },
    { name: 'Kuzey Çiftlik Evleri', x: -10.5, z: -10.5, danger: 2 },
  ];

  private workers: Worker[] = [];
  private workerBusy: boolean[] = [];
  private workerQueue: MesherInput[] = [];

  // World bounds in chunks: X in [-5..4], Y in [-3..1], Z in [-5..4]
  public readonly minCX = -5;
  public readonly maxCX = 4;
  public readonly minCY = -3;
  public readonly maxCY = 1;
  public readonly minCZ = -5;
  public readonly maxCZ = 4;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Create procedural micro-bump roughness canvas texture for PBR surface richness
    const texCanvas = document.createElement('canvas');
    texCanvas.width = 64;
    texCanvas.height = 64;
    const ctx = texCanvas.getContext('2d')!;
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const v = 215 + Math.floor(Math.random() * 40);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    const bumpTex = new THREE.CanvasTexture(texCanvas);
    bumpTex.wrapS = THREE.RepeatWrapping;
    bumpTex.wrapT = THREE.RepeatWrapping;

    this.sharedMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.82,
      metalness: 0.14,
      bumpMap: bumpTex,
      bumpScale: 0.015,
    });

    this.initWorkers();
  }

  private initWorkers() {
    const count = Math.min(4, Math.max(2, (navigator.hardwareConcurrency || 4) - 1));
    for (let i = 0; i < count; i++) {
      try {
        const w = new Worker(new URL('./chunkWorker.ts', import.meta.url), { type: 'module' });
        w.onmessage = (e: MessageEvent<MesherOutput>) => {
          this.workerBusy[i] = false;
          this.applyMeshOutput(e.data);
          this.dispatchNextWorkerJob();
        };
        this.workers.push(w);
        this.workerBusy.push(false);
      } catch {
        // Fallback to sync meshing if worker fails
      }
    }
  }

  public getChunkKey(cx: number, cy: number, cz: number): string {
    return `${cx},${cy},${cz}`;
  }

  public getVoxel(vx: number, vy: number, vz: number): VoxelType {
    const cx = Math.floor(vx / CHUNK_SIZE);
    const cy = Math.floor(vy / CHUNK_SIZE);
    const cz = Math.floor(vz / CHUNK_SIZE);
    const chunk = this.chunks.get(this.getChunkKey(cx, cy, cz));
    if (!chunk) {
      if (vy < this.minCY * CHUNK_SIZE) return VoxelType.BEDROCK;
      return VoxelType.AIR;
    }
    const lx = ((vx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const ly = ((vy % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((vz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return chunk[lx + ly * CHUNK_SIZE + lz * CHUNK_SIZE * CHUNK_SIZE] as VoxelType;
  }

  public setVoxel(vx: number, vy: number, vz: number, type: VoxelType, recordDelta = true, immediate = true): void {
    const cx = Math.floor(vx / CHUNK_SIZE);
    const cy = Math.floor(vy / CHUNK_SIZE);
    const cz = Math.floor(vz / CHUNK_SIZE);
    const key = this.getChunkKey(cx, cy, cz);
    const chunk = this.chunks.get(key);
    if (!chunk) return;

    const lx = ((vx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const ly = ((vy % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((vz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const idx = lx + ly * CHUNK_SIZE + lz * CHUNK_SIZE * CHUNK_SIZE;
    if (chunk[idx] === type) return;

    chunk[idx] = type;
    if (recordDelta) {
      this.modifiedVoxels.set(`${vx},${vy},${vz}`, type);
    }

    const mark = (mcx: number, mcy: number, mcz: number) => {
      const k = this.getChunkKey(mcx, mcy, mcz);
      if (this.chunks.has(k)) {
        if (immediate) this.ImmediateDirtyChunks.add(k);
        else this.dirtyChunks.add(k);
      }
    };

    mark(cx, cy, cz);
    if (lx === 0) mark(cx - 1, cy, cz);
    if (lx === CHUNK_SIZE - 1) mark(cx + 1, cy, cz);
    if (ly === 0) mark(cx, cy - 1, cz);
    if (ly === CHUNK_SIZE - 1) mark(cx, cy + 1, cz);
    if (lz === 0) mark(cx, cy, cz - 1);
    if (lz === CHUNK_SIZE - 1) mark(cx, cy, cz + 1);
  }

  private noise2D(x: number, z: number): number {
    return (
      Math.sin(x * 0.045) * Math.cos(z * 0.045) * 2.5 +
      Math.sin((x + z) * 0.11) * 1.2
    );
  }

  private hash3(x: number, y: number, z: number): number {
    let n = x * 374761393 + y * 668265263 + z * 2147483647;
    n = (n ^ (n >> 13)) * 1274126177;
    return ((n ^ (n >> 16)) >>> 0) / 4294967295;
  }

  public generateWorld(): void {
    // Allocate all chunks and fill stratified terrain
    for (let cz = this.minCZ; cz <= this.maxCZ; cz++) {
      for (let cy = this.minCY; cy <= this.maxCY; cy++) {
        for (let cx = this.minCX; cx <= this.maxCX; cx++) {
          const chunk = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE);
          const baseX = cx * CHUNK_SIZE;
          const baseY = cy * CHUNK_SIZE;
          const baseZ = cz * CHUNK_SIZE;

          for (let lz = 0; lz < CHUNK_SIZE; lz++) {
            const wz = baseZ + lz;
            for (let lx = 0; lx < CHUNK_SIZE; lx++) {
              const wx = baseX + lx;
              // Flatten around bunker entrance & POIs
              const distCenter = Math.hypot(wx, wz);
              const rawH = this.noise2D(wx, wz);
              const surfaceY = distCenter < 42 ? 0 : Math.round(rawH * 0.5);

              for (let ly = 0; ly < CHUNK_SIZE; ly++) {
                const wy = baseY + ly;
                const idx = lx + ly * CHUNK_SIZE + lz * CHUNK_SIZE * CHUNK_SIZE;

                if (wy > surfaceY) {
                  chunk[idx] = VoxelType.AIR;
                } else if (wy <= -88) {
                  chunk[idx] = VoxelType.BEDROCK;
                } else if (wy >= surfaceY - 4) {
                  chunk[idx] = VoxelType.TOPSOIL;
                } else if (wy >= surfaceY - 15) {
                  chunk[idx] = VoxelType.CLAY;
                } else {
                  // Rock layer with procedural ores, old pipes, buried chests & tunnels
                  const h = this.hash3(wx >> 2, wy >> 2, wz >> 2);
                  if (h > 0.965) {
                    chunk[idx] = VoxelType.ORE_IRON;
                  } else if (h < 0.028 && wy < -24) {
                    chunk[idx] = VoxelType.ORE_COPPER;
                  } else if (Math.abs(wy + 28) <= 1 && Math.abs((wx + wz) % 37) <= 1) {
                    chunk[idx] = VoxelType.OLD_PIPE;
                  } else {
                    chunk[idx] = VoxelType.ROCK;
                  }
                }
              }
            }
          }
          this.chunks.set(this.getChunkKey(cx, cy, cz), chunk);
        }
      }
    }

    // Stamp underground shelter, ancient tunnels, buried caches, deep Project Aether facility, and surface POIs
    this.buildStartingShelter();
    this.buildUndergroundSecretsAndFacility();
    this.buildSurfaceFeatures();

    // Mark all chunks dirty for initial build
    for (const key of this.chunks.keys()) {
      this.dirtyChunks.add(key);
    }
    this.processDirtyChunks(true);
  }

  private fillBox(
    x0: number, y0: number, z0: number,
    x1: number, y1: number, z1: number,
    type: VoxelType
  ): void {
    const minX = Math.min(x0, x1), maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1), maxY = Math.max(y0, y1);
    const minZ = Math.min(z0, z1), maxZ = Math.max(z0, z1);
    for (let z = minZ; z <= maxZ; z++) {
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          this.setVoxel(x, y, z, type, false, false);
        }
      }
    }
  }

  private buildStartingShelter(): void {
    // Underground Shelter at Y = -24 .. -8 (i.e. -2.4m to -0.8m), X = -28..28, Z = -28..28
    // Outer reinforced walls (brick + concrete floor, topsoil outer wall segments so player can reinforce them!)
    this.fillBox(-26, -25, -26, 26, -8, 26, VoxelType.BRICK_WALL);
    this.fillBox(-24, -24, -24, 24, -10, 24, VoxelType.AIR);
    this.fillBox(-26, -25, -26, 26, -25, 26, VoxelType.CONCRETE_WALL); // Floor
    this.fillBox(-26, -9, -26, 26, -8, 26, VoxelType.CONCRETE_WALL);   // Ceiling

    // Intentional weak wall patches on East/West so player sees Topsoil vs Brick & creatures target weak walls
    this.fillBox(25, -23, -8, 26, -13, 8, VoxelType.TOPSOIL);
    this.fillBox(-26, -23, -8, -25, -13, 8, VoxelType.TOPSOIL);

    // Warm shelter lamps on ceiling
    this.setVoxel(-12, -10, -12, VoxelType.LAMP_WARM, false, false);
    this.setVoxel(12, -10, -12, VoxelType.LAMP_WARM, false, false);
    this.setVoxel(-12, -10, 12, VoxelType.LAMP_WARM, false, false);
    this.setVoxel(12, -10, 12, VoxelType.LAMP_WARM, false, false);
    this.setVoxel(0, -10, 0, VoxelType.LAMP_WARM, false, false);

    // Bed in Bedroom corner (-20, -24, -20)
    this.fillBox(-22, -24, -22, -16, -22, -18, VoxelType.BED_BLOCK);

    // Workbench / Kitchen / Medical Station at (18, -24, -20)
    this.fillBox(16, -24, -22, 22, -21, -19, VoxelType.WORKBENCH_BLOCK);

    // Diesel Generator in Generator corner (-21, -24, 18) + Cable line
    this.fillBox(-22, -24, 16, -18, -20, 20, VoxelType.GENERATOR_BLOCK);
    this.fillBox(-17, -24, 18, 0, -24, 18, VoxelType.CABLE_LINE);

    // First Lore Terminal inside shelter
    this.fillBox(0, -24, -23, 2, -20, -22, VoxelType.TERMINAL_LORE);

    // Storage chest inside shelter
    this.fillBox(20, -24, 18, 22, -22, 20, VoxelType.BURIED_CHEST);

    // Sloped Stairwell Ramp going North (Z = -25 to -58) up to surface Y = 0
    for (let step = 0; step < 26; step++) {
      const zStart = -25 - step;
      const yFloor = -24 + step;
      this.fillBox(-6, yFloor, zStart, 6, yFloor + 14, zStart, VoxelType.AIR);
      this.fillBox(-7, yFloor - 1, zStart, 7, yFloor - 1, zStart, VoxelType.CONCRETE_WALL);
      this.fillBox(-7, yFloor, zStart, -7, yFloor + 14, zStart, VoxelType.BRICK_WALL);
      this.fillBox(7, yFloor, zStart, 7, yFloor + 14, zStart, VoxelType.BRICK_WALL);
      if (step < 18) {
        this.fillBox(-7, yFloor + 15, zStart, 7, yFloor + 15, zStart, VoxelType.CONCRETE_WALL);
      }
      if (step % 8 === 0) {
        this.setVoxel(0, yFloor + 13, zStart, VoxelType.LAMP_WARM, false, false);
      }
    }

    // Surface hatch bunker entrance frame at Z = -52..-46
    this.fillBox(-8, 0, -54, 8, 12, -46, VoxelType.CONCRETE_WALL);
    this.fillBox(-6, 0, -55, 6, 10, -45, VoxelType.AIR);
    // Armored entrance door frame at bottom of stairs (Z = -25)
    this.fillBox(-5, -24, -25, 5, -14, -25, VoxelType.DOOR_OPEN);
  }

  private buildUndergroundSecretsAndFacility(): void {
    // Buried supply caches and old tunnels at medium depth (Y = -36..-45)
    const caches = [
      [35, -32, 10],
      [-38, -35, -15],
      [15, -42, 35],
      [-20, -48, 28],
    ];
    for (const [cx, cy, cz] of caches) {
      this.fillBox(cx - 5, cy - 3, cz - 5, cx + 5, cy + 5, cz + 5, VoxelType.AIR);
      this.fillBox(cx - 1, cy - 3, cz - 1, cx + 1, cy - 1, cz + 1, VoxelType.BURIED_CHEST);
      this.setVoxel(cx, cy + 4, cz, VoxelType.LAMP_WARM, false, false);
      this.setVoxel(cx + 3, cy - 3, cz, VoxelType.TERMINAL_LORE, false, false);
    }

    // DEEP FACILITY ("PROJE AETHER" Lab) at Y = -72..-56 (Depth -7.2m to -5.6m), X = -22..22, Z = -22..22
    this.fillBox(-22, -73, -22, 22, -55, 22, VoxelType.STEEL_WALL);
    this.fillBox(-20, -71, -20, 20, -57, 20, VoxelType.AIR);
    // Glowing Bio-Reactor Core in center
    this.fillBox(-4, -71, -4, 4, -59, 4, VoxelType.FACILITY_CORE);
    // Lore Terminals & High-Tier Loot around core
    this.fillBox(-14, -71, -14, -12, -67, -12, VoxelType.TERMINAL_LORE);
    this.fillBox(12, -71, -14, 14, -67, -12, VoxelType.TERMINAL_LORE);
    this.fillBox(-14, -71, 12, -12, -69, 14, VoxelType.BURIED_CHEST);
    this.fillBox(12, -71, 12, 14, -69, 14, VoxelType.BURIED_CHEST);
    this.setVoxel(-15, -58, 0, VoxelType.LAMP_WARM, false, false);
    this.setVoxel(15, -58, 0, VoxelType.LAMP_WARM, false, false);
    this.setVoxel(0, -58, -15, VoxelType.LAMP_WARM, false, false);
    this.setVoxel(0, -58, 15, VoxelType.LAMP_WARM, false, false);
  }

  private buildSurfaceFeatures(): void {
    // 1. Ruined Town / Market (North: X=-25..25, Z=-135..-95)
    this.buildRuinedBuilding(-22, 0, -125, 18, 14, 16, VoxelType.BRICK_WALL, true);
    this.buildRuinedBuilding(6, 0, -122, 16, 12, 14, VoxelType.CONCRETE_WALL, true);

    // 2. Gas Station (East: X=95..130, Z=-18..18)
    this.fillBox(98, 0, -14, 124, 1, 14, VoxelType.CONCRETE_WALL);
    // Canopy pillars & roof
    this.fillBox(102, 1, -10, 104, 13, -8, VoxelType.RUST_METAL);
    this.fillBox(120, 1, -10, 122, 13, -8, VoxelType.RUST_METAL);
    this.fillBox(102, 1, 8, 104, 13, 10, VoxelType.RUST_METAL);
    this.fillBox(120, 1, 8, 122, 13, 10, VoxelType.RUST_METAL);
    this.fillBox(100, 13, -12, 124, 14, 12, VoxelType.STEEL_WALL);
    // Fuel pumps & loot
    this.fillBox(110, 1, -2, 113, 6, 2, VoxelType.GENERATOR_BLOCK);
    this.fillBox(116, 1, 0, 118, 3, 2, VoxelType.BURIED_CHEST);
    this.setVoxel(108, 1, 5, VoxelType.TERMINAL_LORE, false, false);

    // 3. Abandoned Hospital (West: X=-135..-95, Z=10..42)
    this.buildRuinedBuilding(-128, 0, 14, 24, 18, 22, VoxelType.CONCRETE_WALL, true);
    // Red cross symbol on front wall
    this.fillBox(-104, 8, 23, -103, 14, 27, VoxelType.BRICK_WALL);

    // 4. Military Outpost (South: X=-20..20, Z=100..135)
    this.buildRuinedBuilding(-16, 0, 105, 28, 14, 22, VoxelType.STEEL_WALL, true);
    this.fillBox(-4, 1, 115, -1, 4, 118, VoxelType.BURIED_CHEST);
    this.fillBox(3, 1, 115, 5, 5, 117, VoxelType.TERMINAL_LORE);

    // 5. Farmhouse (NW: X=-115..-90, Z=-115..-90)
    this.buildRuinedBuilding(-112, 0, -110, 18, 12, 16, VoxelType.WOOD_DEAD, true);

    // Scatter Rusty Car Wrecks & Withered Dead Trees across the surface
    const carCoords = [
      [-35, -65], [28, -72], [55, -25], [-55, -20],
      [42, 45], [-48, 52], [75, -55], [-68, 65],
    ];
    for (const [cx, cz] of carCoords) {
      this.buildRustyCar(cx, 0, cz);
    }

    const treeCoords = [
      [-45, -35], [40, -40], [-30, 38], [32, 32],
      [-75, -10], [72, 22], [-18, 70], [22, -82],
      [-85, -55], [82, -62], [-60, 82], [65, 78],
    ];
    for (const [tx, tz] of treeCoords) {
      this.buildDeadTree(tx, 0, tz);
    }
  }

  private buildRuinedBuilding(
    bx: number, by: number, bz: number,
    w: number, h: number, d: number,
    wallType: VoxelType,
    withLoot: boolean
  ): void {
    for (let z = bz; z < bz + d; z++) {
      for (let y = by; y < by + h; y++) {
        for (let x = bx; x < bx + w; x++) {
          const isBorder = x === bx || x === bx + w - 1 || z === bz || z === bz + d - 1;
          const isFloor = y === by;
          const isRoof = y === by + h - 1;
          // Jagged ruined top wall cutout
          if (isRoof && ((x + z) % 5 === 0)) continue;
          if (y > by + h - 4 && ((x * 3 + z * 7) % 11 < 4)) continue;

          if (isFloor) {
            this.setVoxel(x, y, z, VoxelType.CONCRETE_WALL, false, false);
          } else if (isBorder) {
            // Doorway on front
            const midX = bx + Math.floor(w / 2);
            if (z === bz && Math.abs(x - midX) <= 2 && y <= by + 8) {
              this.setVoxel(x, y, z, VoxelType.DOOR_CLOSED, false, false);
            } else {
              this.setVoxel(x, y, z, wallType, false, false);
            }
          } else {
            this.setVoxel(x, y, z, VoxelType.AIR, false, false);
          }
        }
      }
    }

    if (withLoot) {
      this.fillBox(bx + 3, by + 1, bz + 3, bx + 5, by + 3, bz + 5, VoxelType.BURIED_CHEST);
      this.fillBox(bx + w - 5, by + 1, bz + d - 5, bx + w - 4, by + 4, bz + d - 4, VoxelType.TERMINAL_LORE);
    }
  }

  private buildRustyCar(cx: number, cy: number, cz: number): void {
    // Detailed micro-voxel car wreck (12x5x6 voxels = 1.2m x 0.5m x 0.6m)
    this.fillBox(cx, cy + 1, cz, cx + 11, cy + 3, cz + 5, VoxelType.RUST_METAL);
    this.fillBox(cx + 3, cy + 4, cz + 1, cx + 8, cy + 5, cz + 4, VoxelType.RUST_METAL);
    // Wheels
    this.fillBox(cx + 1, cy, cz, cx + 3, cy + 1, cz + 5, VoxelType.BEDROCK);
    this.fillBox(cx + 8, cy, cz, cx + 10, cy + 1, cz + 5, VoxelType.BEDROCK);
  }

  private buildDeadTree(tx: number, ty: number, tz: number): void {
    // Trunk
    this.fillBox(tx, ty, tz, tx + 1, ty + 14, tz + 1, VoxelType.WOOD_DEAD);
    // Twisted dead branches
    this.fillBox(tx - 4, ty + 10, tz, tx, ty + 11, tz + 1, VoxelType.WOOD_DEAD);
    this.fillBox(tx + 2, ty + 12, tz, tx + 5, ty + 13, tz + 1, VoxelType.WOOD_DEAD);
    this.fillBox(tx, ty + 13, tz - 4, tx + 1, ty + 14, tz, VoxelType.WOOD_DEAD);
  }

  private buildPaddedChunk(cx: number, cy: number, cz: number): Uint8Array {
    const P = CHUNK_SIZE + 2;
    const padded = new Uint8Array(P * P * P);
    const vxBase = cx * CHUNK_SIZE;
    const vyBase = cy * CHUNK_SIZE;
    const vzBase = cz * CHUNK_SIZE;

    for (let pz = 0; pz < P; pz++) {
      const wz = vzBase + pz - 1;
      for (let py = 0; py < P; py++) {
        const wy = vyBase + py - 1;
        for (let px = 0; px < P; px++) {
          const wx = vxBase + px - 1;
          padded[px + py * P + pz * P * P] = this.getVoxel(wx, wy, wz);
        }
      }
    }
    return padded;
  }

  public processDirtyChunks(syncAll = false): void {
    // Immediate player-edited chunks get meshed synchronously for instant feedback (< 2ms per chunk)
    if (this.ImmediateDirtyChunks.size > 0) {
      for (const key of this.ImmediateDirtyChunks) {
        this.dirtyChunks.delete(key);
        const [cx, cy, cz] = key.split(',').map(Number);
        const padded = this.buildPaddedChunk(cx, cy, cz);
        const out = buildChunkGreedyMesh({ chunkKey: key, cx, cy, cz, padded });
        this.applyMeshOutput(out);
      }
      this.ImmediateDirtyChunks.clear();
    }

    if (this.dirtyChunks.size === 0) return;

    const batchLimit = syncAll ? 9999 : 8;
    let count = 0;
    for (const key of this.dirtyChunks) {
      this.dirtyChunks.delete(key);
      const [cx, cy, cz] = key.split(',').map(Number);
      const padded = this.buildPaddedChunk(cx, cy, cz);
      const job: MesherInput = { chunkKey: key, cx, cy, cz, padded };

      if (syncAll || this.workers.length === 0) {
        const out = buildChunkGreedyMesh(job);
        this.applyMeshOutput(out);
      } else {
        this.workerQueue.push(job);
        this.dispatchNextWorkerJob();
      }
      if (++count >= batchLimit) break;
    }
  }

  private dispatchNextWorkerJob(): void {
    if (this.workerQueue.length === 0) return;
    for (let i = 0; i < this.workers.length; i++) {
      if (!this.workerBusy[i] && this.workerQueue.length > 0) {
        const job = this.workerQueue.shift()!;
        this.workerBusy[i] = true;
        this.workers[i].postMessage(job, [job.padded.buffer]);
      }
    }
  }

  private applyMeshOutput(out: MesherOutput): void {
    const existing = this.meshes.get(out.chunkKey);
    if (existing) {
      this.scene.remove(existing);
      existing.geometry.dispose();
      this.meshes.delete(out.chunkKey);
    }

    if (out.positions.length === 0) return;

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(out.positions, 3));
    geom.setAttribute('normal', new THREE.BufferAttribute(out.normals, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(out.colors, 3));
    geom.setIndex(new THREE.BufferAttribute(out.indices, 1));
    geom.computeBoundingSphere();

    const mesh = new THREE.Mesh(geom, this.sharedMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.meshes.set(out.chunkKey, mesh);
  }

  /**
   * Fast 3D DDA Voxel Raycast returning hit voxel, normal, and distance.
   */
  public raycast(
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    maxDistUnits = 4.0
  ): {
    vx: number;
    vy: number;
    vz: number;
    nx: number;
    ny: number;
    nz: number;
    voxel: VoxelType;
    dist: number;
  } | null {
    const maxSteps = Math.ceil(maxDistUnits / VOXEL_SIZE) * 2;
    let x = Math.floor(origin.x / VOXEL_SIZE);
    let y = Math.floor(origin.y / VOXEL_SIZE);
    let z = Math.floor(origin.z / VOXEL_SIZE);

    const stepX = dir.x > 0 ? 1 : dir.x < 0 ? -1 : 0;
    const stepY = dir.y > 0 ? 1 : dir.y < 0 ? -1 : 0;
    const stepZ = dir.z > 0 ? 1 : dir.z < 0 ? -1 : 0;

    const tDeltaX = stepX !== 0 ? Math.abs(VOXEL_SIZE / dir.x) : Infinity;
    const tDeltaY = stepY !== 0 ? Math.abs(VOXEL_SIZE / dir.y) : Infinity;
    const tDeltaZ = stepZ !== 0 ? Math.abs(VOXEL_SIZE / dir.z) : Infinity;

    let tMaxX =
      stepX > 0
        ? ((x + 1) * VOXEL_SIZE - origin.x) / dir.x
        : stepX < 0
        ? (x * VOXEL_SIZE - origin.x) / dir.x
        : Infinity;
    let tMaxY =
      stepY > 0
        ? ((y + 1) * VOXEL_SIZE - origin.y) / dir.y
        : stepY < 0
        ? (y * VOXEL_SIZE - origin.y) / dir.y
        : Infinity;
    let tMaxZ =
      stepZ > 0
        ? ((z + 1) * VOXEL_SIZE - origin.z) / dir.z
        : stepZ < 0
        ? (z * VOXEL_SIZE - origin.z) / dir.z
        : Infinity;

    let nx = 0, ny = 0, nz = 0;
    let dist = 0;

    for (let i = 0; i < maxSteps; i++) {
      const vox = this.getVoxel(x, y, z);
      if (vox !== VoxelType.AIR) {
        return { vx: x, vy: y, vz: z, nx, ny, nz, voxel: vox, dist };
      }

      if (tMaxX < tMaxY) {
        if (tMaxX < tMaxZ) {
          dist = tMaxX;
          tMaxX += tDeltaX;
          x += stepX;
          nx = -stepX; ny = 0; nz = 0;
        } else {
          dist = tMaxZ;
          tMaxZ += tDeltaZ;
          z += stepZ;
          nx = 0; ny = 0; nz = -stepZ;
        }
      } else {
        if (tMaxY < tMaxZ) {
          dist = tMaxY;
          tMaxY += tDeltaY;
          y += stepY;
          nx = 0; ny = -stepY; nz = 0;
        } else {
          dist = tMaxZ;
          tMaxZ += tDeltaZ;
          z += stepZ;
          nx = 0; ny = 0; nz = -stepZ;
        }
      }

      if (dist > maxDistUnits) break;
    }

    return null;
  }

  public isSolidAtWorld(wx: number, wy: number, wz: number): boolean {
    const vx = Math.floor(wx / VOXEL_SIZE);
    const vy = Math.floor(wy / VOXEL_SIZE);
    const vz = Math.floor(wz / VOXEL_SIZE);
    const v = this.getVoxel(vx, vy, vz);
    const mat = VOXEL_MATERIALS[v];
    return mat ? !mat.passable : false;
  }
}
