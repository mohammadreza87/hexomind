import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../src/client/ui/store/gameStore';

describe('gameStore setScore behaviour', () => {
  const resetStore = () => {
    useGameStore.setState((state) => ({
      ...state,
      gameState: 'idle',
      score: 0,
      highScore: 0,
      combo: 0,
      level: 1,
      moves: 0,
      showNoSpaceToast: false,
      lineClearPopup: null,
      shareRescueOffer: null,
      shareStatus: {
        sharedToday: false,
        shareCountToday: 0,
        totalShares: 0,
        lastShareAt: null,
      },
    }));
  };

  beforeEach(() => {
    resetStore();
  });

  it('ignores duplicate score updates while playing', () => {
    const { setScore } = useGameStore.getState();

    setScore(1500);
    const afterFirstUpdate = useGameStore.getState();
    expect(afterFirstUpdate.score).toBe(1500);
    expect(afterFirstUpdate.highScore).toBe(1500);

    setScore(1500);
    const afterSecondUpdate = useGameStore.getState();

    expect(afterSecondUpdate).toBe(afterFirstUpdate);
    expect(afterSecondUpdate.score).toBe(1500);
    expect(afterSecondUpdate.highScore).toBe(1500);
  });

  it('keeps high score unchanged when updating final score after game over', () => {
    const { setScore, setGameState } = useGameStore.getState();

    setScore(2000);
    setGameState('gameOver');
    setScore(2100);

    const state = useGameStore.getState();
    expect(state.score).toBe(2100);
    expect(state.highScore).toBe(2000);
  });

  it('continues to update high score when a higher score is submitted', () => {
    const { setScore } = useGameStore.getState();

    setScore(500);
    setScore(2500);

    const state = useGameStore.getState();
    expect(state.score).toBe(2500);
    expect(state.highScore).toBe(2500);
  });
});
