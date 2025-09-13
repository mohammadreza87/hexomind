import { describe, it, expect } from 'vitest';
import { GridModel } from '../src/client/game/core/models/GridModel';
import type { HexCoordinates } from '../src/shared/types/hex';

function hexCount(radius: number): number {
  // total cells in hex grid radius r = 1 + 3r(r+1)
  return 1 + 3 * radius * (radius + 1);
}

describe('GridModel API', () => {
  it('getAllCells returns correct count', () => {
    const r = 2;
    const grid = new GridModel(r);
    expect(grid.getAllCells().length).toBe(hexCount(r));
  });

  it('getNeighbors returns up to 6 neighbors within bounds', () => {
    const grid = new GridModel(2);
    const center: HexCoordinates = { q: 0, r: 0 };
    expect(grid.getNeighbors(center).length).toBe(6);

    const edge: HexCoordinates = { q: 2, r: -2 }; // corner
    expect(grid.getNeighbors(edge).length).toBeGreaterThan(0);
    expect(grid.getNeighbors(edge).length).toBeLessThanOrEqual(6);
  });

  it('detectPotentialCompleteLines matches Line shape', () => {
    const grid = new GridModel(1);
    // Occupy a horizontal line except one
    // r = 0 line: q in [-1, 0, 1]
    grid.setCellOccupied({ q: -1, r: 0 }, true, 'a');
    grid.setCellOccupied({ q: 1, r: 0 }, true, 'b');

    const potentials = grid.detectPotentialCompleteLines([{ q: 0, r: 0 }]);
    expect(potentials.length).toBeGreaterThan(0);
    const horizontal = potentials.find(l => l.direction === 'horizontal');
    expect(horizontal).toBeDefined();
    expect(horizontal!.cells.length).toBe(3);
  });
});

