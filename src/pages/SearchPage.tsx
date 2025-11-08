import React, { useState, useEffect, useMemo } from 'react';
import { useSearch } from '../contexts/SearchContext';
import { useNavigate, useLocation } from 'react-router-dom';
import EventCard from '../components/EventCard';
import ProfessionalLoader from '../components/ProfessionalLoader';
import { Search, MapPin, ArrowLeft, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

const SearchPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { searchQuery, setSearchQuery, selectedLocation, setSelectedLocation } = useSearch();
  
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localSearchQuery, setLocalSearchQuery] = useState('');


  // Eventos estáticos como fallback
  const fallbackEvents = [
    {
      id: '1',
      title: 'Reveillon Mil Sorrisos',
      date: '2025-12-27',
      endDate: '2026-01-02',
      location: 'São Miguel dos Milagres',
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
      location: 'São Paulo',
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
      location: 'Belo Horizonte',
      image: 'https://i.postimg.cc/x1hQHbrW/Imagem-Whats-App-2025-07-14-s-20-38-34-99ab0e70.jpg',
      category: 'Festa Junina',
      city: 'Belo Horizonte',
      state: 'MG',
      price: 0,
    },
  ];



  useEffect(() => {
    // Pegar query da URL se existir
    const urlParams = new URLSearchParams(location.search);
    const queryFromUrl = urlParams.get('q');
    if (queryFromUrl) {
      setLocalSearchQuery(queryFromUrl);
      setSearchQuery(queryFromUrl);
    } else if (searchQuery) {
      setLocalSearchQuery(searchQuery);
    }
    
    fetchApprovedEvents();
  }, []);

  // Sincronizar com o contexto quando mudar
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

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
        .eq('status', 'approved')
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Erro ao buscar eventos:', error);
        setError('Erro ao carregar eventos');
        setEvents(fallbackEvents);
        return;
      }

      // Formatar eventos para o formato esperado pelo EventCard
      const formattedEvents = (eventsData || []).map((event) => {
        const city = event.location_city || '';
        const state = event.location_state || '';

        const startDate = event.start_date ? String(event.start_date).slice(0, 10) : '';
        const endDate = event.end_date ? String(event.end_date).slice(0, 10) : undefined;

        return {
          id: event.id,
          title: event.title || 'Evento',
          date: startDate,
          endDate,
          location: city,
          image: event.image || '/placeholder-event.jpg',
          category: event.category || '',
          city,
          state,
          price: typeof event.price === 'number' ? event.price : Number(event.price) || 0,
        };
      });

      setEvents(formattedEvents);
    } catch (err) {
      console.error('Erro inesperado ao buscar eventos:', err);
      setError('Erro inesperado');
      setEvents(fallbackEvents);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar eventos baseado na busca e localização
  const filteredEvents = useMemo(() => {
    let filtered = events;

    // Filtro de busca por texto
    if (localSearchQuery) {
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(localSearchQuery.toLowerCase()) ||
        event.category.toLowerCase().includes(localSearchQuery.toLowerCase()) ||
        event.city.toLowerCase().includes(localSearchQuery.toLowerCase())
      );
    }

    // Filtro de localização
    if (selectedLocation !== 'Qualquer lugar') {
      filtered = filtered.filter(event => 
        event.city.toLowerCase().includes(selectedLocation.toLowerCase()) ||
        event.state.toLowerCase().includes(selectedLocation.toLowerCase())
      );
    }

    return filtered;
  }, [events, localSearchQuery, selectedLocation]);

  const handleSearch = () => {
    if (localSearchQuery.trim().length > 0) {
      setSearchQuery(localSearchQuery.trim());
    }
  };

  const handleClearSearch = () => {
    setLocalSearchQuery('');
    setSearchQuery('');
  };

  const handleLocationClick = () => {
    // Aqui você pode abrir um modal de seleção de localização
    alert('Funcionalidade de seleção de localização será implementada aqui');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header da página de busca */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {/* Botão voltar */}
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>

            {/* Barra de pesquisa */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Digite o evento que procura"
                className="w-full pl-10 pr-12 py-3 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white text-base"
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              {localSearchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Botão de busca */}
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium"
            >
              Buscar
            </button>
          </div>

          {/* Filtro de localização */}
          <div className="mt-3">
            <button
              onClick={handleLocationClick}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 transition-colors rounded-lg text-sm"
            >
              <MapPin className="h-4 w-4 text-pink-600" />
              <span className="text-gray-700">{selectedLocation}</span>
            </button>
          </div>

        </div>
      </div>

      {/* Conteúdo da busca */}
      <div className="container mx-auto px-4 py-6">
        {/* Resultados da busca */}
        {localSearchQuery && (
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Resultados da busca
            </h1>
            <p className="text-gray-600">
              {filteredEvents.length > 0 
                ? `Encontrados ${filteredEvents.length} evento(s) para "${localSearchQuery}"`
                : `Nenhum evento encontrado para "${localSearchQuery}"`
              }
            </p>
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <ProfessionalLoader size="lg" />
          </div>
        ) : error ? (
          <div className="text-center text-red-600">{error}</div>
        ) : (
          <>
            {/* Grid de eventos */}
            {filteredEvents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {filteredEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              /* Mensagem quando não há eventos */
              <div className="text-center py-16">
                <div className="mb-6">
                  <Search className="h-16 w-16 text-gray-400 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Nenhum evento encontrado
                </h3>
                <p className="text-gray-600 mb-6">
                  {localSearchQuery 
                    ? 'Tente ajustar os termos de busca ou filtros de localização.'
                    : 'Comece digitando o nome de um evento ou selecione uma localização.'
                  }
                </p>
                {localSearchQuery && (
                  <button
                    onClick={handleClearSearch}
                    className="px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium"
                  >
                    Limpar busca
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
