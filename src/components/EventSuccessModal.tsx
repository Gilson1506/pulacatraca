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
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100 animate-in fade-in-50 zoom-in-95">
        {/* Header com ícone de sucesso */}
        <div className="relative p-8 pb-6 text-center bg-gradient-to-br from-pink-50 to-purple-50 rounded-t-3xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/50 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
          
          {/* Ícone de sucesso com animação */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center animate-bounce shadow-lg">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
              {/* Sparkles animados */}
              <div className="absolute -top-2 -right-2 animate-pulse">
                <Sparkles className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="absolute -bottom-1 -left-2 animate-pulse delay-300">
                <Sparkles className="w-4 h-4 text-pink-400" />
              </div>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            🎉 Evento Criado!
          </h2>
          
          <p className="text-gray-600 mb-2">
            Parabéns! Seu evento foi criado com sucesso.
          </p>
          <p className="text-sm text-gray-500">
            Aguarde a aprovação para que apareça na plataforma.
          </p>
        </div>

        {/* Detalhes do evento */}
        <div className="px-8 py-6">
          <div className="bg-gradient-to-r from-pink-50 via-purple-50 to-pink-50 rounded-2xl p-6 border border-pink-100 shadow-sm">
            <h3 className="font-bold text-lg text-gray-900 mb-4 text-center">
              {eventData.title}
            </h3>
            
            <div className="space-y-4">
              {/* Data e Hora */}
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {formatDate(eventData.start_date)}
                  </p>
                  <p className="text-sm text-gray-600">
                    às {formatTime(eventData.start_time)}
                  </p>
                </div>
              </div>
              
              {/* Localização */}
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {getLocationText()}
                  </p>
                  <p className="text-sm text-gray-600">
                    {eventData.location_type === 'online' ? 'Transmissão online' : 
                     eventData.location_type === 'tbd' ? 'Será definido em breve' : 'Local físico'}
                  </p>
                </div>
              </div>
              
              {/* Ingressos */}
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Ticket className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {getTicketTypeText()}
                  </p>
                  <p className="text-sm text-gray-600">
                    {eventData.tickets_count} tipo{eventData.tickets_count > 1 ? 's' : ''} de ingresso criado{eventData.tickets_count > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Próximos passos */}
        <div className="px-8 pb-6">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">
                  Próximos Passos
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">Seu evento está sendo analisado pela equipe</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">Você será notificado sobre a aprovação</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">Após aprovado, aparecerá na página inicial</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">Os ingressos ficarão disponíveis para venda</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="px-8 pb-8 flex flex-col space-y-3">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white py-4 px-6 rounded-2xl font-semibold hover:from-pink-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center space-x-2 shadow-lg"
          >
            <span>Continuar</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => {
              onClose();
              window.location.href = '/organizer-dashboard';
            }}
            className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-2xl font-semibold hover:bg-gray-200 transition-colors"
          >
            Ver Meus Eventos
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventSuccessModal;