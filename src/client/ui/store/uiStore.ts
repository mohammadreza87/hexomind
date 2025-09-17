import { create } from 'zustand';

interface UIStore {
  // UI visibility states
  showMenu: boolean;
  showLeaderboard: boolean;
  showSettings: boolean;
  showTutorial: boolean;

  // Theme
  theme: 'dark' | 'light' | 'auto';
  soundEnabled: boolean;
  hapticEnabled: boolean;

  // Actions
  toggleMenu: () => void;
  toggleLeaderboard: () => void;
  toggleSettings: () => void;
  toggleTutorial: () => void;
  setShowMenu: (show: boolean) => void;
  setShowLeaderboard: (show: boolean) => void;
  setTheme: (theme: UIStore['theme']) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setHapticEnabled: (enabled: boolean) => void;
  closeAllPanels: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  // Initial state
  showMenu: false,
  showLeaderboard: false,
  showSettings: false,
  showTutorial: false,
  theme: 'dark',
  soundEnabled: true,
  hapticEnabled: true,

  // Actions
  toggleMenu: () => set((state) => ({
    showMenu: !state.showMenu,
    showLeaderboard: false,
    showSettings: false,
  })),
  toggleLeaderboard: () => set((state) => ({
    showLeaderboard: !state.showLeaderboard,
    showMenu: false,
    showSettings: false,
  })),
  toggleSettings: () => set((state) => ({
    showSettings: !state.showSettings,
    showMenu: false,
    showLeaderboard: false,
  })),
  toggleTutorial: () => set((state) => ({
    showTutorial: !state.showTutorial,
  })),
  setShowMenu: (show) => set({ showMenu: show }),
  setShowLeaderboard: (show) => set({ showLeaderboard: show }),
  setTheme: (theme) => set({ theme }),
  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
  setHapticEnabled: (enabled) => set({ hapticEnabled: enabled }),
  closeAllPanels: () => set({
    showMenu: false,
    showLeaderboard: false,
    showSettings: false,
    showTutorial: false,
  }),
}));