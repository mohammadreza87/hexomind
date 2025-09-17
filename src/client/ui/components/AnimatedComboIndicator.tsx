import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

interface AnimatedComboIndicatorProps {
  combo: number;
}

export const AnimatedComboIndicator: React.FC<AnimatedComboIndicatorProps> = ({ combo }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);

  const getComboColor = () => {
    if (combo >= 5) return 'from-neon-red to-neon-pink';
    if (combo >= 3) return 'from-neon-purple to-neon-blue';
    return 'from-neon-cyan to-neon-green';
  };

  const getComboText = () => {
    if (combo >= 5) return 'MEGA COMBO!';
    if (combo >= 3) return 'SUPER COMBO!';
    return `${combo}x COMBO`;
  };

  // Entrance and combo animations
  useGSAP(() => {
    if (!containerRef.current || combo === 0) return;

    // Reset any ongoing animations
    gsap.killTweensOf([containerRef.current, textRef.current]);

    // Main timeline for combo effect
    const tl = gsap.timeline();

    // Entrance animation
    tl.fromTo(containerRef.current,
      {
        scale: 0,
        opacity: 0,
        rotateZ: -180,
      },
      {
        scale: 1,
        opacity: 1,
        rotateZ: 0,
        duration: 0.5,
        ease: 'back.out(2)',
      }
    );

    // Text animation
    tl.fromTo(textRef.current,
      {
        y: 30,
        opacity: 0,
      },
      {
        y: 0,
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out',
      },
      '-=0.3'
    );

    // Floating animation
    tl.to(containerRef.current,
      {
        y: -10,
        duration: 2,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      }
    );

    // Create particle explosion
    if (particlesRef.current) {
      const particles = 12;
      particlesRef.current.innerHTML = '';

      for (let i = 0; i < particles; i++) {
        const particle = document.createElement('div');
        particle.className = 'absolute w-2 h-2 rounded-full';
        particle.style.background = `linear-gradient(135deg, #F6E05E, #F6AD55)`;
        particle.style.left = '50%';
        particle.style.top = '50%';
        particle.style.transform = 'translate(-50%, -50%)';
        particlesRef.current.appendChild(particle);

        const angle = (360 / particles) * i;
        const distance = 50 + Math.random() * 50;

        gsap.to(particle, {
          x: Math.cos(angle * Math.PI / 180) * distance,
          y: Math.sin(angle * Math.PI / 180) * distance,
          opacity: 0,
          scale: 0,
          duration: 1 + Math.random() * 0.5,
          ease: 'power2.out',
          delay: Math.random() * 0.1,
        });
      }
    }

    // Pulse effect for high combos
    if (combo >= 3) {
      gsap.to(containerRef.current, {
        scale: 1.1,
        duration: 0.3,
        ease: 'power2.inOut',
        yoyo: true,
        repeat: -1,
      });
    }

    // Rotation for mega combos
    if (combo >= 5) {
      gsap.to(textRef.current, {
        rotateY: 360,
        duration: 2,
        ease: 'none',
        repeat: -1,
      });
    }

  }, { dependencies: [combo], scope: containerRef });

  // Exit animation when combo ends
  useEffect(() => {
    if (combo === 0 && containerRef.current) {
      gsap.to(containerRef.current, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: 'back.in(2)',
      });
    }
  }, [combo]);

  if (combo === 0) return null;

  return (
    <div ref={containerRef} className="relative">
      {/* Main combo display */}
      <div className="glass-effect rounded-full px-8 py-4 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 animate-shimmer" />

        {/* Combo text */}
        <div ref={textRef} className="relative">
          <div className={`text-3xl font-bold text-gradient ${getComboColor()}`}>
            {getComboText()}
          </div>
          <div className="text-center text-white/60 text-sm mt-1">
            +{combo * 100} points
          </div>
        </div>
      </div>

      {/* Particle container */}
      <div ref={particlesRef} className="absolute inset-0 pointer-events-none" />

      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(246, 224, 94, 0.3) 0%, transparent 70%)`,
          filter: 'blur(20px)',
        }}
      />
    </div>
  );
};