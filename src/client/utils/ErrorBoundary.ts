import { logger } from './logger';

/**
 * Error boundary utilities for Phaser game
 * Provides graceful error handling and recovery
 */

export class GameErrorBoundary {
  private static instance: GameErrorBoundary;
  private errorHandlers: Map<string, (error: Error) => void> = new Map();
  private recoveryStrategies: Map<string, () => void> = new Map();

  static getInstance(): GameErrorBoundary {
    if (!GameErrorBoundary.instance) {
      GameErrorBoundary.instance = new GameErrorBoundary();
    }
    return GameErrorBoundary.instance;
  }

  constructor() {
    this.setupGlobalErrorHandlers();
  }

  private setupGlobalErrorHandlers(): void {
    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      console.error('Global error caught:', event.error);
      this.handleError(event.error, 'global');
      event.preventDefault();
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.handleError(new Error(event.reason), 'promise');
      event.preventDefault();
    });
  }

  /**
   * Register an error handler for a specific context
   */
  registerErrorHandler(context: string, handler: (error: Error) => void): void {
    this.errorHandlers.set(context, handler);
  }

  /**
   * Register a recovery strategy for a specific context
   */
  registerRecoveryStrategy(context: string, strategy: () => void): void {
    this.recoveryStrategies.set(context, strategy);
  }

  /**
   * Handle an error with context-specific handling
   */
  handleError(error: Error, context: string = 'general'): void {
    // Log error for debugging
    console.error(`[${context}] Error:`, error);

    // Try context-specific handler first
    const handler = this.errorHandlers.get(context);
    if (handler) {
      try {
        handler(error);
        return;
      } catch (handlerError) {
        console.error('Error handler failed:', handlerError);
      }
    }

    // Fallback to general error handling
    this.handleGeneralError(error, context);
  }

  private handleGeneralError(error: Error, context: string): void {
    // Check for specific error types
    if (error.message.includes('asset') || error.message.includes('load')) {
      this.handleAssetError(error);
    } else if (error.message.includes('tween') || error.message.includes('animation')) {
      this.handleAnimationError(error);
    } else if (error.message.includes('render')) {
      this.handleRenderError(error);
    } else {
      this.showErrorNotification(error, context);
    }

    // Try recovery strategy
    this.attemptRecovery(context);
  }

  private handleAssetError(error: Error): void {
    logger.warn('Asset loading error, attempting fallback:', error);
    // Could implement fallback assets or retry logic here
    this.showErrorNotification(new Error('Some game assets failed to load. The game may not display correctly.'), 'assets');
  }

  private handleAnimationError(error: Error): void {
    logger.warn('Animation error, disabling animations:', error);
    // Disable animations as fallback
    this.showErrorNotification(new Error('Animation error detected. Some animations have been disabled.'), 'animation');
  }

  private handleRenderError(error: Error): void {
    logger.warn('Rendering error:', error);
    this.showErrorNotification(new Error('Rendering issue detected. Please refresh the page if the game does not display correctly.'), 'render');
  }

  private showErrorNotification(error: Error, context: string): void {
    // Create a non-intrusive error notification
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(255, 0, 0, 0.9);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 14px;
      z-index: 10000;
      max-width: 400px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s ease-out;
    `;

    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">⚠️ Error (${context})</div>
      <div>${error.message}</div>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  private attemptRecovery(context: string): void {
    const strategy = this.recoveryStrategies.get(context);
    if (strategy) {
      try {
        logger.debug(`Attempting recovery for context: ${context}`);
        strategy();
      } catch (recoveryError) {
        console.error('Recovery strategy failed:', recoveryError);
      }
    }
  }

  /**
   * Wrap a function with error handling
   */
  wrap<T extends (...args: any[]) => any>(
    fn: T,
    context: string = 'wrapped'
  ): T {
    return ((...args: Parameters<T>) => {
      try {
        const result = fn(...args);
        if (result instanceof Promise) {
          return result.catch((error) => {
            this.handleError(error, context);
            throw error;
          });
        }
        return result;
      } catch (error) {
        this.handleError(error as Error, context);
        throw error;
      }
    }) as T;
  }

  /**
   * Safe execution with fallback
   */
  safeExecute<T>(
    fn: () => T,
    fallback: T,
    context: string = 'safe'
  ): T {
    try {
      return fn();
    } catch (error) {
      this.handleError(error as Error, context);
      return fallback;
    }
  }
}

// Add CSS animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

export const errorBoundary = GameErrorBoundary.getInstance();
