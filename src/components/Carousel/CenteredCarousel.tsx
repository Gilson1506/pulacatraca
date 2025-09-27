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
      <div className="px-2 sm:px-2 lg:px-8">
        <div className="mx-4 sm:mx-4 lg:mx-40">
        <Swiper
          modules={[Autoplay]}
          onSwiper={(swiper) => {
            swiperRef.current = swiper
          }}
          onSlideChange={handleSlideChange}
          spaceBetween={-60}
          slidesPerView={1.2}
          centeredSlides={true}
          loop={options.length > 1}
          autoplay={autoplay ? { delay: autoplayDelay, disableOnInteraction: false } : false}
          speed={800}
          breakpoints={{
            640: {
              slidesPerView: 1.2,
              spaceBetween: -60,
            },
            768: {
              slidesPerView: 1.2,
              spaceBetween: -60,
            },
            1024: {
              slidesPerView: 1.8,
              spaceBetween: -120,
            },
            1280: {
              slidesPerView: 2.0,
              spaceBetween: -140,
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
