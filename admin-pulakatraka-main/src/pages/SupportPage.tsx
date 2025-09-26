import React, { useState, useEffect } from 'react';
import { Search, AlertTriangle, Clock, MessageSquare, User, Mail, Tag, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { SupportTicket, SupportMessage } from '../types';

interface TicketDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: SupportTicket | null;
  messages: SupportMessage[];
  onSendMessage: (content: string) => void;
  onUpdateTicket: (data: Partial<SupportTicket>) => void;
}

const TicketDetailsModal: React.FC<TicketDetailsModalProps> = ({
  isOpen,
  onClose,
  ticket,
  messages,
  onSendMessage,
  onUpdateTicket
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [status, setStatus] = useState(ticket?.status || 'Aberto');
  const [priority, setPriority] = useState(ticket?.priority || 'Média');

  useEffect(() => {
    if (ticket) {
      setStatus(ticket.status);
      setPriority(ticket.priority);
    }
  }, [ticket]);

  if (!isOpen || !ticket) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    onSendMessage(newMessage);
    setNewMessage('');
  };

  const handleStatusChange = (newStatus: SupportTicket['status']) => {
    setStatus(newStatus);
    onUpdateTicket({ status: newStatus });
  };

  const handlePriorityChange = (newPriority: SupportTicket['priority']) => {
    setPriority(newPriority);
    onUpdateTicket({ priority: newPriority });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{ticket.subject}</h2>
              <div className="mt-2 space-y-1">
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <User className="w-4 h-4" />
                  <span>{ticket.user_name}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Mail className="w-4 h-4" />
                  <span>{ticket.user_email}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Tag className="w-4 h-4" />
                  <span>{ticket.category}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">Fechar</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value as SupportTicket['status'])}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-700"
              >
                <option value="Aberto">Aberto</option>
                <option value="Em Andamento">Em Andamento</option>
                <option value="Resolvido">Resolvido</option>
                <option value="Fechado">Fechado</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Prioridade</label>
              <select
                value={priority}
                onChange={(e) => handlePriorityChange(e.target.value as SupportTicket['priority'])}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-gray-700"
              >
                <option value="Baixa">Baixa</option>
                <option value="Média">Média</option>
                <option value="Alta">Alta</option>
                <option value="Urgente">Urgente</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.is_staff ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-4 ${
                  message.is_staff
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <span className="font-medium">{message.user_name}</span>
                  <span className="text-xs opacity-75">
                    {new Date(message.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {message.attachments.map((attachment, index) => (
                      <a
                        key={index}
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 text-sm underline"
                      >
                        <span>{attachment.name}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSubmit} className="flex space-x-4">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="flex-1 min-w-0 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enviar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | SupportTicket['status']>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | SupportTicket['priority']>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | SupportTicket['category']>('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
    }
  }, [selectedTicket]);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const { data: tickets, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(tickets || []);
    } catch (error) {
      console.error('Erro ao buscar tickets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (ticketId: string) => {
    try {
      const { data: messages, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(messages || []);
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedTicket) return;

    try {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: selectedTicket.id,
          content,
          is_staff: true,
          user_id: 'staff', // TODO: Usar ID do usuário logado
          user_name: 'Atendente' // TODO: Usar nome do usuário logado
        });

      if (error) throw error;

      // Atualizar última resposta do ticket
      await supabase
        .from('support_tickets')
        .update({
          last_response: content,
          last_response_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTicket.id);

      // Recarregar mensagens
      await fetchMessages(selectedTicket.id);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  const handleUpdateTicket = async (data: Partial<SupportTicket>) => {
    if (!selectedTicket) return;

    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedTicket.id);

      if (error) throw error;

      // Recarregar tickets
      await fetchTickets();
    } catch (error) {
      console.error('Erro ao atualizar ticket:', error);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.user_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || ticket.priority === filterPriority;
    const matchesCategory = filterCategory === 'all' || ticket.category === filterCategory;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aberto':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700';
      case 'Em Andamento':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700';
      case 'Resolvido':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700';
      case 'Fechado':
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Baixa':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700';
      case 'Média':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700';
      case 'Alta':
        return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-700';
      case 'Urgente':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Suporte</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gerencie todos os tickets de suporte.</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por assunto, nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | SupportTicket['status'])}
              className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Todos os Status</option>
              <option value="Aberto">Aberto</option>
              <option value="Em Andamento">Em Andamento</option>
              <option value="Resolvido">Resolvido</option>
              <option value="Fechado">Fechado</option>
            </select>
            
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as 'all' | SupportTicket['priority'])}
              className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Todas as Prioridades</option>
              <option value="Baixa">Baixa</option>
              <option value="Média">Média</option>
              <option value="Alta">Alta</option>
              <option value="Urgente">Urgente</option>
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as 'all' | SupportTicket['category'])}
              className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Todas as Categorias</option>
              <option value="Conta">Conta</option>
              <option value="Pagamento">Pagamento</option>
              <option value="Evento">Evento</option>
              <option value="Ingresso">Ingresso</option>
              <option value="Técnico">Técnico</option>
              <option value="Outro">Outro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Tickets */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Ticket</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Cliente</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Prioridade</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Categoria</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Última Atualização</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg">
                        <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{ticket.subject}</p>
                        {ticket.last_response && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                            {ticket.last_response}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-900 dark:text-white">{ticket.user_name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{ticket.user_email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{ticket.category}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{new Date(ticket.updated_at).toLocaleString('pt-BR')}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTickets.length === 0 && (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Nenhum ticket encontrado</p>
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      <TicketDetailsModal
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        ticket={selectedTicket}
        messages={messages}
        onSendMessage={handleSendMessage}
        onUpdateTicket={handleUpdateTicket}
      />
    </div>
  );
}