import React from 'react';

interface ProfessionalLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const ProfessionalLoader: React.FC<ProfessionalLoaderProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3', 
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-[6px]'
  };

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <div 
        className={`
          ${sizeClasses[size]}
          border-pink-200 
          border-t-pink-500 
          border-r-pink-400
          rounded-full 
          animate-spin
        `}
        style={{ 
          animationDuration: '1s',
          animationTimingFunction: 'linear'
        }}
      />
    </div>
  );
};

export default ProfessionalLoader;