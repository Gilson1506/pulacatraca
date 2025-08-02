import React, { useState, useEffect } from 'react';
import EventCarousel from '../components/EventCarousel';
import EventCard from '../components/EventCard';
import MobileEventSearchBar from '../components/MobileEventSearchBar';
import LiveChat from '../components/LiveChat';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

const HomePage = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);



  // Eventos estáticos como fallback
  const fallbackEvents = [
    {
      id: '1',
      title: 'Reveillon Mil Sorrisos',
      date: '2025-12-27',
      endDate: '2026-01-02',
      location: 'São Miguel dos Milagres, AL',
      image: 'https://i.postimg.cc/QCJNJNgc/Imagem-Whats-App-2025-07-14-s-20-38-33-6d804a5e.jpg',
      category: 'Festa',
      city: 'São Miguel dos Milagres',
      state: 'AL',
      price: 0,
    },
    {
      id: '2',
      title: 'MAIOR INTER',
      date: '2025-08-10',
      location: 'São Paulo, SP',
      image: 'https://i.postimg.cc/xCr0rNtK/Imagem-Whats-App-2025-07-14-s-20-38-34-840bac16.jpg',
      category: 'Festival',
      city: 'São Paulo',
      state: 'SP',
      price: 0,
    },
    {
      id: '3',
      title: 'ARRAIÁ DO PULA CATRACA',
      date: '2025-07-20',
      location: 'Belo Horizonte, MG',
      image: 'https://i.postimg.cc/x1hQHbrW/Imagem-Whats-App-2025-07-14-s-20-38-34-99ab0e70.jpg',
      category: 'Festa Junina',
      city: 'Belo Horizonte',
      state: 'MG',
      price: 0,
    },
  ];

  useEffect(() => {
    fetchApprovedEvents();
  }, []);

  const fetchApprovedEvents = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Buscar apenas eventos aprovados do Supabase
      const { data: eventsData, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          start_date,
          end_date,
          location,
          image,
          subject,
          subcategory,
          category,
          price,
          description,
          location_type,
          location_name,
          location_city,
          location_state,
          ticket_type,
          created_at,
          organizer_id
        `)
        .eq('status', 'approved') // ✅ APENAS EVENTOS APROVADOS
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Erro ao buscar eventos:', error);
        setError('Erro ao carregar eventos');
        setEvents(fallbackEvents); // Usar eventos estáticos como fallback
        return;
      }

      // Formatar eventos para o formato esperado pelo EventCard
      const formattedEvents = eventsData?.map(event => {
        // Formatar localização baseada no tipo
        const formatLocation = () => {
          if (event.location_type === 'online') {
            return 'Evento Online';
          } else if (event.location_type === 'tbd') {
            return 'Local a definir';
          } else {
            // Usar dados detalhados se disponíveis
            if (event.location_city && event.location_state) {
              return `${event.location_city}, ${event.location_state}`;
            }
            // Fallback para location original
            return event.location || '';
          }
        };

        // Extrair cidade e estado
        const getLocationParts = () => {
          if (event.location_type === 'online') {
            return { city: 'Online', state: '' };
          } else if (event.location_type === 'tbd') {
            return { city: 'A definir', state: '' };
          } else if (event.location_city && event.location_state) {
            return { 
              city: event.location_city, 
              state: event.location_state 
            };
          } else {
            // Fallback para parsing da location original
            const parts = event.location?.split(',') || [];
            return {
              city: parts[0]?.trim() || '',
              state: parts[1]?.trim() || ''
            };
          }
        };

        const locationParts = getLocationParts();

        return {
          id: event.id,
          title: event.title,
          date: event.start_date?.split('T')[0] || '',
          endDate: event.end_date?.split('T')[0],
          location: formatLocation(),
          image: event.image || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjM2OEE3Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTYwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5FdmVudG88L3RleHQ+Cjwvc3ZnPgo=',
          category: event.subject || event.category || 'Evento',
          subcategory: event.subcategory,
          city: locationParts.city,
          state: locationParts.state,
          price: event.price || 0,
          ticket_type: event.ticket_type,
          location_type: event.location_type,
          organizer_id: event.organizer_id,
          created_at: event.created_at
        };
      }) || [];

      // Se não há eventos aprovados, usar fallback
      if (formattedEvents.length === 0) {
        console.log('Nenhum evento aprovado encontrado, usando eventos estáticos');
        setEvents(fallbackEvents);
      } else {
        console.log(`${formattedEvents.length} eventos aprovados carregados`);
        setEvents(formattedEvents);
      }

    } catch (error) {
      console.error('Erro inesperado ao buscar eventos:', error);
      setError('Erro inesperado');
      setEvents(fallbackEvents);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans" style={{ fontFamily: 'Inter, Segoe UI, Helvetica, Arial, sans-serif' }}>
      {/* Mobile SearchBar sticky abaixo do Header, antes do carrossel */}
      <div className="md:hidden sticky top-20 z-40 bg-white border-b shadow">
        <MobileEventSearchBar />
      </div>
      {/* Hero Carousel */}
      <div className="container mx-auto px-4">
        <EventCarousel />
      </div>



      {/* Events Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-2" style={{ fontWeight: 600, letterSpacing: '-0.5px' }}>
            Eventos
          </h2>
          <div className="w-16 h-1 bg-pink-600"></div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-pink-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Carregando eventos aprovados...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <p className="text-gray-600">Mostrando eventos em destaque</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">Nenhum evento aprovado encontrado</p>
            <p className="text-sm text-gray-500">Aguarde novos eventos serem aprovados</p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </div>
      
      {/* LiveChat apenas na página inicial */}
      <LiveChat />
    </div>
  );
};

export default HomePage;