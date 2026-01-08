export class RNG {
    private seed: number;

    constructor(seed: number) {
        this.seed = seed;
    }

    // Simple LCG
    public next(): number {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    public nextRange(min: number, max: number): number {
        return min + this.next() * (max - min);
    }
}
