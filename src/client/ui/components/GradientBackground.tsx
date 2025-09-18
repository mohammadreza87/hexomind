import React from 'react';
import '../../styles/gradient-background.css';

export const GradientBackground: React.FC = () => {
  return (
    <div className="gradient-background">
      {/* Floating orbs for additional depth */}
      <div className="gradient-orb gradient-orb-1" />
      <div className="gradient-orb gradient-orb-2" />
      <div className="gradient-orb gradient-orb-3" />
    </div>
  );
};