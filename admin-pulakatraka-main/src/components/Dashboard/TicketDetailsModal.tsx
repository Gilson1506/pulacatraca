import React, { useState } from 'react';
import { X, Send, User, MessageSquare } from 'lucide-react';
import type { SupportTicket } from '../../types';

interface TicketDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: SupportTicket | null;
  onReply: (ticketId: string, message: string) => void;
  onStatusChange: (ticketId: string, status: 'Aberto' | 'Em Andamento' | 'Fechado') => void;
}

export default function TicketDetailsModal({ isOpen, onClose, ticket, onReply, onStatusChange }: TicketDetailsModalProps) {
  const [replyMessage, setReplyMessage] = useState('');

  if (!isOpen || !ticket) return null;

  const handleReply = () => {
    if (replyMessage.trim()) {
      onReply(ticket.id, replyMessage);
      setReplyMessage('');
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onStatusChange(ticket.id, e.target.value as 'Aberto' | 'Em Andamento' | 'Fechado');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aberto': return 'bg-green-100 text-green-800 border-green-200';
      case 'Em Andamento': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Fechado': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgente': return 'bg-red-100 text-red-800';
      case 'Alta': return 'bg-orange-100 text-orange-800';
      case 'Média': return 'bg-yellow-100 text-yellow-800';
      case 'Baixa': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <MessageSquare className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-800">Detalhes do Ticket #{ticket.id}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6">
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-gray-900 mb-2">{ticket.subject}</h3>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">Aberto por: <span className="font-medium text-gray-900">{ticket.user}</span></span>
                </div>
                <span className={`px-3 py-1 rounded-full font-semibold text-xs ${getPriorityColor(ticket.priority)}`}>{ticket.priority}</span>
                {ticket.assignedTo && <span className="text-gray-700">Atribuído a: <span className="font-medium text-gray-900">{ticket.assignedTo}</span></span>}
              </div>
            </div>
            <div className="mt-4 sm:mt-0">
              <label htmlFor="status" className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select
                id="status"
                value={ticket.status}
                onChange={handleStatusChange}
                className={`w-full sm:w-auto p-2 border rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none ${getStatusColor(ticket.status)}`}
              >
                <option value="Aberto">Aberto</option>
                <option value="Em Andamento">Em Andamento</option>
                <option value="Fechado">Fechado</option>
              </select>
            </div>
          </div>
          <div className="space-y-4">
            {ticket.messages.map((msg) => (
              <div key={msg.id} className={`flex items-start gap-3 ${msg.isSupportRep ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${msg.isSupportRep ? 'bg-blue-500' : 'bg-gray-300'}`}>
                  <span className="text-white font-bold">{msg.author.charAt(0)}</span>
                </div>
                <div className={`p-4 rounded-lg max-w-md ${msg.isSupportRep ? 'bg-blue-50' : 'bg-gray-100'}`}>
                  <div className="flex items-baseline gap-2">
                    <p className="font-semibold text-gray-900">{msg.author}</p>
                    <p className="text-xs text-gray-500">{new Date(msg.createdAt).toLocaleString('pt-BR')}</p>
                  </div>
                  <p className="text-gray-800 mt-1">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {ticket.status !== 'Fechado' && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="relative">
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Digite sua resposta..."
                className="w-full p-3 pr-20 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                rows={3}
              />
              <button 
                onClick={handleReply}
                disabled={!replyMessage.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 text-white rounded-lg p-2 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 