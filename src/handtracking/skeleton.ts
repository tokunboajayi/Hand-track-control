// Hand skeleton connection indices for MediaPipe 21-landmark model
// Each pair [from, to] represents a bone connection

export const HAND_CONNECTIONS: [number, number][] = [
    // Thumb
    [0, 1], [1, 2], [2, 3], [3, 4],
    // Index finger
    [0, 5], [5, 6], [6, 7], [7, 8],
    // Middle finger
    [0, 9], [9, 10], [10, 11], [11, 12],
    // Ring finger
    [0, 13], [13, 14], [14, 15], [15, 16],
    // Pinky
    [0, 17], [17, 18], [18, 19], [19, 20],
    // Palm connections
    [5, 9], [9, 13], [13, 17]
];

// Finger color palette (vibrant, gradient feel)
export const FINGER_COLORS = {
    thumb: '#FF6B6B',   // Coral red
    index: '#FFE66D',   // Yellow
    middle: '#4ECDC4',  // Teal
    ring: '#95E1D3',    // Mint
    pinky: '#A8E6CF',   // Light green
    palm: '#DDA0DD'     // Plum
};

// Get color for a connection based on which finger it belongs to
export function getConnectionColor(fromIdx: number, toIdx: number): string {
    if (fromIdx <= 4 || toIdx <= 4) return FINGER_COLORS.thumb;
    if (fromIdx <= 8 || toIdx <= 8) return FINGER_COLORS.index;
    if (fromIdx <= 12 || toIdx <= 12) return FINGER_COLORS.middle;
    if (fromIdx <= 16 || toIdx <= 16) return FINGER_COLORS.ring;
    if (fromIdx <= 20 || toIdx <= 20) return FINGER_COLORS.pinky;
    return FINGER_COLORS.palm;
}
