import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FeaturedEvent {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  buttonText: string;
  buttonLink: string;
}

const EventCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const featuredEvents: FeaturedEvent[] = [
    {
      id: '1',
      title: 'O EMBAIXADOR',
      subtitle: 'Classic',
      image: 'https://i.postimg.cc/7YtVwL9b/Imagem-Whats-App-2025-07-14-s-17-58-28-83ccbe3c.jpg',
      buttonText: 'COMPRE AQUI SEU INGRESSO!',
      buttonLink: '/event/1'
    },
    {
      id: '2',
      title: 'FESTA JULINA',
      subtitle: 'Sorocaba',
      image: 'https://i.postimg.cc/d3dtV6Z4/Imagem-Whats-App-2025-07-14-s-17-58-28-fdcded78.jpg',
      buttonText: 'COMPRE AQUI SEU INGRESSO!',
      buttonLink: '/event/2'
    },
    {
      id: '3',
      title: 'TULUM BEACH',
      subtitle: 'Club 2025',
      image: 'https://i.postimg.cc/t4nDCVB7/Imagem-Whats-App-2025-07-14-s-17-58-16-03e9661e.jpg',
      buttonText: 'COMPRE AQUI SEU INGRESSO!',
      buttonLink: '/event/3'
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % featuredEvents.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + featuredEvents.length) % featuredEvents.length);
  };

  useEffect(() => {
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-[340px] overflow-hidden bg-gray-900 rounded-xl shadow-lg">
      {/* Slides */}
      <div 
        className="flex transition-transform duration-500 ease-in-out h-full"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {featuredEvents.map((event) => (
          <div key={event.id} className="w-full flex-shrink-0 relative">
            <div 
              className="w-full h-full bg-cover bg-center relative"
              style={{ 
                backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${event.image})` 
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white space-y-6 max-w-4xl px-4">
                  <div className="mt-8 space-y-4">
                    <h2 className="text-3xl md:text-4xl font-bold">
                      VENDAS ABERTAS
                    </h2>
                  </div>
                  <div className="w-32 h-1 bg-yellow-400 mx-auto"></div>
                </div>
              </div>
            </div>
          </div>
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

      {/* Dots Indicator */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-3">
        {featuredEvents.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentSlide ? 'bg-yellow-400 scale-125' : 'bg-white bg-opacity-50 hover:bg-opacity-75'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default EventCarousel;