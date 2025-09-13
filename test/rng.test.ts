import { describe, it, expect } from 'vitest';
import { RNG } from '../src/client/game/core/services/RNG';

describe('RNG determinism', () => {
  it('produces identical sequences for same seed', () => {
    const a = new RNG('seed');
    const b = new RNG('seed');
    const seqA = [a.random(), a.random(), a.random(), a.random(), a.random()];
    const seqB = [b.random(), b.random(), b.random(), b.random(), b.random()];
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = new RNG('seed1');
    const b = new RNG('seed2');
    const seqA = [a.random(), a.random(), a.random()];
    const seqB = [b.random(), b.random(), b.random()];
    expect(seqA).not.toEqual(seqB);
  });
});

