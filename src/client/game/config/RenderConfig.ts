/**
 * Rendering configuration for the game
 * Uses pure Phaser graphics for all rendering
 */
export class RenderConfig {
  // Use PNG textures (stable) for grid and pieces
  static readonly USE_SVG_HEXAGONS = false;
  static readonly USE_PNG_HEXAGONS = true;

  static readonly TEXTURE_KEYS = {
    HEX: 'hex',
    // base/fill kept for compatibility but unused when PNG mode is active
    HEX_BASE: 'hex_empty',
    HEX_FILL: 'hex_piece',
    // SVG variants
    HEX_BASE_SVG: 'hex_base_svg',
    HEX_FILL_SVG: 'hex_fill_svg',
    HEX_EMPTY: 'hex_empty',
    HEX_FILLED: 'hex_filled',
    HEX_PIECE: 'hex_piece',
  } as const;

  // PNG asset paths
  static readonly ASSETS = {
    HEX_EMPTY: '/assets/hex-base.png',
    HEX_FILLED: '/assets/hex-fill.png',
    HEX_PIECE: '/assets/hex-fill.png',
  } as const;
}
