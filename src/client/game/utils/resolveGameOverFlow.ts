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
  let storeState: GameStoreState;
  try {
    storeState = storeApi.getState();
  } catch (error) {
    logger.error('[GameOverFlow] Unable to access game store state during game over flow:', error);
    return;
  }

  const {
    setScore,
    setHighScore,
    setGameState,
    setShareRescueOffer,
  } = storeState;

  const safeStoreCall = <T>(action: () => T, message: string): T | undefined => {
    try {
      return action();
    } catch (error) {
      logger.error(message, error);
      return undefined;
    }
  };

  safeStoreCall(() => setShareRescueOffer(null), '[GameOverFlow] Failed to reset share rescue offer during game over flow:');
  safeStoreCall(() => setScore(score), '[GameOverFlow] Failed to sync score during game over flow:');

  // Ensure the UI transitions to the game over state immediately so the panel is shown
  safeStoreCall(() => setGameState('gameOver'), '[GameOverFlow] Failed to transition to game over state:');

  let offeredRescue = false;
  try {
    offeredRescue = await offerShareRescue();
  } catch (error) {
    logger.error('[GameOverFlow] Failed to resolve share rescue offer:', error);
  }

  const latestState = safeStoreCall(() => storeApi.getState(), '[GameOverFlow] Failed to read latest store state during game over flow:');
  if (latestState && score > latestState.highScore) {
    safeStoreCall(() => setHighScore(score), '[GameOverFlow] Failed to update high score from game over flow:');
  }

  if (offeredRescue) {
    safeStoreCall(() => setGameState('sharePrompt'), '[GameOverFlow] Failed to transition to share prompt state:');
  }
};
