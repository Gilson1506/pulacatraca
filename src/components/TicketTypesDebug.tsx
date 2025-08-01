import React from 'react';

interface TicketTypesDebugProps {
  tickets: any[];
  eventId: string;
  isVisible?: boolean;
}

const TicketTypesDebug: React.FC<TicketTypesDebugProps> = ({ 
  tickets, 
  eventId, 
  isVisible = false 
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg max-w-md z-50">
      <h3 className="text-sm font-bold mb-2">🐛 Debug - Tipos de Ingressos</h3>
      <div className="text-xs space-y-1">
        <p><strong>Event ID:</strong> {eventId}</p>
        <p><strong>Tickets Count:</strong> {tickets.length}</p>
        
        {tickets.length > 0 ? (
          <div className="mt-2">
            <p className="font-semibold">Tickets encontrados:</p>
            {tickets.map((ticket, index) => (
              <div key={ticket.id || index} className="bg-gray-800 p-2 rounded mt-1">
                <p><strong>ID:</strong> {ticket.id}</p>
                <p><strong>Nome:</strong> {ticket.name}</p>
                <p><strong>Preço:</strong> R$ {ticket.price}</p>
                <p><strong>Disponível:</strong> {ticket.quantity || ticket.available_quantity}</p>
                <p><strong>Status:</strong> {ticket.status}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-yellow-300">❌ Nenhum ticket encontrado</p>
        )}
      </div>
      
      <button 
        onClick={() => console.log('Tickets Debug:', { eventId, tickets })}
        className="mt-2 bg-blue-600 text-white px-2 py-1 rounded text-xs"
      >
        Log no Console
      </button>
    </div>
  );
};

export default TicketTypesDebug;