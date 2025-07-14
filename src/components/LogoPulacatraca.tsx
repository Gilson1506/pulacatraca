import React from 'react';

const LogoPulacatraca = () => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <svg
        width="50"
        height="50"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Taça estilo cocktail */}
        <path
          d="M16 12 L32 32 L48 12"
          stroke="#E91E63"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <line x1="32" y1="32" x2="32" y2="48" stroke="#E91E63" strokeWidth="4" />
        <line x1="24" y1="52" x2="40" y2="52" stroke="#E91E63" strokeWidth="4" />
        {/* Estrela */}
        <polygon
          points="36,10 37.9,14.1 42.5,14.1 38.3,16.9 40.2,21 36,18.2 31.8,21 33.7,16.9 29.5,14.1 34.1,14.1"
          fill="#E91E63"
        />
      </svg>
      <h1 style={{ color: '#E91E63', fontFamily: 'sans-serif', fontWeight: 'bold', fontSize: '24px' }}>
        Pulacatraca
      </h1>
    </div>
  );
};

export default LogoPulacatraca;
