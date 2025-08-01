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
      <div className="relative bg-pink-500/15 backdrop-blur-sm border border-pink-400/40 rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden transform transition-all duration-500 ease-out translate-y-0 scale-100 opacity-100">
        {/* Header simples */}
        <div className="relative bg-pink-600/25 backdrop-blur-md px-6 py-5 border-b border-pink-400/40">
          <div className="absolute inset-0 bg-pink-600/25"></div>
          
          <div className="relative flex items-center justify-between text-white">
            <div>
              <h2 className="text-xl font-bold text-white drop-shadow-lg">✅ Evento Criado!</h2>
              <p className="text-pink-100 text-sm mt-1 drop-shadow-md">Aguardando aprovação</p>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-pink-500/20 rounded-sm transition-colors backdrop-blur-sm"
            >
              <X className="w-6 h-6 text-white drop-shadow-lg" />
            </button>
          </div>
        </div>

        {/* Conteúdo simplificado */}
        <div className="overflow-y-auto max-h-[calc(85vh-80px)] p-6">
          <div className="text-center space-y-4">
            <div className="bg-pink-500/10 backdrop-blur-sm border border-pink-300/50 rounded-sm p-4">
              <h3 className="font-bold text-lg text-gray-900 drop-shadow-sm mb-2">
                {eventData.title}
              </h3>
              <p className="text-gray-700 text-sm drop-shadow-sm">
                📅 {formatDate(eventData.start_date)} às {formatTime(eventData.start_time)}
              </p>
              <p className="text-gray-700 text-sm drop-shadow-sm">
                📍 {getLocationText()}
              </p>
              <p className="text-gray-700 text-sm drop-shadow-sm">
                🎫 {getTicketTypeText()} ({eventData.tickets_count} tipo{eventData.tickets_count > 1 ? 's' : ''})
              </p>
            </div>
            
            <p className="text-gray-600 text-sm drop-shadow-sm">
              Seu evento está em análise e será publicado após aprovação.
            </p>
          </div>
        </div>



        {/* Footer com botão simples */}
        <div className="sticky bottom-0 bg-pink-500/15 backdrop-blur-md border-t border-pink-400/40 p-6">
          <button
            onClick={onClose}
            className="w-full bg-pink-600/80 backdrop-blur-sm text-white py-4 px-6 rounded-sm font-bold text-lg hover:bg-pink-700/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center drop-shadow-lg"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventSuccessModal;