import React, { useState, useEffect } from 'react';
import { Search, Check, X, Star, Calendar, Users, StarOff, MapPin, Eye, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import EventDetailsModal from '../components/Dashboard/EventDetailsModal';
import EventRejectionModal from '../components/Dashboard/EventRejectionModal';
import EventImage from '../components/Common/EventImage';

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

// Componente Switch customizado para o carrossel
const CarouselSwitch = ({ checked, onChange }: { checked: boolean, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
  </label>
);

export default function EventsPage() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [carouselFieldsAvailable, setCarouselFieldsAvailable] = useState(true);
  
  const [selectedEvent, setSelectedEvent] = useState<AdminEvent | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      console.log('Buscando eventos...');
      
      const { data: events, error } = await supabase
        .from('events')
        .select(`
          *,
          organizer:profiles(name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar eventos:', error);
        throw error;
      }

      console.log('Eventos encontrados:', events);
      console.log('Número de eventos:', events?.length || 0);

      // Mapear os eventos para o formato AdminEvent
      const formattedEvents: AdminEvent[] = events.map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        organizer_id: event.organizer_id,
        organizer_name: event.organizer?.name || 'Organizador desconhecido',
        start_date: event.start_date,
        end_date: event.end_date,
        location: event.location,
        status: event.status,
        created_at: event.created_at,
        updated_at: event.updated_at,
        image: event.image,
        price: event.price,
        available_tickets: event.available_tickets,
        total_tickets: event.total_tickets,
        category: event.category,
        tags: event.tags || [],
        carousel_approved: event.carousel_approved || false,
        carousel_priority: event.carousel_priority || 0,
        reviewed_at: event.reviewed_at,
        reviewed_by: event.reviewed_by,
        rejection_reason: event.rejection_reason
      }));

      setEvents(formattedEvents);
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.organizer_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || event.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/50 dark:text-green-300';
      case 'pending': return 'border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300';
      case 'rejected': return 'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/50 dark:text-red-300';
      case 'draft': return 'border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300';
      case 'cancelled': return 'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/50 dark:text-red-300';
      default: return 'border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300';
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

  const handleApproveEvent = async (eventId: string) => {
    try {
      console.log('Aprovando evento:', eventId);
      
      const { data, error } = await supabase
        .from('events')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'Admin' // TODO: Usar o nome do usuário logado
        })
        .eq('id', eventId)
        .select();

      if (error) {
        console.error('Erro detalhado ao aprovar evento:', error);
        throw error;
      }

      console.log('Evento aprovado com sucesso:', data);

      // Recarregar eventos
      await fetchEvents();
      setIsDetailsModalOpen(false);
    } catch (error) {
      console.error('Erro ao aprovar evento:', error);
      alert('Erro ao aprovar evento. Verifique o console para mais detalhes.');
    }
  };

  const handleRejectEvent = async (reason: string) => {
    if (!selectedEvent) return;

    try {
      console.log('Rejeitando evento:', selectedEvent.id, 'Motivo:', reason);
      
      const { data, error } = await supabase
        .from('events')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'Admin' // TODO: Usar o nome do usuário logado
        })
        .eq('id', selectedEvent.id)
        .select();

      if (error) {
        console.error('Erro detalhado ao rejeitar evento:', error);
        throw error;
      }

      console.log('Evento rejeitado com sucesso:', data);

      // Recarregar eventos
      await fetchEvents();
      setIsRejectionModalOpen(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Erro ao rejeitar evento:', error);
      alert('Erro ao rejeitar evento. Verifique o console para mais detalhes.');
    }
  };

  const handleOpenDetailsModal = (event: AdminEvent) => {
    setSelectedEvent(event);
    setIsDetailsModalOpen(true);
  };

  const handleOpenRejectionModal = () => {
    setIsDetailsModalOpen(false);
    setIsRejectionModalOpen(true);
  };
  
  const handleToggleCarousel = async (eventId: string, approved: boolean) => {
    try {
      console.log('Atualizando carrossel para evento:', eventId, 'Aprovado:', approved);
      
      // Primeiro, verificar se os campos existem na tabela
      const updateData: Record<string, unknown> = {};
      
      // Tentar atualizar carousel_approved se existir
      try {
        updateData.carousel_approved = approved;
        updateData.carousel_priority = approved ? 1 : 0;
      } catch {
        console.warn('Campos de carrossel não disponíveis, pulando...');
      }

      const { data, error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', eventId)
        .select();

      if (error) {
        console.error('Erro detalhado ao atualizar carrossel:', error);
        
        // Se o erro for sobre colunas não existentes, desabilitar campos de carrossel
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          console.log('Campos de carrossel não existem, desabilitando...');
          setCarouselFieldsAvailable(false);
          
          // Tentar apenas atualizar o status
          const { error: statusError } = await supabase
            .from('events')
            .update({
              status: approved ? 'approved' : 'pending'
            })
            .eq('id', eventId);
          
          if (statusError) {
            console.error('Erro ao atualizar status:', statusError);
            throw statusError;
          }
        } else {
          throw error;
        }
      } else {
        console.log('Carrossel atualizado com sucesso:', data);
      }

      // Recarregar eventos
      await fetchEvents();
    } catch (error) {
      console.error('Erro ao atualizar carrossel:', error);
      alert('Erro ao atualizar carrossel. Verifique o console para mais detalhes.');
    }
  };

  const handlePriorityChange = async (eventId: string, priority: number) => {
    try {
      console.log('Atualizando prioridade para evento:', eventId, 'Prioridade:', priority);
      
      const newPriority = Math.max(0, priority);
      
      // Tentar atualizar carousel_priority se existir
      try {
        const { data, error } = await supabase
          .from('events')
          .update({
            carousel_priority: newPriority
          })
          .eq('id', eventId)
          .select();

        if (error) {
          console.error('Erro detalhado ao atualizar prioridade:', error);
          
          // Se o erro for sobre coluna não existente, ignorar
          if (error.message.includes('column') && error.message.includes('does not exist')) {
            console.log('Campo carousel_priority não existe, ignorando...');
            return;
          }
          throw error;
        }

        console.log('Prioridade atualizada com sucesso:', data);
      } catch (e) {
        console.warn('Campo de prioridade não disponível:', e);
      }

      // Recarregar eventos
      await fetchEvents();
    } catch (error) {
      console.error('Erro ao atualizar prioridade:', error);
      alert('Erro ao atualizar prioridade. Verifique o console para mais detalhes.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando eventos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Moderação de Eventos</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Aprove, rejeite e gerencie a visibilidade dos eventos.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por título ou organizador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select
              value={filterStatus}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
              <option value="all">Todos os Status</option>
              <option value="approved">Aprovado</option>
              <option value="pending">Pendente</option>
              <option value="rejected">Rejeitado</option>
              <option value="draft">Rascunho</option>
              <option value="cancelled">Cancelado</option>
          </select>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Evento</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Detalhes</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                {carouselFieldsAvailable && (
                  <>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Carrossel</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Prioridade</th>
                  </>
                )}
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-4">
                      <EventImage
                        src={event.image}
                        alt={event.title}
                        size="md"
                        className="flex-shrink-0"
                        fallbackIcon="event"
                        showLoadingState={true}
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{event.title}</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{event.organizer_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 truncate">{event.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                     <div className="flex items-center text-xs"><Calendar className="w-4 h-4 mr-2" />{new Date(event.start_date).toLocaleDateString('pt-BR')}</div>
                     <div className="flex items-center text-xs mt-1"><MapPin className="w-4 h-4 mr-2" />{event.location}</div>
                     <div className="flex items-center text-xs mt-1"><Users className="w-4 h-4 mr-2" />{event.total_tickets.toLocaleString()} ingressos</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(event.status)}`}>
                      {getStatusText(event.status)}
                    </span>
                  </td>
                  {carouselFieldsAvailable && (
                    <>
                      <td className="px-6 py-4">
                        <CarouselSwitch 
                          checked={event.carousel_approved || false} 
                          onChange={(e) => handleToggleCarousel(event.id, e.target.checked)} 
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="number" 
                          value={event.carousel_priority || 0} 
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePriorityChange(event.id, parseInt(e.target.value, 10))}
                          className="w-16 p-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-center focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          min="0"
                          max="10"
                        />
                      </td>
                    </>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex space-x-1">
                      {event.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleApproveEvent(event.id)} 
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/50 rounded-lg" 
                            title="Aprovar"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => { setSelectedEvent(event); handleOpenRejectionModal(); }} 
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg" 
                            title="Rejeitar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {event.status === 'approved' && carouselFieldsAvailable && (
                        <button 
                          onClick={() => handleToggleCarousel(event.id, !event.carousel_approved)}
                          className={`p-2 rounded-lg ${ event.carousel_approved ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/50' : 'text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'}`}
                          title={event.carousel_approved ? 'Remover do Carrossel' : 'Adicionar ao Carrossel'}
                        >
                          {event.carousel_approved ? <Star className="w-4 h-4" /> : <StarOff className="w-4 h-4" />}
                        </button>
                      )}
                      <button 
                        onClick={() => handleOpenDetailsModal(event)} 
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg" 
                        title="Ver Detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Nenhum evento encontrado</p>
          </div>
        )}
      </div>
      
      <EventDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        event={selectedEvent}
        onApprove={handleApproveEvent}
        onRejectClick={handleOpenRejectionModal}
      />
      <EventRejectionModal
        isOpen={isRejectionModalOpen}
        onClose={() => setIsRejectionModalOpen(false)}
        onConfirm={handleRejectEvent}
        eventName={selectedEvent?.title || ''}
      />
    </div>
  );
}