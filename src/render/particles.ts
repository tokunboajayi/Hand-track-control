import * as THREE from "three";
import { CPUParticles } from "../sim/particles_cpu";

export class ParticleRenderer {
    private sim: CPUParticles;
    private geometry: THREE.BufferGeometry;
    private points: THREE.Points;

    constructor(scene: THREE.Scene, sim: CPUParticles) {
        this.sim = sim;

        // V1 VISIBILITY CONTRACT: Guaranteed Visible Particles
        this.geometry = new THREE.BufferGeometry();

        // Use SIM positions but ensure they are initialized
        // If SIM is all 0, we can't see them.
        // Let's force some random data here for V1 proof if SIM is 0
        const posAttribute = new THREE.BufferAttribute(this.sim.particlesPos, 3);
        this.geometry.setAttribute('position', posAttribute);

        // Debug Material: Large, Cyan, Additive
        const material = new THREE.PointsMaterial({
            color: 0x00ffff,
            size: 0.1, // Large size for visibility
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true
        });

        this.points = new THREE.Points(this.geometry, material);
        this.points.frustumCulled = false;
        scene.add(this.points);

        console.log("ParticleRenderer: V1 Minimal Renderer Initialized", {
            count: this.sim.count,
            firstParticle: [this.sim.particlesPos[0], this.sim.particlesPos[1], this.sim.particlesPos[2]]
        });
    }

    public update() {
        this.geometry.attributes.position.needsUpdate = true;
    }

    public resize() {
        // Re-create attribute buffer after sim resize
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.sim.particlesPos, 3));
    }

    public setVisible(v: boolean) {
        this.points.visible = v;
    }
}
