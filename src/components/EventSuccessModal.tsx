import React from 'react';
import { CheckCircle, X, Calendar, MapPin, Ticket, Clock, ArrowRight, Sparkles } from 'lucide-react';

interface EventSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventData: {
    title: string;
    start_date: string;
    start_time: string;
    ticket_type: 'paid' | 'free';
    tickets_count: number;
    location_type: string;
    location?: string;
    location_name?: string;
    location_city?: string;
    location_state?: string;
  };
}

const EventSuccessModal: React.FC<EventSuccessModalProps> = ({ isOpen, onClose, eventData }) => {
  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeStr: string) => {
    return timeStr.slice(0, 5);
  };

  const getLocationText = () => {
    if (eventData.location_type === 'online') return 'Evento Online';
    if (eventData.location_type === 'tbd') return 'Local a definir';
    if (eventData.location_name) return eventData.location_name;
    if (eventData.location_city && eventData.location_state) {
      return `${eventData.location_city}, ${eventData.location_state}`;
    }
    return eventData.location || 'Local físico';
  };

  const getTicketTypeText = () => {
    return eventData.ticket_type === 'paid' ? 'Ingressos Pagos' : 'Ingressos Gratuitos';
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="relative bg-white backdrop-blur-sm border border-gray-300 rounded-lg shadow-2xl w-full max-w-md h-[85vh] overflow-hidden transform transition-all duration-500 ease-out translate-y-0 scale-100 opacity-100">
        {/* Header simples */}
        <div className="relative bg-gray-100 backdrop-blur-md px-4 py-4 border-b border-gray-300">
          <div className="absolute inset-0 bg-gray-100"></div>
          
          <div className="relative flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-pink-600 drop-shadow-sm">✅ Evento Criado!</h2>
              <p className="text-gray-600 text-xs mt-1">Aguardando aprovação</p>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-sm transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Conteúdo simplificado */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-center space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-sm p-4">
              <h3 className="font-bold text-lg text-pink-600 mb-2">
                {eventData.title}
              </h3>
              <p className="text-gray-700 text-sm">
                📅 {formatDate(eventData.start_date)} às {formatTime(eventData.start_time)}
              </p>
              <p className="text-gray-700 text-sm">
                📍 {getLocationText()}
              </p>
              <p className="text-gray-700 text-sm">
                🎫 {getTicketTypeText()} ({eventData.tickets_count} tipo{eventData.tickets_count > 1 ? 's' : ''})
              </p>
            </div>
            
            <p className="text-gray-600 text-sm">
              Seu evento está em análise e será publicado após aprovação.
            </p>
          </div>
        </div>

        {/* Footer com botão simples */}
        <div className="sticky bottom-0 bg-gray-100 border-t border-gray-300 p-4">
          <button
            onClick={onClose}
            className="w-full bg-pink-600 text-white py-3 px-4 rounded-sm font-bold text-base hover:bg-pink-700 transition-all duration-200 flex items-center justify-center"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventSuccessModal;