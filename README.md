# SON SIĞINAK (Three.js + Vite + TypeScript Voxel Hayatta Kalma RPG)

**Son Sığınak**, kıyamet sonrası bir dünyada yeraltı sığınağınızı kazarak genişlettiğiniz, gündüzleri yüzeye çıkıp yıkık yapıları yağmaladığınız ve geceleri sığınağınıza saldıran mutasyonlu yaratık sürülerine karşı hayatta kalmaya çalıştığınız, tamamen **prosedürel mikro-voxel** (`1 voxel = 0.1 birim`) grafikli bir 3B Hayatta Kalma RPG oyunudur. Harici hiçbir asset (3B model, doku veya ses dosyası) kullanılmaz; tüm arazi, yapılar, karakterler, ışıklandırma ve dokular kod ile prosedürel olarak üretilir.

## Hızlı Başlangıç

```bash
cd son-siginak
npm install
npm run dev
```

Üretim derlemesi için:
```bash
npm run build
```

---

## Kontroller

| Tuş / Giriş | İşlev |
| :--- | :--- |
| **W, A, S, D** | Karakter hareketi |
| **Fare** | Omuz üstü (Third-Person) kamera bakışı (Pointer Lock) |
| **Shift** | Koşma (Enerji harcar) |
| **Ctrl / C** | Çömelme (Gizlilik yeteneğini geliştirir) |
| **Space** | Zıplama |
| **Sol Tık** | Voxel Kazma / Yakın veya Ateşli Silahla Saldırı / İnşa Modunda Blok Yerleştirme |
| **Sağ Tık** | Hassas Nişan (Zoom) / İnşa Modunda Blok Kaldırma |
| **E** | Etkileşim (Kapı aç/kapat, Sandık yağmala, Atölye/Revir aç, Jeneratör yakıt/aç-kapat, Veri terminali oku) |
| **B** | İnşa, Oda, Tuzak ve Elektrik Modunu Aç / Kapat |
| **Q / R** (veya **1-9**) | İnşa modunda yapı/duvar/tuzak şablonu değiştirme; normal modda hızlı ekipman slotu seçimi |
| **Tab** | Envanter, Atölye Üretimi, Yetenekler & Perk Ağacı, Revir & Yara Tedavisi ve Hikâye Kayıtları menüsü |
| **F** | El Feneri Aç / Kapat (Gece görüş sağlar ancak yaratıkların dikkatini çeker) |
| **Z** | Sığınaktaki yatakta uyuma (Zamanı 6 saat ileri sarar, enerji/sağlık yeniler ve kaydeder) |

---

## Mimari ve Teknik Özellikler

### 1. Mikro-Voxel Motoru & Web Worker Greedy Meshing (`src/world/`)
- [`VoxelTypes.ts`](src/world/VoxelTypes.ts): `VOXEL_SIZE = 0.1` birim ölçeğinde katmanlı toprak (`TOPSOIL`, `CLAY`, `ROCK`, `BEDROCK`), maden damarları (`ORE_IRON`, `ORE_COPPER`), eski paslı borular, gömülü sandıklar, yapı duvarları (`TOPSOIL` < `BRICK_WALL` < `CONCRETE_WALL` < `STEEL_WALL`), kapılar, tuzaklar, elektrik hatları ve **Proje Aether** derin tesis bloklarını tanımlar.
- [`GreedyMesher.ts`](src/world/GreedyMesher.ts) & [`chunkWorker.ts`](src/world/chunkWorker.ts): `32x32x32` boyutundaki chunk'lar 6 yönde **Greedy Meshing** algoritmasıyla birleştirilir. Köşe bazlı **Voxel Ambient Occlusion (AO)** ve malzeme başına prosedürel renk/pürüzlülük varyasyonu hesaplanır. Arka plan chunk'ları **Web Worker** havuzunda, oyuncunun o an kazdığı chunk ise anlık (<2 ms) senkron olarak yeniden mesh'lenir.
- [`VoxelWorld.ts`](src/world/VoxelWorld.ts): Katmanlı yeraltı arazisini, başlangıç sığınağını, kuzey çıkış merdivenini, yeraltı gizli odalarını, `Y = -6.5m` derinlikteki **Proje Aether** laboratuvarını ve yüzeydeki 5 farklı POI bölgesini (Yıkık Kasaba, Benzin İstasyonu, Terk Edilmiş Hastane, Eski Askerî Üs, Çiftlik Evleri, paslı araba enkazları ve kurumuş ağaçlar) üretir.

### 2. Atmosfer, Gün-Gece Döngüsü ve Hava Olayları (`src/systems/EnvironmentSystem.ts`)
- **Gün-Gece Kontrastı**: Gündüzleri soluk, tozlu, sarımsı bir gökyüzü ve sis hakimdir. Gece olduğunda yüzey neredeyse zifiri karanlığa gömülür; tek ışık kaynakları oyuncunun el feneri, kişisel feneri ve sığınak içindeki sıcak kehribar lambalardır.
- **Hava Olayları**: Dinamik **Toz Fırtınası** (görüş mesafesini düşürür) ve **Asit Yağmuru** (yüzeyde radyasyon ve sağlık hasarı verir) geçişleri bulunur.
- **Post-Processing**: `EffectComposer`, `UnrealBloomPass` ve `ACESFilmicToneMapping` ile sıcak sığınak lambaları ve derin tesis biyo-reaktörü parlar; sağlık düştüğünde ekran kenarlarında kırmızı vignette ve doygunluk kaybı oluşur.
- **Düşük / Orta / Yüksek Grafik Ayarı**: Üst HUD çubuğundan anlık olarak değiştirilebilir.

### 3. RPG, Yara Sistemi, Yetenekler ve Üretim (`src/systems/RPGSystem.ts`)
- **Hayati Değerler**: Sağlık, Açlık, Susuzluk, Enerji ve Radyasyon.
- **Bölgesel Yara Sistemi**: Kafa, Gövde, Kollar ve Bacaklar ayrı sağlık değerlerine sahiptir. Kol yaralanması kazma ve saldırı hızını düşürür; bacak yaralanması ve **Kırık** yürüme hızını yavaşlatır. **Kanama** ve **Enfeksiyon** durumları bandaj, atel, antibiyotik veya cerrahi ilk yardım çantası ile Revir sekmesinden tedavi edilir.
- **Skyrim Mantığı Yetenekler & Seçmeli Perk'ler**: Kazma, Yakın Savaş, Nişancılık, Üretim, Hayatta Kalma, Gizlilik ve Tıp yetenekleri kullanıldıkça XP kazanır ve seviye atladıkça **Perk Puanı** verir (*Köstebek*, *Gece Kuşu*, *Sahra Doktoru*, *Ağır Taşıyıcı*, *Sığınak Mühendisi*).

### 4. Gece Saldırıları, Duvar Maliyetli Pathfinding ve Savunma (`src/entities/EnemyManager.ts`)
- **Gündüz Düşmanları**: Silahlı yağmacılar ve vahşi köpekler yüzeydeki POI yapılarını korur.
- **Gece Yaratıkları**: Koşucu, Kazıcı (zayıf toprak/tuğla duvarları delerek sığınağa girer), Zırhlı ve Çığlıkçı (takviye sürü çağırır). Her gece dalga büyür ve **7. Gece** büyük sürü saldırısı gerçekleşir.
- **Işık, Ses ve Savunma**: El feneri ve çalışan jeneratör gürültüsü yaratıkların algılama menzilini artırır. Kazık çukuru, alarm teli, elektrikli zemin ve otomatik taretler sığınağı korur.

### 5. Versiyonlu Delta Kayıt Sistemi (`src/systems/SaveSystem.ts`)
- Her sabah saat `06:00`'da, yatakta uyunduğunda veya üst bardaki **Kaydet** butonuna basıldığında oyuncu durumu ve sadece **değişen voxel/chunk farkları (delta)** versiyonlu olarak `localStorage` üzerine kaydedilir.
