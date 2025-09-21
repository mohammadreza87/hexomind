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

  const offeredRescue = await offerShareRescue();

  const latestState = storeApi.getState();
  if (score > latestState.highScore) {
    setHighScore(score);
  }

  setGameState(offeredRescue ? 'sharePrompt' : 'gameOver');
};
