import React, { useEffect, useState, useRef } from 'react';
import { gsap } from 'gsap';
import { designSystem } from '../../design/tokens';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: keyof typeof maxWidths;
  padding?: keyof typeof designSystem.spacing;
  center?: boolean;
}

const maxWidths = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  full: '100%',
} as const;

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = '',
  maxWidth = 'xl',
  padding = 4,
  center = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
    isMobile: window.innerWidth < designSystem.breakpoints.md,
    isTablet: window.innerWidth >= designSystem.breakpoints.md && window.innerWidth < designSystem.breakpoints.lg,
    isDesktop: window.innerWidth >= designSystem.breakpoints.lg,
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setViewport({
        width,
        height,
        isMobile: width < designSystem.breakpoints.md,
        isTablet: width >= designSystem.breakpoints.md && width < designSystem.breakpoints.lg,
        isDesktop: width >= designSystem.breakpoints.lg,
      });

      // Animate container on resize
      if (containerRef.current) {
        gsap.to(containerRef.current, {
          opacity: 0.8,
          duration: 0.1,
          onComplete: () => {
            gsap.to(containerRef.current, {
              opacity: 1,
              duration: 0.2,
            });
          },
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Responsive padding based on viewport
  const getResponsivePadding = () => {
    if (viewport.isMobile) {
      return designSystem.spacing[2]; // 16px on mobile
    } else if (viewport.isTablet) {
      return designSystem.spacing[3]; // 24px on tablet
    }
    return designSystem.spacing[padding]; // Default padding on desktop
  };

  return (
    <div
      ref={containerRef}
      className={`responsive-container ${className}`}
      style={{
        maxWidth: maxWidths[maxWidth],
        padding: `${getResponsivePadding()}px`,
        margin: center ? '0 auto' : undefined,
        width: '100%',
      }}
      data-viewport={viewport.isMobile ? 'mobile' : viewport.isTablet ? 'tablet' : 'desktop'}
    >
      {/* Pass viewport info to children if needed */}
      <div className="responsive-content">
        {typeof children === 'function'
          ? (children as any)(viewport)
          : children}
      </div>
    </div>
  );
};