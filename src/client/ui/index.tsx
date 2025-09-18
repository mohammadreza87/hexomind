import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { useGameStore } from './store/gameStore';
import '../styles/tailwind.css';

// Expose game store globally for Phaser integration
declare global {
  interface Window {
    gameStore?: typeof useGameStore;
  }
}

/**
 * Initialize React UI overlay
 * Called after Phaser game is initialized
 */
export function initializeReactUI(): void {
  // Create a div for React to mount into
  const reactRoot = document.createElement('div');
  reactRoot.id = 'react-ui-root';
  reactRoot.className = 'fixed inset-0 pointer-events-none z-50'; // Higher z-index for UI overlay
  document.body.appendChild(reactRoot);

  // Expose game store globally
  window.gameStore = useGameStore;

  // Mount React app
  const root = createRoot(reactRoot);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  console.log('React UI initialized successfully');
}

/**
 * Clean up React UI
 */
export function destroyReactUI(): void {
  const reactRoot = document.getElementById('react-ui-root');
  if (reactRoot) {
    reactRoot.remove();
  }
}