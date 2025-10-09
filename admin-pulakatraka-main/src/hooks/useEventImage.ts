import { useState, useCallback } from 'react';

interface UseEventImageProps {
  src?: string | null;
  fallbackUrl?: string;
  onLoad?: () => void;
  onError?: () => void;
}

interface UseEventImageReturn {
  isLoading: boolean;
  hasError: boolean;
  imageSrc: string | null;
  shouldShowImage: boolean;
  handleImageLoad: () => void;
  handleImageError: () => void;
  resetImageState: () => void;
}

export const useEventImage = ({
  src,
  fallbackUrl,
  onLoad,
  onError
}: UseEventImageProps): UseEventImageReturn => {
  const [isLoading, setIsLoading] = useState(!!src);
  const [hasError, setHasError] = useState(false);

  const isValidImageUrl = useCallback((url: string | null | undefined): boolean => {
    if (!url) return false;
    if (url === 'placeholder' || url === '/placeholder-event.jpg') return false;
    if (url === fallbackUrl) return false;
    return true;
  }, [fallbackUrl]);

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  }, [onLoad]);

  const handleImageError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  }, [onError]);

  const resetImageState = useCallback(() => {
    setIsLoading(!!src);
    setHasError(false);
  }, [src]);

  const shouldShowImage = isValidImageUrl(src) && !hasError;
  const imageSrc = shouldShowImage ? src : null;

  return {
    isLoading,
    hasError,
    imageSrc,
    shouldShowImage,
    handleImageLoad,
    handleImageError,
    resetImageState
  };
};