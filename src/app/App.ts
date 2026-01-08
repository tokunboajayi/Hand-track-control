import { SceneManager } from '../render/scene';
import { PerfMonitor } from '../utils/perf';
import { DebugPanel } from '../ui/debugPanel';
import { State } from './state';
import { HandTracker } from '../handtracking/HandTracker';
import { VectorField, FieldType } from '../sim/field';
import { CPUParticles } from '../sim/particles_cpu';
import { ParticleRenderer } from '../render/particles';
import { FieldVisualizer } from '../render/field_viz';
import { Tesseract } from '../render/tesseract';
import * as THREE from 'three';

export class App {
    public sceneManager: SceneManager;
    public perfMonitor: PerfMonitor;
    public debugPanel: DebugPanel;
    public handTracker: HandTracker;

    // Sim
    public field: VectorField;
    public cpuSim: CPUParticles;
    public particleRenderer: ParticleRenderer;
    public tesseract: Tesseract;
    public fieldViz: FieldVisualizer;

    // Adaptive Perf
    private lowFpsFrames = 0;
    private lastTime = 0;

    // Tesseract Grab State
    private tesseractGrabbed = false;
    private grabHandIndex = -1;

    // OPTIMIZATION: Cached scratch objects (zero allocations in hot loop)
    private _raycaster = new THREE.Raycaster();
    private _ndc = new THREE.Vector2();
    private _handWorldPos = new THREE.Vector3();

    constructor() {
        const container = document.getElementById('app') || document.body;
        this.sceneManager = new SceneManager(container);
        this.perfMonitor = new PerfMonitor();
        this.debugPanel = new DebugPanel();
        this.handTracker = new HandTracker();

        // Init physics
        this.field = new VectorField();
        this.cpuSim = new CPUParticles(State.particleCount, this.field);
        this.particleRenderer = new ParticleRenderer(this.sceneManager.scene, this.cpuSim);

        // Init Tesseract
        this.tesseract = new Tesseract(this.sceneManager.scene);

        // Init Field Viz
        this.fieldViz = new FieldVisualizer(this.sceneManager.scene, this.field);

        this.animate = this.animate.bind(this);
    }

    public async start() {
        await this.handTracker.initialize();
        this.lastTime = performance.now();
        this.animate();
    }

    private animate() {
        requestAnimationFrame(this.animate);

        const now = performance.now();
        const delta = now - this.lastTime;
        this.lastTime = now;
        const fps = 1000 / delta;

        // Adaptive Perf Check
        if (fps < 30) {
            this.lowFpsFrames++;
            if (this.lowFpsFrames > 60) { // 1-2 seconds of low fps
                if (State.particleCount > 5000) {
                    State.particleCount = Math.floor(State.particleCount * 0.9);
                    console.log("Adaptive Perf: Reducing particles to", State.particleCount);
                    this.cpuSim.resize(State.particleCount);
                    this.particleRenderer.resize();
                    // Update debug panel if possible, or just state
                }
                this.lowFpsFrames = 0;
            }
            // Debug Log
            if (this.perfMonitor && (this.lowFpsFrames % 60 === 0)) {
                console.log('App: Sim Data Check', {
                    count: State.particleCount,
                    p0: [this.cpuSim.particlesPos[0], this.cpuSim.particlesPos[1], this.cpuSim.particlesPos[2]]
                });
            }
        } else {
            this.lowFpsFrames = Math.max(0, this.lowFpsFrames - 1);
        }

        this.perfMonitor.begin();

        // 1. Update Tracking
        this.handTracker.update();
        const states = this.handTracker.gestureDetector.states;
        const multi = this.handTracker.gestureDetector.multiHandState;

        // 2. Map Gestures to Field
        this.field.clearSources();

        // Update Interaction Plane Z
        if (this.sceneManager.interactionPlane) {
            this.sceneManager.interactionPlane.position.z = State.interactionZ;
        }

        // OPTIMIZATION: Use cached raycaster (no allocation)

        // Twist Control for Tesseract
        let twistInput = 0;
        if (multi.isTwisting) {
            twistInput = multi.twistAngle; // raw angle delta
        }
        this.tesseract.update(twistInput);

        // Stretch Control for Field Radius
        if (multi.isStretching) {
            // Map distance to radius
            const targetRadius = Math.max(0.5, Math.min(5.0, multi.stretchDistance * 10));
            State.fieldRadius = State.fieldRadius * 0.9 + targetRadius * 0.1; // Smooth
        }

        // --- TESSERACT GRAB LOGIC ---
        // Check if any hand is pinching near the tesseract
        const tesseractPos = this.tesseract.getPosition();
        const grabRadius = this.tesseract.getBoundingRadius();

        states.forEach((state, index) => {
            if (!state) return;

            // Map hand position to world space (OPTIMIZED: reuse cached vectors)
            this._ndc.set(
                (state.pinchCenter.x * 2) - 1,
                1 - (state.pinchCenter.y * 2)
            );
            this._raycaster.setFromCamera(this._ndc, this.sceneManager.camera);
            const intersects = this._raycaster.intersectObject(this.sceneManager.interactionPlane);

            if (intersects.length > 0) {
                this._handWorldPos.copy(intersects[0].point);
            } else {
                this._handWorldPos.set(this._ndc.x * 10, this._ndc.y * 10, State.interactionZ);
            }

            // Check for grab
            if (state.isPinching) {
                const distToTesseract = this._handWorldPos.distanceTo(tesseractPos);

                if (!this.tesseractGrabbed && distToTesseract < grabRadius) {
                    // Initiate grab
                    this.tesseractGrabbed = true;
                    this.grabHandIndex = index;
                    console.log("Tesseract GRABBED by hand", index);
                }

                // If this hand is holding the tesseract, move it
                if (this.tesseractGrabbed && this.grabHandIndex === index) {
                    this.tesseract.setPosition(this._handWorldPos);
                }
            } else {
                // Released
                if (this.tesseractGrabbed && this.grabHandIndex === index) {
                    this.tesseractGrabbed = false;
                    this.grabHandIndex = -1;
                    console.log("Tesseract RELEASED");
                }
            }

            // --- FIELD SOURCE LOGIC (ONLY WHEN NOT GRABBING) ---
            if (!this.tesseractGrabbed) {
                if (state.isPinching) {
                    this.field.addSource(this._handWorldPos, State.fieldStrength * 2.0, State.fieldRadius, FieldType.SOURCE);
                } else if (state.isSwiping) {
                    this.field.addSource(this._handWorldPos, 5.0, 3.0, FieldType.SOURCE);
                } else {
                    this.field.addSource(this._handWorldPos, 1.0, 2.0, FieldType.VORTEX);
                }
            }
        });

        // 3. Sim Update
        this.cpuSim.update();
        this.particleRenderer.update();
        this.fieldViz.update();

        // 4. Render
        this.sceneManager.render();

        this.perfMonitor.end();
    }
}
