import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, Root } from 'react-dom/client';

vi.mock('gsap', () => {
  const chained = {
    from: vi.fn().mockReturnThis(),
    to: vi.fn().mockReturnThis(),
    fromTo: vi.fn().mockReturnThis(),
    add: vi.fn().mockReturnThis(),
  };

  const timeline = () => ({ ...chained });

  return {
    gsap: {
      registerPlugin: vi.fn(),
      fromTo: vi.fn(),
      to: vi.fn(),
      killTweensOf: vi.fn(),
      timeline,
    },
  };
});

declare global {
  interface Window {
    game?: unknown;
  }
}

describe('game over flow', () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;
  let App: React.ComponentType | null = null;
  let useGameStore: typeof import('../src/client/ui/store/gameStore').useGameStore;
  let resolveGameOverFlowWithStore: typeof import('../src/client/game/utils/resolveGameOverFlow').resolveGameOverFlowWithStore;
  let dom: JSDOM | null = null;

  beforeEach(async () => {
    vi.resetModules();

    dom = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://example.com/',
      pretendToBeVisual: true,
    });

    const { window } = dom;
    vi.stubGlobal('window', window);
    vi.stubGlobal('document', window.document);
    vi.stubGlobal('navigator', window.navigator);
    vi.stubGlobal('localStorage', window.localStorage);
    vi.stubGlobal('sessionStorage', window.sessionStorage);
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const matchMediaMock = vi.fn().mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    window.matchMedia = matchMediaMock;
    vi.stubGlobal('matchMedia', matchMediaMock);

    const getComputedStyleMock = vi.fn().mockReturnValue({
      getPropertyValue: () => '',
      setProperty: () => undefined,
      removeProperty: () => undefined,
    });
    window.getComputedStyle = getComputedStyleMock as unknown as typeof window.getComputedStyle;
    vi.stubGlobal('getComputedStyle', getComputedStyleMock);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    });
    window.fetch = fetchMock as typeof fetch;
    vi.stubGlobal('fetch', fetchMock);

    const [appModule, storeModule, resolverModule] = await Promise.all([
      import('../src/client/ui/App'),
      import('../src/client/ui/store/gameStore'),
      import('../src/client/game/utils/resolveGameOverFlow'),
    ]);

    App = appModule.App;
    useGameStore = storeModule.useGameStore;
    resolveGameOverFlowWithStore = resolverModule.resolveGameOverFlowWithStore;

    container = window.document.createElement('div');
    window.document.body.appendChild(container);
    root = createRoot(container);
    useGameStore.setState((state) => ({
      ...state,
      gameState: 'idle',
      score: 0,
      highScore: 0,
      showNoSpaceToast: false,
      shareRescueOffer: null,
    }), true);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root!.unmount();
      });
    }
    if (container?.parentNode) {
      container.parentNode.removeChild(container);
    }
    root = null;
    container = null;
    App = null;
    vi.unstubAllGlobals();
    dom = null;
  });

  it('does not crash when setting a new high score during game over', async () => {
    if (!App) {
      throw new Error('App failed to load');
    }

    await act(async () => {
      root!.render(React.createElement(App!));
    });

    await act(async () => {
      useGameStore.setState({
        gameState: 'playing',
        score: 2_700,
        highScore: 2_700,
        showNoSpaceToast: false,
        shareRescueOffer: null,
      });
    });

    await expect(async () => {
      await act(async () => {
        await resolveGameOverFlowWithStore({
          score: 2_900,
          storeApi: {
            getState: () => useGameStore.getState(),
          },
          offerShareRescue: async () => false,
        });
      });
    }).not.toThrow();

    const state = useGameStore.getState();
    expect(state.gameState).toBe('gameOver');
    expect(state.score).toBe(2_900);
    expect(state.highScore).toBe(2_900);
  });
});
