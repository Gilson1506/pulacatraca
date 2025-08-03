import React, { useState } from 'react';
import { X, User, Calendar, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ProfessionalLoader from './ProfessionalLoader';

interface TicketData {
  id: string;
  name: string;
  email: string;
  event_title: string;
  event_date: string;
  event_location: string;
  ticket_type: string;
  ticket_price: number;
  qr_code: string;
  purchased_at: string;
  is_checked_in: boolean;
  checked_in_at: string | null;
  ticket_id: string;
  event_id: string;
  organizer_id: string;
  ticket_user_id?: string | null;
  user_id?: string | null;
}

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketData: TicketData | null;
  onSuccess?: () => void;
}

const CheckInModal: React.FC<CheckInModalProps> = ({
  isOpen,
  onClose,
  ticketData,
  onSuccess
}) => {
  const [processing, setProcessing] = useState(false);
  const [checkInComplete, setCheckInComplete] = useState(false);

  const handleCheckIn = async () => {
    if (!ticketData || ticketData.is_checked_in) return;

    setProcessing(true);
    try {
      // Realizar check-in
      const { error } = await supabase
        .from('checkin')
        .insert({
          ticket_user_id: ticketData.ticket_user_id,
          ticket_id: ticketData.ticket_id,
          event_id: ticketData.event_id,
          checked_in_at: new Date().toISOString()
        });

      if (error) throw error;

      setCheckInComplete(true);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Erro no check-in:', error);
      alert('Erro ao realizar check-in. Tente novamente.');
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setCheckInComplete(false);
    onClose();
  };

  if (!isOpen || !ticketData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-50 rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full mx-4 overflow-hidden">
        
        {/* Header Rosa */}
        <div className="bg-gradient-to-r from-pink-500 to-pink-600 p-4 text-white relative">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white hover:bg-pink-400 rounded-full p-2 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="bg-white bg-opacity-20 rounded-full p-3">
              {checkInComplete ? (
                <CheckCircle className="h-6 w-6 text-white" />
              ) : (
                <User className="h-6 w-6 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {checkInComplete ? 'Check-in Realizado!' : 
                 ticketData.is_checked_in ? 'Já fez Check-in' : 'Confirmar Check-in'}
              </h2>
              <p className="text-pink-100 text-sm">
                {checkInComplete ? 'Participante confirmado' : 
                 ticketData.is_checked_in ? 'Check-in anterior' : 'Dados do participante'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 bg-white">
          
          {/* Info do Participante */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-4 mb-6">
            
            {/* Participante */}
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-gray-600" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Participante</p>
                <p className="font-semibold text-gray-900">{ticketData.name}</p>
                <p className="text-xs text-gray-500">{ticketData.email}</p>
              </div>
            </div>
            
            {/* Evento */}
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-gray-600" />
              <div className="flex-1">
                <p className="text-sm text-gray-600">Evento</p>
                <p className="font-semibold text-gray-900">{ticketData.event_title}</p>
                <p className="text-xs text-gray-500">
                  {new Date(ticketData.event_date).toLocaleDateString('pt-BR')} • {ticketData.event_location}
                </p>
              </div>
            </div>
            
            {/* Tipo de Ingresso */}
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 bg-pink-100 rounded flex items-center justify-center">
                <div className="w-2 h-2 bg-pink-600 rounded"></div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">Tipo de Ingresso</p>
                <p className="font-semibold text-gray-900">{ticketData.ticket_type}</p>
                <p className="text-xs text-gray-500">
                  R$ {ticketData.ticket_price?.toFixed(2) || '0,00'}
                </p>
              </div>
            </div>
            
            {/* Status Check-in */}
            <div className="flex items-center space-x-3">
              <div className={`w-5 h-5 rounded flex items-center justify-center ${
                ticketData.is_checked_in || checkInComplete ? 'bg-green-100' : 'bg-yellow-100'
              }`}>
                <div className={`w-2 h-2 rounded ${
                  ticketData.is_checked_in || checkInComplete ? 'bg-green-600' : 'bg-yellow-600'
                }`}></div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600">Status</p>
                <p className={`font-semibold ${
                  ticketData.is_checked_in || checkInComplete ? 'text-green-900' : 'text-yellow-900'
                }`}>
                  {checkInComplete ? 'Check-in Realizado Agora!' :
                   ticketData.is_checked_in ? 'Check-in Anterior' : 'Pendente'}
                </p>
                {(ticketData.checked_in_at || checkInComplete) && (
                  <p className="text-xs text-gray-500">
                    {checkInComplete ? 'Agora' : 
                     new Date(ticketData.checked_in_at!).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* Botões */}
          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-3 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
            >
              {checkInComplete ? 'Concluir' : 'Cancelar'}
            </button>
            
            {/* Botão de fechar sempre visível - RPC já fez tudo */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckInModal;