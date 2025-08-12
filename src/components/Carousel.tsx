import React, { useEffect, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperClass, SwiperOptions } from 'swiper/types';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

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

export const Carousel: React.FC<CarouselProps> = ({
  options = [],
  settings = {},
  className = '',
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
    <div data-testid={id} className={className}>
      <Swiper
        modules={[Pagination]}
        onSwiper={(swiper) => (swiperRef.current = swiper)}
        pagination={{ clickable: true }}
        speed={settings?.speed ?? 150}
        touchEventsTarget={settings?.touchEventsTarget ?? 'wrapper'}
        longSwipes={settings?.longSwipes ?? true}
        resistanceRatio={settings?.resistanceRatio ?? 0.5}
        onSlideChange={(swiper) =>
          customEvents?.slideChanged?.({ isBeginning: swiper.isBeginning, isEnd: swiper.isEnd })
        }
        {...swiperSettings}
      >
        {options.map((item, index) => (
          <SwiperSlide className={slideSuffix} key={`${id}-slide-${index}`}>
            {item.slide}
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};