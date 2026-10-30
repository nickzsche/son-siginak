import { VoxelType } from '../world/VoxelTypes';

export interface ItemDef {
  id: string;
  name: string;
  category: 'tool' | 'weapon' | 'consumable' | 'material' | 'build' | 'medical';
  weight: number;
  description: string;
  miningSpeed?: number;
  damage?: number;
  range?: number;
  isRanged?: boolean;
  healAmount?: number;
  hungerRestore?: number;
  thirstRestore?: number;
  radReduce?: number;
  curesBleed?: boolean;
  curesInfection?: boolean;
  curesFracture?: boolean;
  placeVoxel?: VoxelType;
}

export const ITEMS: Record<string, ItemDef> = {
  shovel_rusty: {
    id: 'shovel_rusty',
    name: 'Paslı Kürek',
    category: 'tool',
    weight: 1.5,
    description: 'Toprak ve kil kazmak için temel alet (Kazma Hızı: 1.3x)',
    miningSpeed: 1.35,
    damage: 14,
    range: 2.8,
  },
  pickaxe_iron: {
    id: 'pickaxe_iron',
    name: 'Çelik Kazma',
    category: 'tool',
    weight: 2.2,
    description: 'Kaya ve maden damarlarını hızla kırar (Kazma Hızı: 2.4x)',
    miningSpeed: 2.4,
    damage: 22,
    range: 2.9,
  },
  drill_power: {
    id: 'drill_power',
    name: 'Endüstriyel Matkap',
    category: 'tool',
    weight: 3.2,
    description: 'En sert kayaları ve derin tesis duvarlarını saniyede deler (Kazma Hızı: 4.5x)',
    miningSpeed: 4.5,
    damage: 30,
    range: 3.1,
  },
  club_wood: {
    id: 'club_wood',
    name: 'Çivili Sopa',
    category: 'weapon',
    weight: 1.4,
    description: 'Yakın dövüş silahı (Hasar: 24)',
    miningSpeed: 0.8,
    damage: 24,
    range: 2.7,
  },
  spear_scrap: {
    id: 'spear_scrap',
    name: 'Hurda Mızrak',
    category: 'weapon',
    weight: 1.8,
    description: 'Uzun menzilli yakın dövüş mızrağı (Hasar: 34)',
    miningSpeed: 0.9,
    damage: 34,
    range: 3.5,
  },
  pistol_9mm: {
    id: 'pistol_9mm',
    name: 'Yarı Otomatik Tabanca',
    category: 'weapon',
    weight: 1.2,
    description: 'Ateşli silah - Yağmacılara ve gece yaratıklarına karşı etkili (Hasar: 42)',
    damage: 42,
    range: 24.0,
    isRanged: true,
  },
  shotgun_pump: {
    id: 'shotgun_pump',
    name: 'Pompalı Tüfek',
    category: 'weapon',
    weight: 2.8,
    description: 'Yüksek sarsıcı güç, yakın-orta mesafe yıkıcı hasar (Hasar: 78)',
    damage: 78,
    range: 16.0,
    isRanged: true,
  },
  canned_food: {
    id: 'canned_food',
    name: 'Konserve Yemek',
    category: 'consumable',
    weight: 0.5,
    description: '+38 Açlık, +8 Sağlık yeniler.',
    hungerRestore: 38,
    healAmount: 8,
  },
  cooked_stew: {
    id: 'cooked_stew',
    name: 'Sıcak Sığınak Güveci',
    category: 'consumable',
    weight: 0.6,
    description: 'Mutfakta pişirilen besleyici yemek (+60 Açlık, +15 Susuzluk, +20 Sağlık).',
    hungerRestore: 60,
    thirstRestore: 15,
    healAmount: 20,
  },
  purified_water: {
    id: 'purified_water',
    name: 'Arıtılmış Su Matarası',
    category: 'consumable',
    weight: 0.5,
    description: '+45 Susuzluk giderir, -8 Radyasyon temizler.',
    thirstRestore: 45,
    radReduce: 8,
  },
  bandage: {
    id: 'bandage',
    name: 'Steril Bandaj',
    category: 'medical',
    weight: 0.2,
    description: 'Kanamayı durdurur ve +25 Sağlık iyileştirir.',
    healAmount: 25,
    curesBleed: true,
  },
  medkit_advanced: {
    id: 'medkit_advanced',
    name: 'Cerrahi İlk Yardım Çantası',
    category: 'medical',
    weight: 0.8,
    description: 'Tüm bölge yaralarını, kırığı, enfeksiyonu ve kanamayı iyileştirir (+65 Sağlık, -30 Radyasyon).',
    healAmount: 65,
    radReduce: 30,
    curesBleed: true,
    curesInfection: true,
    curesFracture: true,
  },
  antibiotics: {
    id: 'antibiotics',
    name: 'Antibiyotik & Anti-Rad',
    category: 'medical',
    weight: 0.2,
    description: 'Enfeksiyonu temizler ve -35 Radyasyon düşürür.',
    radReduce: 35,
    curesInfection: true,
    healAmount: 12,
  },
  splint: {
    id: 'splint',
    name: 'Ortopedik Atel',
    category: 'medical',
    weight: 0.5,
    description: 'Kol ve bacak kırıklarını sabitler ve tedavi eder.',
    curesFracture: true,
    healAmount: 10,
  },
  topsoil: {
    id: 'topsoil',
    name: 'Toprak Bloğu',
    category: 'build',
    weight: 0.1,
    description: 'Zayıf dolgu bloğu (Yaratıklar kolayca kazar).',
    placeVoxel: VoxelType.TOPSOIL,
  },
  clay: {
    id: 'clay',
    name: 'Kil',
    category: 'material',
    weight: 0.15,
    description: 'Tuğla duvar üretiminde kullanılır.',
  },
  stone: {
    id: 'stone',
    name: 'Kaya Parçası',
    category: 'material',
    weight: 0.2,
    description: 'Beton ve tahkimat üretiminde kullanılır.',
  },
  scrap_metal: {
    id: 'scrap_metal',
    name: 'Hurda Metal',
    category: 'material',
    weight: 0.25,
    description: 'Silah, çelik duvar, taret ve alet üretimi için ana bileşen.',
  },
  wood: {
    id: 'wood',
    name: 'Kurumuş Odun',
    category: 'material',
    weight: 0.2,
    description: 'Alet sapı, kazık tuzağı ve yakıt desteğinde kullanılır.',
  },
  cloth: {
    id: 'cloth',
    name: 'Kumaş Parçası',
    category: 'material',
    weight: 0.1,
    description: 'Bandaj, yatak ve zırh yapımında kullanılır.',
  },
  chemicals: {
    id: 'chemicals',
    name: 'Kimyasal Bileşen',
    category: 'material',
    weight: 0.2,
    description: 'İlaç, yakıt, su arıtma ve mühimmat üretiminde kullanılır.',
  },
  electronics: {
    id: 'electronics',
    name: 'Elektronik Devre',
    category: 'material',
    weight: 0.2,
    description: 'Jeneratör, kablo, elektrikli tuzak, lamba ve taret yapımında kullanılır.',
  },
  brick_block: {
    id: 'brick_block',
    name: 'Tuğla Duvar Bloğu',
    category: 'build',
    weight: 0.2,
    description: 'Orta dayanımlı sığınak duvarı.',
    placeVoxel: VoxelType.BRICK_WALL,
  },
  concrete_block: {
    id: 'concrete_block',
    name: 'Beton Duvar Bloğu',
    category: 'build',
    weight: 0.25,
    description: 'Yüksek dayanımlı sığınak duvarı.',
    placeVoxel: VoxelType.CONCRETE_WALL,
  },
  steel_block: {
    id: 'steel_block',
    name: 'Çelik Duvar Bloğu',
    category: 'build',
    weight: 0.35,
    description: 'Maksimum dayanımlı zırhlı sığınak duvarı.',
    placeVoxel: VoxelType.STEEL_WALL,
  },
};

export interface CraftingRecipe {
  id: string;
  resultItem: string;
  resultQty: number;
  ingredients: Record<string, number>;
  skillGain: number;
  requiresBlueprint?: string;
}

export const RECIPES: CraftingRecipe[] = [
  {
    id: 'rec_pickaxe',
    resultItem: 'pickaxe_iron',
    resultQty: 1,
    ingredients: { scrap_metal: 3, wood: 2 },
    skillGain: 20,
  },
  {
    id: 'rec_drill',
    resultItem: 'drill_power',
    resultQty: 1,
    ingredients: { scrap_metal: 6, electronics: 3, chemicals: 2 },
    skillGain: 45,
    requiresBlueprint: 'Matkap Şeması',
  },
  {
    id: 'rec_spear',
    resultItem: 'spear_scrap',
    resultQty: 1,
    ingredients: { scrap_metal: 2, wood: 2 },
    skillGain: 18,
  },
  {
    id: 'rec_pistol',
    resultItem: 'pistol_9mm',
    resultQty: 1,
    ingredients: { scrap_metal: 5, chemicals: 2, electronics: 1 },
    skillGain: 35,
  },
  {
    id: 'rec_shotgun',
    resultItem: 'shotgun_pump',
    resultQty: 1,
    ingredients: { scrap_metal: 8, wood: 3, chemicals: 3 },
    skillGain: 50,
    requiresBlueprint: 'Pompalı Tüfek Şeması',
  },
  {
    id: 'rec_bandage',
    resultItem: 'bandage',
    resultQty: 2,
    ingredients: { cloth: 2, chemicals: 1 },
    skillGain: 15,
  },
  {
    id: 'rec_splint',
    resultItem: 'splint',
    resultQty: 1,
    ingredients: { wood: 2, cloth: 1 },
    skillGain: 15,
  },
  {
    id: 'rec_medkit',
    resultItem: 'medkit_advanced',
    resultQty: 1,
    ingredients: { cloth: 2, chemicals: 3 },
    skillGain: 30,
  },
  {
    id: 'rec_stew',
    resultItem: 'cooked_stew',
    resultQty: 1,
    ingredients: { canned_food: 1, purified_water: 1 },
    skillGain: 15,
  },
  {
    id: 'rec_water',
    resultItem: 'purified_water',
    resultQty: 2,
    ingredients: { chemicals: 1, clay: 2 },
    skillGain: 12,
  },
  {
    id: 'rec_brick',
    resultItem: 'brick_block',
    resultQty: 12,
    ingredients: { clay: 3, stone: 2 },
    skillGain: 14,
  },
  {
    id: 'rec_concrete',
    resultItem: 'concrete_block',
    resultQty: 12,
    ingredients: { stone: 4, clay: 2 },
    skillGain: 18,
  },
  {
    id: 'rec_steel',
    resultItem: 'steel_block',
    resultQty: 10,
    ingredients: { scrap_metal: 3, stone: 2 },
    skillGain: 25,
  },
];

export interface PerkDef {
  id: string;
  name: string;
  description: string;
}

export const PERKS: PerkDef[] = [
  {
    id: 'mole',
    name: 'Köstebek',
    description: 'Kazma hızı %35 artar, madenlerden ekstra cevher düşme şansı yükselir.',
  },
  {
    id: 'night_owl',
    name: 'Gece Kuşu',
    description: 'Karanlıkta görüş ve el feneri menzili %40 artar, gece hasarı +%15.',
  },
  {
    id: 'field_medic',
    name: 'Sahra Doktoru',
    description: 'Bandajlar ve ilk yardım çantaları %50 daha fazla iyileştirir ve tüm kanamayı anında durdurur.',
  },
  {
    id: 'pack_mule',
    name: 'Ağır Taşıyıcı',
    description: 'Maksimum envanter ağırlık kapasitesi +25 kg artar.',
  },
  {
    id: 'fortress_engineer',
    name: 'Sığınak Mühendisi',
    description: 'Jeneratör yakıt tüketimi %35 azalır, taret ve tuzak hasarı %35 artar.',
  },
];

export interface LoreNote {
  id: string;
  title: string;
  location: string;
  content: string;
  unlocked: boolean;
}

export const LORE_NOTES: LoreNote[] = [
  {
    id: 'lore_1',
    title: 'Kayıt #01: Sığınak Protokolü 7',
    location: 'Sığınak Ana Terminali',
    content: '14 Ekim 2029 - Gökyüzü sarı-kül rengine döndüğünde kapakları mühürledik. Yüzeydeki "Kızıl Spor" bulutu sadece bitkileri kurutmakla kalmadı, gece olduğunda biyolojik mutasyona uğramış sürüleri yüzeye çıkarıyor. Sığınağın doğu ve batı duvarları hâlâ toprak dolgulu; ilk işimiz tuğla ve çelik ile tahkim etmek olmalı.',
    unlocked: true,
  },
  {
    id: 'lore_2',
    title: 'Kayıt #02: Yağmacıların Günlüğü',
    location: 'Yıkık Kasaba Marketi',
    content: 'Gündüzleri güneşin ultraviyole radyasyonu o gece yaratıklarını toprağın altına kaçırıyor. Bu yüzden gündüz saatleri yağma için tek fırsatımız. Ancak kasabanın altından garip bir mekanik uğultu geliyor...',
    unlocked: false,
  },
  {
    id: 'lore_3',
    title: 'Kayıt #03: Başhekim Dr. Arda\'nın Ses Kaydı',
    location: 'Terk Edilmiş Hastane',
    content: 'Hastalarımızda gördüğümüz enfeksiyon sıradan bir virüs değil. Asit yağmurlarıyla taşınan sentetik nano-sporlar kemik dokusunu değiştiriyor. Yerin 6.5 metre altında "PROJE AETHER" adında gizli bir jeotermal laboratuvar olduğu söyleniyor.',
    unlocked: false,
  },
  {
    id: 'lore_4',
    title: 'Kayıt #04: Askerî İstihbarat Raporu',
    location: 'Eski Askerî Üs',
    content: 'GİZLİ: 7. Gece döngüsünde yeraltı kolonisinin tamamı yüzeye ve sığınaklara toplu saldırıya geçiyor. Elektrikli zemin tuzakları, kazık çukurları ve otomatik taretler olmadan hiçbir sığınak 7. geceyi sağ çıkaramaz. Pompalı tüfek ve endüstriyel matkap şemaları bu terminale eklendi.',
    unlocked: false,
  },
  {
    id: 'lore_5',
    title: 'Kayıt #05: Mühendis Kaan\'ın Tünel Notu',
    location: 'Yeraltı Eski Tünel Odası',
    content: 'Sığınağın tam altından aşağıya doğru kazarken eski bakır borulara ve çelik bir kubbeye rastladım. Kaya katmanları çok sert, çelik kazma veya endüstriyel matkap şart. Aşağıdan gelen mavi-yeşil parıltı Proje Aether çekirdeğine ait olmalı!',
    unlocked: false,
  },
  {
    id: 'lore_6',
    title: 'Kayıt #06: PROJE AETHER Ana Bilgisayar Kaydı',
    location: 'Derin Tesis (Y = -6.5m)',
    content: 'TEBRİKLER! Proje Aether Biyo-Reaktör Çekirdeğine ulaştınız. Atmosferi temizleyecek nötralizasyon dizisi aktif edildi. Artık sığınağınız kendi kendine yeten bir yeraltı kalesine dönüştü!',
    unlocked: false,
  },
];

export type SkillName = 'mining' | 'combat' | 'marksmanship' | 'crafting' | 'survival' | 'stealth' | 'medicine';

export class RPGSystem {
  // Vitals (0..100)
  public health = 100;
  public hunger = 100;
  public thirst = 100;
  public stamina = 100;
  public radiation = 5;

  // Body part health (0..100)
  public limbs = {
    head: 100,
    torso: 100,
    arms: 100,
    legs: 100,
  };

  // Status afflictions
  public bleeding = false;
  public infection = false;
  public fracture = false;

  // Skyrim-style skills (level + XP)
  public skills: Record<SkillName, { name: string; level: number; xp: number }> = {
    mining: { name: '⛏️ Kazma & Madencilik', level: 1, xp: 0 },
    combat: { name: '⚔️ Yakın Savaş', level: 1, xp: 0 },
    marksmanship: { name: '🎯 Nişancılık', level: 1, xp: 0 },
    crafting: { name: '🛠️ Üretim & Mühendislik', level: 1, xp: 0 },
    survival: { name: '🔥 Hayatta Kalma', level: 1, xp: 0 },
    stealth: { name: '👣 Gizlilik', level: 1, xp: 0 },
    medicine: { name: '🏥 Tıp & Cerrahi', level: 1, xp: 0 },
  };

  public perkPoints = 1; // Start with 1 selectable perk point so player can test perks immediately!
  public unlockedPerks = new Set<string>();
  public unlockedBlueprints = new Set<string>();

  // Grid/Weight Inventory
  public inventory = new Map<string, number>();
  public baseMaxWeight = 45.0;
  public quickbar: string[] = [
    'shovel_rusty',
    'pickaxe_iron',
    'club_wood',
    'pistol_9mm',
    'canned_food',
    'purified_water',
    'bandage',
    'brick_block',
  ];
  public selectedQuickSlot = 0;

  // Shelter Electricity & Rooms
  public generatorFuel = 85; // 0..100
  public generatorOn = true;
  public reachedDeepFacility = false;

  constructor() {
    // Starting gear & survival supplies
    this.addItem('shovel_rusty', 1);
    this.addItem('pickaxe_iron', 1);
    this.addItem('club_wood', 1);
    this.addItem('pistol_9mm', 1);
    this.addItem('canned_food', 3);
    this.addItem('purified_water', 3);
    this.addItem('bandage', 3);
    this.addItem('scrap_metal', 8);
    this.addItem('wood', 8);
    this.addItem('clay', 10);
    this.addItem('stone', 10);
    this.addItem('cloth', 4);
    this.addItem('chemicals', 4);
    this.addItem('electronics', 3);
    this.addItem('brick_block', 25);
    this.addItem('concrete_block', 15);
  }

  public getMaxWeight(): number {
    return this.baseMaxWeight + (this.unlockedPerks.has('pack_mule') ? 25 : 0) + (this.skills.survival.level - 1) * 2;
  }

  public getCurrentWeight(): number {
    let total = 0;
    for (const [id, qty] of this.inventory.entries()) {
      const def = ITEMS[id];
      if (def) total += def.weight * qty;
    }
    return Math.round(total * 10) / 10;
  }

  public addItem(id: string, qty = 1): boolean {
    if (!ITEMS[id]) return false;
    const cur = this.inventory.get(id) || 0;
    this.inventory.set(id, cur + qty);
    return true;
  }

  public removeItem(id: string, qty = 1): boolean {
    const cur = this.inventory.get(id) || 0;
    if (cur < qty) return false;
    if (cur === qty) this.inventory.delete(id);
    else this.inventory.set(id, cur - qty);
    return true;
  }

  public getEquippedItem(): ItemDef {
    const id = this.quickbar[this.selectedQuickSlot];
    return ITEMS[id] || ITEMS.shovel_rusty;
  }

  public gainSkillXP(skill: SkillName, amount: number, onLevelUp?: (skillName: string, newLvl: number) => void): void {
    const s = this.skills[skill];
    s.xp += amount;
    const needed = s.level * 100;
    if (s.xp >= needed) {
      s.xp -= needed;
      s.level++;
      this.perkPoints++;
      if (onLevelUp) onLevelUp(s.name, s.level);
    }
  }

  public getMiningSpeedMultiplier(): number {
    const item = this.getEquippedItem();
    const base = item.miningSpeed || 1.0;
    const skillMult = 1 + (this.skills.mining.level - 1) * 0.12;
    const perkMult = this.unlockedPerks.has('mole') ? 1.35 : 1.0;
    const armPenalty = this.limbs.arms < 50 ? 0.65 : 1.0;
    return base * skillMult * perkMult * armPenalty;
  }

  public getMoveSpeedMultiplier(): number {
    let mult = 1.0;
    if (this.limbs.legs < 50 || this.fracture) mult *= 0.65;
    if (this.getCurrentWeight() > this.getMaxWeight()) mult *= 0.55;
    return mult;
  }

  public applyDamage(amount: number, sourceName?: string): void {
    const actual = Math.max(1, amount * (1 - this. radiation * 0.002));
    this.health = Math.max(0, this.health - actual);

    // Random body limb damage
    const r = Math.random();
    if (r < 0.2) {
      this.limbs.head = Math.max(0, this.limbs.head - actual * 0.9);
    } else if (r < 0.5) {
      this.limbs.torso = Math.max(0, this.limbs.torso - actual * 0.8);
      if (Math.random() < 0.35) this.bleeding = true;
    } else if (r < 0.75) {
      this.limbs.arms = Math.max(0, this.limbs.arms - actual * 1.1);
      if (Math.random() < 0.25) this.infection = true;
    } else {
      this.limbs.legs = Math.max(0, this.limbs.legs - actual * 1.1);
      if (this.limbs.legs < 45 && Math.random() < 0.35) this.fracture = true;
    }
    void sourceName;
  }

  public useConsumableOrMed(itemId: string): string | null {
    const def = ITEMS[itemId];
    if (!def) return null;
    if ((this.inventory.get(itemId) || 0) <= 0) return 'Envanterde bu eşya yok!';

    if (
      def.category !== 'consumable' &&
      def.category !== 'medical'
    ) {
      return null;
    }

    const medicMult = this.unlockedPerks.has('field_medic') ? 1.5 : 1.0;
    if (def.healAmount) {
      this.health = Math.min(100, this.health + def.healAmount * medicMult);
      this.limbs.head = Math.min(100, this.limbs.head + def.healAmount * 0.8 * medicMult);
      this.limbs.torso = Math.min(100, this.limbs.torso + def.healAmount * 0.8 * medicMult);
      this.limbs.arms = Math.min(100, this.limbs.arms + def.healAmount * 0.8 * medicMult);
      this.limbs.legs = Math.min(100, this.limbs.legs + def.healAmount * 0.8 * medicMult);
    }
    if (def.hungerRestore) {
      this.hunger = Math.min(100, this.hunger + def.hungerRestore);
    }
    if (def.thirstRestore) {
      this.thirst = Math.min(100, this.thirst + def.thirstRestore);
    }
    if (def.radReduce) {
      this.radiation = Math.max(0, this.radiation - def.radReduce);
    }
    if (def.curesBleed) this.bleeding = false;
    if (def.curesInfection) this.infection = false;
    if (def.curesFracture) this.fracture = false;

    this.removeItem(itemId, 1);
    if (def.category === 'medical') {
      this.gainSkillXP('medicine', 25);
    } else {
      this.gainSkillXP('survival', 10);
    }
    return `${def.name} kullanıldı.`;
  }

  public update(dt: number, isInsideShelter: boolean, isAcidRain: boolean): void {
    // Passive hunger & thirst drain
    this.hunger = Math.max(0, this.hunger - dt * 0.22);
    this.thirst = Math.max(0, this.thirst - dt * 0.30);

    // Generator fuel consumption
    if (this.generatorOn && this.generatorFuel > 0) {
      const engMult = this.unlockedPerks.has('fortress_engineer') ? 0.65 : 1.0;
      this.generatorFuel = Math.max(0, this.generatorFuel - dt * 0.08 * engMult);
      if (this.generatorFuel <= 0) {
        this.generatorOn = false;
      }
    }

    // Acid rain & surface radiation
    if (!isInsideShelter) {
      if (isAcidRain) {
        this.radiation = Math.min(100, this.radiation + dt * 0.9);
        this.health = Math.max(0, this.health - dt * 1.1);
      } else {
        this.radiation = Math.min(100, this.radiation + dt * 0.08);
      }
    } else if (this.generatorOn) {
      // Shelter air filtration slowly reduces low radiation & warms player
      this.radiation = Math.max(0, this.radiation - dt * 0.05);
    }

    // Afflictions drain
    if (this.bleeding) {
      this.health = Math.max(0, this.health - dt * 1.2);
    }
    if (this.infection) {
      this.health = Math.max(0, this.health - dt * 0.6);
      this.stamina = Math.max(0, this.stamina - dt * 0.8);
    }
    if (this.hunger <= 0 || this.thirst <= 0) {
      this.health = Math.max(0, this.health - dt * 0.9);
    }

    // Respawn / Emergency revival in shelter bed if health hits 0
    if (this.health <= 0) {
      this.health = 65;
      this.hunger = Math.max(40, this.hunger);
      this.thirst = Math.max(40, this.thirst);
      this.bleeding = false;
      this.fracture = false;
      this.limbs = { head: 80, torso: 80, arms: 80, legs: 80 };
    }
  }
}
