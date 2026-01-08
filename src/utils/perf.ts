import Stats from 'stats.js';

export class PerfMonitor {
    private stats: Stats;

    constructor() {
        this.stats = new Stats();
        this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
        document.body.appendChild(this.stats.dom);
    }

    public begin() {
        this.stats.begin();
    }

    public end() {
        this.stats.end();
    }
}
