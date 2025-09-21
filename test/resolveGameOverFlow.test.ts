import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveGameOverFlowWithStore } from '../src/client/game/utils/resolveGameOverFlow';

type StoreState = {
  highScore: number;
  setScore: (score: number) => void;
  setHighScore: (score: number) => void;
  setGameState: (state: 'idle' | 'playing' | 'paused' | 'gameOver' | 'sharePrompt') => void;
  setShareRescueOffer: (offer: unknown) => void;
};

type StoreApi = {
  getState: () => StoreState;
};

type StoreMocks = {
  storeApi: StoreApi;
  state: StoreState;
  setScore: ReturnType<typeof vi.fn>;
  setHighScore: ReturnType<typeof vi.fn>;
  setGameState: ReturnType<typeof vi.fn>;
  setShareRescueOffer: ReturnType<typeof vi.fn>;
};

const createStoreMocks = (initialHighScore = 0): StoreMocks => {
  const setScore = vi.fn();
  const setHighScore = vi.fn();
  const setGameState = vi.fn();
  const setShareRescueOffer = vi.fn();

  const state: StoreState = {
    highScore: initialHighScore,
    setScore: (value: number) => {
      setScore(value);
    },
    setHighScore: (value: number) => {
      state.highScore = value;
      setHighScore(value);
    },
    setGameState: (value) => {
      setGameState(value);
    },
    setShareRescueOffer: (value) => {
      setShareRescueOffer(value);
    },
  };

  const storeApi: StoreApi = {
    getState: () => state,
  };

  return {
    storeApi,
    state,
    setScore,
    setHighScore,
    setGameState,
    setShareRescueOffer,
  };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('resolveGameOverFlowWithStore', () => {
  it('transitions to game over when no share rescue is offered', async () => {
    const mocks = createStoreMocks(1_000);

    await resolveGameOverFlowWithStore({
      score: 1_500,
      storeApi: mocks.storeApi,
      offerShareRescue: async () => false,
    });

    expect(mocks.setShareRescueOffer).toHaveBeenCalledWith(null);
    expect(mocks.setScore).toHaveBeenCalledWith(1_500);
    expect(mocks.setHighScore).toHaveBeenCalledWith(1_500);
    expect(mocks.setGameState).toHaveBeenCalledWith('gameOver');
    expect(mocks.state.highScore).toBe(1_500);
  });

  it('keeps the game over UI mounted when the share rescue prompt is shown', async () => {
    const mocks = createStoreMocks(2_000);

    await resolveGameOverFlowWithStore({
      score: 2_750,
      storeApi: mocks.storeApi,
      offerShareRescue: async () => true,
    });

    expect(mocks.setShareRescueOffer).toHaveBeenCalledWith(null);
    expect(mocks.setScore).toHaveBeenCalledWith(2_750);
    expect(mocks.setHighScore).toHaveBeenCalledWith(2_750);
    expect(mocks.setGameState).toHaveBeenCalledWith('sharePrompt');
    expect(mocks.state.highScore).toBe(2_750);
  });
});
