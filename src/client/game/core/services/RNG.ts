/**
 * Lightweight deterministic RNG (mulberry32)
 */
export class RNG {
  private state: number;

  constructor(seed: number | string = Date.now()) {
    // Hash string seed to number
    let s = 0;
    if (typeof seed === 'string') {
      for (let i = 0; i < seed.length; i++) {
        s = (s << 5) - s + seed.charCodeAt(i);
        s |= 0; // 32-bit
      }
    } else {
      s = Math.floor(seed) | 0;
    }
    // Avoid zero state
    if (s === 0) s = 0x6d2b79f5;
    this.state = s >>> 0;
  }

  /**
   * Returns float in [0, 1)
   */
  random(): number {
    // mulberry32
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    return r;
  }

  /**
   * Returns integer in [0, max)
   */
  int(max: number): number {
    return Math.floor(this.random() * max);
  }

  /**
   * Pick a random element
   */
  pick<T>(arr: T[]): T {
    return arr[this.int(arr.length)];
  }
}

