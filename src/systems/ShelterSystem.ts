import { VoxelType } from '../world/VoxelTypes';

export interface BuildBlueprint {
  id: string;
  name: string;
  category: 'wall' | 'room' | 'defense' | 'power';
  voxelType: VoxelType;
  costItem: string;
  costQty: number;
  size: [number, number, number]; // Voxel stamp size [w, h, d]
  powerDraw?: number;
  description: string;
}

export const BUILD_BLUEPRINTS: BuildBlueprint[] = [
  {
    id: 'wall_topsoil',
    name: '1. Toprak Dolgu (Zayıf)',
    category: 'wall',
    voxelType: VoxelType.TOPSOIL,
    costItem: 'topsoil',
    costQty: 1,
    size: [2, 2, 2],
    description: 'Geçici zayıf duvar. Gece yaratıkları hızla kazabilir.',
  },
  {
    id: 'wall_brick',
    name: '2. Tuğla Duvar (Orta)',
    category: 'wall',
    voxelType: VoxelType.BRICK_WALL,
    costItem: 'brick_block',
    costQty: 1,
    size: [2, 3, 2],
    description: 'Orta dayanımlı tuğla duvar.',
  },
  {
    id: 'wall_concrete',
    name: '3. Beton Duvar (Yüksek)',
    category: 'wall',
    voxelType: VoxelType.CONCRETE_WALL,
    costItem: 'concrete_block',
    costQty: 1,
    size: [2, 3, 2],
    description: 'Yüksek dayanımlı betonarme sığınak duvarı.',
  },
  {
    id: 'wall_steel',
    name: '4. Çelik Zırhlı Duvar (Maks)',
    category: 'wall',
    voxelType: VoxelType.STEEL_WALL,
    costItem: 'steel_block',
    costQty: 1,
    size: [2, 3, 2],
    description: 'En üst seviye çelik duvar. Kazıcı yaratıklara karşı maksimum direnç.',
  },
  {
    id: 'door_armored',
    name: '5. Zırhlı Sığınak Kapısı',
    category: 'room',
    voxelType: VoxelType.DOOR_CLOSED,
    costItem: 'scrap_metal',
    costQty: 2,
    size: [4, 9, 1],
    description: '[E] ile açılıp kapanabilen zırhlı sığınak kapısı.',
  },
  {
    id: 'room_lamp',
    name: '6. Sıcak Sığınak Lambası (⚡2W)',
    category: 'power',
    voxelType: VoxelType.LAMP_WARM,
    costItem: 'electronics',
    costQty: 1,
    size: [1, 1, 1],
    powerDraw: 2,
    description: 'Sığınağı sıcak kehribar ışıkla aydınlatır.',
  },
  {
    id: 'power_cable',
    name: '7. Elektrik Kablo Hattı',
    category: 'power',
    voxelType: VoxelType.CABLE_LINE,
    costItem: 'electronics',
    costQty: 1,
    size: [2, 1, 2],
    description: 'Jeneratörden odalara, lambalara ve taretlere elektrik taşır.',
  },
  {
    id: 'trap_spike',
    name: '8. Kazık Çukuru Tuzağı',
    category: 'defense',
    voxelType: VoxelType.TRAP_SPIKE,
    costItem: 'wood',
    costQty: 2,
    size: [3, 1, 3],
    description: 'Üzerinden geçen düşmanlara fiziksel delici hasar verir ve yavaşlatır.',
  },
  {
    id: 'trap_shock',
    name: '9. Elektrikli Zemin & Taret (⚡5W)',
    category: 'defense',
    voxelType: VoxelType.TURRET_BLOCK,
    costItem: 'scrap_metal',
    costQty: 3,
    size: [2, 3, 2],
    powerDraw: 5,
    description: 'Jeneratör aktifken yaklaşan gece yaratıklarına otomatik ateş açar.',
  },
];
