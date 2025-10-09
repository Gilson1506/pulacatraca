import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirmar', 
  cancelText = 'Cancelar',
  variant = 'danger'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const colorClasses = {
    danger: {
      iconBg: 'bg-red-100 dark:bg-red-900/20',
      iconText: 'text-red-600 dark:text-red-400',
      buttonBg: 'bg-red-600',
      buttonHover: 'hover:bg-red-700',
    },
    warning: {
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/20',
      iconText: 'text-yellow-600 dark:text-yellow-400',
      buttonBg: 'bg-yellow-500',
      buttonHover: 'hover:bg-yellow-600',
    },
    info: {
      iconBg: 'bg-blue-100 dark:bg-blue-900/20',
      iconText: 'text-blue-600 dark:text-blue-400',
      buttonBg: 'bg-blue-600',
      buttonHover: 'hover:bg-blue-700',
    },
  };

  const selectedVariant = colorClasses[variant];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-sm w-full">
        <div className="p-6 text-center">
          <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${selectedVariant.iconBg} sm:mx-0 sm:h-10 sm:w-10 mb-4`}>
            <AlertTriangle className={`h-6 w-6 ${selectedVariant.iconText}`} />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{message}</p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 text-white py-2 px-4 rounded-lg transition-colors ${selectedVariant.buttonBg} ${selectedVariant.buttonHover}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 