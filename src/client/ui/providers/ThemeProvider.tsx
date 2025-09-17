import React, { useEffect, createContext, useContext } from 'react';
import { designSystem } from '../../design/tokens';
import { useUIStore } from '../store/uiStore';

interface ThemeContextValue {
  theme: 'dark' | 'light' | 'auto';
  tokens: typeof designSystem;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const theme = useUIStore((state) => state.theme);

  useEffect(() => {
    // Inject CSS variables
    const cssVariables = designSystem.getCSSVariables();
    const root = document.documentElement;

    Object.entries(cssVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Apply theme class
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      root.classList.toggle('dark', mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => {
        root.classList.toggle('dark', e.matches);
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, tokens: designSystem }}>
      {children}
    </ThemeContext.Provider>
  );
};