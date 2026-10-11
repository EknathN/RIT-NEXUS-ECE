import React from 'react';
import './RITLogo.css';

export default function RITLogo({ height = 38, showBadge = true, className = '' }) {
  return (
    <div className={`rit-logo-wrapper ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <img
        src="/images/rit-logo-dark.png"
        alt="RIT"
        className="rit-logo-img rit-logo-light"
        style={{ height: `${height}px`, width: 'auto', objectFit: 'contain' }}
      />
      <img
        src="/images/rit-logo-white.png"
        alt="RIT"
        className="rit-logo-img rit-logo-dark"
        style={{ height: `${height}px`, width: 'auto', objectFit: 'contain' }}
      />
      {showBadge && (
        <span
          className="rit-logo-badge"
          style={{
            background: 'linear-gradient(135deg, var(--accent-500, #0094ff), var(--cyan-500, #00d9ff))',
            color: '#ffffff',
            fontSize: `${Math.max(10, Math.round(height * 0.28))}px`,
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: '4px',
            letterSpacing: '0.05em',
            lineHeight: 1.4,
            display: 'inline-block'
          }}
        >
          ECE NEXUS
        </span>
      )}
    </div>
  );
}
