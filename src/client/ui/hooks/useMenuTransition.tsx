import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';

interface UseMenuTransitionOptions {
  isOpen: boolean;
  duration?: number;
  type?: 'fade' | 'slide' | 'scale' | 'rotate';
  direction?: 'up' | 'down' | 'left' | 'right';
}

export const useMenuTransition = ({
  isOpen,
  duration = 0.4,
  type = 'scale',
  direction = 'up',
}: UseMenuTransitionOptions) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !backdropRef.current || !panelRef.current) return;

    const tl = gsap.timeline();

    if (isOpen) {
      // Set initial state
      gsap.set(containerRef.current, { display: 'block' });

      // Animate backdrop
      tl.fromTo(backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: duration * 0.6, ease: 'power2.out' }
      );

      // Animate panel based on type
      switch (type) {
        case 'slide':
          const slideFrom = {
            up: { y: '100%' },
            down: { y: '-100%' },
            left: { x: '100%' },
            right: { x: '-100%' },
          };

          tl.fromTo(panelRef.current,
            {
              ...slideFrom[direction],
              opacity: 0,
            },
            {
              x: 0,
              y: 0,
              opacity: 1,
              duration,
              ease: 'power3.out',
            },
            '-=0.3'
          );
          break;

        case 'scale':
          tl.fromTo(panelRef.current,
            {
              scale: 0.7,
              opacity: 0,
              rotateX: type === 'rotate' ? -90 : 0,
            },
            {
              scale: 1,
              opacity: 1,
              rotateX: 0,
              duration,
              ease: 'back.out(1.7)',
            },
            '-=0.3'
          );
          break;

        case 'rotate':
          tl.fromTo(panelRef.current,
            {
              scale: 0.8,
              opacity: 0,
              rotateY: -180,
            },
            {
              scale: 1,
              opacity: 1,
              rotateY: 0,
              duration: duration * 1.2,
              ease: 'power3.out',
            },
            '-=0.3'
          );
          break;

        case 'fade':
        default:
          tl.fromTo(panelRef.current,
            { opacity: 0, y: 20 },
            {
              opacity: 1,
              y: 0,
              duration,
              ease: 'power2.out',
            },
            '-=0.3'
          );
      }

      // Add subtle bounce to elements inside panel
      const elements = panelRef.current.querySelectorAll('[data-animate]');
      if (elements.length) {
        tl.from(elements,
          {
            y: 20,
            opacity: 0,
            duration: 0.3,
            stagger: 0.05,
            ease: 'power2.out',
          },
          '-=0.2'
        );
      }
    } else {
      // Exit animation
      tl.to(panelRef.current, {
        scale: 0.9,
        opacity: 0,
        duration: duration * 0.7,
        ease: 'power2.in',
      });

      tl.to(backdropRef.current,
        {
          opacity: 0,
          duration: duration * 0.5,
          ease: 'power2.in',
        },
        '-=0.3'
      );

      tl.set(containerRef.current, { display: 'none' });
    }

    return () => {
      tl.kill();
    };
  }, [isOpen, duration, type, direction]);

  return {
    containerRef,
    backdropRef,
    panelRef,
  };
};