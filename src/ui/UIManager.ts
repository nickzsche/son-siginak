import { RPGSystem, ITEMS, RECIPES, PERKS, LORE_NOTES } from '../systems/RPGSystem';
import { BUILD_BLUEPRINTS } from '../systems/ShelterSystem';
import { EnvironmentSystem } from '../systems/EnvironmentSystem';
import { Player } from '../entities/Player';
import { VoxelWorld } from '../world/VoxelWorld';

export class UIManager {
  private rpg: RPGSystem;
  private env: EnvironmentSystem;
  private player: Player;
  private world: VoxelWorld;
  private alertTimeout: number | null = null;
  public isModalOpen = false;

  constructor(rpg: RPGSystem, env: EnvironmentSystem, player: Player, world: VoxelWorld) {
    this.rpg = rpg;
    this.env = env;
    this.player = player;
    this.world = world;

    this.initTabs();
    this.renderQuickbar();
    this.renderBuildHUD();
  }

  private initTabs(): void {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-tab');
        if (target) this.openModalTab(target);
      });
    });

    const closeBtn = document.getElementById('modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.toggleModal(false));
    }
  }

  public showAlert(msg: string, durationMs = 3600): void {
    const el = document.getElementById('alert-banner');
    if (!el) return;
    el.textContent = msg;
    el.style.opacity = '1';
    if (this.alertTimeout) window.clearTimeout(this.alertTimeout);
    this.alertTimeout = window.setTimeout(() => {
      el.style.opacity = '0';
    }, durationMs);
  }

  public toggleModal(forceState?: boolean, tabId?: string): void {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;

    this.isModalOpen = forceState !== undefined ? forceState : !this.isModalOpen;
    if (this.isModalOpen) {
      overlay.classList.remove('hidden');
      document.exitPointerLock?.();
      this.openModalTab(tabId || 'tab-inv');
    } else {
      overlay.classList.add('hidden');
    }
  }

  public openModalTab(tabId: string): void {
    document.querySelectorAll('.tab-btn').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
    });
    document.querySelectorAll('.tab-pane').forEach((p) => {
      p.classList.toggle('active', p.id === tabId);
    });
    this.renderModalContent();
  }

  public renderQuickbar(): void {
    const wrap = document.getElementById('quickbar');
    if (!wrap) return;
    wrap.innerHTML = '';

    this.rpg.quickbar.forEach((itemId, idx) => {
      const def = ITEMS[itemId];
      const qty = this.rpg.inventory.get(itemId) || 0;
      const slot = document.createElement('div');
      slot.className = `quick-slot ${idx === this.rpg.selectedQuickSlot ? 'active' : ''}`;
      slot.innerHTML = `
        <div class="slot-key">${idx + 1}</div>
        <div class="slot-name">${def ? def.name : '-'}</div>
        <div class="slot-qty">${qty > 0 ? 'x' + qty : ''}</div>
      `;
      slot.addEventListener('click', () => {
        this.rpg.selectedQuickSlot = idx;
        if (def && (def.category === 'consumable' || def.category === 'medical')) {
          const msg = this.rpg.useConsumableOrMed(itemId);
          if (msg) this.showAlert(msg);
        }
        this.renderQuickbar();
      });
      wrap.appendChild(slot);
    });
  }

  public renderBuildHUD(): void {
    const hud = document.getElementById('build-hud');
    const opts = document.getElementById('build-options');
    if (!hud || !opts) return;

    hud.classList.toggle('hidden', !this.player.buildMode);
    opts.innerHTML = '';

    BUILD_BLUEPRINTS.forEach((bp, idx) => {
      const have = this.rpg.inventory.get(bp.costItem) || 0;
      const card = document.createElement('div');
      card.className = `build-card ${idx === this.player.selectedBlueprintIdx ? 'selected' : ''}`;
      card.innerHTML = `
        <div><strong>${bp.name}</strong></div>
        <div style="color:#9ca3af">${bp.costQty}x ${bp.costItem} (Stok: ${have})</div>
      `;
      card.addEventListener('click', () => {
        this.player.selectedBlueprintIdx = idx;
        this.renderBuildHUD();
      });
      opts.appendChild(card);
    });
  }

  public renderModalContent(): void {
    this.renderInventoryTab();
    this.renderCraftingTab();
    this.renderSkillsTab();
    this.renderMedTab();
    this.renderLoreTab();
  }

  private renderInventoryTab(): void {
    const pane = document.getElementById('tab-inv');
    if (!pane) return;

    const curW = this.rpg.getCurrentWeight();
    const maxW = this.rpg.getMaxWeight();

    let html = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div><strong>Envanter Ağırlığı:</strong> <span style="color:${curW > maxW ? '#ef4444' : '#34d399'}">${curW} / ${maxW} kg</span></div>
        <div><strong>Aktif Ekipman:</strong> ${this.rpg.getEquippedItem().name}</div>
      </div>
      <div class="inv-grid">
    `;

    for (const [itemId, qty] of this.rpg.inventory.entries()) {
      if (qty <= 0) continue;
      const def = ITEMS[itemId];
      if (!def) continue;

      const canUse = def.category === 'consumable' || def.category === 'medical';
      const canEquip = def.category === 'tool' || def.category === 'weapon' || def.category === 'build';

      html += `
        <div class="item-card">
          <div>
            <div style="font-weight:700;color:#fde68a">${def.name} (x${qty})</div>
            <div style="font-size:10px;color:#9ca3af;margin:3px 0;">${def.description}</div>
            <div style="font-size:10px;color:#6ee7b7">Ağırlık: ${(def.weight * qty).toFixed(1)} kg</div>
          </div>
          <div style="display:flex;gap:4px;">
            ${canUse ? `<button data-use="${itemId}">Kullan</button>` : ''}
            ${canEquip ? `<button data-equip="${itemId}">Kuşan</button>` : ''}
          </div>
        </div>
      `;
    }

    html += `</div>`;
    pane.innerHTML = html;

    pane.querySelectorAll('[data-use]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-use')!;
        const msg = this.rpg.useConsumableOrMed(id);
        if (msg) this.showAlert(msg);
        this.renderModalContent();
        this.renderQuickbar();
      });
    });

    pane.querySelectorAll('[data-equip]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-equip')!;
        const existingIdx = this.rpg.quickbar.indexOf(id);
        if (existingIdx >= 0) {
          this.rpg.selectedQuickSlot = existingIdx;
        } else {
          this.rpg.quickbar[this.rpg.selectedQuickSlot] = id;
        }
        this.renderQuickbar();
        this.showAlert(`${ITEMS[id].name} kuşanıldı.`);
      });
    });
  }

  private renderCraftingTab(): void {
    const pane = document.getElementById('tab-craft');
    if (!pane) return;

    let html = `
      <div style="margin-bottom:10px;color:#d1d5db;">
        Atölye, Mutfak ve Su Arıtma Tarifleri (Ürettikçe <strong>Üretim & Mühendislik</strong> yeteneği gelişir):
      </div>
      <div class="recipe-grid">
    `;

    for (const rec of RECIPES) {
      const resDef = ITEMS[rec.resultItem];
      const ingParts: string[] = [];
      let canCraft = true;

      for (const [ingId, needQty] of Object.entries(rec.ingredients)) {
        const have = this.rpg.inventory.get(ingId) || 0;
        if (have < needQty) canCraft = false;
        const ingName = ITEMS[ingId]?.name || ingId;
        ingParts.push(`<span style="color:${have >= needQty ? '#6ee7b7' : '#fca5a5'}">${ingName}: ${have}/${needQty}</span>`);
      }

      const bpLocked = rec.requiresBlueprint && !this.rpg.unlockedBlueprints.has(rec.requiresBlueprint);
      if (bpLocked) canCraft = false;

      html += `
        <div class="recipe-card">
          <div style="font-weight:700;color:#fde68a;margin-bottom:4px;">${resDef.name} (x${rec.resultQty})</div>
          <div style="font-size:11px;color:#9ca3af;margin-bottom:6px;">${resDef.description}</div>
          <div style="font-size:11px;margin-bottom:8px;">Gereken: ${ingParts.join(' | ')}</div>
          ${bpLocked ? `<div style="color:#f87171;font-size:11px;margin-bottom:6px;">🔒 Şema Gerekli: ${rec.requiresBlueprint} (Askerî Üs / Terminallerden bulunur)</div>` : ''}
          <button data-craft="${rec.id}" ${!canCraft ? 'disabled style="opacity:0.4;cursor:not-allowed"' : ''}>🛠️ Üret</button>
        </div>
      `;
    }

    html += `</div>`;
    pane.innerHTML = html;

    pane.querySelectorAll('[data-craft]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const recId = btn.getAttribute('data-craft')!;
        const rec = RECIPES.find((r) => r.id === recId);
        if (!rec) return;

        for (const [ingId, needQty] of Object.entries(rec.ingredients)) {
          if ((this.rpg.inventory.get(ingId) || 0) < needQty) return;
        }
        for (const [ingId, needQty] of Object.entries(rec.ingredients)) {
          this.rpg.removeItem(ingId, needQty);
        }
        this.rpg.addItem(rec.resultItem, rec.resultQty);
        this.rpg.gainSkillXP('crafting', rec.skillGain, (s, l) =>
          this.showAlert(`⭐ Yetenek Yükseldi: ${s} Seviye ${l}! (+1 Perk Puanı)`)
        );
        this.showAlert(`🛠️ ${ITEMS[rec.resultItem].name} x${rec.resultQty} üretildi!`);
        this.renderModalContent();
        this.renderQuickbar();
      });
    });
  }

  private renderSkillsTab(): void {
    const pane = document.getElementById('tab-skills');
    if (!pane) return;

    let html = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div><strong>Kullandıkça Gelişen Yetenekler (Skyrim Sistemi)</strong></div>
        <div style="color:#f59e0b;font-weight:700;">⭐ Kullanılabilir Perk Puanı: ${this.rpg.perkPoints}</div>
      </div>
      <div class="recipe-grid" style="margin-bottom:16px;">
    `;

    for (const s of Object.values(this.rpg.skills)) {
      const needed = s.level * 100;
      const pct = Math.min(100, Math.round((s.xp / needed) * 100));
      html += `
        <div class="perk-card">
          <div style="display:flex;justify-content:space-between;font-weight:700;">
            <span>${s.name}</span>
            <span style="color:#fde68a">Sv. ${s.level}</span>
          </div>
          <div class="bar-bg" style="margin-top:6px;"><div class="bar-fill stamina" style="width:${pct}%"></div></div>
          <div style="font-size:10px;color:#9ca3af;margin-top:4px;">XP: ${Math.floor(s.xp)} / ${needed}</div>
        </div>
      `;
    }

    html += `</div><div class="panel-title">SEÇMELİ PERK AĞACI</div><div class="recipe-grid">`;

    for (const p of PERKS) {
      const unlocked = this.rpg.unlockedPerks.has(p.id);
      html += `
        <div class="perk-card" style="border-color:${unlocked ? '#10b981' : '#374151'}">
          <div style="font-weight:700;color:${unlocked ? '#34d399' : '#fde68a'}">${p.name} ${unlocked ? '✔ (Aktif)' : ''}</div>
          <div style="font-size:11px;color:#9ca3af;margin:6px 0;">${p.description}</div>
          ${
            !unlocked
              ? `<button data-perk="${p.id}" ${this.rpg.perkPoints <= 0 ? 'disabled style="opacity:0.4"' : ''}>Perk Seç (1 Puan)</button>`
              : ''
          }
        </div>
      `;
    }

    html += `</div>`;
    pane.innerHTML = html;

    pane.querySelectorAll('[data-perk]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pid = btn.getAttribute('data-perk')!;
        if (this.rpg.perkPoints > 0 && !this.rpg.unlockedPerks.has(pid)) {
          this.rpg.perkPoints--;
          this.rpg.unlockedPerks.add(pid);
          this.showAlert(`⭐ Yeni Perk Açıldı: ${PERKS.find((x) => x.id === pid)?.name}!`);
          this.renderModalContent();
        }
      });
    });
  }

  private renderMedTab(): void {
    const pane = document.getElementById('tab-med');
    if (!pane) return;

    pane.innerHTML = `
      <div style="margin-bottom:12px;">
        <strong>Revir & Vücut Bölgesi Yara Durumu:</strong> Kol yaralanmaları kazma ve saldırı hızını düşürür; bacak yaralanmaları ve kırıklar yürüme hızını yavaşlatır.
      </div>
      <div class="recipe-grid" style="margin-bottom:14px;">
        <div class="perk-card"><strong>Kafa Sağlığı:</strong> %${Math.round(this.rpg.limbs.head)}</div>
        <div class="perk-card"><strong>Gövde Sağlığı:</strong> %${Math.round(this.rpg.limbs.torso)}</div>
        <div class="perk-card"><strong>Kollar (Saldırı/Kazma):</strong> %${Math.round(this.rpg.limbs.arms)}</div>
        <div class="perk-card"><strong>Bacaklar (Hareket):</strong> %${Math.round(this.rpg.limbs.legs)}</div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button id="btn-med-bandage" style="padding:8px 14px;background:#059669;color:#fff;border:none;border-radius:6px;cursor:pointer;">
          🩹 Bandaj Uygula (Stok: ${this.rpg.inventory.get('bandage') || 0})
        </button>
        <button id="btn-med-splint" style="padding:8px 14px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;">
          🦴 Atel Uygula - Kırık Tedavisi (Stok: ${this.rpg.inventory.get('splint') || 0})
        </button>
        <button id="btn-med-kit" style="padding:8px 14px;background:#d97706;color:#fff;border:none;border-radius:6px;cursor:pointer;">
          🏥 Cerrahi İlk Yardım Çantası (Stok: ${this.rpg.inventory.get('medkit_advanced') || 0})
        </button>
      </div>
    `;

    document.getElementById('btn-med-bandage')?.addEventListener('click', () => {
      const m = this.rpg.useConsumableOrMed('bandage');
      if (m) this.showAlert(m);
      this.renderModalContent();
    });
    document.getElementById('btn-med-splint')?.addEventListener('click', () => {
      const m = this.rpg.useConsumableOrMed('splint');
      if (m) this.showAlert(m);
      this.renderModalContent();
    });
    document.getElementById('btn-med-kit')?.addEventListener('click', () => {
      const m = this.rpg.useConsumableOrMed('medkit_advanced');
      if (m) this.showAlert(m);
      this.renderModalContent();
    });
  }

  private renderLoreTab(): void {
    const pane = document.getElementById('tab-lore');
    if (!pane) return;

    let html = `<div style="margin-bottom:10px;">Yüzeydeki yapılarda ve yeraltı kazılarında bulunan ses kayıtları ve bilgisayar terminalleri:</div>`;
    for (const note of LORE_NOTES) {
      if (note.unlocked) {
        html += `
          <div class="lore-card">
            <div style="font-weight:700;color:#fde68a">${note.title} — <span style="color:#9ca3af">${note.location}</span></div>
            <div style="margin-top:6px;line-height:1.45;color:#e5e7eb">${note.content}</div>
          </div>
        `;
      } else {
        html += `
          <div class="lore-card" style="opacity:0.45;border-left-color:#4b5563">
            <div style="font-weight:700;">🔒 ${note.title} (${note.location})</div>
            <div style="margin-top:4px;">Bu veri kaydını açmak için ilgili bölgedeki terminali [E] ile inceleyin.</div>
          </div>
        `;
      }
    }
    pane.innerHTML = html;
  }

  public updateHUD(fps: number): void {
    const fpsEl = document.getElementById('fps-badge');
    if (fpsEl) fpsEl.textContent = `${Math.round(fps)} FPS`;

    const hours = Math.floor(this.env.timeOfDay);
    const mins = Math.floor((this.env.timeOfDay - hours) * 60);
    const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    const phase = this.env.isNight() ? '🌙 GECE (TEHLİKE!)' : this.env.isDuskWarning() ? '🌇 AKŞAMÜSTÜ (Sığınağa Dön!)' : '☀️ GÜNDÜZ';

    const clockEl = document.getElementById('clock-badge');
    if (clockEl) clockEl.textContent = `GÜN ${this.env.dayCount} | ${timeStr} (${phase})`;

    const weatherEl = document.getElementById('weather-badge');
    if (weatherEl) {
      const wName =
        this.env.weather === 'acid_rain'
          ? '☢️ Asit Yağmuru (Dışarısı Hasar Verir!)'
          : this.env.weather === 'dust_storm'
          ? '🌪️ Toz Fırtınası (Görüş Düşük)'
          : '🌫️ Soluk / Tozlu Gökyüzü';
      weatherEl.textContent = `Hava: ${wName}`;
    }

    const zoneEl = document.getElementById('zone-badge');
    if (zoneEl) {
      if (this.player.position.y <= -5.2) {
        zoneEl.textContent = 'Bölge: 🧬 PROJE AETHER DERİN TESİSİ';
      } else if (this.player.isInsideShelter()) {
        zoneEl.textContent = 'Bölge: 🏠 Sığınak İçi (Sıcak & Güvenli)';
      } else if (this.player.position.y < -0.5) {
        zoneEl.textContent = 'Bölge: ⛏️ Yeraltı Maden Tüneli';
      } else {
        zoneEl.textContent = 'Bölge: 💀 Yüzey Çorak Toprakları';
      }
    }

    const powerEl = document.getElementById('power-badge');
    if (powerEl) {
      powerEl.textContent = `⚡ Jeneratör: %${Math.round(this.rpg.generatorFuel)} (${
        this.rpg.generatorOn ? 'Aktif' : 'Kapalı'
      })`;
    }

    // Vitals bars
    const setBar = (id: string, val: number) => {
      const bar = document.getElementById(`bar-${id}`);
      const txt = document.getElementById(`val-${id}`);
      if (bar) bar.style.width = `${Math.max(0, Math.min(100, val))}%`;
      if (txt) txt.textContent = `${Math.round(val)}`;
    };
    setBar('health', this.rpg.health);
    setBar('hunger', this.rpg.hunger);
    setBar('thirst', this.rpg.thirst);
    setBar('stamina', this.rpg.stamina);
    setBar('rad', this.rpg.radiation);

    // Body limb status
    const setLimb = (id: string, label: string, val: number) => {
      const el = document.getElementById(id);
      if (!el) return;
      const v = Math.round(val);
      el.textContent = `${label}: %${v}`;
      el.className = `limb-box ${v < 35 ? 'critical' : v < 75 ? 'injured' : ''}`;
    };
    setLimb('limb-head', 'Kafa', this.rpg.limbs.head);
    setLimb('limb-torso', 'Gövde', this.rpg.limbs.torso);
    setLimb('limb-arms', 'Kollar', this.rpg.limbs.arms);
    setLimb('limb-legs', 'Bacaklar', this.rpg.limbs.legs);

    const affEl = document.getElementById('afflictions-list');
    if (affEl) {
      let tags = '';
      if (this.rpg.bleeding) tags += `<span class="affliction-tag">🩸 Kanama (Bandaj Kullan)</span>`;
      if (this.rpg.infection) tags += `<span class="affliction-tag">🦠 Enfeksiyon</span>`;
      if (this.rpg.fracture) tags += `<span class="affliction-tag">🦴 Kırık (Yavaşlatır)</span>`;
      affEl.innerHTML = tags;
    }

    // Low health vignette & color desaturation
    const vig = document.getElementById('vignette-overlay');
    const gameCont = document.getElementById('game-container');
    if (vig && gameCont) {
      if (this.rpg.health < 45) {
        const intensity = ((45 - this.rpg.health) / 45).toFixed(2);
        vig.style.boxShadow = `inset 0 0 130px rgba(220, 20, 20, ${intensity})`;
        gameCont.style.filter = `saturate(${0.35 + (this.rpg.health / 45) * 0.65})`;
      } else {
        vig.style.boxShadow = 'inset 0 0 85px rgba(0, 0, 0, 0.65)';
        gameCont.style.filter = 'none';
      }
    }

    // Coords & nearest POI compass
    const coordsEl = document.getElementById('coords-display');
    if (coordsEl) {
      coordsEl.textContent = `Konum: X:${this.player.position.x.toFixed(1)}m Y:${this.player.position.y.toFixed(1)}m Z:${this.player.position.z.toFixed(1)}m`;
    }

    const compassEl = document.getElementById('poi-compass');
    if (compassEl) {
      const sorted = [...this.world.pois]
        .map((p) => ({
          name: p.name,
          dist: Math.round(Math.hypot(p.x - this.player.position.x, p.z - this.player.position.z)),
        }))
        .sort((a, b) => a.dist - b.dist);
      compassEl.textContent = `Yakın POI: ${sorted[0].name} (${sorted[0].dist}m) | ${sorted[1].name} (${sorted[1].dist}m)`;
    }

    const loreCountEl = document.getElementById('lore-count');
    if (loreCountEl) {
      const unlockedCount = LORE_NOTES.filter((l) => l.unlocked).length;
      loreCountEl.textContent = `${unlockedCount} / ${LORE_NOTES.length}`;
    }
  }
}
