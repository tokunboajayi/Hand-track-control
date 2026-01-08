import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { GestureDetector } from './gestures';
import { HAND_CONNECTIONS, getConnectionColor } from './skeleton';

export class HandTracker {
    private handLandmarker: HandLandmarker | undefined;
    private runningMode: 'IMAGE' | 'VIDEO' = 'VIDEO';
    private video: HTMLVideoElement;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private lastVideoTime = -1;
    public results: any = undefined;
    public gestureDetector: GestureDetector;

    // Optimization: Frame skipping
    private frameCount = 0;
    private readonly DETECT_INTERVAL = 2; // Detect every 2nd frame
    public showDebug = true; // Toggle debug overlay

    // Temporal Smoothing for jitter reduction
    private readonly SMOOTHING = 0.7; // 70% old, 30% new
    private smoothedLandmarks: { x: number; y: number; z: number }[][] = [];

    constructor() {
        this.gestureDetector = new GestureDetector(); // Initialize!

        this.video = document.createElement('video');
        this.video.style.position = 'absolute';
        this.video.style.transform = 'scaleX(-1)';
        this.video.style.width = '320px';
        this.video.style.height = '180px';
        this.video.style.bottom = '0';
        this.video.style.right = '0';
        this.video.style.opacity = '0.6';
        this.video.style.zIndex = '100';
        this.video.autoplay = true;
        this.video.playsInline = true;
        document.body.appendChild(this.video);

        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.bottom = '0';
        this.canvas.style.right = '0';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.transform = 'scaleX(-1)';
        this.canvas.style.zIndex = '101';
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d')!;
    }

    public async initialize() {
        try {
            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
            );
            this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                    delegate: 'GPU'
                },
                runningMode: this.runningMode,
                numHands: 2
            });
            await this.startWebcam();
        } catch (error) {
            console.error('Error initializing HandTracker:', error);
        }
    }

    private async startWebcam() {
        const constraints = { video: { width: 640, height: 360 } }; // Optimized: Lower res
        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = stream;
            this.video.addEventListener('loadeddata', () => {
                this.resizeCanvas();
            });
        } catch (err) {
            console.error('Error accessing webcam:', err);
            const alert = document.createElement('div');
            alert.style.position = 'absolute';
            alert.style.top = '50%';
            alert.style.left = '50%';
            alert.style.transform = 'translate(-50%, -50%)';
            alert.style.background = 'rgba(255, 0, 0, 0.8)';
            alert.style.color = 'white';
            alert.style.padding = '20px';
            alert.style.borderRadius = '8px';
            alert.style.fontFamily = 'monospace';
            alert.innerText = 'CAMERA ACCESS DENIED OR MISSING.\nPlease allow camera access to use SpellFoundry.';
            document.body.appendChild(alert);
        }
    }

    private resizeCanvas() {
        this.canvas.width = 320;
        this.canvas.height = 180;
    }

    public update() {
        if (!this.handLandmarker || !this.video.videoWidth) return;

        // Optimization: Frame Skip
        this.frameCount++;
        if (this.frameCount % this.DETECT_INTERVAL !== 0) {
            if (this.showDebug) this.drawDebug(); // Still draw last results
            return;
        }

        const now = performance.now();
        if (this.video.currentTime !== this.lastVideoTime) {
            this.lastVideoTime = this.video.currentTime;
            this.results = this.handLandmarker.detectForVideo(this.video, now);

            if (this.results.landmarks) {
                this.gestureDetector.update(this.results.landmarks, now);
            }
        }

        if (this.showDebug) this.drawDebug();
    }

    private drawDebug() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.results || !this.results.landmarks) return;

        this.results.landmarks.forEach((landmarks: any[], handIdx: number) => {
            const state = this.gestureDetector.states[handIdx];
            const isPinching = state && state.isPinching;

            // Apply smoothing to landmarks
            if (!this.smoothedLandmarks[handIdx]) {
                this.smoothedLandmarks[handIdx] = landmarks.map((l: any) => ({ x: l.x, y: l.y, z: l.z }));
            } else {
                for (let i = 0; i < landmarks.length; i++) {
                    const s = this.smoothedLandmarks[handIdx][i];
                    const r = landmarks[i];
                    s.x = s.x * this.SMOOTHING + r.x * (1 - this.SMOOTHING);
                    s.y = s.y * this.SMOOTHING + r.y * (1 - this.SMOOTHING);
                    s.z = s.z * this.SMOOTHING + r.z * (1 - this.SMOOTHING);
                }
            }

            const smooth = this.smoothedLandmarks[handIdx];

            // --- Draw Skeleton Connections ---
            ctx.lineWidth = isPinching ? 3 : 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            for (const [from, to] of HAND_CONNECTIONS) {
                const p1 = smooth[from];
                const p2 = smooth[to];
                const x1 = p1.x * this.canvas.width;
                const y1 = p1.y * this.canvas.height;
                const x2 = p2.x * this.canvas.width;
                const y2 = p2.y * this.canvas.height;

                const color = getConnectionColor(from, to);

                // Glow effect
                ctx.shadowBlur = isPinching ? 15 : 8;
                ctx.shadowColor = color;
                ctx.strokeStyle = color;

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }

            // Reset shadow for joints
            ctx.shadowBlur = 0;

            // --- Draw Joint Circles ---
            for (let i = 0; i < smooth.length; i++) {
                const p = smooth[i];
                const x = p.x * this.canvas.width;
                const y = p.y * this.canvas.height;

                // Fingertips are larger
                const isTip = [4, 8, 12, 16, 20].includes(i);
                const radius = isTip ? 5 : 3;

                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fillStyle = isPinching ? '#FF0000' : '#FFFFFF';
                ctx.fill();
            }

            // --- Pinch Indicator ---
            if (isPinching && state) {
                const cx = state.pinchCenter.x * this.canvas.width;
                const cy = state.pinchCenter.y * this.canvas.height;

                // Pulsing effect
                const pulse = 1 + Math.sin(Date.now() / 100) * 0.3;
                const radius = 12 * pulse;

                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.strokeStyle = '#FF0000';
                ctx.lineWidth = 3;
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#FF0000';
                ctx.stroke();
                ctx.shadowBlur = 0;
            }

            // --- Velocity Vector (subtle) ---
            if (state && state.handVelocity.length() > 0.5) {
                const palm = smooth[9];
                const cx = palm.x * this.canvas.width;
                const cy = palm.y * this.canvas.height;
                const vx = state.handVelocity.x * 30;
                const vy = state.handVelocity.y * 30;

                ctx.strokeStyle = 'rgba(255, 255, 0, 0.6)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + vx, cy + vy);
                ctx.stroke();
            }
        });
    }
}
