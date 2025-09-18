import { context, reddit } from '@devvit/web/server';

export const createPost = async () => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  return await reddit.submitCustomPost({
    splash: {
      appDisplayName: 'hexomind',
    },
    subredditName: subredditName,
    title: 'hexomind',
  });
};

export const createChallengePost = async (title: string, screenshotUrl?: string) => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  if (screenshotUrl) {
    const imageSources: [string] = [screenshotUrl];
    return await reddit.submitPost({
      subredditName: subredditName,
      title,
      kind: 'image',
      imageUrls: imageSources,
    });
  }

  return await reddit.submitCustomPost({
    splash: {
      appDisplayName: 'hexomind',
    },
    subredditName: subredditName,
    title: title,
  });
};
