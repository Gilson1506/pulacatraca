import React, { useState } from 'react';
import { X, Send } from 'lucide-react';

interface EventRejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  eventName: string;
}

export default function EventRejectionModal({ isOpen, onClose, onConfirm, eventName }: EventRejectionModalProps) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason);
      setReason('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Rejeitar Evento</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-gray-700 dark:text-gray-300">Você está prestes a rejeitar o evento: <strong className="text-gray-900 dark:text-white">{eventName}</strong>.</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Por favor, forneça um motivo claro para a rejeição. Esta mensagem será enviada por e-mail ao organizador.</p>
          <div>
            <label htmlFor="rejection-reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Motivo da Rejeição
            </label>
            <textarea
              id="rejection-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={5}
              placeholder="Ex: O evento não se encaixa nas nossas políticas de conteúdo..."
            />
          </div>
        </div>

        <div className="flex justify-end items-center p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 mr-2"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!reason.trim()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-300 flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Confirmar e Enviar Motivo</span>
          </button>
        </div>
      </div>
    </div>
  );
} 