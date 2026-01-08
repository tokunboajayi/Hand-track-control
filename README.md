# SPELLFOUNDRY

A hand-tracking physics sorcery sandbox.

## Quick Start
1. `npm install`
2. `npm run dev`
3. Allow Camera Access when prompted.

## Gestures & Controls

| Gesture | Action |
| :--- | :--- |
| **Pinch** (Thumb + Index) | Place a source (pushes particles). |
| **Swipe** (Fast Motion) | Shockwave impulse. |
| **Stretch** (Two Hands) | Adjust Field Radius (pull apart = larger). |
| **Twist** (Two Hands) | Rotate 4D Tesseract projection. |

### Gesture Thresholds
- **Pinch**: Detected when thumb and index tip distance < `0.05` (hysteresis exit at `0.08`).
- **Swipe**: Triggered when hand velocity > `1.5` units/frame (reset < `0.5`).
- **Stretch**: Active when both hands pinch. Linear 1:1 map to radius.
- **Twist**: Active when both hands pinch. Maps angular delta to 4D rotation.

## Features
- **Deterministic Simulation**: Uses a fixed seed for reproducible particle patterns (see `src/utils/rng.ts`).
- **Adaptive Performance**: Auto-scales particle count if Frame Rate drops below 30FPS.
- **Visuals**:
    - **Field Viz**: Arrows show the invisible force field.
    - **Trails**: Motion blur effect.
    - **Tesseract**: 4D hypercube projection.

## Controls
Debug panel (Top Right) allows tweaking:
- **Particle Count**: Live count.
- **Interaction Z**: Move the virtual interaction plane forward/backward.
- **Strength/Radius**: Physics multipliers.
