import * as THREE from "three";

export class SceneManager {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;

    public interactionPlane: THREE.Mesh;
    public sanityCube: THREE.Mesh; // V0 Sanity Check

    private container: HTMLElement;
    private clock = new THREE.Clock();

    constructor(container: HTMLElement) {
        this.container = container;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x05060a);

        // Camera
        const w = Math.max(1, container.clientWidth);
        const h = Math.max(1, container.clientHeight);
        this.camera = new THREE.PerspectiveCamera(60, w / h, 0.01, 2000);
        this.camera.position.set(0, 0, 18);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(w, h, false);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        // Attach canvas
        container.appendChild(this.renderer.domElement);

        // Basic light (even if you only use Points, this helps debug meshes)
        const hemi = new THREE.HemisphereLight(0xffffff, 0x111122, 0.8);
        this.scene.add(hemi);

        // Helpers (debug — keep until everything renders)
        const axes = new THREE.AxesHelper(3);
        axes.visible = false; // flip true if you need to debug
        this.scene.add(axes);

        // Interaction plane (raycast target)
        const planeGeo = new THREE.PlaneGeometry(50, 50, 1, 1);
        const planeMat = new THREE.MeshBasicMaterial({
            color: 0x222244,
            transparent: true,
            opacity: 0.0, // invisible but raycastable
            depthWrite: false,
        });
        this.interactionPlane = new THREE.Mesh(planeGeo, planeMat);
        this.interactionPlane.position.set(0, 0, 0);
        this.scene.add(this.interactionPlane);

        // --- V0 VISIBILITY CONTRACT START ---
        // 1. Axes Helper
        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);

        // 2. Grid Helper
        const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
        this.scene.add(gridHelper);

        // 3. Spinning Magenta Cube
        const cubeGeo = new THREE.BoxGeometry(2, 2, 2);
        const cubeMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true });
        this.sanityCube = new THREE.Mesh(cubeGeo, cubeMat);
        this.scene.add(this.sanityCube);

        console.log("SceneManager: V0 Sanity Objects Added", {
            containerSize: { w: container.clientWidth, h: container.clientHeight },
            cameraPos: this.camera.position
        });
        // --- V0 VISIBILITY CONTRACT END ---

        // Resize handling
        this.onResize = this.onResize.bind(this);
        window.addEventListener("resize", this.onResize);
        // Also handle container size changes (common cause of "blank")
        const ro = new ResizeObserver(() => this.onResize());
        ro.observe(container);
    }

    public getDelta(): number {
        return this.clock.getDelta();
    }

    private onResize() {
        const w = Math.max(1, this.container.clientWidth);
        const h = Math.max(1, this.container.clientHeight);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h, false);
    }

    public render() {
        if (this.sanityCube) {
            this.sanityCube.rotation.x += 0.01;
            this.sanityCube.rotation.y += 0.02;
        }
        this.renderer.render(this.scene, this.camera);
    }

    public destroy() {
        window.removeEventListener("resize", this.onResize);
        this.renderer.dispose();
    }
}
