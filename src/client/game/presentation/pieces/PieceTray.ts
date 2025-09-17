import * as Phaser from 'phaser';
import { PieceRenderer } from './PieceRenderer';
import { PieceModel } from '../../core/models/PieceModel';
import { NeonThemeProvider } from '../theme/NeonThemeProvider';
import { GameLayoutManager, LayoutMetrics } from '../../layout/GameLayoutManager';

/**
 * PieceTray - Manages the display and interaction of available pieces
 * Shows 3 pieces below the main board for drag-and-drop placement
 */
export class PieceTray {
  private scene: Phaser.Scene;
  private themeProvider: NeonThemeProvider;
  private layout: GameLayoutManager;
  private layoutMetrics: LayoutMetrics;
  private layoutUnsubscribe?: () => void;
  private container: Phaser.GameObjects.Container;

  private pieceSlots: PieceSlot[] = [];
  private pieceRenderers: Map<string, PieceRenderer> = new Map();

  private readonly SLOT_COUNT = 3;
  private slotSize: number = 150;
  private slotSpacing: number = 24;
  private trayYPosition: number = 0;
  private readonly targetSlotPhysical = 180;
  private readonly minSlotPhysical = 132;
  private readonly maxSlotPhysical = 236;
  private readonly targetSpacingPhysical = 36;

  constructor(scene: Phaser.Scene, themeProvider: NeonThemeProvider, layout: GameLayoutManager) {
    this.scene = scene;
    this.themeProvider = themeProvider;
    this.layout = layout;
    this.layoutMetrics = this.layout.getMetrics();

    this.container = scene.add.container(0, 0);
    this.container.setDepth(100);

    this.setupSlots();
    this.applyLayout(this.layoutMetrics, true);

    this.layoutUnsubscribe = this.layout.onChange(metrics => {
      this.applyLayout(metrics);
    });

    this.scene.events.once(Phaser.Scenes.Events.DESTROY, () => {
      this.layoutUnsubscribe?.();
    });
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

      const bg = this.scene.add.graphics();
      bg.fillStyle(theme.cellEmptyAlt, 0.15);
      bg.lineStyle(1, theme.borderSubtle, 0.25);
      const halfSize = this.slotSize / 2;
      bg.fillRoundedRect(-halfSize, -halfSize, this.slotSize, this.slotSize, 10);
      bg.strokeRoundedRect(-halfSize, -halfSize, this.slotSize, this.slotSize, 10);

      slot.background = bg;
      this.container.add(bg);
      this.pieceSlots.push(slot);
    }
  }

  private applyLayout(metrics: LayoutMetrics, force: boolean = false): void {
    this.layoutMetrics = metrics;
    const trayArea = metrics.pieceTrayArea;

    if (trayArea.width <= 0 || trayArea.height <= 0) {
      return;
    }

    const inverseZoom = metrics.zoom > 0 ? 1 / metrics.zoom : 1;
    let slotSize = Phaser.Math.Clamp(
      this.targetSlotPhysical * inverseZoom,
      this.minSlotPhysical * inverseZoom,
      Math.min(this.maxSlotPhysical * inverseZoom, trayArea.height * 0.88)
    );
    let spacing = Phaser.Math.Clamp(
      this.targetSpacingPhysical * inverseZoom,
      slotSize * 0.08,
      trayArea.width * 0.2
    );

    let occupiedWidth = slotSize * this.SLOT_COUNT + spacing * (this.SLOT_COUNT - 1);

    if (occupiedWidth > trayArea.width) {
      const availableWidth = trayArea.width - spacing * (this.SLOT_COUNT - 1);
      slotSize = Math.max(availableWidth / this.SLOT_COUNT, this.minSlotPhysical * inverseZoom * 0.7);
      occupiedWidth = slotSize * this.SLOT_COUNT + spacing * (this.SLOT_COUNT - 1);

      if (occupiedWidth > trayArea.width) {
        spacing = Math.max(
          (trayArea.width - slotSize * this.SLOT_COUNT) / Math.max(this.SLOT_COUNT - 1, 1),
          slotSize * 0.05
        );
        occupiedWidth = slotSize * this.SLOT_COUNT + spacing * (this.SLOT_COUNT - 1);
      }
    }

    this.slotSize = slotSize;
    this.slotSpacing = spacing;
    this.trayYPosition = trayArea.y + trayArea.height / 2;

    const startX = trayArea.x + (trayArea.width - occupiedWidth) / 2 + slotSize / 2;
    const theme = this.themeProvider.getTheme();

    this.pieceSlots.forEach((slot, index) => {
      slot.x = startX + index * (slotSize + spacing);
      slot.y = this.trayYPosition;

      if (slot.background) {
        slot.background.clear();
        slot.background.fillStyle(theme.cellEmptyAlt, 0.15);
        slot.background.lineStyle(1, theme.borderSubtle, 0.25);
        const halfSize = slotSize / 2;
        const cornerRadius = Math.min(halfSize, 12);
        slot.background.fillRoundedRect(-halfSize, -halfSize, slotSize, slotSize, cornerRadius);
        slot.background.strokeRoundedRect(-halfSize, -halfSize, slotSize, slotSize, cornerRadius);
        slot.background.setPosition(slot.x, slot.y);
      }

      if (slot.pieceId) {
        const renderer = this.pieceRenderers.get(slot.pieceId);
        if (renderer) {
          renderer.setPosition(slot.x, slot.y);
          this.fitRendererToSlot(renderer);
          this.updatePieceInteraction(renderer);
          renderer.syncDepthBase();
        }
      }
    });

    if (force) {
      // Ensure initial pieces (if any) are positioned
      this.pieceRenderers.forEach(renderer => {
        this.fitRendererToSlot(renderer);
        this.updatePieceInteraction(renderer);
        renderer.syncDepthBase();
      });
    }
  }

  private fitRendererToSlot(renderer: PieceRenderer): void {
    const container = renderer.getContainer();
    const bounds = container.getBounds();
    const maxDimension = Math.max(bounds.width, bounds.height);

    if (maxDimension > 0) {
      const targetDimension = this.slotSize * 0.72;
      const scale = targetDimension / maxDimension;
      container.setScale(scale);
    }
  }

  private updatePieceInteraction(renderer: PieceRenderer): void {
    const container = renderer.getContainer();
    const hitSize = this.slotSize * 0.8;
    if (container.input?.hitArea instanceof Phaser.Geom.Rectangle) {
      container.input.hitArea.setTo(-hitSize / 2, -hitSize / 2, hitSize, hitSize);
    }
  }

  /**
   * Add pieces to the tray
   */
  setPieces(pieces: PieceModel[]): void {
    this.clear();

    pieces.forEach((piece, index) => {
      if (index >= this.SLOT_COUNT) return;

      const slot = this.pieceSlots[index];
      const renderer = new PieceRenderer(this.scene, piece, this.themeProvider);
      const pieceContainer = renderer.getContainer();

      renderer.setPosition(slot.x, slot.y);
      this.fitRendererToSlot(renderer);
      this.updatePieceInteraction(renderer);

      slot.occupied = true;
      slot.pieceId = piece.getId();
      this.pieceRenderers.set(piece.getId(), renderer);

      this.container.add(pieceContainer);
      pieceContainer.setDepth(10);
      pieceContainer.setVisible(true);
      renderer.syncDepthBase();

      this.enableDrag(renderer, piece, slot);
    });
  }

  /**
   * Enable drag and drop for a piece
   */
  private enableDrag(renderer: PieceRenderer, piece: PieceModel, slot: PieceSlot): void {
    const container = renderer.getContainer();

    const hitSize = this.slotSize * 0.8;
    container.setInteractive({
      draggable: true,
      hitArea: new Phaser.Geom.Rectangle(-hitSize / 2, -hitSize / 2, hitSize, hitSize),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains
    });

    // Store original position
    const originalX = slot.x;
    const originalY = slot.y;

    // Drag start
    container.on('dragstart', (pointer: Phaser.Input.Pointer) => {
      this.container.remove(container);
      this.scene.add.existing(container);
      container.setDepth(200);

      renderer.setDragging(true);
      container.x = pointer.x;
      container.y = pointer.y;

      this.scene.events.emit('piece:dragstart', piece, pointer, renderer);
    });

    // Dragging
    container.on('drag', (pointer: Phaser.Input.Pointer, _dragX: number, _dragY: number) => {
      container.x = pointer.x;
      container.y = pointer.y;

      this.scene.events.emit('piece:drag', piece, pointer);
    });

    // Drag end
    container.on('dragend', (pointer: Phaser.Input.Pointer) => {
      renderer.setDragging(false);

      this.scene.events.emit('piece:dragend', piece, pointer, renderer, (placed: boolean) => {
        if (placed) {
          slot.occupied = false;
          slot.pieceId = null;
          this.pieceRenderers.delete(piece.getId());

          if (this.areAllSlotsEmpty()) {
            this.scene.events.emit('tray:empty');
          }
        } else {
          // Return to original position
          renderer.scaleToTraySize();
          container.x = originalX;
          container.y = originalY;
          this.container.add(container);
          container.setDepth(10);
          renderer.syncDepthBase();
          this.fitRendererToSlot(renderer);
          this.updatePieceInteraction(renderer);

          // Reset slot state
          slot.occupied = true;
          slot.pieceId = piece.getId();

          // Ensure visibility and scaling are correct after snapping back
          this.scene.tweens.add({
            targets: container,
            scaleX: container.scale,
            scaleY: container.scale,
            duration: 150,
            ease: 'Power2',
            onComplete: () => {
              container.setDepth(10);
              renderer.syncDepthBase();
            }
          });
        }
      });
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

    this.pieceRenderers.forEach(renderer => {
      pieces.push(renderer.getPiece());
    });

    return pieces;
  }

  /**
   * Get pieces for saving game state
   */
  getPiecesForSave(): Array<{ type: any; color: any; used: boolean }> {
    const pieces: Array<{ type: any; color: any; used: boolean }> = [];

    this.pieceRenderers.forEach(renderer => {
      const piece = renderer.getPiece();
      pieces.push({
        type: piece.getShape(),
        color: piece.getColorIndex(),
        used: false
      });
    });

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
    this.clear();

    const piecesToRestore: PieceModel[] = [];
    savedPieces.forEach(savedPiece => {
      if (!savedPiece.used && savedPiece.type !== null) {
        piecesToRestore.push(new PieceModel(savedPiece.type, savedPiece.color));
      }
    });

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
    this.layoutUnsubscribe?.();
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
