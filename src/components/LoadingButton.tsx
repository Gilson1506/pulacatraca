import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingButtonProps {
  children: React.ReactNode;
  isLoading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const LoadingButton: React.FC<LoadingButtonProps> = ({
  children,
  isLoading = false,
  loadingText,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  variant = 'primary',
  size = 'md'
}) => {
  // ✅ VARIANTES DE ESTILO
  const variantClasses = {
    primary: 'bg-pink-600 text-white hover:bg-pink-700 focus:ring-pink-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    outline: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-pink-500'
  };

  // ✅ TAMANHOS
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  // ✅ TAMANHO DO SPINNER
  const spinnerSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const baseClasses = 'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center';
  
  const finalClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={finalClasses}
    >
      {isLoading ? (
        <>
          <Loader2 className={`animate-spin -ml-1 mr-2 ${spinnerSizes[size]} text-current`} />
          {loadingText || 'Carregando...'}
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default LoadingButton;