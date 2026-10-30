import { VoxelWorld } from '../world/VoxelWorld';
import { RPGSystem, LORE_NOTES } from './RPGSystem';
import { EnvironmentSystem } from './EnvironmentSystem';
import { Player } from '../entities/Player';

const SAVE_KEY = 'son_siginak_save_v1';

export interface SavePayloadV1 {
  version: 1;
  savedAt: string;
  dayCount: number;
  timeOfDay: number;
  playerPos: [number, number, number];
  rpg: {
    health: number;
    hunger: number;
    thirst: number;
    stamina: number;
    radiation: number;
    limbs: { head: number; torso: number; arms: number; legs: number };
    bleeding: boolean;
    infection: boolean;
    fracture: boolean;
    perkPoints: number;
    unlockedPerks: string[];
    unlockedBlueprints: string[];
    inventory: [string, number][];
    generatorFuel: number;
    generatorOn: boolean;
    reachedDeepFacility: boolean;
  };
  unlockedLoreIds: string[];
  voxelDeltas: [string, number][];
}

export class SaveSystem {
  public static save(world: VoxelWorld, rpg: RPGSystem, env: EnvironmentSystem, player: Player): boolean {
    try {
      const payload: SavePayloadV1 = {
        version: 1,
        savedAt: new Date().toISOString(),
        dayCount: env.dayCount,
        timeOfDay: env.timeOfDay,
        playerPos: [player.position.x, player.position.y, player.position.z],
        rpg: {
          health: rpg.health,
          hunger: rpg.hunger,
          thirst: rpg.thirst,
          stamina: rpg.stamina,
          radiation: rpg.radiation,
          limbs: { ...rpg.limbs },
          bleeding: rpg.bleeding,
          infection: rpg.infection,
          fracture: rpg.fracture,
          perkPoints: rpg.perkPoints,
          unlockedPerks: Array.from(rpg.unlockedPerks),
          unlockedBlueprints: Array.from(rpg.unlockedBlueprints),
          inventory: Array.from(rpg.inventory.entries()),
          generatorFuel: rpg.generatorFuel,
          generatorOn: rpg.generatorOn,
          reachedDeepFacility: rpg.reachedDeepFacility,
        },
        unlockedLoreIds: LORE_NOTES.filter((l) => l.unlocked).map((l) => l.id),
        voxelDeltas: Array.from(world.modifiedVoxels.entries()),
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      return true;
    } catch {
      return false;
    }
  }

  public static load(world: VoxelWorld, rpg: RPGSystem, env: EnvironmentSystem, player: Player): boolean {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw) as SavePayloadV1;
      if (data.version !== 1) return false;

      env.dayCount = data.dayCount;
      env.timeOfDay = data.timeOfDay;
      player.position.set(data.playerPos[0], data.playerPos[1], data.playerPos[2]);

      rpg.health = data.rpg.health;
      rpg.hunger = data.rpg.hunger;
      rpg.thirst = data.rpg.thirst;
      rpg.stamina = data.rpg.stamina;
      rpg.radiation = data.rpg.radiation;
      rpg.limbs = { ...data.rpg.limbs };
      rpg.bleeding = data.rpg.bleeding;
      rpg.infection = data.rpg.infection;
      rpg.fracture = data.rpg.fracture;
      rpg.perkPoints = data.rpg.perkPoints;
      rpg.unlockedPerks = new Set(data.rpg.unlockedPerks);
      rpg.unlockedBlueprints = new Set(data.rpg.unlockedBlueprints);
      rpg.inventory = new Map(data.rpg.inventory);
      rpg.generatorFuel = data.rpg.generatorFuel;
      rpg.generatorOn = data.rpg.generatorOn;
      rpg.reachedDeepFacility = data.rpg.reachedDeepFacility;

      for (const l of LORE_NOTES) {
        if (data.unlockedLoreIds.includes(l.id)) l.unlocked = true;
      }

      for (const [k, voxType] of data.voxelDeltas) {
        const [vx, vy, vz] = k.split(',').map(Number);
        world.setVoxel(vx, vy, vz, voxType, true, false);
      }
      world.processDirtyChunks(true);
      return true;
    } catch {
      return false;
    }
  }
}
