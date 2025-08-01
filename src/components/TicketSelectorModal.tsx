import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, MapPin, Star, Users, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TicketData {
  id: string;
  name: string;
  price: number;
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

  // Inicializar seleções
  useEffect(() => {
    if (tickets.length > 0) {
      setSelections(
        tickets.map(ticket => ({
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
    setSelections(prev => {
      const existing = prev.find(s => s.ticketId === ticketId);
      if (existing) {
        return prev.map(s => s.ticketId === ticketId ? { ...s, [field]: Math.max(0, value) } : s);
      } else {
        return [...prev, { ticketId, masculineQuantity: 0, feminineQuantity: 0, [field]: Math.max(0, value) }];
      }
    });
  };

  const calculateTotal = () => {
    return selections.reduce((total, selection) => {
      const ticket = tickets.find(t => t.id === selection.ticketId);
      if (!ticket) return total;
      
      const masculineTotal = selection.masculineQuantity * ticket.price;
      const feminineTotal = selection.feminineQuantity * ticket.price;
      
      return total + masculineTotal + feminineTotal;
    }, 0);
  };

  const getTotalQuantity = () => {
    return selections.reduce((total, selection) => {
      return total + selection.masculineQuantity + selection.feminineQuantity;
    }, 0);
  };

  const handleFinalize = async () => {
    if (!user) {
      onAuthRequired();
      return;
    }

    const totalQuantity = getTotalQuantity();
    if (totalQuantity === 0) return;

    setLoading(true);

    try {
      // Preparar dados para checkout
      const selectedTickets = selections
        .filter(s => s.masculineQuantity > 0 || s.feminineQuantity > 0)
        .map(selection => {
          const ticket = tickets.find(t => t.id === selection.ticketId);
          return {
            ticketId: ticket?.id,
            ticketName: ticket?.name,
            ticketPrice: ticket?.price,
            masculineQuantity: selection.masculineQuantity,
            feminineQuantity: selection.feminineQuantity,
            area: ticket?.area,
            sector: ticket?.sector
          };
        });

      // Navegar para checkout
      navigate('/checkout', {
        state: {
          event: {
            id: event.id,
            title: event.title,
            date: event.date,
            location: event.location,
            image: event.image
          },
          selectedTickets,
          totalAmount: calculateTotal()
        }
      });
    } catch (error) {
      console.error('Erro ao finalizar seleção:', error);
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
    if (area.toLowerCase().includes('premium') || area.toLowerCase().includes('vip')) {
      return <Star className="w-4 h-4 text-yellow-500" />;
    }
    if (area.toLowerCase().includes('front') || area.toLowerCase().includes('stage')) {
      return <Zap className="w-4 h-4 text-purple-500" />;
    }
    if (area.toLowerCase().includes('camarote')) {
      return <Star className="w-4 h-4 text-green-500" />;
    }
    if (area.toLowerCase().includes('backstage')) {
      return <Zap className="w-4 h-4 text-red-500" />;
    }
    if (area.toLowerCase().includes('open bar')) {
      return <Users className="w-4 h-4 text-orange-500" />;
    }
    return <Users className="w-4 h-4 text-blue-500" />;
  };

  const getAreaColors = (area?: string) => {
    if (!area) return 'bg-white/5 border-gray-300/50';
    if (area.toLowerCase().includes('premium') || area.toLowerCase().includes('vip')) {
      return 'bg-yellow-500/10 border-yellow-400/60';
    }
    if (area.toLowerCase().includes('front') || area.toLowerCase().includes('stage')) {
      return 'bg-purple-500/10 border-purple-400/60';
    }
    if (area.toLowerCase().includes('camarote')) {
      return 'bg-green-500/10 border-green-400/60';
    }
    if (area.toLowerCase().includes('backstage')) {
      return 'bg-red-500/10 border-red-400/60';
    }
    if (area.toLowerCase().includes('open bar')) {
      return 'bg-orange-500/10 border-orange-400/60';
    }
    return 'bg-blue-500/10 border-blue-400/60';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop transparente */}
      <div 
        className={`absolute inset-0 transition-all duration-500 ${
          showModal ? 'bg-opacity-0' : 'bg-opacity-0'
        }`}
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div 
        className={`relative bg-white/15 backdrop-blur-sm border border-gray-400/30 rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden transform transition-all duration-500 ease-out ${
          showModal 
            ? 'translate-y-0 scale-100 opacity-100' 
            : 'translate-y-8 scale-95 opacity-0'
        }`}
      >
        {/* Header transparente */}
        <div className="relative bg-gray-900/20 backdrop-blur-md px-6 py-5 border-b border-gray-400/30">
          <div className="absolute inset-0 bg-gray-900/20"></div>
          
                      <div className="relative flex items-center justify-between text-white">
              <div>
                <h2 className="text-xl font-bold text-white drop-shadow-lg">Selecione o ingresso ou setor</h2>
                <p className="text-gray-100 text-sm mt-1 drop-shadow-md">{event.title}</p>
              </div>
            
                          <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-sm transition-colors backdrop-blur-sm"
              >
                <X className="w-6 h-6 text-white drop-shadow-lg" />
              </button>
          </div>
        </div>

        {/* Conteúdo Scrollável */}
        <div className="overflow-y-auto max-h-[calc(85vh-180px)]">
          {tickets.length === 0 ? (
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
            <div className="p-6 space-y-6">
              {tickets.map((ticket, index) => {
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
                    <div className={`${getAreaColors(ticket.area)} backdrop-blur-md rounded-sm p-4 mb-4 border`}>
                      <div className="flex items-start space-x-3">
                                                  <div className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm">
                            {getAreaIcon(ticket.area)}
                          </div>
                        
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-lg drop-shadow-sm">
                            {ticket.area || ticket.name || 'Ingresso'}
                          </h3>
                          
                          {ticket.sector && (
                            <p className="text-purple-600 font-medium drop-shadow-sm">
                              {ticket.sector}
                            </p>
                          )}
                          
                          {ticket.description && (
                            <p className="text-gray-700 text-sm mt-1 drop-shadow-sm">
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
                      <div className="space-y-4 pl-4">
                        {/* Feminino */}
                        <div className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-sm border border-gray-300/50 rounded-sm hover:border-gray-400/70 transition-colors">
                          <div className="flex-1">
                                                          <h4 className="font-semibold text-gray-900 drop-shadow-sm">
                                Feminino - {ticket.area || ticket.name}
                              </h4>
                              <p className="text-gray-800 font-bold text-lg drop-shadow-sm">
                                R$ {ticket.price.toFixed(2).replace('.', ',')}
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
                        <div className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-sm border border-gray-300/50 rounded-sm hover:border-gray-400/70 transition-colors">
                          <div className="flex-1">
                                                          <h4 className="font-semibold text-gray-900 drop-shadow-sm">
                                Masculino - {ticket.area || ticket.name}
                              </h4>
                              <p className="text-gray-800 font-bold text-lg drop-shadow-sm">
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
        {tickets.length > 0 && (
          <div className="sticky bottom-0 bg-white/10 backdrop-blur-md border-t border-gray-400/30 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-2xl font-bold text-gray-900 drop-shadow-md">
                  Total: R$ {calculateTotal().toFixed(2).replace('.', ',')}
                </p>
                <p className="text-sm text-gray-700 drop-shadow-sm">
                  + Taxa Adm.
                </p>
              </div>
              
              {getTotalQuantity() > 0 && (
                <div className="text-right">
                  <p className="text-sm text-gray-700 drop-shadow-sm">
                    {getTotalQuantity()} ingresso{getTotalQuantity() > 1 ? 's' : ''} selecionado{getTotalQuantity() > 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
            
            <button
              onClick={handleFinalize}
              disabled={loading || getTotalQuantity() === 0}
              className="w-full bg-gray-900/80 backdrop-blur-sm text-white py-4 px-6 rounded-sm font-bold text-lg hover:bg-gray-800/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center drop-shadow-lg"
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