import React from 'react';
import { ImageIcon, Calendar, Loader2 } from 'lucide-react';
import { useEventImage } from '../../hooks/useEventImage';

interface EventImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLoadingState?: boolean;
  fallbackIcon?: 'event' | 'calendar' | 'image';
  onImageLoad?: () => void;
  onImageError?: () => void;
}

const EventImage: React.FC<EventImageProps> = ({
  src,
  alt,
  className = '',
  size = 'md',
  showLoadingState = true,
  fallbackIcon = 'event',
  onImageLoad,
  onImageError
}) => {
  const {
    isLoading,
    hasError,
    imageSrc,
    shouldShowImage,
    handleImageLoad,
    handleImageError
  } = useEventImage({
    src,
    onLoad: onImageLoad,
    onError: onImageError
  });

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16', 
    lg: 'w-24 h-24',
    xl: 'w-full h-full' // Para permitir tamanhos customizados via className
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8', 
    xl: 'w-10 h-10'
  };

  const getFallbackIcon = () => {
    const iconClass = `${iconSizes[size]} text-gray-400 dark:text-gray-500`;
    
    switch (fallbackIcon) {
      case 'calendar':
        return <Calendar className={iconClass} />;
      case 'image':
        return <ImageIcon className={iconClass} />;
      default:
        const emojiSize = size === 'sm' ? 'text-lg' : size === 'md' ? 'text-2xl' : size === 'lg' ? 'text-3xl' : 'text-4xl';
        return <div className={`${emojiSize} leading-none`}>🎭</div>;
    }
  };



  return (
    <div className={`${sizeClasses[size]} ${className} relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700`}>
      {shouldShowImage ? (
        <>
          {isLoading && showLoadingState && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
              <Loader2 className={`${iconSizes[size]} text-gray-400 animate-spin`} />
            </div>
          )}
          <img
            src={imageSrc || src || ''}
            alt={alt}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isLoading ? 'opacity-0' : 'opacity-100'
            }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
          />
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800">
          <div className="mb-1">
            {getFallbackIcon()}
          </div>
          <div className={`text-xs text-gray-500 dark:text-gray-400 text-center font-medium ${
            size === 'sm' ? 'text-[10px]' : 'text-xs'
          }`}>
            {hasError ? 'Erro' : 'Sem Imagem'}
          </div>
        </div>
      )}
      
      {/* Overlay para melhor contraste do texto quando necessário */}
      {shouldShowImage && !isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-200" />
      )}
    </div>
  );
};

export default EventImage;