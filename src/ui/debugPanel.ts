import GUI from 'lil-gui';
import { State } from '../app/state';

export class DebugPanel {
    private gui: GUI;

    constructor() {
        this.gui = new GUI({ title: 'SPELLFOUNDRY Settings' });

        this.gui.add(State, 'particleCount').name('Particles').listen();
        // this.gui.add(State, 'useWebGPU').name('WebGPU Compute').listen(); // Removed
        this.gui.add(State, 'fieldStrength', 0, 5).name('Field Strength');
        this.gui.add(State, 'fieldRadius', 0.1, 5).name('Field Radius');
        this.gui.add(State, 'interactionZ', -5, 5).name('Interaction Z');
    }
}
