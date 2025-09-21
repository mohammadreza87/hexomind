import React, { useState } from 'react';

interface ShareDialogProps {
  shareText: string;
  shareableUrl?: string;
  twitterUrl?: string;
  score: number;
  username: string;
  onClose: () => void;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  shareText,
  shareableUrl,
  twitterUrl,
  score,
  username,
  onClose
}) => {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareViaWebAPI = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Hexomind Challenge',
          text: shareText,
          url: window.location.href
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-auto">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md">
        <div className="relative rounded-2xl shadow-2xl"
             style={{
               backdropFilter: 'blur(12px) saturate(125%)',
               WebkitBackdropFilter: 'blur(12px) saturate(125%)',
               backgroundColor: 'rgba(17, 25, 40, 0.85)',
               border: '1px solid rgba(255, 255, 255, 0.15)'
             }}>

          <div className="space-y-4" style={{padding: '1.5rem'}}>
            {/* Header */}
            <div className="text-center">
              <h3 className="text-xl font-bold text-white mb-2">
                Share Your Score! 🎮
              </h3>
              <p className="text-sm text-white/70">
                Score: {score.toLocaleString()} points
              </p>
            </div>

            {/* Share Message */}
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-white/60 uppercase tracking-wider">Share Text</span>
                <button
                  onClick={() => copyToClipboard(shareText, 'text')}
                  className="text-xs text-cyan-400 hover:text-cyan-300"
                >
                  {copied === 'text' ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-sm text-white/90 break-words">
                {shareText}
              </p>
            </div>

            {/* Share Options */}
            <div className="space-y-3">
              {/* Twitter/X */}
              {twitterUrl && (
                <a
                  href={twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  Share on X (Twitter)
                </a>
              )}

              {/* Copy Link */}
              {shareableUrl && (
                <button
                  onClick={() => copyToClipboard(shareableUrl, 'url')}
                  className="w-full py-3 px-4 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  {copied === 'url' ? '✓ Link Copied!' : 'Copy Share Link'}
                </button>
              )}

              {/* Web Share API */}
              {navigator.share && (
                <button
                  onClick={shareViaWebAPI}
                  className="w-full py-3 px-4 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-400 font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a9.001 9.001 0 01-7.432 0m9.032-4.026A9.001 9.001 0 0112 3c-4.474 0-8.268 3.12-9.032 7.326m0 0A9.001 9.001 0 0012 21c4.474 0 8.268-3.12 9.032-7.326" />
                  </svg>
                  More Share Options
                </button>
              )}

              {/* Discord */}
              <button
                onClick={() => {
                  const discordText = `🔥 I just scored ${score.toLocaleString()} points in Hexomind! Can you beat my score? 🎮`;
                  copyToClipboard(discordText, 'discord');
                }}
                className="w-full py-3 px-4 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                {copied === 'discord' ? '✓ Copied for Discord!' : 'Copy for Discord'}
              </button>

              {/* Download Image */}
              <button
                onClick={() => {
                  // Generate a score card image
                  const canvas = document.createElement('canvas');
                  canvas.width = 800;
                  canvas.height = 400;
                  const ctx = canvas.getContext('2d');

                  if (ctx) {
                    // Background gradient
                    const gradient = ctx.createLinearGradient(0, 0, 800, 400);
                    gradient.addColorStop(0, '#1a1a2e');
                    gradient.addColorStop(1, '#16213e');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, 0, 800, 400);

                    // Title
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 48px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('HEXOMIND', 400, 80);

                    // Score
                    ctx.fillStyle = '#f39c12';
                    ctx.font = 'bold 72px Arial';
                    ctx.fillText(score.toLocaleString(), 400, 200);

                    // Label
                    ctx.fillStyle = '#ecf0f1';
                    ctx.font = '24px Arial';
                    ctx.fillText('POINTS', 400, 240);

                    // Player
                    ctx.font = '32px Arial';
                    ctx.fillText(`Player: ${username}`, 400, 320);

                    // Download
                    const link = document.createElement('a');
                    link.download = `hexomind-score-${score}.png`;
                    link.href = canvas.toDataURL();
                    link.click();
                  }
                }}
                className="w-full py-3 px-4 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Download Score Card
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white/70 font-semibold text-sm transition-all duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};