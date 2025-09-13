import { describe, it, expect } from 'vitest';
import { PieceGenerationService } from '../src/client/game/core/services/PieceGenerationService';
import { GridModel } from '../src/client/game/core/models/GridModel';

describe('PieceGenerationService deterministic output', () => {
  it('generates the same piece set with same seed', () => {
    const grid = new GridModel(3);
    const genA = new PieceGenerationService({ guaranteeSolvability: false }, 'fixed-seed');
    const genB = new PieceGenerationService({ guaranteeSolvability: false }, 'fixed-seed');

    const setA = genA.generatePieceSet(grid, 3);
    const setB = genB.generatePieceSet(grid, 3);

    // Compare shape ids and color indices for determinism
    expect(setA.map(p => p.getShape().id)).toEqual(setB.map(p => p.getShape().id));
    expect(setA.map(p => p.getColorIndex())).toEqual(setB.map(p => p.getColorIndex()));
  });
});

