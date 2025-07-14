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
          <div className="absolute top-3 left-3">
            <div className="bg-white rounded-lg p-2 text-center shadow-md">
              <div className="text-2xl font-bold text-pink-600">{dateFormatted.day}</div>
              <div className="text-xs text-gray-600 font-medium">{dateFormatted.month}</div>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <h3 className="font-bold text-gray-900 group-hover:text-pink-600 transition-colors mb-2 text-lg">
            {event.title}
          </h3>
          
          <div className="flex items-center space-x-1 text-gray-500 text-sm mb-3">
            <MapPin className="h-4 w-4" />
            <span>{event.city}/{event.state}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {event.time}
            </div>
            <div className="font-bold text-pink-600">
              A partir de R$ {event.price.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default EventCard;