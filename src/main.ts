import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { VoxelWorld } from './world/VoxelWorld';
import { VoxelType, VOXEL_SIZE } from './world/VoxelTypes';
import { InputManager } from './core/InputManager';
import { RPGSystem, LORE_NOTES } from './systems/RPGSystem';
import { EnvironmentSystem } from './systems/EnvironmentSystem';
import { ParticleSystem } from './systems/ParticleSystem';
import { BUILD_BLUEPRINTS } from './systems/ShelterSystem';
import { Player } from './entities/Player';
import { EnemyManager } from './entities/EnemyManager';
import { SaveSystem } from './systems/SaveSystem';
import { UIManager } from './ui/UIManager';

class SonSiginakGame {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  private world: VoxelWorld;
  private input: InputManager;
  private rpg: RPGSystem;
  private env: EnvironmentSystem;
  private particles: ParticleSystem;
  private player: Player;
  private enemies: EnemyManager;
  private ui: UIManager;

  private quality: 'low' | 'medium' | 'high' = 'high';
  private lastTime = performance.now();
  private fpsSmooth = 60;
  private randomEventTimer = 65;

  constructor() {
    this.container = document.getElementById('game-container')!;

    this.renderer = new THREE.WebGLRenderer({ powerPreference: 'high-performance', antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.08, 110);

    // Post-Processing: RenderPass + UnrealBloomPass + OutputPass (ACES Filmic + Voxel AO)
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.32, // Bloom strength
      0.45, // Radius
      0.82  // Threshold
    );
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());

    // Initialize Core Systems
    this.world = new VoxelWorld(this.scene);
    this.world.generateWorld();

    this.input = new InputManager(this.renderer.domElement);
    this.rpg = new RPGSystem();
    this.env = new EnvironmentSystem(this.scene);
    this.particles = new ParticleSystem(this.scene);
    this.player = new Player(this.scene);
    this.enemies = new EnemyManager(this.scene);
    this.enemies.spawnInitialDayPatrols();

    // Load saved delta state if available
    const loaded = SaveSystem.load(this.world, this.rpg, this.env, this.player);

    this.ui = new UIManager(this.rpg, this.env, this.player, this.world);
    if (loaded) {
      this.ui.showAlert('💾 Kayıtlı sığınak ve dünya durumu yüklendi!');
    } else {
      this.ui.showAlert('🏠 SON SIĞINAK: Kuzey merdiveninden yüzeye çıkıp yağma yapın, gece olmadan sığınağı tahkim edin!');
    }

    this.bindActionsAndUI();
    window.addEventListener('resize', () => this.onResize());

    requestAnimationFrame((t) => this.loop(t));
  }

  private bindActionsAndUI(): void {
    this.input.onAction('toggleMenu', () => {
      this.ui.toggleModal();
    });

    this.input.onAction('toggleBuild', () => {
      this.player.buildMode = !this.player.buildMode;
      this.ui.renderBuildHUD();
      this.ui.showAlert(
        this.player.buildMode
          ? '🔨 İnşa Modu Aktif: Sol Tık Yerleştir | Sağ Tık Kaldır | Q/R Yapı Seç'
          : '⛏️ Kazma ve Savaş Moduna Dönüldü'
      );
    });

    this.input.onAction('cycleBuildPrev', () => {
      if (!this.player.buildMode) return;
      this.player.selectedBlueprintIdx =
        (this.player.selectedBlueprintIdx - 1 + BUILD_BLUEPRINTS.length) % BUILD_BLUEPRINTS.length;
      this.ui.renderBuildHUD();
    });

    this.input.onAction('cycleBuildNext', () => {
      if (!this.player.buildMode) return;
      this.player.selectedBlueprintIdx = (this.player.selectedBlueprintIdx + 1) % BUILD_BLUEPRINTS.length;
      this.ui.renderBuildHUD();
    });

    this.input.onAction('toggleFlashlight', () => {
      this.player.flashlightOn = !this.player.flashlightOn;
      this.ui.showAlert(this.player.flashlightOn ? '🔦 El Feneri Açıldı (Gece yaratıklarını çekebilir)' : '🔦 El Feneri Kapatıldı');
    });

    this.input.onAction('sleep', () => {
      this.trySleep();
    });

    this.input.onAction('interact', () => {
      this.handleInteraction();
    });

    for (let i = 1; i <= 8; i++) {
      this.input.onAction(`slot${i}`, () => {
        if (this.player.buildMode && i <= BUILD_BLUEPRINTS.length) {
          this.player.selectedBlueprintIdx = i - 1;
          this.ui.renderBuildHUD();
          return;
        }
        this.rpg.selectedQuickSlot = i - 1;
        const itemId = this.rpg.quickbar[i - 1];
        const def = this.rpg.getEquippedItem();
        if (def.category === 'consumable' || def.category === 'medical') {
          const msg = this.rpg.useConsumableOrMed(itemId);
          if (msg) this.ui.showAlert(msg);
        }
        this.ui.renderQuickbar();
      });
    }

    // Quality dropdown
    const qSelect = document.getElementById('quality-select') as HTMLSelectElement | null;
    if (qSelect) {
      qSelect.addEventListener('change', () => {
        this.setGraphicsQuality(qSelect.value as 'low' | 'medium' | 'high');
      });
    }

    // Save button
    document.getElementById('btn-save')?.addEventListener('click', () => {
      SaveSystem.save(this.world, this.rpg, this.env, this.player);
      this.ui.showAlert('💾 Oyun ve değişen chunk farkları kaydedildi!');
    });

    // Help button
    document.getElementById('btn-help')?.addEventListener('click', () => {
      this.ui.toggleModal(true, 'tab-lore');
    });
  }

  private trySleep(): void {
    if (!this.player.isInsideShelter() && this.player.position.y > -0.6) {
      this.ui.showAlert('⚠️ Sadece sığınaktaki yatakta uyuyabilirsiniz!');
      return;
    }
    this.env.timeOfDay = (this.env.timeOfDay + 6) % 24;
    if (this.env.timeOfDay < 6) {
      this.env.dayCount++;
      SaveSystem.save(this.world, this.rpg, this.env, this.player);
    }
    this.rpg.stamina = 100;
    this.rpg.health = Math.min(100, this.rpg.health + 30);
    this.ui.showAlert('💤 Sığınak yatağında 6 saat uyudunuz (+30 Sağlık, +100 Enerji, Otomatik Kaydedildi).');
  }

  private handleInteraction(): void {
    const aimDir = this.player.getAimDirection();
    const hit = this.world.raycast(this.camera.position, aimDir, 4.2);
    if (!hit) return;

    const v = hit.voxel;
    if (v === VoxelType.DOOR_CLOSED) {
      // Open door block and neighbors
      this.toggleDoorCluster(hit.vx, hit.vy, hit.vz, VoxelType.DOOR_OPEN);
      this.ui.showAlert('🚪 Zırhlı Kapı Açıldı.');
    } else if (v === VoxelType.DOOR_OPEN) {
      this.toggleDoorCluster(hit.vx, hit.vy, hit.vz, VoxelType.DOOR_CLOSED);
      this.ui.showAlert('🔒 Zırhlı Kapı Kilitlendi.');
    } else if (v === VoxelType.BED_BLOCK) {
      this.trySleep();
    } else if (v === VoxelType.WORKBENCH_BLOCK) {
      this.ui.toggleModal(true, 'tab-craft');
    } else if (v === VoxelType.GENERATOR_BLOCK) {
      if ((this.rpg.inventory.get('chemicals') || 0) > 0 && this.rpg.generatorFuel < 85) {
        this.rpg.removeItem('chemicals', 1);
        this.rpg.generatorFuel = Math.min(100, this.rpg.generatorFuel + 40);
        this.rpg.generatorOn = true;
        this.ui.showAlert('⛽ Jeneratöre yakıt eklendi (+%40 Yakıt, Jeneratör Aktif).');
      } else {
        this.rpg.generatorOn = !this.rpg.generatorOn;
        this.ui.showAlert(
          this.rpg.generatorOn
            ? '⚡ Jeneratör Çalıştırıldı: Sığınak ışıkları ve taretler aktif.'
            : '🔇 Jeneratör Kapatıldı: Gürültü kesildi, gece yaratıkları daha az çekilir.'
        );
      }
    } else if (v === VoxelType.BURIED_CHEST) {
      this.world.setVoxel(hit.vx, hit.vy, hit.vz, VoxelType.AIR, true, true);
      this.rpg.addItem('scrap_metal', 3);
      this.rpg.addItem('canned_food', 2);
      this.rpg.addItem('purified_water', 2);
      this.rpg.addItem('cloth', 2);
      this.rpg.addItem('chemicals', 2);
      this.rpg.addItem('electronics', 1);
      this.ui.showAlert('📦 Sandık Yağmalandı: +3 Hurda Metal, +2 Konserve, +2 Su, +2 Kimyasal, +Elektronik!');
      this.ui.renderQuickbar();
    } else if (v === VoxelType.TERMINAL_LORE || v === VoxelType.FACILITY_CORE) {
      // Unlock next locked lore note + blueprints!
      const nextLore = LORE_NOTES.find((l) => !l.unlocked);
      if (nextLore) {
        nextLore.unlocked = true;
        this.rpg.unlockedBlueprints.add('Matkap Şeması');
        this.rpg.unlockedBlueprints.add('Pompalı Tüfek Şeması');
        this.ui.showAlert(`📼 Yeni Veri Kaydı & Şema Açıldı: ${nextLore.title}`);
      } else {
        this.ui.showAlert('📼 Veri Terminali açılıyor...');
      }
      this.ui.toggleModal(true, 'tab-lore');
    }
  }

  private toggleDoorCluster(vx: number, vy: number, vz: number, targetType: VoxelType): void {
    for (let dz = -3; dz <= 3; dz++) {
      for (let dy = -6; dy <= 6; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const cur = this.world.getVoxel(vx + dx, vy + dy, vz + dz);
          if (cur === VoxelType.DOOR_CLOSED || cur === VoxelType.DOOR_OPEN) {
            this.world.setVoxel(vx + dx, vy + dy, vz + dz, targetType, true, true);
          }
        }
      }
    }
  }

  public setGraphicsQuality(q: 'low' | 'medium' | 'high'): void {
    this.quality = q;
    if (q === 'low') {
      this.renderer.setPixelRatio(1.0);
      this.bloomPass.enabled = false;
    } else if (q === 'medium') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.35));
      this.bloomPass.enabled = true;
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      this.bloomPass.enabled = true;
    }
    this.env.setShadowQuality(q);
    this.ui.showAlert(`🖥️ Grafik Kalitesi: ${q === 'high' ? 'Yüksek' : q === 'medium' ? 'Orta' : 'Düşük'}`);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  private triggerRandomSurfaceEvent(): void {
    const r = Math.random();
    if (r < 0.35) {
      // Supply drop crate near bunker entrance
      const dropX = Math.floor((Math.random() - 0.5) * 30);
      const dropZ = -65 - Math.floor(Math.random() * 20);
      this.world.setVoxel(dropX, 1, dropZ, VoxelType.BURIED_CHEST, true, true);
      this.world.setVoxel(dropX, 2, dropZ, VoxelType.LAMP_WARM, true, true);
      this.ui.showAlert('🪂 RASTGELE OLAY: Kuzey yüzeyine paraşütle Acil Erzak Paketi düştü!');
    } else if (r < 0.7) {
      // Friendly wandering survivor trade gift
      this.rpg.addItem('medkit_advanced', 1);
      this.rpg.addItem('purified_water', 2);
      this.ui.showAlert('🤝 RASTGELE OLAY: Dost bir gezgin sığınak telsizinden yardım bıraktı (+İlk Yardım Çantası, +2 Su)!');
    } else {
      // Abandoned survivor camp discovered
      this.rpg.unlockedBlueprints.add('Matkap Şeması');
      this.rpg.unlockedBlueprints.add('Pompalı Tüfek Şeması');
      this.rpg.addItem('scrap_metal', 4);
      this.ui.showAlert('⛺ RASTGELE OLAY: Terk edilmiş kamp bulundu (+4 Hurda Metal, Üretim Şemaları Açıldı)!');
    }
    this.ui.renderQuickbar();
  }

  private loop(now: number): void {
    requestAnimationFrame((t) => this.loop(t));

    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(0.05, Math.max(0.001, rawDt));

    const currentFps = 1 / Math.max(0.0001, rawDt);
    this.fpsSmooth = this.fpsSmooth * 0.92 + currentFps * 0.08;

    this.input.update();

    if (!this.ui.isModalOpen) {
      this.player.update(
        dt,
        this.input,
        this.world,
        this.camera,
        this.rpg,
        this.particles,
        (msg) => this.ui.showAlert(msg),
        (tabId) => this.ui.toggleModal(true, tabId),
        () => this.trySleep(),
        (origin, dir, range, dmg) =>
          this.enemies.handleRayAttack(origin, dir, range, dmg, this.particles, this.rpg, (m) => {
            this.ui.showAlert(m);
            this.ui.renderQuickbar();
          })
      );
    }

    this.env.update(
      dt,
      this.player.position,
      this.rpg.generatorOn,
      this.rpg.unlockedPerks.has('night_owl'),
      (newDay) => {
        SaveSystem.save(this.world, this.rpg, this.env, this.player);
        this.ui.showAlert(`🌅 GÜN ${newDay} SABAHI: Geceyi sağ atlattınız! Otomatik kayıt alındı.`);
      },
      (newWeather) => {
        if (newWeather === 'acid_rain') {
          this.ui.showAlert('☢️ ASİT YAĞMURU BAŞLADI! Yüzeyde durmak radyasyon ve hasar verir, sığınağa inin!');
        } else if (newWeather === 'dust_storm') {
          this.ui.showAlert('🌪️ TOZ FIRTINASI BAŞLADI! Görüş mesafesi düştü.');
        }
      }
    );

    this.rpg.update(dt, this.player.isInsideShelter(), this.env.weather === 'acid_rain');

    this.enemies.update(
      dt,
      this.player.position,
      this.env.isNight(),
      this.env.dayCount,
      this.player.flashlightOn,
      this.rpg.generatorOn,
      this.world,
      this.rpg,
      this.particles,
      (msg) => this.ui.showAlert(msg)
    );

    // Random surface events timer
    this.randomEventTimer -= dt;
    if (this.randomEventTimer <= 0) {
      this.randomEventTimer = 75 + Math.random() * 45;
      this.triggerRandomSurfaceEvent();
    }

    this.particles.update(dt);
    this.world.processDirtyChunks(false);
    this.ui.updateHUD(this.fpsSmooth);

    if (this.quality === 'low') {
      this.renderer.render(this.scene, this.camera);
    } else {
      this.composer.render();
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new SonSiginakGame();
});
