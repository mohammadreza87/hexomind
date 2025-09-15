import * as Phaser from 'phaser';
import { PieceRenderer } from './PieceRenderer';
import { PieceModel } from '../../core/models/PieceModel';
import { NeonThemeProvider } from '../theme/NeonThemeProvider';

/**
 * PieceTray - Manages the display and interaction of available pieces
 * Shows 3 pieces below the main board for drag-and-drop placement
 */
export class PieceTray {
  private scene: Phaser.Scene;
  private themeProvider: NeonThemeProvider;
  private container: Phaser.GameObjects.Container;

  private pieceSlots: PieceSlot[] = [];
  private pieceRenderers: Map<string, PieceRenderer> = new Map();

  private readonly SLOT_COUNT = 3;
  private slotSize: number = 100; // Size of each slot placeholder
  private slotSpacing: number = 20; // Spacing between slots
  private trayYPosition: number = 0; // Y position of tray

  constructor(scene: Phaser.Scene, themeProvider: NeonThemeProvider) {
    this.scene = scene;
    this.themeProvider = themeProvider;

    // Create main container with high depth to be above board
    this.container = scene.add.container(0, 0);
    this.container.setDepth(100); // Higher depth to ensure visibility

    this.setupSlots();
    this.positionTray();

    // Listen for resize
    scene.scale.on('resize', () => this.positionTray());
  }

  /**
   * Setup piece slots
   */
  private setupSlots(): void {
    const theme = this.themeProvider.getTheme();

    for (let i = 0; i < this.SLOT_COUNT; i++) {
      const slot: PieceSlot = {
        index: i,
        x: 0,
        y: 0,
        occupied: false,
        pieceId: null,
        background: null
      };

      // Create smaller slot background placeholder
      const bg = this.scene.add.graphics();
      bg.fillStyle(theme.cellEmptyAlt, 0.15);
      bg.lineStyle(1, theme.borderSubtle, 0.25);

      // Draw smaller rounded rectangle
      const halfSize = this.slotSize / 2;
      bg.fillRoundedRect(-halfSize, -halfSize, this.slotSize, this.slotSize, 8);
      bg.strokeRoundedRect(-halfSize, -halfSize, this.slotSize, this.slotSize, 8);

      slot.background = bg;
      this.container.add(bg);

      this.pieceSlots.push(slot);
    }
  }

  /**
   * Position the tray on screen
   */
  private positionTray(): void {
    const { width, height } = this.scene.cameras.main;

    // Calculate slot size based on screen width
    // Slots should be smaller and fit comfortably
    const maxSlotSize = 100;
    const minSlotSize = 60;
    this.slotSize = Math.min(maxSlotSize, Math.max(minSlotSize, width / 8));

    // Calculate spacing - same padding from edges and between slots
    // Total width = padding + slot + spacing + slot + spacing + slot + padding
    // Where padding = spacing for consistency
    const totalSlotsWidth = this.SLOT_COUNT * this.slotSize;
    const availableWidth = width * 0.9; // Use 90% of screen width
    const totalSpacing = availableWidth - totalSlotsWidth;
    const numberOfGaps = this.SLOT_COUNT + 1; // gaps between and on sides
    this.slotSpacing = totalSpacing / numberOfGaps;

    // Position tray in bottom area
    this.trayYPosition = height - height * 0.10; // Closer to bottom

    // Calculate starting X position (first slot position)
    const startX = this.slotSpacing + this.slotSize / 2;

    // Position each slot
    this.pieceSlots.forEach((slot, index) => {
      slot.x = startX + index * (this.slotSize + this.slotSpacing);
      slot.y = this.trayYPosition;

      if (slot.background) {
        // Update background size and position
        slot.background.clear();
        const theme = this.themeProvider.getTheme();
        slot.background.fillStyle(theme.cellEmptyAlt, 0.15);
        slot.background.lineStyle(1, theme.borderSubtle, 0.25);

        const halfSize = this.slotSize / 2;
        slot.background.fillRoundedRect(-halfSize, -halfSize, this.slotSize, this.slotSize, 8);
        slot.background.strokeRoundedRect(-halfSize, -halfSize, this.slotSize, this.slotSize, 8);
        slot.background.setPosition(slot.x, slot.y);
      }

      // Update piece position if exists
      if (slot.pieceId) {
        const renderer = this.pieceRenderers.get(slot.pieceId);
        if (renderer) {
          renderer.setPosition(slot.x, slot.y);
        }
      }
    });
  }

  /**
   * Add pieces to the tray
   */
  setPieces(pieces: PieceModel[]): void {
    // Clear existing pieces
    this.clear();

    // Setting pieces in tray

    // Add new pieces
    pieces.forEach((piece, index) => {
      if (index >= this.SLOT_COUNT) return;

      const slot = this.pieceSlots[index];
      // Creating piece at slot position

      const renderer = new PieceRenderer(
        this.scene,
        piece,
        this.themeProvider
      );

      // Get the container and ensure it's visible
      const pieceContainer = renderer.getContainer();

      // Position at slot
      renderer.setPosition(slot.x, slot.y);

      // Ensure visibility

      // Store references
      slot.occupied = true;
      slot.pieceId = piece.getId();
      this.pieceRenderers.set(piece.getId(), renderer);

      // Add to container and ensure visibility
      this.container.add(pieceContainer);
      pieceContainer.setDepth(10); // Set relative depth within tray
      pieceContainer.setVisible(true); // Explicitly set visible

      // Enable drag
      this.enableDrag(renderer, piece, slot);
    });
  }

  /**
   * Enable drag and drop for a piece
   */
  private enableDrag(renderer: PieceRenderer, piece: PieceModel, slot: PieceSlot): void {
    const container = renderer.getContainer();

    // Make interactive with hit area based on slot size
    const hitSize = this.slotSize * 0.8;
    container.setInteractive({
      draggable: true,
      hitArea: new Phaser.Geom.Rectangle(-hitSize/2, -hitSize/2, hitSize, hitSize),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains
    });

    // Store original position
    const originalX = slot.x;
    const originalY = slot.y;

    // Drag start
    container.on('dragstart', (pointer: Phaser.Input.Pointer) => {
      // Move piece to scene root for dragging
      this.container.remove(container);
      this.scene.add.existing(container);
      container.setDepth(200); // High depth while dragging

      // Set dragging state (this will scale to normal size)
      renderer.setDragging(true);

      // Center the piece on the pointer immediately
      container.x = pointer.x;
      container.y = pointer.y;

      // Emit event with renderer
      this.scene.events.emit('piece:dragstart', piece, pointer, renderer);
    });

    // Dragging
    container.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      // Always center the piece on the pointer
      container.x = pointer.x;
      container.y = pointer.y;

      // Emit event for board to show preview
      this.scene.events.emit('piece:drag', piece, pointer);
    });

    // Drag end
    container.on('dragend', (pointer: Phaser.Input.Pointer) => {
      renderer.setDragging(false);

      // Emit event to check placement with renderer
      this.scene.events.emit('piece:dragend', piece, pointer, renderer, (placed: boolean) => {
        if (placed) {
          // Piece was placed successfully
          slot.occupied = false;
          slot.pieceId = null;
          this.pieceRenderers.delete(piece.getId());

          // Container is destroyed by MainScene, just check for empty tray
          // Check if all slots empty
          if (this.areAllSlotsEmpty()) {
            this.scene.events.emit('tray:empty');
          }
        } else {
          // Return to original position and re-add to tray
          // First scale back to tray size
          renderer.scaleToTraySize();

          this.scene.tweens.add({
            targets: container,
            x: originalX,
            y: originalY,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
              // Move back to tray container
              this.scene.children.remove(container);
              this.container.add(container);
              container.setPosition(originalX, originalY);
              container.setDepth(10);
            }
          });
        }
      });
    });

    // Hover effects
    container.on('pointerover', () => {
      if (!renderer.isDragging()) {
        this.scene.tweens.add({
          targets: container,
          scale: 1.05,
          duration: 100
        });
      }
    });

    container.on('pointerout', () => {
      if (!renderer.isDragging()) {
        this.scene.tweens.add({
          targets: container,
          scale: 1,
          duration: 100
        });
      }
    });
  }

  /**
   * Check if all slots are empty
   */
  private areAllSlotsEmpty(): boolean {
    return this.pieceSlots.every(slot => !slot.occupied);
  }

  /**
   * Get remaining pieces
   */
  getRemainingPieces(): PieceModel[] {
    const pieces: PieceModel[] = [];

    this.pieceRenderers.forEach((renderer) => {
      pieces.push(renderer.getPiece());
    });

    return pieces;
  }

  /**
   * Get pieces for saving game state
   */
  getPiecesForSave(): Array<{ type: any; color: any; used: boolean }> {
    const pieces: Array<{ type: any; color: any; used: boolean }> = [];

    // Add current pieces in tray (not used)
    this.pieceRenderers.forEach((renderer) => {
      const piece = renderer.getPiece();
      pieces.push({
        type: piece.getShape(),
        color: piece.getColorIndex(),
        used: false
      });
    });

    // Fill remaining slots with empty markers if needed
    while (pieces.length < this.SLOT_COUNT) {
      pieces.push({
        type: null,
        color: 0,
        used: true
      });
    }

    return pieces;
  }

  /**
   * Restore pieces from saved game
   */
  restorePieces(savedPieces: Array<{ type: any; color: any; used: boolean }>): void {
    // Clear current pieces
    this.clear();

    // Create PieceModel instances from saved pieces that aren't used
    const piecesToRestore: PieceModel[] = [];
    savedPieces.forEach(savedPiece => {
      if (!savedPiece.used && savedPiece.type !== null) {
        piecesToRestore.push(new PieceModel(savedPiece.type, savedPiece.color));
      }
    });

    // Use setPieces to add them to the tray
    this.setPieces(piecesToRestore);
  }

  /**
   * Clear all pieces
   */
  clear(): void {
    this.pieceRenderers.forEach(renderer => renderer.destroy());
    this.pieceRenderers.clear();

    this.pieceSlots.forEach(slot => {
      slot.occupied = false;
      slot.pieceId = null;
    });
  }

  /**
   * Destroy the tray
   */
  destroy(): void {
    this.clear();
    this.container.destroy();
  }
}

interface PieceSlot {
  index: number;
  x: number;
  y: number;
  occupied: boolean;
  pieceId: string | null;
  background: Phaser.GameObjects.Graphics | null;
}