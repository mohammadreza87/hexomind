import React, { useEffect } from 'react';
import { gsap } from 'gsap';

interface LineClearPopupProps {
  lines: number;
  score: number;
  onComplete: () => void;
}

export const LineClearPopup: React.FC<LineClearPopupProps> = ({ lines, score, onComplete }) => {

  // Get compliment based on lines cleared
  const getCompliment = (linesCleared: number): string => {
    if (linesCleared === 1) {
      const compliments = ['NICE!', 'GOOD!', 'COOL!'];
      return compliments[Math.floor(Math.random() * compliments.length)];
    } else if (linesCleared === 2) {
      const compliments = ['GREAT!', 'AWESOME!', 'DOUBLE!'];
      return compliments[Math.floor(Math.random() * compliments.length)];
    } else if (linesCleared === 3) {
      const compliments = ['EXCELLENT!', 'TRIPLE!', 'AMAZING!'];
      return compliments[Math.floor(Math.random() * compliments.length)];
    } else if (linesCleared === 4) {
      const compliments = ['PERFECT!', 'QUADRUPLE!', 'INCREDIBLE!'];
      return compliments[Math.floor(Math.random() * compliments.length)];
    } else {
      const compliments = ['UNBELIEVABLE!', 'LEGENDARY!', 'UNSTOPPABLE!'];
      return compliments[Math.floor(Math.random() * compliments.length)];
    }
  };

  // Get gradient colors based on lines cleared
  const getGradientClass = (linesCleared: number): string => {
    if (linesCleared === 1) {
      return 'from-cyan-400 via-blue-400 to-purple-400';
    } else if (linesCleared === 2) {
      return 'from-green-400 via-emerald-400 to-cyan-400';
    } else if (linesCleared === 3) {
      return 'from-purple-400 via-pink-400 to-rose-400';
    } else if (linesCleared === 4) {
      return 'from-yellow-400 via-orange-400 to-red-400';
    } else {
      return 'from-red-400 via-pink-400 to-purple-400';
    }
  };

  useEffect(() => {
    // Animate popup sliding down from top - faster
    gsap.fromTo(
      '.line-clear-popup',
      {
        opacity: 0,
        y: -30,
        scale: 0.8,
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.25,
        ease: 'power2.out',
      }
    );

    // Animate compliment text with pulse - faster
    gsap.to('.compliment-text', {
      scale: 1.1,
      duration: 0.2,
      yoyo: true,
      repeat: 1,
      ease: 'power2.inOut',
      delay: 0.1,
    });

    // Animate score with counter effect - faster
    const obj = { value: 0 };
    gsap.to(obj, {
      value: score,
      duration: 0.4,
      delay: 0.15,
      ease: 'power2.out',
      onUpdate: function() {
        const scoreElement = document.querySelector('.score-value');
        if (scoreElement) {
          scoreElement.textContent = `+${Math.round(obj.value)}`;
        }
      },
    });

    // Auto-hide after delay - faster, slide up
    const timer = setTimeout(() => {
      gsap.to('.line-clear-popup', {
        scale: 0.8,
        opacity: 0,
        y: -20,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: onComplete,
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [score, onComplete]);

  const compliment = getCompliment(lines);
  const gradientClass = getGradientClass(lines);

  return (
    <div className="fixed top-24 left-0 right-0 z-40 flex justify-center pointer-events-none">
      {/* Popup with glassmorphism - 40% smaller, positioned above grid */}
      <div className="line-clear-popup">
        <div className="relative rounded-xl shadow-2xl"
             style={{
               backdropFilter: 'blur(12px) saturate(115%)',
               WebkitBackdropFilter: 'blur(12px) saturate(115%)',
               backgroundColor: 'rgba(17, 25, 40, 0.36)',
               border: '1px solid rgba(255, 255, 255, 0.125)',
               padding: '0.9rem 1.2rem'
             }}>

          {/* Compliment Text */}
          <div className="text-center">
            <div className={`compliment-text text-base font-bold bg-gradient-to-r ${gradientClass} bg-clip-text text-transparent`}>
              {compliment}
            </div>

            {/* Score */}
            <div className="score-value text-sm font-bold text-white/90 mt-1">
              +{score}
            </div>
          </div>

          {/* Decorative glow based on lines cleared */}
          <div className={`absolute -top-4 -left-4 w-8 h-8 bg-gradient-to-r ${gradientClass} opacity-30 rounded-full blur-xl`} />
          <div className={`absolute -bottom-4 -right-4 w-8 h-8 bg-gradient-to-r ${gradientClass} opacity-30 rounded-full blur-xl`} />
        </div>
      </div>
    </div>
  );
};