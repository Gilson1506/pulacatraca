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


    </div>
  );
};

export default EventCarousel;