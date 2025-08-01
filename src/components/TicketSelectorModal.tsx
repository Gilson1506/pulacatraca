import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, MapPin, Star, Users, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TicketData {
  id: string;
  name: string;
  price: number;
  price_feminine?: number;
  quantity: number;
  description?: string;
  area?: string;
  sector?: string;
  benefits?: string[];
  has_half_price?: boolean;
  min_quantity?: number;
  max_quantity?: number;
  sale_start_date?: string;
  sale_end_date?: string;
  ticket_type?: string;
  status?: string;
  stripe_price_id?: string;
  batches?: BatchData[];
  current_batch?: BatchData | null;
  sale_period_type?: 'date' | 'batch';
  availability?: 'public' | 'restricted' | 'manual';
}

interface BatchData {
  id: string;
  batch_number: number;
  batch_name?: string;
  price_masculine: number;
  price_feminine: number;
  quantity: number;
  available_quantity: number;
  sale_start_date?: string;
  sale_end_date?: string;
  status: string;
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
  };
  user: any;
  onAuthRequired: () => void;
}

interface TicketSelection {
  ticketId: string;
  masculineQuantity: number;
  feminineQuantity: number;
}

const TicketSelectorModal: React.FC<TicketSelectorModalProps> = ({
  isOpen,
  onClose,
  tickets,
  event,
  user,
  onAuthRequired
}) => {
  const navigate = useNavigate();
  const [selections, setSelections] = useState<TicketSelection[]>([]);
  const [processedTickets, setProcessedTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Animação de entrada do modal
  useEffect(() => {
    if (isOpen) {
      // Delay para animação suave
      setTimeout(() => setShowModal(true), 10);
    } else {
      setShowModal(false);
    }
  }, [isOpen]);

  // Inicializar seleções e processar preços
  useEffect(() => {
    if (tickets.length > 0) {
      console.log('🎫 TicketSelectorModal - Tickets recebidos:', tickets);
      
      // Processar tickets para adicionar preço feminino se não existir
      const processed = tickets.map(ticket => {
        let currentPrice = ticket.price;
        let currentPriceFeminine = ticket.price_feminine || (ticket.price * 0.9);
        
        // Se há lotes, usar preço do lote atual
        if (ticket.sale_period_type === 'batch' && ticket.current_batch) {
          currentPrice = ticket.current_batch.price_masculine;
          currentPriceFeminine = ticket.current_batch.price_feminine;
        }
        
        return {
          ...ticket,
          price: currentPrice,
          price_feminine: currentPriceFeminine,
          area: ticket.area || ticket.name || 'Ingresso Geral'
        };
      });
      
      console.log('🎫 TicketSelectorModal - Tickets processados:', processed);
      
      setProcessedTickets(processed);
      setSelections(
        processed.map(ticket => ({
          ticketId: ticket.id,
          masculineQuantity: 0,
          feminineQuantity: 0
        }))
      );
    }
  }, [tickets]);

  const getSelection = (ticketId: string) => {
    return selections.find(s => s.ticketId === ticketId) || {
      ticketId,
      masculineQuantity: 0,
      feminineQuantity: 0
    };
  };

  const updateSelection = (ticketId: string, field: 'masculineQuantity' | 'feminineQuantity', value: number) => {
    console.log('🔄 Atualizando seleção:', { ticketId, field, value });
    
    setSelections(prev => {
      const existing = prev.find(s => s.ticketId === ticketId);
      const newValue = Math.max(0, value);
      
      let newSelections;
      if (existing) {
        newSelections = prev.map(s => 
          s.ticketId === ticketId ? { ...s, [field]: newValue } : s
        );
      } else {
        newSelections = [...prev, { 
          ticketId, 
          masculineQuantity: 0, 
          feminineQuantity: 0, 
          [field]: newValue 
        }];
      }
      
      console.log('🔄 Novas seleções:', newSelections);
      return newSelections;
    });
  };

  const calculateTotal = () => {
    const total = selections.reduce((total, selection) => {
      const ticket = processedTickets.find(t => t.id === selection.ticketId);
      if (!ticket) return total;
      
      const masculineTotal = selection.masculineQuantity * ticket.price;
      const feminineTotal = selection.feminineQuantity * (ticket.price_feminine || ticket.price);
      
      return total + masculineTotal + feminineTotal;
    }, 0);
    
    console.log('💰 Total calculado:', total);
    return total;
  };

  const getTotalQuantity = () => {
    const totalQty = selections.reduce((total, selection) => {
      return total + selection.masculineQuantity + selection.feminineQuantity;
    }, 0);
    
    console.log('🔢 Quantidade total:', totalQty);
    return totalQty;
  };

  const handleFinalize = async () => {
    if (!user) {
      onAuthRequired();
      return;
    }

    const totalQuantity = getTotalQuantity();
    if (totalQuantity === 0) {
      alert('Selecione pelo menos um ingresso');
      return;
    }

    setLoading(true);

    try {
      // Preparar dados para checkout - formato correto
      const selectedTickets = [];
      
      selections
        .filter(s => s.masculineQuantity > 0 || s.feminineQuantity > 0)
        .forEach(selection => {
          const ticket = processedTickets.find(t => t.id === selection.ticketId);
          
          // Adicionar ingressos masculinos
          if (selection.masculineQuantity > 0) {
            selectedTickets.push({
              ticketId: ticket?.id,
              ticketName: ticket?.name,
              price: ticket?.price || 0,
              quantity: selection.masculineQuantity,
              gender: 'masculine',
              area: ticket?.area,
              sector: ticket?.sector,
              stripe_price_id: ticket?.stripe_price_id
            });
          }
          
          // Adicionar ingressos femininos
          if (selection.feminineQuantity > 0) {
            selectedTickets.push({
              ticketId: ticket?.id,
              ticketName: ticket?.name,
              price: ticket?.price_feminine || ticket?.price || 0,
              quantity: selection.feminineQuantity,
              gender: 'feminine',
              area: ticket?.area,
              sector: ticket?.sector,
              stripe_price_id: ticket?.stripe_price_id
            });
          }
        });

      console.log('🛒 Dados para checkout:', selectedTickets);
      console.log('🎯 Evento para checkout:', event);
      
      const checkoutData = {
        event: {
          id: event.id,
          title: event.title,
          date: event.date,
          location: event.location,
          image: event.image
        },
        selectedTickets,
        totalAmount: calculateTotal()
      };
      
      console.log('📦 Estado completo para checkout:', checkoutData);

      // Navegar para checkout
      navigate('/checkout', {
        state: checkoutData
      });
    } catch (error) {
      console.error('❌ Erro ao finalizar seleção:', error);
      alert('Erro ao processar seleção. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const isTicketAvailable = (ticket: TicketData) => {
    const now = new Date();
    const startDate = ticket.sale_start_date ? new Date(ticket.sale_start_date) : null;
    const endDate = ticket.sale_end_date ? new Date(ticket.sale_end_date) : null;
    
    if (startDate && now < startDate) return false;
    if (endDate && now > endDate) return false;
    return ticket.quantity > 0;
  };

  const getAreaIcon = (area?: string) => {
    if (!area) return <MapPin className="w-4 h-4" />;
    const areaLower = area.toLowerCase();
    if (areaLower.includes('premium') || areaLower.includes('vip')) {
      return <Star className="w-4 h-4 text-yellow-500" />;
    }
    if (areaLower.includes('front') || areaLower.includes('stage')) {
      return <Zap className="w-4 h-4 text-purple-500" />;
    }
    if (areaLower.includes('camarote')) {
      return <Star className="w-4 h-4 text-green-500" />;
    }
    if (areaLower.includes('backstage')) {
      return <Zap className="w-4 h-4 text-red-500" />;
    }
    if (areaLower.includes('open bar')) {
      return <Users className="w-4 h-4 text-orange-500" />;
    }
    return <Users className="w-4 h-4 text-blue-500" />;
  };

  const getAreaColors = (area?: string) => {
    if (!area) return 'bg-gray-50/80 border-gray-300/60';
    const areaLower = area.toLowerCase();
    if (areaLower.includes('premium') || areaLower.includes('vip')) {
      return 'bg-yellow-50/80 border-yellow-400/60';
    }
    if (areaLower.includes('front') || areaLower.includes('stage')) {
      return 'bg-purple-50/80 border-purple-400/60';
    }
    if (areaLower.includes('camarote')) {
      return 'bg-green-50/80 border-green-400/60';
    }
    if (areaLower.includes('backstage')) {
      return 'bg-red-50/80 border-red-400/60';
    }
    if (areaLower.includes('open bar')) {
      return 'bg-orange-50/80 border-orange-400/60';
    }
    return 'bg-blue-50/80 border-blue-400/60';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop transparente */}
      <div 
        className={`absolute inset-0 transition-all duration-500 ${
          showModal ? 'bg-black bg-opacity-50' : 'bg-black bg-opacity-0'
        }`}
        onClick={onClose}
      />
      
              {/* Modal Container */}
        <div 
          className={`relative bg-gray-100/90 backdrop-blur-sm border border-gray-300/60 rounded-lg shadow-2xl w-full max-w-sm sm:max-w-md max-h-[85vh] flex flex-col transform transition-all duration-500 ease-out ${
            showModal 
              ? 'translate-y-0 scale-100 opacity-100' 
              : 'translate-y-8 scale-95 opacity-0'
          }`}
        >
        {/* Header */}
        <div className="relative bg-gray-200/80 backdrop-blur-md px-3 sm:px-4 py-3 sm:py-4 border-b border-gray-300/60">
          <div className="absolute inset-0 bg-gray-200/80"></div>
          
          <div className="relative flex items-center justify-between text-gray-800">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-800">Selecione o ingresso</h2>
              <p className="text-gray-600 text-xs mt-1">{event.title}</p>
            </div>
            
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 hover:bg-gray-300/50 rounded-sm transition-colors"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Conteúdo Scrollável */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {processedTickets.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <MapPin className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum ingresso disponível
              </h3>
              <p className="text-gray-600">
                Este evento ainda não possui ingressos criados.
              </p>
            </div>
          ) : (
            <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
              {processedTickets.map((ticket, index) => {
                const selection = getSelection(ticket.id);
                const isAvailable = isTicketAvailable(ticket);
                
                return (
                  <div 
                    key={ticket.id}
                    className={`transform transition-all duration-300 ${
                      showModal ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
                    }`}
                    style={{ transitionDelay: `${index * 100}ms` }}
                  >
                    {/* Área/Setor Header */}
                    <div className={`${getAreaColors(ticket.area)} backdrop-blur-md rounded-sm p-2 sm:p-3 mb-2 sm:mb-3 border`}>
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm">
                          {getAreaIcon(ticket.area)}
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-sm sm:text-lg">
                            {ticket.area || ticket.name || 'Ingresso'}
                          </h3>
                          
                          {ticket.sector && (
                            <p className="text-purple-600 font-medium text-sm">
                              {ticket.sector}
                            </p>
                          )}
                          
                          {ticket.description && (
                            <p className="text-gray-700 text-sm mt-1">
                              {ticket.description}
                            </p>
                          )}
                          
                          {ticket.benefits && ticket.benefits.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {ticket.benefits.map((benefit, idx) => (
                                <span 
                                  key={idx}
                                  className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                                >
                                  {benefit}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          {/* Informações sobre lotes */}
                          {ticket.sale_period_type === 'batch' && ticket.current_batch && (
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-blue-700 text-xs font-medium">
                                  {ticket.current_batch.batch_name || `Lote ${ticket.current_batch.batch_number}`}
                                </span>
                              </div>
                              <p className="text-blue-600 text-xs mt-1">
                                {ticket.current_batch.available_quantity} de {ticket.current_batch.quantity} disponíveis
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {!isAvailable && (
                          <span className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-full font-medium">
                            Esgotado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Opções de Ingressos */}
                    {isAvailable && (
                      <div className="space-y-2 sm:space-y-3 pl-1 sm:pl-2">
                        {/* Feminino */}
                        <div className="flex items-center justify-between p-2 sm:p-3 bg-white/50 backdrop-blur-sm border border-gray-300/50 rounded-sm hover:border-gray-400/70 transition-colors">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-xs sm:text-sm">
                              Feminino - {ticket.area || ticket.name}
                            </h4>
                            <p className="text-gray-800 font-bold text-sm sm:text-lg">
                              R$ {(ticket.price_feminine || ticket.price).toFixed(2).replace('.', ',')}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => updateSelection(ticket.id, 'feminineQuantity', selection.feminineQuantity - 1)}
                              disabled={selection.feminineQuantity <= 0}
                              className="w-8 h-8 rounded-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                            >
                              <Minus className="w-4 h-4 text-gray-600" />
                            </button>
                            
                            <span className="w-8 text-center font-semibold">
                              {selection.feminineQuantity}
                            </span>
                            
                            <button
                              onClick={() => updateSelection(ticket.id, 'feminineQuantity', selection.feminineQuantity + 1)}
                              disabled={selection.feminineQuantity >= (ticket.max_quantity || 10)}
                              className="w-8 h-8 rounded-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                            >
                              <Plus className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        </div>

                        {/* Masculino */}
                        <div className="flex items-center justify-between p-2 sm:p-3 bg-white/50 backdrop-blur-sm border border-gray-300/50 rounded-sm hover:border-gray-400/70 transition-colors">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-xs sm:text-sm">
                              Masculino - {ticket.area || ticket.name}
                            </h4>
                            <p className="text-gray-800 font-bold text-sm sm:text-lg">
                              R$ {ticket.price.toFixed(2).replace('.', ',')}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => updateSelection(ticket.id, 'masculineQuantity', selection.masculineQuantity - 1)}
                              disabled={selection.masculineQuantity <= 0}
                              className="w-8 h-8 rounded-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                            >
                              <Minus className="w-4 h-4 text-gray-600" />
                            </button>
                            
                            <span className="w-8 text-center font-semibold">
                              {selection.masculineQuantity}
                            </span>
                            
                            <button
                              onClick={() => updateSelection(ticket.id, 'masculineQuantity', selection.masculineQuantity + 1)}
                              disabled={selection.masculineQuantity >= (ticket.max_quantity || 10)}
                              className="w-8 h-8 rounded-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                            >
                              <Plus className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Fixo */}
        {processedTickets.length > 0 && (
          <div className="sticky bottom-0 bg-gray-200/80 backdrop-blur-md border-t border-gray-300/60 p-3 sm:p-4">
            <div className="text-center mb-2 sm:mb-3">
              <p className="text-lg sm:text-xl font-bold text-gray-900">
                Total: R$ {calculateTotal().toFixed(2).replace('.', ',')}
              </p>
              <p className="text-xs text-gray-700">
                + Taxa Adm.
              </p>
              {getTotalQuantity() > 0 && (
                <p className="text-xs text-gray-700 mt-1">
                  {getTotalQuantity()} ingresso{getTotalQuantity() > 1 ? 's' : ''} selecionado{getTotalQuantity() > 1 ? 's' : ''}
                </p>
              )}
            </div>
            
            <button
              onClick={handleFinalize}
              disabled={loading || getTotalQuantity() === 0}
              className="w-full bg-gray-800 text-white py-3 px-3 sm:px-4 rounded-sm font-bold text-sm sm:text-base hover:bg-gray-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processando...</span>
                </div>
              ) : (
                'Finalizar'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketSelectorModal;