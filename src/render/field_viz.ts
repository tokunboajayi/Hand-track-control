import * as THREE from 'three';
import { VectorField } from '../sim/field';

export class FieldVisualizer {
    private group: THREE.Group;
    private arrows: THREE.ArrowHelper[] = [];
    private field: VectorField;

    // Grid config
    private readonly ROWS = 10;
    private readonly COLS = 10;
    private readonly SIZE = 20; // World size covered

    constructor(scene: THREE.Scene, field: VectorField) {
        this.field = field;
        this.group = new THREE.Group();
        scene.add(this.group);

        this.initArrows();
    }

    private initArrows() {
        const step = this.SIZE / this.ROWS;
        const start = -this.SIZE / 2 + step / 2;

        for (let i = 0; i < this.ROWS; i++) {
            for (let j = 0; j < this.COLS; j++) {
                const x = start + j * step;
                const y = start + i * step; // Z is up in some, Y in others. We use XY plane.

                const dir = new THREE.Vector3(1, 0, 0);
                const origin = new THREE.Vector3(x, y, 0);
                const length = 0.5;
                const color = 0x555555;

                const arrow = new THREE.ArrowHelper(dir, origin, length, color, 0.2, 0.1);
                this.arrows.push(arrow);
                this.group.add(arrow);
            }
        }
    }

    public update() {
        // Sample field at each arrow pos
        const tempVec = new THREE.Vector3();

        for (const arrow of this.arrows) {
            this.field.sample(arrow.position, tempVec); // tempVec = force vector

            const len = tempVec.length();
            if (len > 0.01) {
                tempVec.normalize();
                arrow.setDirection(tempVec);
                // Scale length by strength, clamp
                const arrowLen = Math.min(len * 2.0, 1.5);
                arrow.setLength(Math.max(arrowLen, 0.2), 0.2, 0.1);
                arrow.visible = true;
            } else {
                arrow.visible = false; // Hide if no field
            }
        }
    }
}
