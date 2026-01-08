import * as THREE from 'three';
import { VectorField } from './field';
import { RNG } from '../utils/rng';

export class CPUParticles {
    public particlesPos!: Float32Array;
    public particlesVel!: Float32Array;
    public count: number;
    private field: VectorField;
    private rng: RNG;

    // Simulation params
    private readonly DAMPING = 0.98;
    private readonly BOUNDS = 10.0;

    // OPTIMIZATION: Cached scratch vectors (zero allocations in update loop)
    private _tempK = new THREE.Vector3();
    private _tempPos = new THREE.Vector3();

    constructor(count: number, field: VectorField) {
        this.count = count;
        this.field = field;
        this.rng = new RNG(12345); // Deterministic Seed
        this.allocateBuffers();
        this.initParticles();
    }

    private allocateBuffers() {
        this.particlesPos = new Float32Array(this.count * 3);
        this.particlesVel = new Float32Array(this.count * 3);
    }

    private initParticles() {
        for (let i = 0; i < this.count; i++) {
            this.resetParticle(i);
        }
    }

    private resetParticle(i: number) {
        const i3 = i * 3;
        // Random spread
        this.particlesPos[i3] = this.rng.nextRange(-10, 10);
        this.particlesPos[i3 + 1] = this.rng.nextRange(-7.5, 7.5);
        this.particlesPos[i3 + 2] = this.rng.nextRange(-2.5, 2.5);

        this.particlesVel[i3] = 0;
        this.particlesVel[i3 + 1] = 0;
        this.particlesVel[i3 + 2] = 0;
    }

    public update(dt: number = 0.016) {
        // OPTIMIZATION: Use cached vectors (no allocations)
        const tempK = this._tempK;
        const tempPos = this._tempPos;

        for (let i = 0; i < this.count; i++) {
            const i3 = i * 3;

            // Read Pos
            tempPos.set(
                this.particlesPos[i3],
                this.particlesPos[i3 + 1],
                this.particlesPos[i3 + 2]
            );

            // Sample Field -> Force/Accel
            this.field.sample(tempPos, tempK); // tempK is now acceleration

            // Update Vel
            this.particlesVel[i3] += tempK.x * dt * 50; // Scale force
            this.particlesVel[i3 + 1] += tempK.y * dt * 50;
            this.particlesVel[i3 + 2] += tempK.z * dt * 50;

            // Damping
            this.particlesVel[i3] *= this.DAMPING;
            this.particlesVel[i3 + 1] *= this.DAMPING;
            this.particlesVel[i3 + 2] *= this.DAMPING;

            // Update Pos
            this.particlesPos[i3] += this.particlesVel[i3];
            this.particlesPos[i3 + 1] += this.particlesVel[i3 + 1];
            this.particlesPos[i3 + 2] += this.particlesVel[i3 + 2];

            // Bounds / Reset
            if (Math.abs(this.particlesPos[i3]) > this.BOUNDS ||
                Math.abs(this.particlesPos[i3 + 1]) > this.BOUNDS) {
                this.resetParticle(i);
            }
        }
    }

    public resize(newCount: number) {
        if (newCount === this.count) return;
        this.count = newCount;
        this.allocateBuffers();
        this.initParticles();
    }
}
