import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface CarouselEvent {
  id: string;
  title: string;
  image: string | null;
}

const EventCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [events, setEvents] = useState<CarouselEvent[]>([]);

  const goTo = (idx: number) => {
    if (!events.length) return;
    setCurrentSlide((idx + events.length) % events.length);
  };

  const nextSlide = () => goTo(currentSlide + 1);
  const prevSlide = () => goTo(currentSlide - 1);

  useEffect(() => {
    const fetchCarouselEvents = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, image, status, carousel_approved, carousel_priority, reviewed_at')
        .eq('status', 'approved')
        .eq('carousel_approved', true)
        .order('carousel_priority', { ascending: false })
        .order('reviewed_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        const mapped: CarouselEvent[] = data.map((e: any) => ({
          id: e.id,
          title: e.title,
          image: e.image || null,
        }));
        setEvents(mapped);
        setCurrentSlide(0);
      }
    };

    fetchCarouselEvents();
  }, []);

  useEffect(() => {
    if (!events.length) return;
    const interval = setInterval(nextSlide, 6000);
    return () => clearInterval(interval);
  }, [events.length, currentSlide]);

  if (!events.length) {
    return null;
  }

  return (
    <div className="relative h-[180px] sm:h-[260px] md:h-[360px] lg:h-[460px] xl:h-[560px] overflow-hidden bg-gray-900 rounded-xl shadow-lg">
      {/* Slides */}
      <div
        className="flex transition-transform duration-500 ease-in-out h-full w-full"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {events.map((event) => (
          <Link to={`/event/${event.id}`} key={event.id} className="w-full flex-shrink-0 relative block">
            <div className="w-full h-full relative">
              <img
                src={event.image || '/placeholder-event.jpg'}
                alt={event.title}
                className="w-full h-full object-cover object-center select-none"
                draggable="false"
                decoding="async"
                loading="eager"
                sizes="(min-width: 1280px) 1200px, (min-width: 1024px) 1000px, (min-width: 768px) 768px, 100vw"
                style={{ objectFit: 'cover', objectPosition: 'center center' }}
              />
              {/* Overlay sutil para melhorar contraste e bordas */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30" />
              {/* Título opcional (oculto por padrão) */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 sm:p-4">
                <h3 className="hidden sm:block text-white drop-shadow-md font-semibold truncate">{event.title}</h3>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        aria-label="Anterior"
        className="absolute left-3 sm:left-4 md:left-6 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 sm:p-3 rounded-full hover:bg-black/70 transition-all duration-300 z-10"
      >
        <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>
      
      <button
        onClick={nextSlide}
        aria-label="Próximo"
        className="absolute right-3 sm:right-4 md:right-6 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 sm:p-3 rounded-full hover:bg-black/70 transition-all duration-300 z-10"
      >
        <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-2 z-10">
        {events.map((_, idx) => (
          <button
            key={idx}
            aria-label={`Ir para slide ${idx + 1}`}
            onClick={() => goTo(idx)}
            className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full transition-all ${
              idx === currentSlide ? 'bg-white scale-110' : 'bg-white/50 hover:bg-white/80'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default EventCarousel;