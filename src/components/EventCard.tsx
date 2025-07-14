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
      <div className="bg-white rounded-[12px] shadow-[0_4px_12px_rgba(0,0,0,0.1)] overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 flex flex-col">
        <div className="relative w-full">
          <img
            src={event.image}
            alt={event.title}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
            style={{ borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
          />
        </div>
        <div className="flex flex-row items-start p-4 gap-4">
          {/* Bloco de data rosa à esquerda */}
          <div className="flex flex-col items-center justify-center min-w-[56px] mr-2">
            <div className="bg-[#ff2d55] text-white rounded-lg px-2 py-1 flex flex-col items-center shadow-md">
              <span className="text-2xl font-bold leading-tight" style={{ fontFamily: 'Poppins, Inter, Roboto, sans-serif' }}>{dateFormatted.day}</span>
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ fontFamily: 'Poppins, Inter, Roboto, sans-serif' }}>{dateFormatted.month}</span>
            </div>
          </div>
          {/* Conteúdo principal do card */}
          <div className="flex-1 flex flex-col justify-center">
            <h3 className="font-semibold text-gray-800 mb-1 text-[18px] leading-snug" style={{ fontFamily: 'Poppins, Inter, Roboto, sans-serif' }}>
              {event.title}
            </h3>
            <div className="flex items-center space-x-1 text-[14px] mb-1" style={{ fontFamily: 'Inter, Roboto, Poppins, sans-serif' }}>
              <MapPin className="h-4 w-4 text-[#007aff]" />
              <span className="text-[#007aff] font-semibold">{event.location || `${event.city}/${event.state}`}</span>
            </div>
            <span className="text-gray-500 text-xs mt-1" style={{ fontFamily: 'Inter, Roboto, Poppins, sans-serif' }}>{event.time}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default EventCard;