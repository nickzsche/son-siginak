import * as THREE from 'three';

export type WeatherType = 'clear_dust' | 'dust_storm' | 'acid_rain';

export class EnvironmentSystem {
  public scene: THREE.Scene;
  public dayCount = 1;
  public timeOfDay = 8.5; // 0..24 hours (Starts at 08:30 AM)
  public timeScale = 0.22; // ~1 game hour every ~4.5 real seconds
  public weather: WeatherType = 'clear_dust';
  public weatherTimer = 45;

  public sunLight: THREE.DirectionalLight;
  public ambientLight: THREE.HemisphereLight;
  public shelterLights: THREE.PointLight[] = [];
  public fog: THREE.FogExp2;

  private weatherParticles: THREE.Points;
  private weatherPositions: Float32Array;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Pale, dusty yellowish daytime sky & fog
    this.fog = new THREE.FogExp2(0xc4b082, 0.032);
    this.scene.fog = this.fog;
    this.scene.background = new THREE.Color(0xc4b082);

    this.ambientLight = new THREE.HemisphereLight(0xd8c698, 0x3b3224, 0.65);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xffe8b0, 1.35);
    this.sunLight.position.set(18, 32, -14);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 90;
    const d = 24;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0008;
    this.scene.add(this.sunLight);

    // Warm Shelter Interior Lights (Contrast between warm shelter & dead cold outside)
    const shelterCoords: [number, number, number, number][] = [
      [0, -1.2, 0, 0xff9d42],
      [-1.5, -1.2, -1.5, 0xff9233],
      [1.5, -1.2, 1.5, 0xff9233],
      [0, -0.5, -3.8, 0xffa84c], // Stairwell warm light
      [0, -6.3, 0, 0x20f5c8],    // Deep Facility Project Aether cyan-emerald core glow
    ];

    for (const [x, y, z, hex] of shelterCoords) {
      const pl = new THREE.PointLight(hex, 2.2, 7.5, 1.6);
      pl.position.set(x, y, z);
      this.scene.add(pl);
      this.shelterLights.push(pl);
    }

    // Procedural Dust Storm & Acid Rain Particle Field
    const count = 900;
    this.weatherPositions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      this.weatherPositions[i * 3] = (Math.random() - 0.5) * 32;
      this.weatherPositions[i * 3 + 1] = Math.random() * 14;
      this.weatherPositions[i * 3 + 2] = (Math.random() - 0.5) * 32;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(this.weatherPositions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xd4b87a,
      size: 0.08,
      transparent: true,
      opacity: 0.35,
    });
    this.weatherParticles = new THREE.Points(geom, mat);
    this.scene.add(this.weatherParticles);
  }

  public isNight(): boolean {
    return this.timeOfDay >= 19.5 || this.timeOfDay < 5.5;
  }

  public isDuskWarning(): boolean {
    return this.timeOfDay >= 17.5 && this.timeOfDay < 19.5;
  }

  public setShadowQuality(quality: 'low' | 'medium' | 'high'): void {
    if (quality === 'low') {
      this.sunLight.castShadow = false;
    } else {
      this.sunLight.castShadow = true;
      const size = quality === 'high' ? 2048 : 1024;
      this.sunLight.shadow.mapSize.set(size, size);
      this.sunLight.shadow.map?.dispose();
      this.sunLight.shadow.map = null;
    }
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    generatorActive: boolean,
    hasNightOwl: boolean,
    onNewMorning?: (day: number) => void,
    onWeatherChange?: (w: WeatherType) => void
  ): void {
    const prevTime = this.timeOfDay;
    this.timeOfDay += dt * this.timeScale;
    if (this.timeOfDay >= 24) {
      this.timeOfDay -= 24;
    }
    // Trigger morning auto-save at 06:00
    if (prevTime < 6.0 && this.timeOfDay >= 6.0) {
      this.dayCount++;
      if (onNewMorning) onNewMorning(this.dayCount);
    }

    // Weather transitions
    this.weatherTimer -= dt;
    if (this.weatherTimer <= 0) {
      this.weatherTimer = 50 + Math.random() * 40;
      const r = Math.random();
      const next: WeatherType = r < 0.5 ? 'clear_dust' : r < 0.78 ? 'dust_storm' : 'acid_rain';
      if (next !== this.weather) {
        this.weather = next;
        if (onWeatherChange) onWeatherChange(this.weather);
      }
    }

    // Calculate Sun elevation angle
    const angle = ((this.timeOfDay - 6) / 24) * Math.PI * 2;
    const sunY = Math.sin(angle);
    const sunXZ = Math.cos(angle);

    this.sunLight.position.set(
      playerPos.x + sunXZ * 28,
      Math.max(2, sunY * 32),
      playerPos.z - 12
    );
    this.sunLight.target.position.copy(playerPos);
    this.sunLight.target.updateMatrixWorld();

    const isInsideBunker = playerPos.y < -0.65;

    // Sky, Ambient & Fog interpolation (Day dusty yellow vs Night pitch-black terrifying)
    const dayFactor = THREE.MathUtils.clamp((sunY + 0.15) / 0.55, 0, 1);

    const daySky = new THREE.Color(0xc7b285);
    const duskSky = new THREE.Color(0x6e3a26);
    const nightSky = new THREE.Color(0x020305); // Pitch black night!

    const skyColor = new THREE.Color();
    if (dayFactor > 0.5) {
      skyColor.lerpColors(duskSky, daySky, (dayFactor - 0.5) * 2);
    } else {
      skyColor.lerpColors(nightSky, duskSky, dayFactor * 2);
    }

    if (this.weather === 'acid_rain') {
      skyColor.lerp(new THREE.Color(0x3a5228), 0.5 * dayFactor + 0.15);
    } else if (this.weather === 'dust_storm') {
      skyColor.lerp(new THREE.Color(0x9e7142), 0.65 * dayFactor + 0.1);
    }

    (this.scene.background as THREE.Color).copy(skyColor);
    this.fog.color.copy(skyColor);

    // Fog density increases sharply in dust storm or pitch-black night
    let baseFog = 0.026;
    if (this.weather === 'dust_storm' && !isInsideBunker) baseFog = 0.11;
    else if (this.weather === 'acid_rain' && !isInsideBunker) baseFog = 0.055;
    else if (dayFactor < 0.1 && !isInsideBunker) baseFog = hasNightOwl ? 0.045 : 0.085;
    else if (isInsideBunker) baseFog = 0.022;

    this.fog.density = THREE.MathUtils.lerp(this.fog.density, baseFog, dt * 3);

    // Sun & Ambient intensities (Night is pitch-dark outside!)
    this.sunLight.intensity = dayFactor * (this.weather === 'dust_storm' ? 0.55 : 1.35);
    const minNightAmbient = hasNightOwl ? 0.14 : 0.025;
    this.ambientLight.intensity = isInsideBunker
      ? (generatorActive ? 0.28 : 0.06)
      : Math.max(minNightAmbient, dayFactor * 0.65);

    // Shelter warm point lights (Flicker slightly or turn off if generator runs out of fuel)
    const t = performance.now() * 0.005;
    for (let i = 0; i < this.shelterLights.length; i++) {
      const pl = this.shelterLights[i];
      if (i === this.shelterLights.length - 1) {
        // Deep facility core always pulses
        pl.intensity = 2.5 + Math.sin(t * 2) * 0.4;
      } else {
        pl.intensity = generatorActive ? 2.1 + Math.sin(t + i) * 0.08 : 0.08;
      }
    }

    // Update weather particles around player on surface
    this.weatherParticles.visible = !isInsideBunker;
    if (!isInsideBunker) {
      const pMat = this.weatherParticles.material as THREE.PointsMaterial;
      if (this.weather === 'acid_rain') {
        pMat.color.setHex(0x84cc16);
        pMat.opacity = 0.65;
        pMat.size = 0.07;
      } else if (this.weather === 'dust_storm') {
        pMat.color.setHex(0xd99b52);
        pMat.opacity = 0.75;
        pMat.size = 0.12;
      } else {
        pMat.color.setHex(0xd4b87a);
        pMat.opacity = 0.25;
        pMat.size = 0.06;
      }

      const posAttr = this.weatherParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const windX = this.weather === 'dust_storm' ? 8.5 : 1.2;
      const fallY = this.weather === 'acid_rain' ? -9.5 : -1.4;

      for (let i = 0; i < arr.length / 3; i++) {
        arr[i * 3] += windX * dt;
        arr[i * 3 + 1] += fallY * dt;
        if (arr[i * 3] - playerPos.x > 16) arr[i * 3] -= 32;
        if (arr[i * 3] - playerPos.x < -16) arr[i * 3] += 32;
        if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = 12;
        if (arr[i * 3 + 2] - playerPos.z > 16) arr[i * 3 + 2] -= 32;
        if (arr[i * 3 + 2] - playerPos.z < -16) arr[i * 3 + 2] += 32;
      }
      posAttr.needsUpdate = true;
    }
  }
}
