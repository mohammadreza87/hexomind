import { logger } from '../../utils/logger';

export type GameStateValue = 'idle' | 'playing' | 'paused' | 'gameOver' | 'sharePrompt';

interface GameStoreState {
  highScore: number;
  setScore: (score: number) => void;
  setHighScore: (highScore: number) => void;
  setGameState: (state: GameStateValue) => void;
  setShareRescueOffer: (offer: unknown) => void;
}

export interface GameStoreApi {
  getState: () => GameStoreState;
}

interface ResolveGameOverFlowOptions {
  score: number;
  storeApi: GameStoreApi;
  offerShareRescue: () => Promise<boolean>;
}

export const resolveGameOverFlowWithStore = async ({
  score,
  storeApi,
  offerShareRescue,
}: ResolveGameOverFlowOptions): Promise<void> => {
  const {
    setScore,
    setHighScore,
    setGameState,
    setShareRescueOffer,
  } = storeApi.getState();

  setShareRescueOffer(null);
  setScore(score);

  // Ensure the UI transitions to the game over state immediately so the panel is shown
  setGameState('gameOver');

  let offeredRescue = false;
  try {
    offeredRescue = await offerShareRescue();
  } catch (error) {
    logger.error('[GameOverFlow] Failed to resolve share rescue offer:', error);
  }

  try {
    const latestState = storeApi.getState();
    if (score > latestState.highScore) {
      setHighScore(score);
    }
  } catch (error) {
    logger.error('[GameOverFlow] Failed to update high score from game over flow:', error);
  }

  if (offeredRescue) {
    setGameState('sharePrompt');
  }
};
