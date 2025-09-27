import React, { useRef, useEffect } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Swiper as SwiperClass, SwiperOptions } from 'swiper/types'
import 'swiper/css'
import 'swiper/css/pagination'
import { Pagination } from 'swiper/modules'

import './Carousel.css'

const carouselContainer = 'carouselContainer'
const swiperContainer = 'swiperContainer'

type CarouselProps = {
  options: Array<{ slide: React.ReactNode }>
  settings?: {
    on?: {
      slideChanged?({
        isBeginning,
        isEnd,
      }: {
        isBeginning: boolean
        isEnd: boolean
      }): void
    }
  } & Omit<SwiperOptions, 'on'>
  className?: string
  id: string
  slideSuffix?: string
  controls?: ({
    next,
    prev,
    slidesTotal,
  }: {
    next: () => void
    prev: () => void
    slidesTotal: number
  }) => void
}

export const Carousel = ({
  options = [],
  settings = {},
  className = carouselContainer,
  slideSuffix = '',
  id,
  controls,
}: CarouselProps) => {
  const swiperRef = useRef<SwiperClass | null>(null)

  useEffect(() => {
    if (swiperRef.current && controls) {
      controls({
        next: () => swiperRef.current?.slideNext(),
        prev: () => swiperRef.current?.slidePrev(),
        slidesTotal: options.length,
      })
    }
    return () => {
      if (swiperRef.current) {
        swiperRef.current.destroy(true, true)
        swiperRef.current = null
      }
    }
  }, [id])

  const { on: customEvents, ...swiperSettings } = settings

  return (
    <div data-testid={id} className={`${swiperContainer} ${className}`}>
      <Swiper
        modules={[Pagination]}
        onSwiper={(swiper) => {
          swiperRef.current = swiper
        }}
        pagination={{
          el: `.swiper-pagination-${id}`,
          type: 'bullets',
          clickable: true,
        }}
        speed={150}
        touchEventsTarget={'wrapper'}
        longSwipes={true}
        resistanceRatio={0.5}
        onSlideChange={(swiper) => {
          customEvents?.slideChanged?.({
            isBeginning: swiper.isBeginning,
            isEnd: swiper.isEnd,
          })
        }}
        {...swiperSettings}
      >
        {options.map((item, index) => (
          <SwiperSlide className={slideSuffix} key={index}>
            {item.slide}
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  )
}

export default Carousel
