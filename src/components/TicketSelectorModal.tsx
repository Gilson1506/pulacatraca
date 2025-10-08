import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Clock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import OrganizerWarningModal from './OrganizerWarningModal';
import { saveCartData } from '../utils/cartStorage';

interface TicketData {
  id: string;
  event_id: string;
  name: string;
  title?: string;
  description?: string;
  price: number;
  price_masculine?: number;
  price_feminine?: number;
  price_type?: 'unissex' | 'gender_separate';
  quantity: number;
  available_quantity: number;
  min_quantity?: number;
  max_quantity?: number;
  has_half_price?: boolean;
  half_price_title?: string;
  half_price_quantity?: number;
  half_price_price?: number;
  half_price_price_feminine?: number;
  sector?: string;
  benefits?: string[];
  ticket_type?: 'paid' | 'free';
  status?: 'active' | 'inactive' | 'sold_out';
  sale_start_date?: string;
  sale_end_date?: string;
  sale_period_type?: 'date' | 'batch';
  availability?: 'public' | 'restricted' | 'manual';
  service_fee_type?: 'buyer' | 'seller';
  character_limit?: number;
  description_limit?: number;
  transferable?: boolean;
  max_transfers?: number;
  stripe_price_id?: string;
  created_at?: string;
  updated_at?: string;
  batches?: BatchData[];
}

interface BatchData {
  id: string;
  batch_number: number;
  quantity: number;
  price_type?: 'unissex' | 'gender_separate';
  price?: number;
  price_feminine?: number;
  sale_start_date?: string;
  sale_start_time?: string;
  sale_end_date?: string;
  sale_end_time?: string;
  created_at?: string;
  updated_at?: string;
}

interface TicketSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: TicketData[];
  event: {
    id: string;
    title: string;
    date: string;
    location: string;
    image: string;
    user_id?: string;
  };
  user: any;
}

interface TicketSelection {
  ticketId: string;
  quantity: number;
  masculineQuantity?: number;
  feminineQuantity?: number;
}

const TicketSelectorModal: React.FC<TicketSelectorModalProps> = ({
  isOpen,
  onClose,
  tickets,
  event,
  user
}) => {
  const navigate = useNavigate();
  const [selections, setSelections] = useState<TicketSelection[]>([]);
  const [processedTickets, setProcessedTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showOrganizerWarning, setShowOrganizerWarning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setShowModal(true), 10);
    } else {
      setShowModal(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (tickets.length > 0) {
      console.log('🎫 Tickets recebidos:', tickets);
      
      const processed = tickets
        .filter(ticket => ticket.status === 'active' && ticket.available_quantity > 0)
        .map(ticket => {
          // Determinar preço atual baseado em sale_period_type e batches
          let currentPrice = ticket.price;
          let currentPriceMasc = ticket.price_masculine || ticket.price;
          let currentPriceFem = ticket.price_feminine || ticket.price;
          
          if (ticket.sale_period_type === 'batch' && ticket.batches && ticket.batches.length > 0) {
            // Assumir o primeiro batch ativo ou o atual
            const currentBatch = ticket.batches.find(b => new Date(b.sale_start_date || '') <= new Date() && new Date() <= new Date(b.sale_end_date || ''));
            if (currentBatch) {
              currentPrice = currentBatch.price || currentPrice;
              currentPriceMasc = currentBatch.price || currentPriceMasc;
              currentPriceFem = currentBatch.price_feminine || currentPriceFem;
            }
          }
          
          return {
            ...ticket,
            price: currentPrice,
            price_masculine: currentPriceMasc,
            price_feminine: currentPriceFem,
          };
        });
      
      console.log('🎫 Tickets processados:', processed);
      
      setProcessedTickets(processed);
      setSelections(
        processed.map(ticket => ({
          ticketId: ticket.id,
          quantity: 0,
          ...(ticket.price_type === 'gender_separate' && {
            masculineQuantity: 0,
            feminineQuantity: 0
          })
        }))
      );
    }
  }, [tickets]);

  const getSelection = (ticketId: string) => {
    return selections.find(s => s.ticketId === ticketId) || {
      ticketId,
      quantity: 0
    };
  };

  const updateSelection = (ticketId: string, delta: number) => {
    setSelections(prev => {
      const existing = prev.find(s => s.ticketId === ticketId);
      let newValue;
      
      if (existing?.quantity !== undefined) {
        newValue = Math.max(0, Math.min((existing.quantity || 0) + delta, 10)); // max 10 por simplicidade
      } else {
        // Para gender_separate, ajustar logicamente, mas por agora, assumir unissex simples
        newValue = Math.max(0, delta);
      }
      
      if (existing) {
        return prev.map(s => 
          s.ticketId === ticketId 
            ? { ...s, quantity: newValue } 
            : s
        );
      } else {
        return [...prev, { ticketId, quantity: newValue }];
      }
    });
  };

  const calculateTotal = () => {
    return selections.reduce((total, selection) => {
      const ticket = processedTickets.find(t => t.id === selection.ticketId);
      if (!ticket || (selection.quantity || 0) === 0) return total;
      
      // Para unissex, usar price * quantity
      // Para separate, assumimos mix, mas por agora simplificar para price * quantity
      return total + (ticket.price || 0) * (selection.quantity || 0);
    }, 0);
  };

  const getTotalQuantity = () => {
    return selections.reduce((total, s) => total + (s.quantity || 0), 0);
  };

  const handleFinalize = async () => {
    if (user && event.user_id && user.id === event.user_id) {
      setShowOrganizerWarning(true);
      return;
    }

    if (!user) {
      // Lógica para não logado - similar ao original, mas adaptada
      const selectedTickets = selections
        .filter(s => (s.quantity || 0) > 0)
        .map(selection => {
          const ticket = processedTickets.find(t => t.id === selection.ticketId);
          return {
            ticketId: ticket?.id,
            ticketName: ticket?.title || ticket?.name,
            price: ticket?.price || 0,
            quantity: selection.quantity || 0,
            gender: ticket?.price_type === 'gender_separate' ? 'mixed' : 'unissex', // Simplificado
            sector: ticket?.sector,
            stripe_price_id: ticket?.stripe_price_id
          };
        });

      if (selectedTickets.length === 0) {
        alert('Selecione pelo menos um ingresso');
        return;
      }

      const checkoutData = {
        event: { ...event, time: (event as any).time, address: (event as any).address, city: (event as any).city, state: (event as any).state },
        selectedTickets,
        totalAmount: calculateTotal(),
        returnTo: '/checkout'
      };

      try {
        saveCartData({
          event: checkoutData.event,
          selectedTickets,
          totalAmount: calculateTotal()
        });
      } catch (error) {
        alert('Erro ao salvar dados. Tente novamente.');
        return;
      }

      onClose();
      navigate('/login');
      return;
    }

    const totalQuantity = getTotalQuantity();
    if (totalQuantity === 0) {
      alert('Selecione pelo menos um ingresso');
      return;
    }

    setLoading(true);

    try {
      const selectedTickets = selections
        .filter(s => (s.quantity || 0) > 0)
        .map(selection => {
          const ticket = processedTickets.find(t => t.id === selection.ticketId);
          return {
            ticketId: ticket?.id,
            ticketName: ticket?.title || ticket?.name,
            price: ticket?.price || 0,
            quantity: selection.quantity || 0,
            gender: ticket?.price_type === 'gender_separate' ? 'mixed' : 'unissex',
            sector: ticket?.sector,
            stripe_price_id: ticket?.stripe_price_id
          };
        });

      const checkoutData = {
        event: { ...event, time: (event as any).time, address: (event as any).address, city: (event as any).city, state: (event as any).state },
        selectedTickets,
        totalAmount: calculateTotal()
      };

      onClose();
      navigate('/checkout', { state: checkoutData });
    } catch (error) {
      alert('Erro ao processar seleção. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const isTicketAvailable = (ticket: TicketData) => {
    const now = new Date();
    const start = ticket.sale_start_date ? new Date(ticket.sale_start_date) : null;
    const end = ticket.sale_end_date ? new Date(ticket.sale_end_date) : null;
    const available = ticket.available_quantity > 0;
    
    return (!start || now >= start) && (!end || now <= end) && available && ticket.status === 'active';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div 
        className={`absolute inset-0 transition-all duration-500 ${
          showModal ? 'bg-black bg-opacity-50' : 'bg-black bg-opacity-0'
        }`}
        onClick={onClose}
      />
      
      <div 
        className={`relative bg-white border border-gray-200 rounded-lg shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col transform transition-all duration-500 ease-out ${
          showModal ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-8 scale-95 opacity-0'
        }`}
      >
        {/* Header - Rosa */}
        <div className="relative bg-pink-600 px-4 py-3 border-b border-pink-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-lg">Selecione os ingressos</h2>
              <p className="text-pink-100 text-sm mt-1">{event.title}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-pink-500 rounded transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Conteúdo Scrollável - Branco com preto */}
        <div className="flex-1 overflow-y-auto">
          {processedTickets.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum ingresso disponível</h3>
              <p className="text-gray-600">Este evento ainda não possui ingressos criados.</p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Header da tabela */}
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <h3 className="text-gray-900 font-semibold">Ingressos</h3>
                <h3 className="text-gray-900 font-semibold">Preço</h3>
              </div>
              
              {processedTickets.map((ticket, index) => {
                const selection = getSelection(ticket.id);
                const isAvailable = isTicketAvailable(ticket);
                const displayName = ticket.title || ticket.name;
                const displayPrice = ticket.price;
                const showLimited = ticket.available_quantity < ticket.quantity / 2;
                const currentBatch = ticket.batches?.[0]; // Simplificado

                return (
                  <div 
                    key={ticket.id}
                    className={`transform transition-all duration-300 ${
                      showModal ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
                    }`}
                    style={{ transitionDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                      <div className="flex-1 pr-4">
                        <h4 className="text-gray-900 font-bold text-sm">{displayName}</h4>
                        {ticket.description && (
                          <p className="text-gray-600 text-xs mt-1">{ticket.description}</p>
                        )}
                        {showLimited && (
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3 text-yellow-500" />
                            <span className="text-yellow-600 text-xs font-medium">LIMITADO ⏳</span>
                          </div>
                        )}
                        {currentBatch && (
                          <p className="text-gray-500 text-xs mt-1">Lote {currentBatch.batch_number}</p>
                        )}
                        <p className="text-gray-500 text-xs">Em até 12x + taxas</p>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <p className="text-gray-900 font-bold text-sm min-w-[60px] text-right">
                          R$ {displayPrice.toFixed(2).replace('.', ',')}
                        </p>
                        {isAvailable ? (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => updateSelection(ticket.id, -1)}
                              disabled={selection.quantity <= 0}
                              className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center text-gray-600 transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center font-semibold text-gray-900">{selection.quantity || 0}</span>
                            <button
                              onClick={() => updateSelection(ticket.id, 1)}
                              disabled={selection.quantity >= (ticket.max_quantity || 10)}
                              className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center text-gray-600 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">Esgotado</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer - Botão Rosa */}
        {processedTickets.length > 0 && (
          <div className="bg-white border-t border-gray-200 p-4">
            <div className="text-center mb-4">
              <p className="text-2xl font-bold text-gray-900">
                Total: R$ {calculateTotal().toFixed(2).replace('.', ',')}
              </p>
              <p className="text-sm text-gray-600 mt-1">+ Taxa Adm.</p>
              {getTotalQuantity() > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  {getTotalQuantity()} ingresso{getTotalQuantity() > 1 ? 's' : ''} selecionado{getTotalQuantity() > 1 ? 's' : ''}
                </p>
              )}
            </div>
            
            <button
              onClick={handleFinalize}
              disabled={loading || getTotalQuantity() === 0}
              className="w-full bg-pink-600 text-white py-3 px-4 rounded font-bold text-base hover:bg-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center uppercase tracking-wide"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processando...</span>
                </div>
              ) : (
                'COMPRAR INGRESSOS'
              )}
            </button>
          </div>
        )}
      </div>
      
      <OrganizerWarningModal
        isOpen={showOrganizerWarning}
        onClose={() => setShowOrganizerWarning(false)}
        organizerName={user?.name || 'Organizador'}
      />
    </div>
  );
};

export default TicketSelectorModal;