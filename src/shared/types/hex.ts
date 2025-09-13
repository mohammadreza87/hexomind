/**
 * Hexagonal coordinate system types and utilities
 * Using axial coordinates (q, r) where q is column and r is row
 */

export interface HexCoordinates {
  q: number; // column (x-axis in Unity)
  r: number; // row (z-axis in Unity)
}

export interface HexCell {
  coordinates: HexCoordinates;
  isOccupied: boolean;
  pieceId?: string;
}

export interface HexGrid {
  radius: number;
  cells: Map<string, HexCell>;
}

/**
 * Convert hex coordinates to a unique string key
 */
export function hexToKey(hex: HexCoordinates): string {
  return `${hex.q},${hex.r}`;
}

/**
 * Parse a string key back to hex coordinates
 */
export function keyToHex(key: string): HexCoordinates {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}

/**
 * Get the s coordinate (derived from q and r in cube coordinates)
 */
export function getS(hex: HexCoordinates): number {
  return -hex.q - hex.r;
}

/**
 * Calculate distance between two hexagons
 */
export function hexDistance(a: HexCoordinates, b: HexCoordinates): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

/**
 * Get all six neighbor directions
 */
export const HEX_DIRECTIONS: HexCoordinates[] = [
  { q: 1, r: 0 },   // Right
  { q: 1, r: -1 },  // Top-Right
  { q: 0, r: -1 },  // Top-Left
  { q: -1, r: 0 },  // Left
  { q: -1, r: 1 },  // Bottom-Left
  { q: 0, r: 1 },   // Bottom-Right
];

/**
 * Get neighbor at a specific direction
 */
export function hexNeighbor(hex: HexCoordinates, direction: number): HexCoordinates {
  const dir = HEX_DIRECTIONS[direction];
  return { q: hex.q + dir.q, r: hex.r + dir.r };
}

/**
 * Get all neighbors of a hex
 */
export function hexNeighbors(hex: HexCoordinates): HexCoordinates[] {
  return HEX_DIRECTIONS.map((dir) => ({
    q: hex.q + dir.q,
    r: hex.r + dir.r,
  }));
}

/**
 * Check if coordinates are equal
 */
export function hexEquals(a: HexCoordinates, b: HexCoordinates): boolean {
  return a.q === b.q && a.r === b.r;
}

/**
 * Add two hex coordinates
 */
export function hexAdd(a: HexCoordinates, b: HexCoordinates): HexCoordinates {
  return { q: a.q + b.q, r: a.r + b.r };
}

/**
 * Subtract hex coordinates
 */
export function hexSubtract(a: HexCoordinates, b: HexCoordinates): HexCoordinates {
  return { q: a.q - b.q, r: a.r - b.r };
}