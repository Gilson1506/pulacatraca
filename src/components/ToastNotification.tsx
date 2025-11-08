import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';

interface ToastNotificationProps {
  isVisible: boolean;
  type: 'success' | 'already_checked' | 'error';
  message: string;
  onClose: () => void;
  duration?: number;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({
  isVisible,
  type,
  message,
  onClose,
  duration = 3000
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!isVisible) return null;

  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          bgColor: 'bg-green-500',
          icon: <CheckCircle className="h-5 w-5 text-white" />,
          borderColor: 'border-green-600'
        };
      case 'already_checked':
        return {
          bgColor: 'bg-yellow-500',
          icon: <AlertTriangle className="h-5 w-5 text-white" />,
          borderColor: 'border-yellow-600'
        };
      case 'error':
        return {
          bgColor: 'bg-red-500',
          icon: <XCircle className="h-5 w-5 text-white" />,
          borderColor: 'border-red-600'
        };
      default:
        return {
          bgColor: 'bg-gray-500',
          icon: <XCircle className="h-5 w-5 text-white" />,
          borderColor: 'border-gray-600'
        };
    }
  };

  const config = getToastConfig();

  return (
    <div className="fixed top-4 right-4 z-50">
      <div 
        className={`${config.bgColor} ${config.borderColor} border-l-4 text-white px-6 py-4 rounded-lg shadow-lg transform transition-all duration-300 ${
          isAnimating ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}
        style={{ minWidth: '300px', maxWidth: '400px' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {config.icon}
            <p className="font-medium text-sm">{message}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-200 transition-colors ml-4"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {/* Barra de progresso */}
        <div className="mt-2 w-full bg-white bg-opacity-20 rounded-full h-1">
          <div 
            className="bg-white h-1 rounded-full transition-all ease-linear"
            style={{
              width: '100%',
              animation: `shrink ${duration}ms linear forwards`
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default ToastNotification;