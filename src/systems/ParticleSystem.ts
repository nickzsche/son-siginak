import * as THREE from 'three';

interface ParticleBurst {
  points: THREE.Points;
  velocities: Float32Array;
  age: number;
  maxAge: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private bursts: ParticleBurst[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public spawnVoxelBurst(
    pos: THREE.Vector3,
    colorRGB: [number, number, number],
    count = 18,
    speed = 2.4,
    size = 0.08
  ): void {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x + (Math.random() - 0.5) * 0.12;
      positions[i * 3 + 1] = pos.y + (Math.random() - 0.5) * 0.12;
      positions[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.12;

      velocities[i * 3] = (Math.random() - 0.5) * speed;
      velocities[i * 3 + 1] = Math.random() * speed * 0.9 + 0.6;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * speed;

      const shade = 0.8 + Math.random() * 0.35;
      colors[i * 3] = Math.min(1, colorRGB[0] * shade);
      colors[i * 3 + 1] = Math.min(1, colorRGB[1] * shade);
      colors[i * 3 + 2] = Math.min(1, colorRGB[2] * shade);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size,
      vertexColors: true,
      transparent: true,
      opacity: 1,
    });

    const points = new THREE.Points(geom, mat);
    this.scene.add(points);
    this.bursts.push({
      points,
      velocities,
      age: 0,
      maxAge: 0.65,
    });
  }

  public update(dt: number): void {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.age += dt;
      if (b.age >= b.maxAge) {
        this.scene.remove(b.points);
        b.points.geometry.dispose();
        (b.points.material as THREE.Material).dispose();
        this.bursts.splice(i, 1);
        continue;
      }

      const posAttr = b.points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const count = arr.length / 3;
      for (let j = 0; j < count; j++) {
        b.velocities[j * 3 + 1] -= 6.5 * dt; // Gravity
        arr[j * 3] += b.velocities[j * 3] * dt;
        arr[j * 3 + 1] += b.velocities[j * 3 + 1] * dt;
        arr[j * 3 + 2] += b.velocities[j * 3 + 2] * dt;
      }
      posAttr.needsUpdate = true;
      (b.points.material as THREE.PointsMaterial).opacity = 1 - b.age / b.maxAge;
    }
  }
}
