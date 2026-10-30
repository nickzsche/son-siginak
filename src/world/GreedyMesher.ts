import { CHUNK_SIZE, VOXEL_SIZE, VoxelType, VOXEL_MATERIALS } from './VoxelTypes';

export interface MesherInput {
  chunkKey: string;
  cx: number;
  cy: number;
  cz: number;
  /** Padded 34x34x34 voxel array so boundary faces & AO have neighbor access */
  padded: Uint8Array;
}

export interface MesherOutput {
  chunkKey: string;
  cx: number;
  cy: number;
  cz: number;
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
  emissivePositions: Float32Array;
}

const PADDED_SIZE = CHUNK_SIZE + 2;

function getPadded(padded: Uint8Array, x: number, y: number, z: number): number {
  const px = x + 1;
  const py = y + 1;
  const pz = z + 1;
  return padded[px + py * PADDED_SIZE + pz * PADDED_SIZE * PADDED_SIZE];
}

function isOpaque(v: number): boolean {
  return v !== VoxelType.AIR && v !== VoxelType.DOOR_OPEN && v !== VoxelType.CABLE_LINE && v !== VoxelType.TRAP_ALARM;
}

function vertexAO(s1: number, s2: number, c: number): number {
  if (s1 && s2) return 0.38;
  const occ = s1 + s2 + c;
  if (occ === 0) return 1.0;
  if (occ === 1) return 0.78;
  if (occ === 2) return 0.58;
  return 0.42;
}

function hash3(x: number, y: number, z: number): number {
  let n = x * 374761393 + y * 668265263 + z * 2147483647;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

/**
 * Greedy meshing across all 6 face directions with per-vertex voxel AO and color variation.
 * Runs both in Web Worker and as synchronous fallback.
 */
export function buildChunkGreedyMesh(input: MesherInput): MesherOutput {
  const { chunkKey, cx, cy, cz, padded } = input;

  const posArr: number[] = [];
  const normArr: number[] = [];
  const colArr: number[] = [];
  const idxArr: number[] = [];
  const emissiveArr: number[] = [];

  const worldBaseX = cx * CHUNK_SIZE;
  const worldBaseY = cy * CHUNK_SIZE;
  const worldBaseZ = cz * CHUNK_SIZE;

  // Collect sparse emissive voxel centers for shelter/facility lighting
  for (let z = 0; z < CHUNK_SIZE; z++) {
    for (let y = 0; y < CHUNK_SIZE; y++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const v = getPadded(padded, x, y, z);
        if (
          v === VoxelType.LAMP_WARM ||
          v === VoxelType.FACILITY_CORE ||
          v === VoxelType.TERMINAL_LORE
        ) {
          emissiveArr.push(
            (worldBaseX + x + 0.5) * VOXEL_SIZE,
            (worldBaseY + y + 0.5) * VOXEL_SIZE,
            (worldBaseZ + z + 0.5) * VOXEL_SIZE,
            v
          );
        }
      }
    }
  }

  // 6 directions: 0:+X, 1:-X, 2:+Y, 3:-Y, 4:+Z, 5:-Z
  const mask = new Int32Array(CHUNK_SIZE * CHUNK_SIZE);

  for (let d = 0; d < 3; d++) {
    const u = (d + 1) % 3;
    const v = (d + 2) % 3;
    const x = [0, 0, 0];
    const q = [0, 0, 0];
    q[d] = 1;

    for (let backFace = 0; backFace < 2; backFace++) {
      const dirSign = backFace === 0 ? 1 : -1;

      for (x[d] = 0; x[d] < CHUNK_SIZE; x[d]++) {
        let n = 0;
        for (x[v] = 0; x[v] < CHUNK_SIZE; x[v]++) {
          for (x[u] = 0; x[u] < CHUNK_SIZE; x[u]++) {
            const vox = getPadded(padded, x[0], x[1], x[2]);
            if (vox === VoxelType.AIR) {
              mask[n++] = 0;
              continue;
            }
            const nx = x[0] + q[0] * dirSign;
            const ny = x[1] + q[1] * dirSign;
            const nz = x[2] + q[2] * dirSign;
            const neighbor = getPadded(padded, nx, ny, nz);

            if (!isOpaque(neighbor) && vox !== neighbor) {
              // Compute a packed AO signature so greedy quads merge identical material + AO
              const t0 = [nx, ny, nz];
              const du0 = [0, 0, 0];
              const dv0 = [0, 0, 0];
              du0[u] = 1;
              dv0[v] = 1;

              const s_um = isOpaque(getPadded(padded, t0[0] - du0[0], t0[1] - du0[1], t0[2] - du0[2])) ? 1 : 0;
              const s_up = isOpaque(getPadded(padded, t0[0] + du0[0], t0[1] + du0[1], t0[2] + du0[2])) ? 1 : 0;
              const s_vm = isOpaque(getPadded(padded, t0[0] - dv0[0], t0[1] - dv0[1], t0[2] - dv0[2])) ? 1 : 0;
              const s_vp = isOpaque(getPadded(padded, t0[0] + dv0[0], t0[1] + dv0[1], t0[2] + dv0[2])) ? 1 : 0;

              const c00 = isOpaque(getPadded(padded, t0[0] - du0[0] - dv0[0], t0[1] - du0[1] - dv0[1], t0[2] - du0[2] - dv0[2])) ? 1 : 0;
              const c10 = isOpaque(getPadded(padded, t0[0] + du0[0] - dv0[0], t0[1] + du0[1] - dv0[1], t0[2] + du0[2] - dv0[2])) ? 1 : 0;
              const c11 = isOpaque(getPadded(padded, t0[0] + du0[0] + dv0[0], t0[1] + du0[1] + dv0[1], t0[2] + du0[2] + dv0[2])) ? 1 : 0;
              const c01 = isOpaque(getPadded(padded, t0[0] - du0[0] + dv0[0], t0[1] - du0[1] + dv0[1], t0[2] - du0[2] + dv0[2])) ? 1 : 0;

              const aoBits =
                (s_um) |
                (s_up << 1) |
                (s_vm << 2) |
                (s_vp << 3) |
                (c00 << 4) |
                (c10 << 5) |
                (c11 << 6) |
                (c01 << 7);

              // Also quantize per-voxel color variation into 4 buckets so greedy merging stays fast & detailed
              const varBucket = (Math.floor(hash3(worldBaseX + x[0], worldBaseY + x[1], worldBaseZ + x[2]) * 4)) & 3;
              mask[n++] = vox | (aoBits << 8) | (varBucket << 16);
            } else {
              mask[n++] = 0;
            }
          }
        }

        // Greedy 2D scan on mask
        n = 0;
        for (let j = 0; j < CHUNK_SIZE; j++) {
          for (let i = 0; i < CHUNK_SIZE; ) {
            const c = mask[n];
            if (c !== 0) {
              let w = 1;
              while (i + w < CHUNK_SIZE && mask[n + w] === c) {
                w++;
              }
              let h = 1;
              let done = false;
              while (j + h < CHUNK_SIZE) {
                for (let k = 0; k < w; k++) {
                  if (mask[n + k + h * CHUNK_SIZE] !== c) {
                    done = true;
                    break;
                  }
                }
                if (done) break;
                h++;
              }

              // Emit quad
              const voxType = c & 0xff;
              const aoBits = (c >> 8) & 0xff;
              const varBucket = (c >> 16) & 0x3;

              const s_um = aoBits & 1;
              const s_up = (aoBits >> 1) & 1;
              const s_vm = (aoBits >> 2) & 1;
              const s_vp = (aoBits >> 3) & 1;
              const c00 = (aoBits >> 4) & 1;
              const c10 = (aoBits >> 5) & 1;
              const c11 = (aoBits >> 6) & 1;
              const c01 = (aoBits >> 7) & 1;

              const ao00 = vertexAO(s_um, s_vm, c00);
              const ao10 = vertexAO(s_up, s_vm, c10);
              const ao11 = vertexAO(s_up, s_vp, c11);
              const ao01 = vertexAO(s_um, s_vp, c01);

              const quadPos = [0, 0, 0];
              quadPos[d] = x[d] + (backFace === 0 ? 1 : 0);
              quadPos[u] = i;
              quadPos[v] = j;

              const du = [0, 0, 0];
              const dv = [0, 0, 0];
              du[u] = w;
              dv[v] = h;

              // Thin voxel height adjustment for floor traps / cables
              let yOffsetTop = 0;
              if (
                (voxType === VoxelType.CABLE_LINE ||
                  voxType === VoxelType.TRAP_SPIKE ||
                  voxType === VoxelType.TRAP_ALARM ||
                  voxType === VoxelType.TRAP_SHOCK) &&
                d === 1 &&
                backFace === 0
              ) {
                yOffsetTop = -0.65;
              }

              const p0 = [
                (worldBaseX + quadPos[0]) * VOXEL_SIZE,
                (worldBaseY + quadPos[1] + yOffsetTop) * VOXEL_SIZE,
                (worldBaseZ + quadPos[2]) * VOXEL_SIZE,
              ];
              const p1 = [
                (worldBaseX + quadPos[0] + du[0]) * VOXEL_SIZE,
                (worldBaseY + quadPos[1] + du[1] + yOffsetTop) * VOXEL_SIZE,
                (worldBaseZ + quadPos[2] + du[2]) * VOXEL_SIZE,
              ];
              const p2 = [
                (worldBaseX + quadPos[0] + du[0] + dv[0]) * VOXEL_SIZE,
                (worldBaseY + quadPos[1] + du[1] + dv[1] + yOffsetTop) * VOXEL_SIZE,
                (worldBaseZ + quadPos[2] + du[2] + dv[2]) * VOXEL_SIZE,
              ];
              const p3 = [
                (worldBaseX + quadPos[0] + dv[0]) * VOXEL_SIZE,
                (worldBaseY + quadPos[1] + dv[1] + yOffsetTop) * VOXEL_SIZE,
                (worldBaseZ + quadPos[2] + dv[2]) * VOXEL_SIZE,
              ];

              const baseVert = posArr.length / 3;
              posArr.push(
                p0[0], p0[1], p0[2],
                p1[0], p1[1], p1[2],
                p2[0], p2[1], p2[2],
                p3[0], p3[1], p3[2]
              );

              const norm = [0, 0, 0];
              norm[d] = dirSign;
              for (let k = 0; k < 4; k++) {
                normArr.push(norm[0], norm[1], norm[2]);
              }

              const mat = VOXEL_MATERIALS[voxType] || VOXEL_MATERIALS[VoxelType.ROCK];
              const shadeVariation = 0.91 + varBucket * 0.06;
              // Directional subtle shading boost for top/bottom faces
              const dirShade = d === 1 ? (dirSign > 0 ? 1.06 : 0.72) : d === 0 ? 0.92 : 0.86;
              const rBase = mat.color[0] * shadeVariation * dirShade;
              const gBase = mat.color[1] * shadeVariation * dirShade;
              const bBase = mat.color[2] * shadeVariation * dirShade;

              const emBoost = mat.emissive ? 1.45 : 1.0;
              const aos = [ao00, ao10, ao11, ao01];
              for (let k = 0; k < 4; k++) {
                const f = mat.emissive ? emBoost : aos[k];
                colArr.push(rBase * f, gBase * f, bBase * f);
              }

              if (backFace === 0) {
                idxArr.push(
                  baseVert, baseVert + 1, baseVert + 2,
                  baseVert, baseVert + 2, baseVert + 3
                );
              } else {
                idxArr.push(
                  baseVert, baseVert + 2, baseVert + 1,
                  baseVert, baseVert + 3, baseVert + 2
                );
              }

              for (let l = 0; l < h; l++) {
                for (let k = 0; k < w; k++) {
                  mask[n + k + l * CHUNK_SIZE] = 0;
                }
              }

              i += w;
              n += w;
            } else {
              i++;
              n++;
            }
          }
        }
      }
    }
  }

  return {
    chunkKey,
    cx,
    cy,
    cz,
    positions: new Float32Array(posArr),
    normals: new Float32Array(normArr),
    colors: new Float32Array(colArr),
    indices: new Uint32Array(idxArr),
    emissivePositions: new Float32Array(emissiveArr),
  };
}
