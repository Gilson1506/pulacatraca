import React from 'react';
import { Link } from 'react-router-dom';

interface EventCardCarouselProps {
  event: {
    id: string;
    title: string;
    image: string | null;
    date?: string;
    location?: string;
    city?: string;
    state?: string;
    category?: string;
  };
}

const EventCardCarousel: React.FC<EventCardCarouselProps> = ({ event }) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Link to={`/event/${event.id}`} className="block h-full">
      <div className="relative h-[200px] sm:h-[450px] md:h-[500px] lg:h-[420px] rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-3xl mx-2">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${event.image || '/placeholder-event.jpg'})`,
          }}
        >
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/30 to-transparent" />
          
          {/* Content */}
          <div className="relative h-full flex flex-col justify-between p-6 sm:p-8">
            {/* Top Section - Category */}
            {event.category && (
              <div className="flex justify-start">
                <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
                  {event.category}
                </span>
              </div>
            )}

            {/* Bottom Section - Event Info */}
            <div className="space-y-4">
              {/* Date and Location */}
              <div className="space-y-2">
                {event.date && (
                  <div className="flex items-center text-white/90">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm sm:text-base">{formatDate(event.date)}</span>
                  </div>
                )}
                
                {(event.location || (event.city && event.state)) && (
                  <div className="flex items-center text-white/90">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm sm:text-base">
                      {event.location || `${event.city} - ${event.state}`}
                    </span>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default EventCardCarousel;
