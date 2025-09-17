import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

interface AnimatedScoreDisplayProps {
  score: number;
  highScore: number;
}

export const AnimatedScoreDisplay: React.FC<AnimatedScoreDisplayProps> = ({ score, highScore }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLDivElement>(null);
  const highScoreRef = useRef<HTMLDivElement>(null);
  const prevScoreRef = useRef(score);
  const prevHighScoreRef = useRef(highScore);

  // Register GSAP plugins
  gsap.registerPlugin(useGSAP);

  // Entrance animation
  useGSAP(() => {
    const tl = gsap.timeline();

    tl.from(containerRef.current, {
      scale: 0,
      opacity: 0,
      duration: 0.5,
      ease: 'back.out(1.7)',
    })
    .from(scoreRef.current, {
      y: 20,
      opacity: 0,
      duration: 0.3,
    }, '-=0.2')
    .from(highScoreRef.current, {
      y: 20,
      opacity: 0,
      duration: 0.3,
    }, '-=0.2');
  }, { scope: containerRef });

  // Score change animation
  useEffect(() => {
    if (score !== prevScoreRef.current && scoreRef.current) {
      // Animate score increase
      const diff = score - prevScoreRef.current;

      // Create floating number effect
      const floatingNumber = document.createElement('div');
      floatingNumber.className = 'absolute text-2xl font-bold text-gradient from-neon-yellow to-neon-orange pointer-events-none';
      floatingNumber.textContent = `+${diff}`;
      floatingNumber.style.left = '50%';
      floatingNumber.style.top = '50%';
      floatingNumber.style.transform = 'translate(-50%, -50%)';
      scoreRef.current.appendChild(floatingNumber);

      gsap.to(floatingNumber, {
        y: -50,
        opacity: 0,
        duration: 1,
        ease: 'power2.out',
        onComplete: () => floatingNumber.remove(),
      });

      // Pulse the score
      gsap.to(scoreRef.current, {
        scale: 1.2,
        duration: 0.2,
        ease: 'elastic.out(1, 0.3)',
        yoyo: true,
        repeat: 1,
      });

      // Animate number count up
      gsap.to(prevScoreRef, {
        current: score,
        duration: 0.5,
        ease: 'power2.out',
        onUpdate: () => {
          const displayScore = Math.round(prevScoreRef.current);
          const element = scoreRef.current?.querySelector('.score-number');
          if (element) {
            element.textContent = displayScore.toLocaleString();
          }
        },
      });
    }
    prevScoreRef.current = score;
  }, [score]);

  // High score animation
  useEffect(() => {
    if (highScore > prevHighScoreRef.current && highScoreRef.current) {
      // Celebrate new high score
      const tl = gsap.timeline();

      tl.to(highScoreRef.current, {
        scale: 1.3,
        duration: 0.3,
        ease: 'power2.out',
      })
      .to(highScoreRef.current, {
        rotateZ: 5,
        duration: 0.1,
        yoyo: true,
        repeat: 5,
        ease: 'power2.inOut',
      })
      .to(highScoreRef.current, {
        scale: 1,
        rotateZ: 0,
        duration: 0.3,
        ease: 'power2.out',
      });

      // Add glow effect
      gsap.to(highScoreRef.current, {
        boxShadow: '0 0 30px rgba(246, 224, 94, 0.8)',
        duration: 0.5,
        yoyo: true,
        repeat: 2,
      });
    }
    prevHighScoreRef.current = highScore;
  }, [highScore]);

  return (
    <div ref={containerRef} className="pointer-events-auto relative">
      {/* Glass container with GSAP-ready structure */}
      <div className="glass-effect rounded-3xl p-6 min-w-[200px] overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/10 to-neon-pink/10 animate-gradient-xy" />

        {/* Current Score */}
        <div ref={scoreRef} className="relative mb-2">
          <div className="text-sm text-white/60 mb-1">SCORE</div>
          <div className="text-4xl font-bold text-gradient from-neon-yellow to-neon-orange">
            <span className="score-number">{score.toLocaleString()}</span>
          </div>
        </div>

        {/* High Score */}
        <div ref={highScoreRef} className="relative pt-3 border-t border-white/10">
          <div className="text-xs text-white/50">BEST</div>
          <div className="text-lg font-semibold text-white/80">
            {highScore.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};