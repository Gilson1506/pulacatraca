import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Swiper as SwiperClass, SwiperOptions } from 'swiper/types';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';

interface CarouselEvent {
  id: string;
  title: string;
  image: string | null;
}

type CarouselProps = {
  settings?: Omit<SwiperOptions, 'on'> & {
    on?: {
      slideChanged?({ isBeginning, isEnd }: { isBeginning: boolean; isEnd: boolean }): void;
    };
  };
  id?: string;
};

const EventCarousel: React.FC<CarouselProps> = ({ settings = {}, id = 'event-carousel' }) => {
  const swiperRef = useRef<SwiperClass | null>(null);
  const [events, setEvents] = useState<CarouselEvent[]>([]);

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
        setEvents(
          data.map((e: any) => ({ id: e.id, title: e.title, image: e.image || null }))
        );
      }
    };

    fetchCarouselEvents();
    return () => {
      if (swiperRef.current) {
        swiperRef.current.destroy(true, true);
        swiperRef.current = null;
      }
    };
  }, []);

  const { on: customEvents, ...swiperSettings } = settings;

  if (!events.length) return null;

  return (
    <div data-testid={id} className="relative rounded-xl shadow-lg overflow-hidden">
      <Swiper
        modules={[Autoplay]}
        onSwiper={(swiper) => (swiperRef.current = swiper)}
        autoplay={{ delay: 6000, disableOnInteraction: false }}
        speed={250}
        resistanceRatio={0.5}
        longSwipes={true}
        onSlideChange={(swiper) =>
          customEvents?.slideChanged?.({ isBeginning: swiper.isBeginning, isEnd: swiper.isEnd })
        }
        {...swiperSettings}
        className="h-[180px] sm:h-[260px] md:h-[360px] lg:h-[460px] xl:h-[560px] bg-gray-900"
      >
        {events.map((event) => (
          <SwiperSlide key={event.id} className="relative">
            <Link to={`/event/${event.id}`} className="block w-full h-full">
              <img
                src={event.image || '/placeholder-event.jpg'}
                alt={event.title}
                width={1200}
                height={600}
                className="w-full h-full object-cover object-center select-none"
                style={{ aspectRatio: '2/1' }}
                decoding="async"
                loading="eager"
                sizes="(min-width: 1280px) 1200px, (min-width: 1024px) 1000px, (min-width: 768px) 768px, 100vw"
                draggable="false"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30" />
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default EventCarousel;