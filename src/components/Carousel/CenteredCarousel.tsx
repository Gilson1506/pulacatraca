import React, { useRef, useEffect, useState } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Swiper as SwiperClass } from 'swiper/types'
import { Autoplay } from 'swiper/modules'
import 'swiper/css'
import './CenteredCarousel.css'

interface CenteredCarouselProps {
  options: Array<{ slide: React.ReactNode }>
  id: string
  autoplay?: boolean
  autoplayDelay?: number
  onSlideChange?: (activeIndex: number) => void
}

const CenteredCarousel: React.FC<CenteredCarouselProps> = ({
  options,
  id,
  autoplay = true,
  autoplayDelay = 5000,
  onSlideChange,
}) => {
  const swiperRef = useRef<SwiperClass | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (swiperRef.current && onSlideChange) {
      onSlideChange(activeIndex)
    }
  }, [activeIndex, onSlideChange])

  const handleSlideChange = (swiper: SwiperClass) => {
    setActiveIndex(swiper.activeIndex)
  }

  return (
    <div className="relative w-full overflow-visible">

      {/* Swiper Container */}
      <div className="w-full overflow-visible">
        <div className="w-full overflow-visible">
        <Swiper
          modules={[Autoplay]}
          onSwiper={(swiper) => {
            swiperRef.current = swiper
          }}
          onSlideChange={handleSlideChange}
          spaceBetween={-32}
          slidesPerView={1.2}
          centeredSlides={true}
          centeredSlidesBounds={true}
          slidesOffsetBefore={12}
          slidesOffsetAfter={12}
          loop={options.length > 1}
          autoplay={autoplay ? { delay: autoplayDelay, disableOnInteraction: false } : false}
          speed={800}
          style={{ overflow: 'visible' }}
          breakpoints={{
            640: {
              slidesPerView: 1.2,
              spaceBetween: -26,
            },
            768: {
              slidesPerView: 1.3,
              spaceBetween: -34,
            },
            1024: {
              slidesPerView: 1.6,
              spaceBetween: -50,
            },
            1280: {
              slidesPerView: 1.8,
              spaceBetween: -70,
            },
          }}
          className="centered-carousel"
        >
          {options.map((item, index) => (
            <SwiperSlide key={index} className="centered-slide">
              <div className="relative">
                {item.slide}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
        </div>
      </div>

    </div>
  )
}

export default CenteredCarousel
