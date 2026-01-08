import * as THREE from "three";
import { VectorField } from "../sim/field";

export class FieldVisualizer {
    private group: THREE.Group;
    private arrows: THREE.ArrowHelper[] = [];
    private field: VectorField;

    private readonly ROWS = 12;
    private readonly COLS = 12;
    private readonly SIZE = 20;

    constructor(scene: THREE.Scene, field: VectorField) {
        this.field = field;
        this.group = new THREE.Group();
        scene.add(this.group);

        const half = this.SIZE * 0.5;

        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                const x = THREE.MathUtils.lerp(-half, half, c / (this.COLS - 1));
                const y = THREE.MathUtils.lerp(-half, half, r / (this.ROWS - 1));
                const origin = new THREE.Vector3(x, y, 0);

                const dir = new THREE.Vector3(1, 0, 0);
                const len = 0.6;
                const arrow = new THREE.ArrowHelper(dir, origin, len, 0x3366ff, 0.2, 0.1);
                arrow.visible = false;
                this.arrows.push(arrow);
                this.group.add(arrow);
            }
        }

        this.group.visible = false; // default off; toggle from UI
    }

    public setVisible(v: boolean) {
        this.group.visible = v;
    }

    public update() {
        if (!this.group.visible) return;

        const tmp = new THREE.Vector3();
        const samplePos = new THREE.Vector3();

        for (const arrow of this.arrows) {
            samplePos.copy(arrow.position);

            // Expecting field.sample(x,y,z) -> {x,y,z} OR Vector3-compatible
            const v = this.field.sample(samplePos.x, samplePos.y, samplePos.z);

            // Normalize input shape into THREE.Vector3
            if (v instanceof THREE.Vector3) tmp.copy(v);
            else tmp.set(v.x ?? 0, v.y ?? 0, v.z ?? 0);

            const len = tmp.length();
            if (len < 1e-3) {
                arrow.visible = false;
                continue;
            }

            tmp.normalize();
            arrow.setDirection(tmp);

            // Clamp arrow length (visual only)
            const L = THREE.MathUtils.clamp(len * 0.6, 0.25, 1.5);
            arrow.setLength(L, 0.18, 0.10);
            arrow.visible = true;
        }
    }
}
