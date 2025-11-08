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
      
      // Agrupar tickets por nome/título para mostrar lotes na ordem
      const ticketsByTitle = tickets.reduce((acc, ticket) => {
        const title = ticket.title || ticket.name;
        if (!acc[title]) {
          acc[title] = [];
        }
        acc[title].push(ticket);
        return acc;
      }, {} as Record<string, typeof tickets>);

      const processed = Object.entries(ticketsByTitle)
        .flatMap(([title, ticketGroup]) => {
          // Ordenar por batch_info.batch_number se existir, senão por ID
          const sortedTickets = ticketGroup
            .sort((a, b) => {
              const aBatchNum = (a as any).batch_info?.batch_number || 0;
              const bBatchNum = (b as any).batch_info?.batch_number || 0;
              return aBatchNum - bBatchNum;
            })
            .map(ticket => {
              // Para tickets com lotes, usar informações do batch
              if ((ticket as any).is_batch_ticket && (ticket as any).batch_info) {
                const batchInfo = (ticket as any).batch_info;
                return {
                  ...ticket,
                  name: `${title} - ${batchInfo.batch_number === 1 ? '1º Lote' : 
                         batchInfo.batch_number === 2 ? '2º Lote' :
                         batchInfo.batch_number === 3 ? '3º Lote' :
                         `${batchInfo.batch_number}º Lote`}`,
                  batch_status: batchInfo.batch_status,
                  is_available: batchInfo.is_available
                };
              }
              
              // Para tickets sem lotes, manter como está
              return {
                ...ticket,
                batch_status: ticket.status === 'active' ? 'active' : 'inactive',
                is_available: ticket.status === 'active' && ticket.available_quantity > 0
              };
            });
          
          // Adicionar opção de meia entrada para cada ticket que tiver has_half_price
          const ticketsWithHalfPrice: any[] = [];
          sortedTickets.forEach(ticket => {
            ticketsWithHalfPrice.push(ticket);
            
            // Se tem meia entrada disponível, adicionar como um ticket separado
            if (ticket.has_half_price && ticket.half_price_quantity && ticket.half_price_quantity > 0) {
              const halfPriceTicket = {
                ...ticket,
                id: `${ticket.id}_half`,
                name: ticket.name + ' (Meia Entrada)',
                title: (ticket.title || ticket.name) + ' (Meia Entrada)',
                price: ticket.half_price_price || ticket.price / 2,
                price_feminine: ticket.half_price_price_feminine || (ticket.price_feminine ? ticket.price_feminine / 2 : undefined),
                available_quantity: ticket.half_price_quantity,
                quantity: ticket.half_price_quantity,
                is_half_price: true,
                original_ticket_id: ticket.id
              };
              ticketsWithHalfPrice.push(halfPriceTicket);
            }
          });
          
          return ticketsWithHalfPrice;
        })
        .filter(ticket => {
          // Ocultar lotes que já expiraram (status 'ended')
          if ((ticket as any).is_batch_ticket && (ticket as any).batch_status === 'ended') {
            return false;
          }
          // Mostrar apenas tickets que estão disponíveis OU que são lotes com outros status
          return (ticket as any).is_available || (ticket as any).is_batch_ticket;
        });
      
      console.log('🎫 Tickets processados com lotes ordenados:', processed);
      
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

  const isTicketAvailable = (ticket: TicketData & { batch_status?: string; is_available?: boolean }) => {
    // Se é um ticket com batch, usar as informações do batch
    if ((ticket as any).is_batch_ticket) {
      return (ticket as any).is_available === true;
    }
    
    // Para tickets sem lotes, usar lógica original
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
                const batchStatus = (ticket as any).batch_status;
                const isBatchTicket = (ticket as any).is_batch_ticket;

                // Determinar status e ícone para lotes
                let statusText = '';
                let statusIcon = '';
                let statusClass = '';
                
                if (isBatchTicket) {
                  switch (batchStatus) {
                    case 'upcoming':
                      statusText = 'Indisponível';
                      statusIcon = '⏳';
                      statusClass = 'bg-yellow-100 text-yellow-700';
                      break;
                    case 'ended':
                      statusText = 'PRAZO TERMINADO';
                      statusIcon = '⏰';
                      statusClass = 'bg-orange-100 text-orange-700';
                      break;
                    case 'sold_out':
                      statusText = 'Esgotado';
                      statusIcon = '❌';
                      statusClass = 'bg-red-100 text-red-700';
                      break;
                    case 'active':
                      if (isAvailable) {
                        statusText = 'Disponível';
                        statusIcon = '✅';
                        statusClass = 'bg-green-100 text-green-700';
                      } else {
                        statusText = 'Esgotado';
                        statusIcon = '❌';
                        statusClass = 'bg-red-100 text-red-700';
                      }
                      break;
                    default:
                      statusText = 'Indisponível';
                      statusIcon = '❓';
                      statusClass = 'bg-gray-100 text-gray-700';
                  }
                }

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
                        <div className="flex items-center gap-2">
                          <h4 className="text-gray-900 font-bold text-sm">{displayName}</h4>
                          {(ticket as any).is_half_price && (
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                              🎓 Meia
                            </span>
                          )}
                        </div>
                        {ticket.description && (
                          <p className="text-gray-600 text-xs mt-1">{ticket.description}</p>
                        )}
                        {showLimited && isAvailable && (
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3 text-yellow-500" />
                            <span className="text-yellow-600 text-xs font-medium">POUCOS RESTANTES ⚠️</span>
                          </div>
                        )}
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
                          <div className="flex flex-col items-end space-y-1">
                            <span className={`px-2 py-1 text-xs rounded-full ${statusClass}`}>
                              {statusIcon} {statusText}
                            </span>
                 {isBatchTicket && batchStatus === 'upcoming' && (
                   <span className="text-xs text-gray-500">
                     {(ticket as any).batch_info?.sale_start_date && 
                       `Inicia ${new Date((ticket as any).batch_info.sale_start_date).toLocaleDateString('pt-BR')}`}
                   </span>
                 )}
                 {isBatchTicket && batchStatus === 'ended' && (
                   <span className="text-xs text-orange-600">
                     {(ticket as any).batch_info?.sale_end_date && 
                       `Vendas encerraram ${new Date((ticket as any).batch_info.sale_end_date).toLocaleDateString('pt-BR')}`}
                   </span>
                 )}
                          </div>
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