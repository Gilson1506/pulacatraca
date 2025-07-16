import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  date: string;
  endDate?: string;
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

  // Função para formatar a data de forma inteligente
  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00'); // Adiciona T00:00:00 para evitar problemas de fuso
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '');
    const year = date.getFullYear();
    return { day, month, year };
  };

  const renderDate = () => {
    const { day: startDay, month: startMonth, year: startYear } = formatDate(event.date);

    if (event.endDate) {
      const { day: endDay, month: endMonth, year: endYear } = formatDate(event.endDate);

      // Mostrar ano apenas se for passagem de ano
      const showYear = startYear !== endYear;

      return (
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center gap-2">
            {/* Data de Início */}
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-pink-600">{startDay}</span>
              <span className="text-xs font-semibold text-gray-900">{startMonth}</span>
            </div>

            {/* Linha Divisória Vertical */}
            <div className="h-8 w-px bg-gray-300"></div>

            {/* Data de Fim */}
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-pink-600">{endDay}</span>
              <span className="text-xs font-semibold text-gray-900">{endMonth}</span>
            </div>
          </div>

          {/* Ano(s) */}
          {showYear && (
            <span className="text-xs text-gray-500 mt-1">
              {`${startYear} - ${endYear}`}
            </span>
          )}
        </div>
      );
    }
    // Evento de dia único: só mostra o ano se não for o ano atual
    const currentYear = new Date().getFullYear();
    const showYear = startYear !== currentYear;
    return (
      <>
        <span className="text-3xl font-bold text-pink-600">{startDay}</span>
        <span className="text-sm font-semibold text-gray-900 mt-1">{startMonth}</span>
        {showYear && (
          <span className="text-xs text-gray-500">{startYear}</span>
        )}
      </>
    );
  };

  return (
    <Link to={`/event/${event.id}`} className="block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden group">
      <div className="relative">
        <img 
          src={event.image} 
          alt={event.title} 
          className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="p-4 flex items-start">
        {/* Bloco da Data (Esquerda) - Borda removida */}
        <div className="flex flex-col items-center justify-center bg-white p-2 rounded-md mr-4 text-center min-w-[70px]">
          {renderDate()}
        </div>

        {/* Detalhes do Evento (Direita) */}
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800 text-base leading-tight truncate drop-shadow-md" title={event.title}>
            {event.title}
          </h3>
          <div className="flex items-center mt-2">
            <MapPin className="h-4 w-4 mr-1.5 flex-shrink-0 text-blue-500" />
            <p className="text-sm truncate font-medium" style={{ fontFamily: 'Nunito, Inter, Segoe UI, Helvetica, Arial, sans-serif', color: '#3B82F6', letterSpacing: '0.01em', fontWeight: 600, textShadow: '0 1px 4px rgba(59,130,246,0.10)' }} title={`${event.city}, ${event.state}`}>
              {`${event.city}, ${event.state}`}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default EventCard;