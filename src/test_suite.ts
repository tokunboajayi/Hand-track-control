import * as THREE from 'three';
import { GestureDetector } from './handtracking/gestures';
import { VectorField, FieldType } from './sim/field';

console.log("=== RUNNING BASIC TESTS ===");

const runTests = () => {
    // 1. Gesture Test
    console.log("TEST: Gesture Logic");
    const detector = new GestureDetector();
    const mockLandmarks: any[] = [];
    // Create a fake hand (21 points)
    for (let i = 0; i < 21; i++) mockLandmarks.push({ x: 0, y: 0, z: 0 });

    // Set pinch: Thumb(4) and Index(8) close
    mockLandmarks[4] = { x: 0.5, y: 0.5, z: 0 };
    mockLandmarks[8] = { x: 0.51, y: 0.51, z: 0 }; // Distance ~0.014 < 0.05
    detector.update([mockLandmarks], 1000);
    const state = detector.states[0];
    if (state.isPinching) console.log(" PASS: Pinch detected");
    else console.error(" FAIL: Pinch not detected");

    // Release pinch
    mockLandmarks[8] = { x: 0.8, y: 0.8, z: 0 }; // Dist ~0.4 > 0.08
    detector.update([mockLandmarks], 2000);
    if (!detector.states[0].isPinching) console.log(" PASS: Pinch release detected");
    else console.error(" FAIL: Pinch release not detected");


    // 2. Field Test
    console.log("TEST: Field Sampling");
    const field = new VectorField();
    field.clearSources();
    field.addSource(new THREE.Vector3(0, 0, 0), 1.0, 1.0, FieldType.SOURCE); // Source at origin

    const items = new THREE.Vector3();
    field.sample(new THREE.Vector3(0.5, 0, 0), items);
    // Should push away (+x)
    if (items.x > 0) console.log(" PASS: Source pushes particles correct direction");
    else console.error(" FAIL: Source direction wrong", items);

    console.log("=== TESTS COMPLETE ===");
};

runTests();
