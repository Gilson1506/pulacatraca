import React, { useEffect, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperClass, SwiperOptions } from 'swiper/types';
import { EffectCoverflow, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';
import './Carousel.css';

type CarouselProps = {
  options: Array<{ slide: React.ReactNode }>;
  settings?: Omit<SwiperOptions, 'on'> & {
    on?: {
      slideChanged?({ isBeginning, isEnd }: { isBeginning: boolean; isEnd: boolean }): void;
    };
  };
  className?: string;
  id: string;
  slideSuffix?: string;
  controls?: ({
    next,
    prev,
    slidesTotal,
  }: {
    next: () => void;
    prev: () => void;
    slidesTotal: number;
  }) => void;
};

const Carousel: React.FC<CarouselProps> = ({
  options = [],
  settings = {},
  className = 'coverflow-carousel',
  slideSuffix = '',
  id,
  controls,
}) => {
  const swiperRef = useRef<SwiperClass | null>(null);

  useEffect(() => {
    if (swiperRef.current && controls) {
      controls({
        next: () => swiperRef.current?.slideNext(),
        prev: () => swiperRef.current?.slidePrev(),
        slidesTotal: options.length,
      });
    }
    return () => {
      if (swiperRef.current) {
        swiperRef.current.destroy(true, true);
        swiperRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, options.length]);

  const { on: customEvents, ...swiperSettings } = settings;

  if (!options.length) return null;

  return (
    <div
      data-testid={id}
      data-carousel-id={id}
      className={`coverflow-carousel ${className}`}
    >
      <Swiper
        modules={[EffectCoverflow, Pagination]}
        onSwiper={(swiper) => (swiperRef.current = swiper)}
        effect="coverflow"
        centeredSlides
        slidesPerView="auto"
        loop
        speed={500}
        pagination={{ clickable: true }}
        touchEventsTarget="wrapper"
        resistanceRatio={0.5}
        longSwipes
        coverflowEffect={{ rotate: 0, stretch: 0, depth: 200, modifier: 1, slideShadows: false }}
        onSlideChange={(swiper) =>
          customEvents?.slideChanged?.({ isBeginning: swiper.isBeginning, isEnd: swiper.isEnd })
        }
        {...swiperSettings}
        className="coverflow-swiper"
      >
        {options.map((item, index) => (
          <SwiperSlide className={`coverflow-slide ${slideSuffix}`} key={`${id}-slide-${index}`}>
            {item.slide}
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default Carousel;