import * as THREE from 'three';

export interface HandGestureState {
    isPinching: boolean;
    pinchStrength: number; // 0 to 1
    pinchCenter: THREE.Vector3; // Normalized coords [0,1] or world if remapped
    handVelocity: THREE.Vector3;
    isSwiping: boolean; // Velocity threshold
    swipeDirection: THREE.Vector3;
}

export interface MultiHandGestureState {
    isStretching: boolean;
    stretchDistance: number;
    isTwisting: boolean;
    twistAngle: number; // radians
    center: THREE.Vector3;
}

export class GestureDetector {
    private lastPalmPos: THREE.Vector3[] = [new THREE.Vector3(), new THREE.Vector3()];
    private lastTime: number = 0;

    // Hysteresis config
    private readonly PINCH_START = 0.05; // 5% of screen
    private readonly PINCH_RELEASE = 0.08;

    // Smoothing
    private readonly ALPHA = 0.5; // EMA factor

    // State per hand (max 2 hands)
    public states: HandGestureState[] = [];
    public multiHandState: MultiHandGestureState = {
        isStretching: false,
        stretchDistance: 0,
        isTwisting: false,
        twistAngle: 0,
        center: new THREE.Vector3()
    };

    private initialTwistVector: THREE.Vector3 | null = null;

    // Optimization: Reusable scratch vectors (no allocations in hot loop)
    private _thumbTip = new THREE.Vector3();
    private _indexTip = new THREE.Vector3();
    private _currentCenter = new THREE.Vector3();
    private _palmCenter = new THREE.Vector3();
    private _disp = new THREE.Vector3();
    private _currentVector = new THREE.Vector2();
    private _vStart = new THREE.Vector2();

    constructor() {
        this.resetState();
    }

    private resetState() {
        this.states = [this.createEmptyState(), this.createEmptyState()];
    }

    private createEmptyState(): HandGestureState {
        return {
            isPinching: false,
            pinchStrength: 0,
            pinchCenter: new THREE.Vector3(),
            handVelocity: new THREE.Vector3(),
            isSwiping: false,
            swipeDirection: new THREE.Vector3()
        };
    }

    public update(landmarks: any[][], currentTime: number) {
        if (!landmarks || landmarks.length === 0) {
            this.initialTwistVector = null;
            return;
        }

        const dt = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Process each detected hand
        for (let i = 0; i < landmarks.length; i++) {
            if (i >= 2) break; // Support max 2 hands
            const hand = landmarks[i]; // Array of {x, y, z}

            // 1. Pinch Detection (using scratch vectors)
            this._thumbTip.set(hand[4].x, hand[4].y, hand[4].z);
            this._indexTip.set(hand[8].x, hand[8].y, hand[8].z);

            const dist = this._thumbTip.distanceTo(this._indexTip);
            const state = this.states[i]; // Reuse state object

            // Hysteresis
            if (state.isPinching) {
                if (dist > this.PINCH_RELEASE) state.isPinching = false;
            } else {
                if (dist < this.PINCH_START) state.isPinching = true;
            }

            // Update Pinch Center (EMA Smoothed)
            this._currentCenter.copy(this._thumbTip).add(this._indexTip).multiplyScalar(0.5);
            state.pinchCenter.lerp(this._currentCenter, this.ALPHA);

            // 2. Velocity / Swipe
            // Using landmark 9 (middle_finger_mcp) as stable palm center
            this._palmCenter.set(hand[9].x, hand[9].y, hand[9].z);

            if (dt > 0) {
                this._disp.copy(this._palmCenter).sub(this.lastPalmPos[i]);
                const vel = this._disp.divideScalar(dt);
                state.handVelocity.lerp(vel, 0.2); // Smooth velocity

                // Swipe threshold (tune this)
                const speed = state.handVelocity.length();
                state.isSwiping = speed > 1.5; // Threshold in normalized coord units/sec
                if (state.isSwiping) {
                    state.swipeDirection.copy(state.handVelocity).normalize();
                } else {
                    state.swipeDirection.set(0, 0, 0);
                }
            }
            this.lastPalmPos[i].copy(this._palmCenter);
        }

        this.detectMultiHandGestures(landmarks);
    }

    private detectMultiHandGestures(landmarks: any[][]) {
        if (landmarks.length < 2) {
            this.multiHandState.isStretching = false;
            this.multiHandState.isTwisting = false;
            this.initialTwistVector = null;
            return;
        }

        const s0 = this.states[0];
        const s1 = this.states[1];

        if (s0.isPinching && s1.isPinching) {
            // Both pinching = Stretch or Twist?

            // Stretch: Distance between pinch centers
            const dist = s0.pinchCenter.distanceTo(s1.pinchCenter);
            this.multiHandState.isStretching = true;
            this.multiHandState.stretchDistance = dist;

            // Twist: Angle change
            // We only care about 2D rotation for the tesseract (XY plane)
            const v1 = s0.pinchCenter;
            const v2 = s1.pinchCenter;
            this._currentVector.set(v2.x - v1.x, v2.y - v1.y).normalize();

            if (!this.initialTwistVector) {
                this.initialTwistVector = new THREE.Vector3(this._currentVector.x, this._currentVector.y, 0);
                this.multiHandState.twistAngle = 0;
                this.multiHandState.isTwisting = true;
            } else {
                this._vStart.set(this.initialTwistVector.x, this.initialTwistVector.y);
                // Calculate angle difference
                const angleCurrent = Math.atan2(this._currentVector.y, this._currentVector.x);
                const angleStart = Math.atan2(this._vStart.y, this._vStart.x);
                let diff = angleCurrent - angleStart;

                this.multiHandState.twistAngle = diff;
            }

            // Center point for rotation
            this.multiHandState.center.copy(s0.pinchCenter).add(s1.pinchCenter).multiplyScalar(0.5);

        } else {
            this.multiHandState.isStretching = false;
            this.multiHandState.isTwisting = false;
            this.initialTwistVector = null;
        }
    }
}
