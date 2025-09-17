import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';

interface BentoItem {
  id: string;
  content: React.ReactNode;
  colSpan?: number;
  rowSpan?: number;
  className?: string;
  animated?: boolean;
}

interface BentoGridProps {
  items: BentoItem[];
  columns?: {
    default: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
  className?: string;
}

export const BentoGrid: React.FC<BentoGridProps> = ({
  items,
  columns = { default: 1, sm: 2, md: 3, lg: 4 },
  gap = 16,
  className = '',
}) => {
  const gridRef = useRef<HTMLDivElement>(null);

  // Animate grid items on mount
  useGSAP(() => {
    const items = gridRef.current?.querySelectorAll('.bento-item');
    if (!items) return;

    gsap.fromTo(
      items,
      {
        scale: 0.8,
        opacity: 0,
        y: 30,
      },
      {
        scale: 1,
        opacity: 1,
        y: 0,
        duration: 0.5,
        stagger: {
          each: 0.05,
          from: 'random',
        },
        ease: 'power2.out',
      }
    );

    // Add hover animations
    items.forEach((item) => {
      const hoverTl = gsap.timeline({ paused: true });

      hoverTl
        .to(item, {
          scale: 1.02,
          duration: 0.3,
          ease: 'power2.out',
        })
        .to(
          item.querySelector('.bento-glow'),
          {
            opacity: 1,
            duration: 0.3,
            ease: 'power2.out',
          },
          0
        );

      item.addEventListener('mouseenter', () => hoverTl.play());
      item.addEventListener('mouseleave', () => hoverTl.reverse());
    });
  }, { scope: gridRef });

  // Generate responsive grid classes
  const getGridClasses = () => {
    const classes = ['grid'];

    // Add column classes
    classes.push(`grid-cols-${columns.default}`);
    if (columns.sm) classes.push(`sm:grid-cols-${columns.sm}`);
    if (columns.md) classes.push(`md:grid-cols-${columns.md}`);
    if (columns.lg) classes.push(`lg:grid-cols-${columns.lg}`);
    if (columns.xl) classes.push(`xl:grid-cols-${columns.xl}`);

    // Add gap
    classes.push(`gap-${gap / 4}`);

    return classes.join(' ');
  };

  return (
    <div
      ref={gridRef}
      className={`${getGridClasses()} ${className}`}
      style={{
        '--bento-gap': `${gap}px`,
      } as React.CSSProperties}
    >
      {items.map((item) => (
        <div
          key={item.id}
          className={`
            bento-item relative overflow-hidden rounded-2xl
            ${item.colSpan ? `col-span-${item.colSpan}` : ''}
            ${item.rowSpan ? `row-span-${item.rowSpan}` : ''}
            ${item.className || ''}
          `}
        >
          {/* Glass background */}
          <div className="absolute inset-0 glass-effect" />

          {/* Glow effect */}
          <div
            className="bento-glow absolute inset-0 opacity-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at center, rgba(183, 148, 244, 0.1) 0%, transparent 70%)',
            }}
          />

          {/* Content */}
          <div className="relative z-10 h-full">
            {item.content}
          </div>
        </div>
      ))}
    </div>
  );
};