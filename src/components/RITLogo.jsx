import React from 'react';
import './RITLogo.css';

export default function RITLogo({ height = 38, showBadge = true, className = '' }) {
  return (
    <div
      className={`rit-logo-wrapper ${className}`}
      style={{ '--logo-height': `${height}px` }}
    >
      <img
        src="/images/rit-logo-dark.png"
        alt="RIT"
        className="rit-logo-img rit-logo-light"
      />
      <img
        src="/images/rit-logo-white.png"
        alt="RIT"
        className="rit-logo-img rit-logo-dark"
      />
      {showBadge && (
        <span className="rit-logo-badge">
          ECE NEXUS
        </span>
      )}
    </div>
  );
}
