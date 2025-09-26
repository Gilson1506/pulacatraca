import React from 'react';
import { Calendar, MapPin, Users, Star, Clock } from 'lucide-react';
import EventImage from './EventImage';

interface EventImageCardProps {
  event: {
    id: string;
    title: string;
    image?: string | null;
    start_date: string;
    location: string;
    status?: string;
    total_tickets?: number;
    category?: string;
    carousel_approved?: boolean;
  };
  variant?: 'default' | 'compact' | 'featured';
  showOverlay?: boolean;
  showStatus?: boolean;
  onClick?: () => void;
  className?: string;
}

const EventImageCard: React.FC<EventImageCardProps> = ({
  event,
  variant = 'default',
  showOverlay = true,
  showStatus = false,
  onClick,
  className = ''
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'compact':
        return {
          container: 'w-20 h-20',
          imageSize: 'md' as const,
          overlayClasses: 'text-xs'
        };
      case 'featured':
        return {
          container: 'w-full h-64 md:h-80',
          imageSize: 'xl' as const,
          overlayClasses: 'text-lg'
        };
      default:
        return {
          container: 'w-full h-48',
          imageSize: 'xl' as const,
          overlayClasses: 'text-sm'
        };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'rejected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const { container, imageSize, overlayClasses } = getVariantClasses();

  return (
    <div 
      className={`${container} ${className} relative group cursor-pointer overflow-hidden rounded-lg`}
      onClick={onClick}
    >
      <EventImage
        src={event.image}
        alt={event.title}
        size={imageSize}
        className="w-full h-full transition-transform duration-300 group-hover:scale-105"
        fallbackIcon="event"
        showLoadingState={true}
      />
      
      {/* Overlay com informações */}
      {showOverlay && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
            <h3 className={`${overlayClasses} font-semibold line-clamp-2 mb-2`}>
              {event.title}
            </h3>
            
            {variant !== 'compact' && (
              <div className="space-y-1">
                <div className="flex items-center text-xs text-gray-200">
                  <Calendar className="w-3 h-3 mr-1" />
                  {new Date(event.start_date).toLocaleDateString('pt-BR')}
                </div>
                
                <div className="flex items-center text-xs text-gray-200">
                  <MapPin className="w-3 h-3 mr-1" />
                  <span className="truncate">{event.location}</span>
                </div>
                
                {event.total_tickets && (
                  <div className="flex items-center text-xs text-gray-200">
                    <Users className="w-3 h-3 mr-1" />
                    {event.total_tickets.toLocaleString()} ingressos
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Badge de status */}
      {showStatus && event.status && (
        <div className="absolute top-2 left-2">
          <span className={`inline-block w-3 h-3 rounded-full ${getStatusColor(event.status)}`} />
        </div>
      )}
      
      {/* Badge de carrossel */}
      {event.carousel_approved && (
        <div className="absolute top-2 right-2">
          <div className="bg-blue-500 text-white p-1 rounded-full">
            <Star className="w-3 h-3 fill-current" />
          </div>
        </div>
      )}
      
      {/* Badge de categoria */}
      {event.category && variant === 'featured' && (
        <div className="absolute top-2 left-2">
          <span className="bg-white/20 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
            {event.category}
          </span>
        </div>
      )}
    </div>
  );
};

export default EventImageCard;