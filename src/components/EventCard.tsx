import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  city: string;
  state: string;
  image: string;
  price: number;
  category: string;
}

interface EventCardProps {
  event: Event;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase();
    return { day, month };
  };

  const dateFormatted = formatDate(event.date);

  return (
    <Link to={`/event/${event.id}`} className="block group">
      <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
        <div className="relative">
          <img
            src={event.image}
            alt={event.title}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {/* Data removida da imagem */}
        </div>
        
        <div className="p-4">
          <h3 className="font-bold text-gray-700 group-hover:text-pink-600 transition-colors mb-2 text-lg">
            {event.title}
          </h3>
          {/* Data do evento abaixo do título */}
          <div className="flex items-center space-x-2 text-gray-500 text-sm mb-2">
            <span className="inline-block font-semibold text-pink-600 bg-pink-50 rounded px-2 py-0.5">
              {dateFormatted.day}/{dateFormatted.month}
            </span>
            <span className="text-gray-600">{event.time}</span>
          </div>
          <div className="flex items-center space-x-1 text-gray-500 text-sm mb-3">
            <MapPin className="h-4 w-4" />
            <span>{event.city}/{event.state}</span>
          </div>
          <div className="flex items-center justify-between">
            {/* Preço removido */}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default EventCard;