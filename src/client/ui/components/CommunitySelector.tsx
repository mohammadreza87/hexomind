import React, { useState, useEffect } from 'react';

interface CommunitySelectorProps {
  onShare: (subreddit: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface UserProfileOption {
  id: string;
  label: string;
  type: string;
}

export const CommunitySelector: React.FC<CommunitySelectorProps> = ({
  onShare,
  onCancel,
  isLoading = false
}) => {
  const [communities, setCommunities] = useState<string[]>([]);
  const [userProfileOptions, setUserProfileOptions] = useState<UserProfileOption[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [selectedCommunity, setSelectedCommunity] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommunities();
  }, []);

  const fetchCommunities = async () => {
    try {
      const response = await fetch('/api/gaming-communities');
      const data = await response.json();
      setCommunities(data.communities || []);
      setUserProfileOptions(data.userProfileOptions || []);
      setCurrentUser(data.currentUser || null);
    } catch (error) {
      console.error('Failed to fetch communities:', error);
      // Fallback to default communities
      setCommunities([
        'gaming',
        'IndieGaming',
        'WebGames',
        'casualgames',
        'puzzles',
        'hexomind'
      ]);
      setUserProfileOptions([]);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (selectedCommunity) {
      onShare(selectedCommunity);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-auto">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />

      <div className="relative w-full max-w-sm">
        <div className="relative rounded-2xl shadow-2xl"
             style={{
               backdropFilter: 'blur(12px) saturate(125%)',
               WebkitBackdropFilter: 'blur(12px) saturate(125%)',
               backgroundColor: 'rgba(17, 25, 40, 0.75)',
               border: '1px solid rgba(255, 255, 255, 0.15)'
             }}>

          <div className="space-y-4" style={{padding: '1.5rem'}}>
            <h3 className="text-xl font-bold text-white text-center">
              Share to Community
            </h3>

            <p className="text-sm text-white/70 text-center">
              Choose a community to share your achievement
            </p>

            <div className="text-xs text-yellow-400/80 text-center bg-yellow-400/10 rounded-lg p-2">
              ⚠️ Note: Sharing to other subreddits only works if Hexomind is installed there
            </div>

            {loading ? (
              <div className="text-center text-white/60 py-4">Loading communities...</div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-xs text-white/60 uppercase tracking-wider">
                    Select Community
                  </label>
                  <select
                    value={selectedCommunity}
                    onChange={(e) => setSelectedCommunity(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-white/10 text-white border border-white/20
                               focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                               transition-all duration-200"
                    disabled={isLoading}
                  >
                    <option value="" className="bg-gray-900">Choose where to share...</option>

                    {/* Current Subreddit Option */}
                    <option value="current" className="bg-gray-900">📍 Current Subreddit</option>

                    {/* User Profile Options */}
                    {userProfileOptions.length > 0 && (
                      <optgroup label="Your Profile" className="bg-gray-900">
                        {userProfileOptions.map(option => (
                          <option key={option.id} value={option.id} className="bg-gray-900">
                            👤 {option.label}
                          </option>
                        ))}
                      </optgroup>
                    )}

                    {/* Popular Gaming Communities */}
                    <optgroup label="Popular Gaming Communities" className="bg-gray-900">
                      <option value="gaming" className="bg-gray-900">🎮 r/gaming (32M members)</option>
                      <option value="IndieGaming" className="bg-gray-900">🎯 r/IndieGaming (2M members)</option>
                      <option value="WebGames" className="bg-gray-900">🌐 r/WebGames (500K members)</option>
                      <option value="casualgames" className="bg-gray-900">🎲 r/casualgames (200K members)</option>
                    </optgroup>

                    {/* Puzzle & Strategy Communities */}
                    <optgroup label="Puzzle & Strategy" className="bg-gray-900">
                      <option value="puzzlegames" className="bg-gray-900">🧩 r/puzzlegames</option>
                      <option value="hexagon" className="bg-gray-900">⬡ r/hexagon</option>
                      <option value="incremental_games" className="bg-gray-900">📈 r/incremental_games</option>
                    </optgroup>

                    {/* Mobile Gaming */}
                    <optgroup label="Mobile Gaming" className="bg-gray-900">
                      <option value="mobilegaming" className="bg-gray-900">📱 r/mobilegaming</option>
                      <option value="iosgaming" className="bg-gray-900">🍎 r/iosgaming</option>
                      <option value="AndroidGaming" className="bg-gray-900">🤖 r/AndroidGaming</option>
                    </optgroup>

                    {/* Game Development */}
                    <optgroup label="Game Development" className="bg-gray-900">
                      <option value="playmygame" className="bg-gray-900">🎮 r/playmygame</option>
                      <option value="gamedev" className="bg-gray-900">⚙️ r/gamedev</option>
                      <option value="indiedev" className="bg-gray-900">💡 r/indiedev</option>
                    </optgroup>

                    {/* Additional Communities from API */}
                    {communities.filter(sub => !['gaming', 'IndieGaming', 'WebGames', 'casualgames', 'puzzlegames', 'hexagon', 'mobilegaming', 'incremental_games', 'playmygame', 'gamedev', 'indiedev', 'iosgaming', 'AndroidGaming'].includes(sub)).length > 0 && (
                      <optgroup label="Other Communities" className="bg-gray-900">
                        {communities.filter(sub => !['gaming', 'IndieGaming', 'WebGames', 'casualgames', 'puzzlegames', 'hexagon', 'mobilegaming', 'incremental_games', 'playmygame', 'gamedev', 'indiedev', 'iosgaming', 'AndroidGaming'].includes(sub)).map(sub => (
                          <option key={sub} value={sub} className="bg-gray-900">
                            r/{sub}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={onCancel}
                    disabled={isLoading}
                    className="flex-1 py-3 px-4 rounded-xl bg-white/10 text-white/70 font-semibold
                               text-sm tracking-wide border border-white/10 transition-all duration-200
                               hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleShare}
                    disabled={!selectedCommunity || isLoading}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500
                               text-white font-semibold text-sm tracking-wide shadow-lg
                               transition-all duration-200 hover:shadow-xl hover:scale-105
                               active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                               disabled:hover:scale-100"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin">⏳</span>
                        Sharing...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <span>🚀</span>
                        Share
                      </span>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};