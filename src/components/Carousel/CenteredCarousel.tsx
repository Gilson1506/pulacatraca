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
    <div className="relative w-full">

      {/* Swiper Container */}
      <div className="w-full">
        <div className="w-full">
        <Swiper
          modules={[Autoplay]}
          onSwiper={(swiper) => {
            swiperRef.current = swiper
          }}
          onSlideChange={handleSlideChange}
          spaceBetween={-20}
          slidesPerView={1.1}
          centeredSlides={true}
          loop={options.length > 1}
          autoplay={autoplay ? { delay: autoplayDelay, disableOnInteraction: false } : false}
          speed={800}
          breakpoints={{
            640: {
              slidesPerView: 1.2,
              spaceBetween: -40,
            },
            768: {
              slidesPerView: 1.3,
              spaceBetween: -50,
            },
            1024: {
              slidesPerView: 1.6,
              spaceBetween: -80,
            },
            1280: {
              slidesPerView: 1.8,
              spaceBetween: -100,
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
