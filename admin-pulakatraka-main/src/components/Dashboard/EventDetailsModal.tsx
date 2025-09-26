import React from 'react';
import { X, Calendar, MapPin, Users, DollarSign, Check, XCircle } from 'lucide-react';
import EventImage from '../Common/EventImage';

// Interface para eventos do admin (compatível com o banco)
interface AdminEvent {
  id: string;
  title: string;
  description: string;
  organizer_id: string;
  organizer_name: string;
  start_date: string;
  end_date: string;
  location: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
  updated_at: string;
  image?: string;
  price: number;
  available_tickets: number;
  total_tickets: number;
  category: string;
  tags: string[];
  carousel_approved?: boolean;
  carousel_priority?: number;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
}

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: AdminEvent | null;
  onApprove: (eventId: string) => void;
  onRejectClick: () => void;
}

export default function EventDetailsModal({ isOpen, onClose, event, onApprove, onRejectClick }: EventDetailsModalProps) {
  if (!isOpen || !event) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-700';
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-700';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Aprovado';
      case 'pending': return 'Pendente';
      case 'rejected': return 'Rejeitado';
      case 'draft': return 'Rascunho';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Detalhes do Evento</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-6">
            <EventImage
              src={event.image}
              alt={event.title}
              size="xl"
              className="w-full h-60"
              fallbackIcon="event"
              showLoadingState={true}
            />
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{event.title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Organizado por <span className="font-medium text-gray-700 dark:text-gray-300">{event.organizer_name}</span></p>

          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
             <p className="text-gray-800 dark:text-gray-200">{event.description}</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div className="flex items-center space-x-3">
              <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <p>
                <span className="font-medium text-gray-800 dark:text-gray-200">Data:</span> 
                <span className="text-gray-600 dark:text-gray-400"> {new Date(event.start_date).toLocaleDateString('pt-BR')}</span>
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <p>
                <span className="font-medium text-gray-800 dark:text-gray-200">Local:</span> 
                <span className="text-gray-600 dark:text-gray-400"> {event.location}</span>
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <p>
                <span className="font-medium text-gray-800 dark:text-gray-200">Ingressos:</span> 
                <span className="text-gray-600 dark:text-gray-400"> {event.available_tickets.toLocaleString()}/{event.total_tickets.toLocaleString()}</span>
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <DollarSign className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <p>
                <span className="font-medium text-gray-800 dark:text-gray-200">Preço:</span> 
                <span className="text-gray-600 dark:text-gray-400"> {formatCurrency(event.price)}</span>
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-800 dark:text-gray-200">Categoria:</span> 
              <span className="text-gray-600 dark:text-gray-400 ml-2">{event.category}</span>
            </div>
            <div>
              <span className="font-medium text-gray-800 dark:text-gray-200">Status:</span> 
              <span className={`ml-2 inline-flex px-3 py-1 rounded-full font-semibold text-xs border ${getStatusColor(event.status)}`}>
                {getStatusText(event.status)}
              </span>
            </div>
          </div>
          
           {event.rejection_reason && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-600">
              <h4 className="font-bold text-red-800 dark:text-red-300">Motivo da Rejeição</h4>
              <p className="text-red-700 dark:text-red-400 mt-1">{event.rejection_reason}</p>
            </div>
          )}
        </div>

        {event.status === 'pending' && (
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button 
              onClick={onRejectClick}
              className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold flex items-center space-x-2 transition-all duration-200"
            >
              <XCircle className="w-5 h-5" />
              <span>Rejeitar</span>
            </button>
            <button 
              onClick={() => onApprove(event.id)}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center space-x-2 transition-all duration-200"
            >
              <Check className="w-5 h-5" />
              <span>Aprovar</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 