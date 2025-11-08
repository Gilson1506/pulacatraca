import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import CenteredCarousel from './Carousel/CenteredCarousel';
import EventCardCarousel from './EventCardCarousel';

interface CarouselEvent {
  id: string;
  title: string;
  image: string | null;
  date?: string;
  location?: string;
  city?: string;
  state?: string;
  category?: string;
}

const EventCarouselNew: React.FC = () => {
  const [events, setEvents] = useState<CarouselEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCarouselEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, title, image, status, carousel_approved, carousel_priority, reviewed_at')
          .eq('status', 'approved')
          .eq('carousel_approved', true)
          .order('carousel_priority', { ascending: false })
          .order('reviewed_at', { ascending: false })
          .limit(10);

        if (!error && data) {
          setEvents(
            data.map((e: any) => ({ 
              id: e.id, 
              title: e.title, 
              image: e.image || null,
              date: e.date,
              location: e.location,
              city: e.city,
              state: e.state,
              category: e.category
            }))
          );
        }
      } catch (error) {
        console.error('Erro ao buscar eventos do carrossel:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCarouselEvents();
  }, []);

  if (isLoading) {
    return (
      <div className="relative rounded-xl shadow-lg overflow-hidden bg-gray-200 animate-pulse h-[180px] sm:h-[260px] md:h-[360px] lg:h-[460px] xl:h-[560px]">
        <div className="w-full h-full bg-gray-300"></div>
      </div>
    );
  }

  if (!events.length) {
    // Fallback com eventos estáticos
    const fallbackEvents = [
      {
        id: '1',
        title: 'Reveillon Mil Sorrisos',
        image: 'https://i.postimg.cc/QCJNJNgc/Imagem-Whats-App-2025-07-14-s-20-38-33-6d804a5e.jpg',
        date: '2025-12-27T20:00:00',
        location: 'São Miguel dos Milagres',
        city: 'São Miguel dos Milagres',
        state: 'AL',
        category: 'Festa'
      },
      {
        id: '2',
        title: 'MAIOR INTER',
        image: 'https://i.postimg.cc/xCr0rNtK/Imagem-Whats-App-2025-07-14-s-20-38-34-840bac16.jpg',
        date: '2025-08-10T19:00:00',
        location: 'São Paulo',
        city: 'São Paulo',
        state: 'SP',
        category: 'Festival'
      },
      {
        id: '3',
        title: 'ARRAIÁ DO PULA CATRACA',
        image: 'https://i.postimg.cc/x1hQHbrW/Imagem-Whats-App-2025-07-14-s-20-38-34-99ab0e70.jpg',
        date: '2025-07-20T18:00:00',
        location: 'Belo Horizonte',
        city: 'Belo Horizonte',
        state: 'MG',
        category: 'Festa Junina'
      },
    ];

    const carouselOptions = fallbackEvents.map((event) => ({
      slide: <EventCardCarousel event={event} />,
    }));

    return (
      <div className="w-full">
        <CenteredCarousel
          options={carouselOptions}
          id="event-carousel-fallback"
          autoplay={true}
          autoplayDelay={6000}
        />
      </div>
    );
  }

  const carouselOptions = events.map((event) => ({
    slide: <EventCardCarousel event={event} />,
  }));

  return (
    <div className="w-full">
      <CenteredCarousel
        options={carouselOptions}
        id="event-carousel"
        autoplay={true}
        autoplayDelay={6000}
      />
    </div>
  );
};

export default EventCarouselNew;