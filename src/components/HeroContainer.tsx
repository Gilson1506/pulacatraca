import React from 'react';
import Header from './Header';

interface HeroContainerProps {
  backgroundImage: string;
  children: React.ReactNode;
}

const HeroContainer: React.FC<HeroContainerProps> = ({ backgroundImage, children }) => {
  return (
    <div
      className="relative"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 bg-black bg-opacity-60"></div>
      <div className="relative z-10">
        <Header className="bg-transparent shadow-none" />
        {children}
      </div>
    </div>
  );
};

export default HeroContainer; 