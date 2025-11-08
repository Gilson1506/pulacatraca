import React, { ReactNode } from 'react'
import { SwiperOptions, PaginationOptions } from 'swiper/types'
import { Carousel } from './Carousel'
import './HomeCarousel.css'

const carouselContainer = 'carouselContainer'

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
    | 'banner-oss'
  options: Array<{ slide: ReactNode }>
  controls?({
    next,
    prev,
    slidesTotal,
  }: {
    next: () => void
    prev: () => void
    slidesTotal: number
  }): void
  updateArrows?({ beginning, end }: { beginning: boolean; end: boolean }): void
  id: string
}

const HomeCarousel = ({
  type = 'event-card',
  options,
  controls,
  updateArrows,
  id,
}: HomeCarouselProps) => {
  const pagination: PaginationOptions = {
    clickable: true,
    el: `.swiper-pagination-${id}`,
    type: 'bullets',
  }

  const slidesOffset = {
    slidesOffsetBefore: 0,
    slidesOffsetAfter: 0,
  }

  const DefaultSettings = {
    speed: 150,
    longSwipes: true,
    resistanceRatio: 0.5,
    slidesOffsetBefore: 16,
    slidesOffsetAfter: 16,
    a11y: {
      prevSlideMessage: 'Card anterior',
      nextSlideMessage: 'Próxima card',
      firstSlideMessage: 'Primeiro card da coleção',
      lastSlideMessage: 'Último card da coleção',
    },
    on: {
      slideChanged: ({
        isBeginning,
        isEnd,
      }: {
        isBeginning: boolean
        isEnd: boolean
      }): void => {
        if (updateArrows) {
          updateArrows({ beginning: isBeginning, end: isEnd })
        }
      },
    },
  }

  const settings: Record<string, SwiperOptions> = {
    'one-card': {
      breakpoints: {
        1100: {
          slidesPerView: 1,
          spaceBetween: 42,
          pagination,
          ...slidesOffset,
        },
        830: {
          slidesPerView: 'auto',
          spaceBetween: 16,
          pagination,
        },
        640: {
          slidesPerView: 'auto',
          spaceBetween: 16,
          pagination,
        },
        320: {
          slidesPerView: 'auto',
          spaceBetween: 6,
          pagination,
        },
      },
    },
    sponsored: {
      autoplay: {
        delay: 7000,
      },
      breakpoints: {
        1100: {
          slidesPerView: 1,
          spaceBetween: 42,
          pagination,
          ...slidesOffset,
        },
        830: {
          slidesPerView: 1,
          spaceBetween: 16,
        },
        640: {
          slidesPerView: 1,
          spaceBetween: 16,
        },
        320: {
          slidesPerView: 1,
          spaceBetween: 12,
        },
      },
    },
    'event-card': {
      breakpoints: {
        1100: {
          spaceBetween: 16,
          slidesPerView: 4,
          slidesPerGroup: 3,
          ...slidesOffset,
        },
        830: {
          spaceBetween: 16,
          slidesPerView: 'auto',
          centeredSlides: true,
          slidesPerGroup: 2,
        },
        640: {
          slidesPerView: 1.15,
          slidesPerGroup: 1,
          spaceBetween: 12,
          centeredSlides: true,
        },
        320: {
          slidesPerView: 1.1,
          slidesPerGroup: 1,
          spaceBetween: 10,
          centeredSlides: true,
        },
      },
    },
    'recent-card': {
      breakpoints: {
        1100: {
          spaceBetween: 16,
          slidesPerView: 4,
          slidesPerGroup: 3,
          ...slidesOffset,
        },
        830: {
          spaceBetween: 16,
          slidesPerView: 3,
          slidesPerGroup: 2,
        },
        640: {
          slidesPerView: 1.15,
          slidesPerGroup: 1,
          spaceBetween: 12,
          centeredSlides: true,
        },
        320: {
          slidesPerView: 1.1,
          slidesPerGroup: 1,
          spaceBetween: 10,
          centeredSlides: true,
        },
      },
    },
    'collection-card': {
      breakpoints: {
        1100: {
          spaceBetween: 14,
          slidesPerView: 9,
          slidesPerGroup: 2,
          ...slidesOffset,
        },
        830: {
          spaceBetween: 14,
          slidesPerView: 'auto',
        },
        640: {
          spaceBetween: 12,
          slidesPerView: 'auto',
        },
        320: {
          spaceBetween: 12,
          slidesPerView: 'auto',
        },
      },
    },
    'venue-card': {
      breakpoints: {
        1100: {
          spaceBetween: 32,
          slidesPerView: 5,
          slidesPerGroup: 2,
          ...slidesOffset,
        },
        830: {
          spaceBetween: 16,
          slidesPerView: 4,
        },
        640: {
          spaceBetween: 16,
          slidesPerView: 3,
        },
        320: {
          spaceBetween: 12,
          slidesPerView: 2,
        },
      },
    },
    'city-card': {
      breakpoints: {
        1100: {
          spaceBetween: 24,
          slidesPerView: 5,
          slidesPerGroup: 2,
          ...slidesOffset,
        },
        830: {
          spaceBetween: 16,
          slidesPerView: 5,
        },
        640: {
          spaceBetween: 16,
          slidesPerView: 4,
        },
        320: {
          spaceBetween: 12,
          slidesPerView: 2,
        },
      },
    },
    'organizer-card': {
      breakpoints: {
        1100: {
          spaceBetween: 24,
          slidesPerView: 6,
          slidesPerGroup: 2,
          ...slidesOffset,
        },
        830: {
          spaceBetween: 16,
          slidesPerView: 4,
        },
        640: {
          spaceBetween: 16,
          slidesPerView: 3,
        },
        320: {
          spaceBetween: 12,
          slidesPerView: 2,
        },
      },
    },
    'banner-card': {
      breakpoints: {
        1100: {
          slidesPerView: 1,
          spaceBetween: 0,
          allowSlidePrev: options?.length !== 1,
          allowSlideNext: options?.length !== 1,
          ...slidesOffset,
        },
        830: {
          slidesPerView: 1,
          spaceBetween: 0,
          allowSlidePrev: options?.length !== 1,
          allowSlideNext: options?.length !== 1,
        },
        640: {
          slidesPerView: 1,
          spaceBetween: 0,
          allowSlidePrev: options?.length !== 1,
          allowSlideNext: options?.length !== 1,
        },
        320: {
          slidesPerView: 1,
          spaceBetween: 0,
          allowSlidePrev: options?.length !== 1,
          allowSlideNext: options?.length !== 1,
        },
      },
    },
    'banner-login': {
      breakpoints: {
        1100: {
          slidesPerView: 1,
          spaceBetween: 0,
          allowSlidePrev: options?.length !== 1,
          allowSlideNext: options?.length !== 1,
          ...slidesOffset,
        },
        830: {
          slidesPerView: 1,
          spaceBetween: 0,
          allowSlidePrev: options?.length !== 1,
          allowSlideNext: options?.length !== 1,
        },
        640: {
          slidesPerView: 1,
          spaceBetween: 0,
          allowSlidePrev: options?.length !== 1,
          allowSlideNext: options?.length !== 1,
        },
        320: {
          slidesPerView: 1,
          spaceBetween: 0,
          allowSlidePrev: options?.length !== 1,
          allowSlideNext: options?.length !== 1,
        },
      },
    },
    'banner-oss': {
      breakpoints: {
        1100: {
          slidesPerView: 1,
          spaceBetween: 0,
          allowSlidePrev: options?.length !== 1,
          allowSlideNext: options?.length !== 1,
          ...slidesOffset,
        },
        830: {
          slidesPerView: 1,
          spaceBetween: 0,
          allowSlidePrev: options?.length !== 1,
          allowSlideNext: options?.length !== 1,
        },
        640: {
          slidesPerView: 1,
          spaceBetween: 0,
          allowSlidePrev: options?.length !== 1,
          allowSlideNext: options?.length !== 1,
        },
        320: {
          slidesPerView: 1,
          spaceBetween: 0,
          allowSlidePrev: options?.length !== 1,
          allowSlideNext: options?.length !== 1,
        },
      },
    },
  }

  return (
    <Carousel
      options={options}
      settings={{ ...settings[type], ...DefaultSettings }}
      id={id}
      className={carouselContainer}
      slideSuffix={type}
      controls={controls}
    />
  )
}

export default HomeCarousel
