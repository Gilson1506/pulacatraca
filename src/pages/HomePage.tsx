import React, { useState, useEffect } from 'react';
import EventCard from '../components/EventCard';

import LiveChat from '../components/LiveChat';
import ProfessionalLoader from '../components/ProfessionalLoader';
import { supabase } from '../lib/supabase';
import EventCarousel from '../components/EventCarousel';
 
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
      location: 'São Miguel dos Milagres', // Apenas cidade
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
      location: 'São Paulo', // Apenas cidade
      image: 'https://i.postimg.cc/xCr0rNtK/Imagem-Whats-App-2025-07-14-s-20-38-34-840bac16.jpg',
      category: 'Festival',
      city: 'São Paulo',
      state: 'SP',
      price: 0,
    },
    {
      id: '3',
      title: 'ARRAIÁ DO PULAKATRACA',
      date: '2025-07-20',
      location: 'Belo Horizonte', // Apenas cidade
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
 
            // Formatar eventos para o formato esperado pelo EventCard (simples, como antes)
      const formattedEvents = (eventsData || []).map((event) => {
        // Usar diretamente a cidade do evento do banco de dados
        const city = event.location_city || '';
        const state = event.location_state || '';

        const startDate = event.start_date ? String(event.start_date).slice(0, 10) : '';
        const endDate = event.end_date ? String(event.end_date).slice(0, 10) : undefined;

        const formattedEvent = {
          id: event.id,
          title: event.title || 'Evento',
          date: startDate,
          endDate,
          location: city, // Usar apenas a cidade
          image: event.image || '/placeholder-event.jpg',
          category: event.category || '',
          city,
          state,
          price: typeof event.price === 'number' ? event.price : Number(event.price) || 0,
        };
        
        console.log('Evento formatado:', {
          id: formattedEvent.id,
          title: formattedEvent.title,
          location: formattedEvent.location,
          city: formattedEvent.city,
          state: formattedEvent.state,
          rawData: {
            location_city: event.location_city,
            location_state: event.location_state,
            location_name: event.location_name,
            location: event.location
          }
        });
        
        return formattedEvent;
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
 
  return (
    <div className="min-h-screen bg-gray-50 font-sans" style={{ fontFamily: 'Inter, Segoe UI, Helvetica, Arial, sans-serif' }}>
      

      {/* Hero Carousel anterior */}
      <div className="container mx-auto px-4">
        <EventCarousel />
      </div>

      {/* Events Section */}
      <div className="container mx-auto px-4 py-6 sm:py-8 md:py-12">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Eventos</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <ProfessionalLoader size="lg" />
          </div>
        ) : error ? (
          <div className="text-center text-red-600">{error}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>

      {/* Live Chat */}
      <LiveChat />
    </div>
  );
};

export default HomePage;