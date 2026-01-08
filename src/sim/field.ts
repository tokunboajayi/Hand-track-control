// Vector Field Logic
import * as THREE from 'three';

export const FieldType = {
  VORTEX: 0,
  SOURCE: 1,
  SINK: 2,
  NOISE: 3
} as const;

export type FieldType = typeof FieldType[keyof typeof FieldType];

export interface FieldSource {
  position: THREE.Vector3;
  strength: number;
  radius: number;
  type: FieldType;
}

export class VectorField {
  public sources: FieldSource[] = [];

  constructor() {
    this.addSource(new THREE.Vector3(0, 0, 0), 1.0, 2.0, FieldType.VORTEX);
  }

  public addSource(pos: THREE.Vector3, strength: number, radius: number, type: FieldType) {
    this.sources.push({ position: pos.clone(), strength, radius, type });
  }

  public clearSources() {
    this.sources = [];
  }

  public sample(pos: THREE.Vector3, target: THREE.Vector3) {
    target.set(0, 0, 0);

    for (const source of this.sources) {
      const dx = pos.x - source.position.x;
      const dy = pos.y - source.position.y;
      const dz = pos.z - source.position.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      // OPTIMIZATION: Early exit using distSq (skip sqrt if outside radius)
      const radiusSq = source.radius * source.radius;
      if (distSq > radiusSq || distSq < 0.000001) continue;

      // Only compute sqrt when needed
      const dist = Math.sqrt(distSq);
      const falloff = 1.0 - (dist / source.radius);
      const power = source.strength * falloff;

      if (source.type === FieldType.VORTEX) {
        target.x += -dy * power;
        target.y += dx * power;
        // target.z += 0; // No-op removed
      } else if (source.type === FieldType.SOURCE) {
        const invDist = 1 / dist;
        target.x += dx * invDist * power;
        target.y += dy * invDist * power;
        target.z += dz * invDist * power;
      } else if (source.type === FieldType.SINK) {
        const invDist = 1 / dist;
        target.x -= dx * invDist * power;
        target.y -= dy * invDist * power;
        target.z -= dz * invDist * power;
      }
    }
  }
}

