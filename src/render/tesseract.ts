import * as THREE from "three";

type V4 = [number, number, number, number];

export class Tesseract {
    private mesh: THREE.LineSegments;
    private geometry: THREE.BufferGeometry;

    private vertices4D: V4[];
    private edges: [number, number][];

    private angleXY = 0;
    private angleZW = 0;

    // OPTIMIZATION: Pre-allocated projected vertices (zero allocations per frame)
    private _projected: THREE.Vector3[] = Array.from({ length: 16 }, () => new THREE.Vector3());

    // Spin Momentum: velocity from twist gesture
    private velocity = new THREE.Vector3(0, 0, 0);
    private readonly DAMPING = 0.98;
    private readonly SPIN_FORCE = 0.5;

    constructor(scene: THREE.Scene) {
        // 16 vertices: (±1, ±1, ±1, ±1)
        this.vertices4D = [];
        for (let i = 0; i < 16; i++) {
            const x = (i & 1) ? 1 : -1;
            const y = (i & 2) ? 1 : -1;
            const z = (i & 4) ? 1 : -1;
            const w = (i & 8) ? 1 : -1;
            this.vertices4D.push([x, y, z, w]);
        }

        // edges: differ in exactly one coordinate
        this.edges = [];
        for (let i = 0; i < 16; i++) {
            for (let j = i + 1; j < 16; j++) {
                let diff = 0;
                for (let k = 0; k < 4; k++) diff += this.vertices4D[i][k] !== this.vertices4D[j][k] ? 1 : 0;
                if (diff === 1) this.edges.push([i, j]);
            }
        }

        this.geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.edges.length * 2 * 3);
        this.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

        const material = new THREE.LineBasicMaterial({
            color: 0xff55aa,
            transparent: true,
            opacity: 0.85,
        });

        this.mesh = new THREE.LineSegments(this.geometry, material);
        this.mesh.scale.set(2.2, 2.2, 2.2);
        this.mesh.position.set(0, 0, 0);
        scene.add(this.mesh);

        // initialize once
        this.update(0);
    }

    public setVisible(v: boolean) {
        this.mesh.visible = v;
    }

    // Grab and move support
    public setPosition(pos: THREE.Vector3) {
        this.mesh.position.copy(pos);
    }

    public getPosition(): THREE.Vector3 {
        return this.mesh.position;
    }

    public getBoundingRadius(): number {
        return 3.0; // Approximate grab radius
    }

    // twistInput: [-1..1] from your two-hand twist detection (or 0)
    public update(twistInput: number) {
        this.angleXY += 0.003;
        this.angleZW += twistInput * 0.06;

        // Spin Momentum: twist adds velocity in the direction of rotation
        if (Math.abs(twistInput) > 0.01) {
            // Direction based on current XY angle
            const angle = this.angleXY + Math.PI / 2; // Perpendicular to rotation
            this.velocity.x += Math.cos(angle) * twistInput * this.SPIN_FORCE;
            this.velocity.y += Math.sin(angle) * twistInput * this.SPIN_FORCE;
        }

        // Apply damping
        this.velocity.multiplyScalar(this.DAMPING);

        // Apply velocity to position
        this.mesh.position.add(this.velocity);

        const cxy = Math.cos(this.angleXY);
        const sxy = Math.sin(this.angleXY);
        const czw = Math.cos(this.angleZW);
        const szw = Math.sin(this.angleZW);

        // OPTIMIZATION: Use pre-allocated array
        const projected = this._projected;

        for (let i = 0; i < 16; i++) {
            let [x, y, z, w] = this.vertices4D[i];

            // Rotate XY
            const x1 = x * cxy - y * sxy;
            const y1 = x * sxy + y * cxy;
            x = x1; y = y1;

            // Rotate ZW
            const z1 = z * czw - w * szw;
            const w1 = z * szw + w * czw;
            z = z1; w = w1;

            // 4D -> 3D stereographic-like projection using w
            const distance = 3.0;
            const inv = 1.0 / (distance - w);
            projected[i].set(x * inv, y * inv, z * inv);
        }

        const pos = (this.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
        let p = 0;

        for (const [a, b] of this.edges) {
            const v1 = projected[a];
            const v2 = projected[b];

            pos[p++] = v1.x; pos[p++] = v1.y; pos[p++] = v1.z;
            pos[p++] = v2.x; pos[p++] = v2.y; pos[p++] = v2.z;
        }

        (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }
}
