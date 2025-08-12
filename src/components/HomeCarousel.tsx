import React from 'react';
import type { SwiperOptions } from 'swiper/types';
import { Carousel } from './Carousel';

type HomeCarouselProps = {
  type:
    | 'one-card'
    | 'sponsored'
    | 'event-card'
    | 'recent-card'
    | 'collection-card'
    | 'venue-card'
    | 'city-card'
    | 'organizer-card'
    | 'banner-card'
    | 'banner-login'
    | 'banner-oss';
  options: Array<{ slide: React.ReactNode }>;
  controls?({
    next,
    prev,
    slidesTotal,
  }: {
    next: () => void;
    prev: () => void;
    slidesTotal: number;
  }): void;
  updateArrows?({ beginning, end }: { beginning: boolean; end: boolean }): void;
  id: string;
};

const HomeCarousel: React.FC<HomeCarouselProps> = ({
  type = 'event-card',
  options,
  controls,
  updateArrows,
  id,
}) => {
  const slidesOffset = { slidesOffsetBefore: 16, slidesOffsetAfter: 16 } as const;

  const DefaultSettings: SwiperOptions = {
    speed: 150,
    longSwipes: true,
    resistanceRatio: 0.5,
    a11y: {
      prevSlideMessage: 'Card anterior',
      nextSlideMessage: 'Próxima card',
      firstSlideMessage: 'Primeiro card da coleção',
      lastSlideMessage: 'Último card da coleção',
    },
    on: {
      slideChange(swiper) {
        updateArrows?.({ beginning: swiper.isBeginning, end: swiper.isEnd });
      },
    },
  };

  const pagination = { clickable: true };

  const settings: Record<string, SwiperOptions> = {
    'one-card': {
      breakpoints: {
        1100: { slidesPerView: 1, spaceBetween: 42, pagination, ...slidesOffset },
        830: { slidesPerView: 'auto', spaceBetween: 16, pagination },
        640: { slidesPerView: 'auto', spaceBetween: 16, pagination },
        320: { slidesPerView: 'auto', spaceBetween: 6, pagination },
      },
    },
    sponsored: {
      autoplay: { delay: 7000 },
      breakpoints: {
        1100: { slidesPerView: 1, spaceBetween: 42, pagination, ...slidesOffset },
        830: { slidesPerView: 1, spaceBetween: 16 },
        640: { slidesPerView: 1, spaceBetween: 16 },
        320: { slidesPerView: 1, spaceBetween: 12 },
      },
    },
    'event-card': {
      breakpoints: {
        1100: { spaceBetween: 16, slidesPerView: 4, slidesPerGroup: 3, ...slidesOffset },
        830: { spaceBetween: 16, slidesPerView: 'auto', slidesPerGroup: 2 },
        640: { slidesPerView: 'auto', slidesPerGroup: 1, spaceBetween: 16 },
        320: { slidesPerView: 'auto', slidesPerGroup: 1, spaceBetween: 16 },
      },
    },
    'recent-card': {
      breakpoints: {
        1100: { spaceBetween: 16, slidesPerView: 4, slidesPerGroup: 3, ...slidesOffset },
        830: { spaceBetween: 16, slidesPerView: 3, slidesPerGroup: 2 },
        640: { slidesPerView: 'auto', slidesPerGroup: 1, spaceBetween: 16 },
        320: { slidesPerView: 'auto', slidesPerGroup: 1, spaceBetween: 16 },
      },
    },
    'collection-card': {
      breakpoints: {
        1100: { spaceBetween: 14, slidesPerView: 9, slidesPerGroup: 2, ...slidesOffset },
        830: { spaceBetween: 14, slidesPerView: 'auto' },
        640: { spaceBetween: 12, slidesPerView: 'auto' },
        320: { spaceBetween: 12, slidesPerView: 'auto' },
      },
    },
    'venue-card': {
      breakpoints: {
        1100: { spaceBetween: 32, slidesPerView: 5, slidesPerGroup: 2, ...slidesOffset },
        830: { spaceBetween: 16, slidesPerView: 4 },
        640: { spaceBetween: 16, slidesPerView: 3 },
        320: { spaceBetween: 12, slidesPerView: 2 },
      },
    },
    'city-card': {
      breakpoints: {
        1100: { spaceBetween: 24, slidesPerView: 5, slidesPerGroup: 2, ...slidesOffset },
        830: { spaceBetween: 16, slidesPerView: 5 },
        640: { spaceBetween: 16, slidesPerView: 4 },
        320: { spaceBetween: 12, slidesPerView: 2 },
      },
    },
    'organizer-card': {
      breakpoints: {
        1100: { spaceBetween: 24, slidesPerView: 6, slidesPerGroup: 2, ...slidesOffset },
        830: { spaceBetween: 16, slidesPerView: 4 },
        640: { spaceBetween: 16, slidesPerView: 3 },
        320: { spaceBetween: 12, slidesPerView: 2 },
      },
    },
    'banner-card': {
      breakpoints: {
        1100: { slidesPerView: 1, spaceBetween: 0, ...slidesOffset },
        830: { slidesPerView: 1, spaceBetween: 0 },
        640: { slidesPerView: 1, spaceBetween: 0 },
        320: { slidesPerView: 1, spaceBetween: 0 },
      },
    },
    'banner-login': {
      breakpoints: {
        1100: { slidesPerView: 1, spaceBetween: 0, ...slidesOffset },
        830: { slidesPerView: 1, spaceBetween: 0 },
        640: { slidesPerView: 1, spaceBetween: 0 },
        320: { slidesPerView: 1, spaceBetween: 0 },
      },
    },
    'banner-oss': {
      breakpoints: {
        1100: { slidesPerView: 1, spaceBetween: 0, ...slidesOffset },
        830: { slidesPerView: 1, spaceBetween: 0 },
        640: { slidesPerView: 1, spaceBetween: 0 },
        320: { slidesPerView: 1, spaceBetween: 0 },
      },
    },
  };

  return (
    <Carousel
      options={options}
      settings={{ ...(settings[type] || {}), ...DefaultSettings }}
      id={id}
      className="w-full"
      slideSuffix={type}
      controls={controls}
    />
  );
};

export default HomeCarousel;