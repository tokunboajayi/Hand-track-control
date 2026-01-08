export interface AppState {
    particleCount: number;
    useWebGPU: boolean;
    debugMode: boolean;
    fieldStrength: number;
    fieldRadius: number;
    interactionZ: number;
}

export const State: AppState = {
    particleCount: 20000, // MVP baseline
    useWebGPU: false, // Default to CPU for MVP
    debugMode: true,
    fieldStrength: 1.0,
    fieldRadius: 1.0,
    interactionZ: 0.0,
};
