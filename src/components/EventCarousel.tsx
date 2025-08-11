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

  const nextSlide = () => {
    setCurrentSlide((prev) => (events.length ? (prev + 1) % events.length : 0));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (events.length ? (prev - 1 + events.length) % events.length : 0));
  };

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
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [events.length]);

  if (!events.length) {
    return null;
  }

  return (
    <div className="relative h-40 sm:h-56 md:h-[340px] overflow-hidden bg-gray-900 rounded-xl shadow-lg">
      {/* Slides */}
      <div 
        className="flex transition-transform duration-500 ease-in-out h-full"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {events.map((event) => (
          <Link to={`/event/${event.id}`} key={event.id} className="w-full flex-shrink-0 relative cursor-pointer">
            <div className="w-full h-full relative">
              <img 
                src={event.image || '/placeholder-event.jpg'}
                alt={event.title}
                className="w-full h-full object-cover object-center"
                draggable="false"
                style={{ 
                  objectFit: 'cover', 
                  objectPosition: 'center center',
                  imageRendering: 'high-quality',
                  filter: 'contrast(1.02) saturate(1.05)'
                }}
                loading="eager"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white space-y-6 max-w-4xl px-4">
                  {/* Conteúdo do overlay propositalmente minimalista */}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-6 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-75 transition-all duration-300 z-10"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      
      <button
        onClick={nextSlide}
        className="absolute right-6 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-75 transition-all duration-300 z-10"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

    </div>
  );
};

export default EventCarousel;