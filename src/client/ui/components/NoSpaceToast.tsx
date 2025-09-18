import React, { useEffect } from 'react';
import { gsap } from 'gsap';

interface NoSpaceToastProps {
  onComplete: () => void;
}

export const NoSpaceToast: React.FC<NoSpaceToastProps> = ({ onComplete }) => {
  useEffect(() => {
    // Animate toast entrance
    gsap.fromTo(
      '.no-space-toast',
      {
        scale: 0.5,
        opacity: 0,
        y: 30,
      },
      {
        scale: 1,
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: 'power3.out',
      }
    );

    // Animate text with pulse
    gsap.to('.no-space-text', {
      scale: 1.05,
      duration: 0.6,
      yoyo: true,
      repeat: 2,
      ease: 'power2.inOut',
    });

    // Auto-hide after delay
    const timer = setTimeout(() => {
      gsap.to('.no-space-toast', {
        scale: 0.8,
        opacity: 0,
        y: -20,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: onComplete,
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      {/* Toast with glassmorphism - 30% smaller */}
      <div className="no-space-toast">
        <div className="relative rounded-2xl shadow-2xl"
             style={{
               backdropFilter: 'blur(12px) saturate(115%)',
               WebkitBackdropFilter: 'blur(12px) saturate(115%)',
               backgroundColor: 'rgba(17, 25, 40, 0.36)',
               border: '1px solid rgba(255, 255, 255, 0.125)',
               padding: '1.4rem 2.1rem'
             }}>

          {/* Message */}
          <div className="no-space-text text-center">
            <div className="text-2xl font-bold bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent mb-1">
              NO MORE SPACE
            </div>
            <div className="text-white/60 text-xs">
              The board is full!
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute -top-6 -left-6 w-11 h-11 bg-orange-500/20 rounded-full blur-2xl" />
          <div className="absolute -bottom-6 -right-6 w-11 h-11 bg-red-500/20 rounded-full blur-2xl" />
        </div>
      </div>
    </div>
  );
};