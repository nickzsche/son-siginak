export const VOXEL_SIZE = 0.1; // 1 voxel = 0.1 unit
export const CHUNK_SIZE = 32;  // 32x32x32 voxels per chunk (= 3.2m cube)

export enum VoxelType {
  AIR = 0,
  TOPSOIL = 1,       // Üst toprak (Dusty scorched earth)
  CLAY = 2,          // Kil katmanı
  ROCK = 3,          // Kaya katmanı
  BEDROCK = 4,       // Ana kaya (unbreakable)
  ORE_IRON = 5,      // Hurda Demir / Maden damarı
  ORE_COPPER = 6,    // Bakır / Elektronik cevheri
  OLD_PIPE = 7,      // Eski paslı boru
  BURIED_CHEST = 8,  // Gömülü sandık / Yağma kutusu
  WOOD_DEAD = 9,     // Kurumuş ağaç / Odun
  RUST_METAL = 10,   // Paslı araba / Hurda metal
  BRICK_WALL = 11,   // Tuğla duvar (orta güç)
  CONCRETE_WALL = 12,// Beton duvar (yüksek güç)
  STEEL_WALL = 13,   // Çelik sığınak duvarı (çok yüksek güç)
  DOOR_CLOSED = 14,  // Sığınak / Yapı kapısı (kapalı)
  DOOR_OPEN = 15,    // Açık kapı (geçilebilir)
  LAMP_WARM = 16,    // Sığınak sıcak lamba
  TRAP_SPIKE = 17,   // Kazık çukuru tuzağı
  TRAP_ALARM = 18,   // Alarm teli tuzağı
  TRAP_SHOCK = 19,   // Elektrikli zemin tuzağı
  TURRET_BLOCK = 20, // Otomatik taret bloğu
  CABLE_LINE = 21,   // Elektrik kablosu
  FACILITY_CORE = 22,// Derin tesis parlayan çekirdek / terminal
  TERMINAL_LORE = 23,// Bilgisayar terminali / Ses kaydı
  BED_BLOCK = 24,    // Yatak (Uyku)
  WORKBENCH_BLOCK = 25, // Atölye / Mutfak / Revir istasyonu
  GENERATOR_BLOCK = 26, // Jeneratör bloğu
}

export interface VoxelMaterialDef {
  id: VoxelType;
  name: string;
  hardness: number;     // Seconds to mine at base speed (Infinity = unbreakable)
  color: [number, number, number]; // Base RGB [0..1]
  roughness: number;
  metalness: number;
  emissive?: boolean;
  dropItem?: string;
  dropCount?: number;
  wallCost?: number;    // Pathfinding cost for night creatures
  passable?: boolean;
}

export const VOXEL_MATERIALS: Record<number, VoxelMaterialDef> = {
  [VoxelType.AIR]: {
    id: VoxelType.AIR,
    name: 'Hava',
    hardness: 0,
    color: [0, 0, 0],
    roughness: 1,
    metalness: 0,
    passable: true,
    wallCost: 1,
  },
  [VoxelType.TOPSOIL]: {
    id: VoxelType.TOPSOIL,
    name: 'Kavrulmuş Üst Toprak',
    hardness: 0.22,
    color: [0.46, 0.37, 0.25],
    roughness: 0.95,
    metalness: 0.0,
    dropItem: 'topsoil',
    dropCount: 1,
    wallCost: 4, // Weak wall - creatures dig easily
  },
  [VoxelType.CLAY]: {
    id: VoxelType.CLAY,
    name: 'Sert Kil Katmanı',
    hardness: 0.40,
    color: [0.55, 0.35, 0.24],
    roughness: 0.85,
    metalness: 0.05,
    dropItem: 'clay',
    dropCount: 1,
    wallCost: 7,
  },
  [VoxelType.ROCK]: {
    id: VoxelType.ROCK,
    name: 'Kaya Katmanı',
    hardness: 0.85,
    color: [0.42, 0.43, 0.45],
    roughness: 0.8,
    metalness: 0.1,
    dropItem: 'stone',
    dropCount: 1,
    wallCost: 16,
  },
  [VoxelType.BEDROCK]: {
    id: VoxelType.BEDROCK,
    name: 'Ana Kaya',
    hardness: Infinity,
    color: [0.14, 0.14, 0.16],
    roughness: 0.9,
    metalness: 0.2,
    wallCost: 9999,
  },
  [VoxelType.ORE_IRON]: {
    id: VoxelType.ORE_IRON,
    name: 'Demir / Metal Damarı',
    hardness: 1.1,
    color: [0.62, 0.44, 0.36],
    roughness: 0.5,
    metalness: 0.65,
    dropItem: 'scrap_metal',
    dropCount: 2,
    wallCost: 22,
  },
  [VoxelType.ORE_COPPER]: {
    id: VoxelType.ORE_COPPER,
    name: 'Bakır & Elektronik Damarı',
    hardness: 1.15,
    color: [0.28, 0.65, 0.55],
    roughness: 0.45,
    metalness: 0.7,
    dropItem: 'electronics',
    dropCount: 1,
    wallCost: 22,
  },
  [VoxelType.OLD_PIPE]: {
    id: VoxelType.OLD_PIPE,
    name: 'Eski Paslı Boru',
    hardness: 0.75,
    color: [0.58, 0.29, 0.16],
    roughness: 0.55,
    metalness: 0.75,
    dropItem: 'scrap_metal',
    dropCount: 2,
    wallCost: 18,
  },
  [VoxelType.BURIED_CHEST]: {
    id: VoxelType.BURIED_CHEST,
    name: 'Yağma Sandığı',
    hardness: 0.45,
    color: [0.75, 0.58, 0.18],
    roughness: 0.6,
    metalness: 0.4,
    dropItem: 'loot_bundle',
    dropCount: 1,
    wallCost: 5,
  },
  [VoxelType.WOOD_DEAD]: {
    id: VoxelType.WOOD_DEAD,
    name: 'Kurumuş Ağaç / Odun',
    hardness: 0.35,
    color: [0.36, 0.26, 0.17],
    roughness: 0.9,
    metalness: 0.0,
    dropItem: 'wood',
    dropCount: 2,
    wallCost: 6,
  },
  [VoxelType.RUST_METAL]: {
    id: VoxelType.RUST_METAL,
    name: 'Paslı Hurda Enkazı',
    hardness: 0.7,
    color: [0.52, 0.24, 0.15],
    roughness: 0.6,
    metalness: 0.7,
    dropItem: 'scrap_metal',
    dropCount: 2,
    wallCost: 15,
  },
  [VoxelType.BRICK_WALL]: {
    id: VoxelType.BRICK_WALL,
    name: 'Tuğla Duvar (Güç: Orta)',
    hardness: 1.0,
    color: [0.64, 0.26, 0.20],
    roughness: 0.85,
    metalness: 0.05,
    dropItem: 'brick_block',
    dropCount: 1,
    wallCost: 30,
  },
  [VoxelType.CONCRETE_WALL]: {
    id: VoxelType.CONCRETE_WALL,
    name: 'Beton Duvar (Güç: Yüksek)',
    hardness: 1.8,
    color: [0.56, 0.58, 0.59],
    roughness: 0.75,
    metalness: 0.15,
    dropItem: 'concrete_block',
    dropCount: 1,
    wallCost: 65,
  },
  [VoxelType.STEEL_WALL]: {
    id: VoxelType.STEEL_WALL,
    name: 'Çelik Sığınak Duvarı (Güç: Maks)',
    hardness: 3.2,
    color: [0.34, 0.39, 0.45],
    roughness: 0.35,
    metalness: 0.85,
    dropItem: 'steel_block',
    dropCount: 1,
    wallCost: 150,
  },
  [VoxelType.DOOR_CLOSED]: {
    id: VoxelType.DOOR_CLOSED,
    name: 'Zırhlı Kapı (Kapalı - E ile Aç)',
    hardness: 1.4,
    color: [0.48, 0.38, 0.22],
    roughness: 0.5,
    metalness: 0.6,
    dropItem: 'scrap_metal',
    dropCount: 1,
    wallCost: 25,
  },
  [VoxelType.DOOR_OPEN]: {
    id: VoxelType.DOOR_OPEN,
    name: 'Zırhlı Kapı (Açık - E ile Kapat)',
    hardness: 1.4,
    color: [0.35, 0.28, 0.16],
    roughness: 0.5,
    metalness: 0.6,
    passable: true,
    wallCost: 1,
  },
  [VoxelType.LAMP_WARM]: {
    id: VoxelType.LAMP_WARM,
    name: 'Sığınak Sıcak Lambası',
    hardness: 0.3,
    color: [1.0, 0.82, 0.42],
    roughness: 0.2,
    metalness: 0.1,
    emissive: true,
    dropItem: 'electronics',
    dropCount: 1,
    wallCost: 3,
  },
  [VoxelType.TRAP_SPIKE]: {
    id: VoxelType.TRAP_SPIKE,
    name: 'Kazık Çukuru Tuzağı',
    hardness: 0.5,
    color: [0.55, 0.15, 0.15],
    roughness: 0.6,
    metalness: 0.5,
    passable: true,
    wallCost: 2,
  },
  [VoxelType.TRAP_ALARM]: {
    id: VoxelType.TRAP_ALARM,
    name: 'Alarm Teli Tuzağı',
    hardness: 0.3,
    color: [0.9, 0.55, 0.1],
    roughness: 0.4,
    metalness: 0.4,
    passable: true,
    wallCost: 1,
  },
  [VoxelType.TRAP_SHOCK]: {
    id: VoxelType.TRAP_SHOCK,
    name: 'Elektrikli Zemin Tuzağı (⚡ Gerektirir)',
    hardness: 0.8,
    color: [0.2, 0.65, 0.95],
    roughness: 0.3,
    metalness: 0.8,
    emissive: true,
    passable: true,
    wallCost: 2,
  },
  [VoxelType.TURRET_BLOCK]: {
    id: VoxelType.TURRET_BLOCK,
    name: 'Otomatik Savunma Tareti (⚡ Gerektirir)',
    hardness: 1.5,
    color: [0.22, 0.52, 0.35],
    roughness: 0.4,
    metalness: 0.8,
    wallCost: 35,
  },
  [VoxelType.CABLE_LINE]: {
    id: VoxelType.CABLE_LINE,
    name: 'Elektrik Hattı Kablosu',
    hardness: 0.2,
    color: [0.95, 0.78, 0.15],
    roughness: 0.5,
    metalness: 0.5,
    passable: true,
    wallCost: 1,
  },
  [VoxelType.FACILITY_CORE]: {
    id: VoxelType.FACILITY_CORE,
    name: 'Derin Tesis Biyo-Reaktörü (PROJE AETHER)',
    hardness: 5.0,
    color: [0.15, 0.95, 0.78],
    roughness: 0.2,
    metalness: 0.9,
    emissive: true,
    wallCost: 200,
  },
  [VoxelType.TERMINAL_LORE]: {
    id: VoxelType.TERMINAL_LORE,
    name: 'Veri Terminali / Ses Kaydı [E ile Oku]',
    hardness: 1.2,
    color: [0.20, 0.85, 0.40],
    roughness: 0.3,
    metalness: 0.7,
    emissive: true,
    wallCost: 20,
  },
  [VoxelType.BED_BLOCK]: {
    id: VoxelType.BED_BLOCK,
    name: 'Sığınak Yatağı [Z veya E ile Uyu]',
    hardness: 0.5,
    color: [0.25, 0.42, 0.68],
    roughness: 0.8,
    metalness: 0.1,
    wallCost: 8,
  },
  [VoxelType.WORKBENCH_BLOCK]: {
    id: VoxelType.WORKBENCH_BLOCK,
    name: 'Üretim & Revir İstasyonu [E ile Aç]',
    hardness: 0.8,
    color: [0.68, 0.46, 0.22],
    roughness: 0.7,
    metalness: 0.3,
    wallCost: 15,
  },
  [VoxelType.GENERATOR_BLOCK]: {
    id: VoxelType.GENERATOR_BLOCK,
    name: 'Dizel Jeneratör [E ile Yakıt Ekle / Aç-Kapat]',
    hardness: 1.5,
    color: [0.82, 0.32, 0.14],
    roughness: 0.45,
    metalness: 0.75,
    wallCost: 30,
  },
};
