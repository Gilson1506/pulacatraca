import React, { useState, useEffect } from 'react';
import { Plus, Minus, Ticket, Star, Clock, Users, Info } from 'lucide-react';

interface TicketData {
  id: string;
  name: string;
  price: number;
  quantity: number;
  description?: string;
  has_half_price?: boolean;
  min_quantity?: number;
  max_quantity?: number;
  sale_start_date?: string;
  sale_end_date?: string;
}

interface TicketSelectorProps {
  tickets: TicketData[];
  onSelectionChange: (ticket: TicketData | null, fullQuantity: number, halfQuantity: number) => void;
  className?: string;
}

const TicketSelector: React.FC<TicketSelectorProps> = ({ 
  tickets, 
  onSelectionChange,
  className = "" 
}) => {
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
  const [fullQuantity, setFullQuantity] = useState(1);
  const [halfQuantity, setHalfQuantity] = useState(0);

  // Auto-selecionar primeiro ticket
  useEffect(() => {
    if (tickets && tickets.length > 0 && !selectedTicket) {
      const firstTicket = tickets[0];
      setSelectedTicket(firstTicket);
      setFullQuantity(firstTicket.min_quantity || 1);
      setHalfQuantity(0);
    }
  }, [tickets, selectedTicket]);

  // Notificar mudanças para o componente pai
  useEffect(() => {
    onSelectionChange(selectedTicket, fullQuantity, halfQuantity);
  }, [selectedTicket, fullQuantity, halfQuantity, onSelectionChange]);

  const handleTicketSelect = (ticket: TicketData) => {
    setSelectedTicket(ticket);
    setFullQuantity(ticket.min_quantity || 1);
    setHalfQuantity(0);
  };

  const adjustFullQuantity = (delta: number) => {
    if (!selectedTicket) return;
    
    const newQuantity = Math.max(
      selectedTicket.min_quantity || 1,
      Math.min(
        (selectedTicket.max_quantity || 10) - halfQuantity,
        fullQuantity + delta
      )
    );
    setFullQuantity(newQuantity);
  };

  const adjustHalfQuantity = (delta: number) => {
    if (!selectedTicket) return;
    
    const newQuantity = Math.max(
      0,
      Math.min(
        (selectedTicket.max_quantity || 10) - fullQuantity,
        halfQuantity + delta
      )
    );
    setHalfQuantity(newQuantity);
  };

  const getTotalPrice = () => {
    if (!selectedTicket) return 0;
    return (fullQuantity * selectedTicket.price) + (halfQuantity * selectedTicket.price / 2);
  };

  const getTotalQuantity = () => {
    return fullQuantity + halfQuantity;
  };

  const isTicketAvailable = (ticket: TicketData) => {
    const now = new Date();
    if (ticket.sale_start_date && new Date(ticket.sale_start_date) > now) return false;
    if (ticket.sale_end_date && new Date(ticket.sale_end_date) < now) return false;
    return ticket.quantity > 0;
  };

  if (!tickets || tickets.length === 0) {
    return (
      <div className={`bg-white rounded-2xl shadow-lg p-6 ${className}`}>
        <div className="text-center py-8">
          <Ticket className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Nenhum ingresso disponível
          </h3>
          <p className="text-gray-500">
            Os ingressos ainda não foram configurados para este evento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl shadow-lg p-6 ${className}`}>
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
          <Ticket className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900">
          Escolha seu ingresso
        </h3>
      </div>
      
      {/* Lista de Ingressos */}
      <div className="space-y-4 mb-6">
        {tickets.map((ticket) => {
          const available = isTicketAvailable(ticket);
          const isSelected = selectedTicket?.id === ticket.id;
          
          return (
            <div 
              key={ticket.id} 
              className={`border-2 rounded-xl p-5 cursor-pointer transition-all duration-200 ${
                isSelected 
                  ? 'border-pink-500 bg-gradient-to-r from-pink-50 to-purple-50 shadow-md' 
                  : available
                    ? 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
              }`}
              onClick={() => available && handleTicketSelect(ticket)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    {/* Radio Button */}
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected 
                        ? 'border-pink-500 bg-pink-500' 
                        : 'border-gray-300'
                    }`}>
                      {isSelected && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    
                    <h4 className="text-lg font-bold text-gray-900">
                      {ticket.name}
                    </h4>
                    
                    {!available && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                        Indisponível
                      </span>
                    )}
                  </div>
                  
                  {ticket.description && (
                    <p className="text-gray-600 text-sm mb-3 ml-8">
                      {ticket.description}
                    </p>
                  )}
                  
                  {/* Informações do Ingresso */}
                  <div className="ml-8 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span>Disponíveis: {ticket.quantity}</span>
                    </div>
                    
                    {(ticket.min_quantity || ticket.max_quantity) && (
                      <div className="flex items-center space-x-2">
                        <Info className="w-4 h-4" />
                        <span>
                          Limite: {ticket.min_quantity || 1}-{ticket.max_quantity || 10}
                        </span>
                      </div>
                    )}
                    
                    {ticket.has_half_price && ticket.price > 0 && (
                      <div className="flex items-center space-x-2">
                        <Star className="w-4 h-4" />
                        <span>Meia-entrada disponível</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Preços */}
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    {ticket.price === 0 ? (
                      <span className="text-green-600">Gratuito</span>
                    ) : (
                      `R$ ${ticket.price.toFixed(2)}`
                    )}
                  </p>
                  
                  {ticket.has_half_price && ticket.price > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      Meia: R$ {(ticket.price / 2).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Seleção de Quantidade */}
      {selectedTicket && isTicketAvailable(selectedTicket) && (
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            Quantidade
          </h4>
          
          <div className="space-y-4">
            {/* Ingressos Inteiros */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <span className="font-medium text-gray-900">Inteiros</span>
                <p className="text-sm text-gray-600">
                  {selectedTicket.price === 0 ? 'Gratuito' : `R$ ${selectedTicket.price.toFixed(2)} cada`}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => adjustFullQuantity(-1)}
                  disabled={fullQuantity <= (selectedTicket.min_quantity || 1)}
                  className="w-9 h-9 rounded-full border-2 border-pink-300 flex items-center justify-center hover:bg-pink-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Minus className="w-4 h-4 text-pink-600" />
                </button>
                
                <span className="w-12 text-center font-bold text-lg text-gray-900">
                  {fullQuantity}
                </span>
                
                <button
                  onClick={() => adjustFullQuantity(1)}
                  disabled={fullQuantity >= ((selectedTicket.max_quantity || 10) - halfQuantity)}
                  className="w-9 h-9 rounded-full border-2 border-pink-300 flex items-center justify-center hover:bg-pink-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-4 h-4 text-pink-600" />
                </button>
              </div>
            </div>

            {/* Ingressos Meia-Entrada */}
            {selectedTicket.has_half_price && selectedTicket.price > 0 && (
              <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-xl">
                <div>
                  <span className="font-medium text-gray-900">Meia-entrada</span>
                  <p className="text-sm text-gray-600">
                    R$ {(selectedTicket.price / 2).toFixed(2)} cada
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => adjustHalfQuantity(-1)}
                    disabled={halfQuantity <= 0}
                    className="w-9 h-9 rounded-full border-2 border-yellow-400 flex items-center justify-center hover:bg-yellow-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="w-4 h-4 text-yellow-600" />
                  </button>
                  
                  <span className="w-12 text-center font-bold text-lg text-gray-900">
                    {halfQuantity}
                  </span>
                  
                  <button
                    onClick={() => adjustHalfQuantity(1)}
                    disabled={getTotalQuantity() >= (selectedTicket.max_quantity || 10)}
                    className="w-9 h-9 rounded-full border-2 border-yellow-400 flex items-center justify-center hover:bg-yellow-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-4 h-4 text-yellow-600" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Resumo Total */}
          <div className="mt-6 p-5 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border border-pink-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-lg font-semibold text-gray-900">Total</span>
              <span className="text-3xl font-bold text-pink-600">
                {getTotalPrice() === 0 ? 'Gratuito' : `R$ ${getTotalPrice().toFixed(2)}`}
              </span>
            </div>
            
            <div className="text-sm text-gray-600">
              <p>
                {getTotalQuantity()} ingresso{getTotalQuantity() > 1 ? 's' : ''}
                {halfQuantity > 0 && (
                  <span className="ml-1">
                    ({fullQuantity} inteiro{fullQuantity > 1 ? 's' : ''} + {halfQuantity} meia)
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketSelector;