import { context, reddit } from '@devvit/web/server';

interface CreatePostOptions {
  origin?: string;
}

const baseSplashConfig = {
  appDisplayName: 'Hexomind',
  heading: 'Can you beat the high score?',
  description: 'Challenge the leaderboard. Set a new record. Become a legend.',
  buttonLabel: 'Beat The Record',
  backgroundUri: 'hexomind-splash.gif', // Use animated GIF as the background
  appIconUri: 'Icon@512.png',  // Keep the original icon - DO NOT CHANGE
} as const;

const textFallback = {
  text: 'Hexomind challenge: Beat the high score and claim your spot on the leaderboard!',
};

const postData = {
  layout: 'missingPieces',
};

export const createPost = async (options?: CreatePostOptions) => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  return await reddit.submitCustomPost({
    splash: baseSplashConfig,
    textFallback,
    postData: {
      ...postData,
      previewImage: 'hexomind-splash.gif', // Include the GIF splash as preview
    },
    subredditName,
    title: 'Hexomind — Daily Challenge',
  });
};

export const createChallengePost = async (
  title: string,
  _screenshotUrl?: string, // Keep for backward compatibility but unused
  options?: CreatePostOptions
) => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  // Always use hexomind-splash.png via baseSplashConfig
  return await reddit.submitCustomPost({
    splash: baseSplashConfig,
    textFallback: {
      text: title, // Use the challenge title as the text fallback
    },
    postData: {
      layout: 'challenge',
      challengeTitle: title,
      previewImage: 'hexomind-splash.gif', // Ensure preview uses same GIF splash
    },
    subredditName,
    title,
  });
};