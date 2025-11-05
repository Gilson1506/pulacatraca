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
  console.log('EventCard - Renderizando evento:', { id: event.id, title: event.title }); // Log para debug

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

    // Verificar se há data de fim E se é diferente da data de início
    if (event.endDate && event.endDate !== event.date) {
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
          <span className="text-xs font-normal text-gray-500 mt-1" style={{ fontFamily: 'Montserrat, Lato, Raleway, sans-serif' }}>
              {`${startYear} - ${endYear}`}
          </span>
          )}
        </div>
      );
    }
    
    // Evento de dia único (sem endDate ou endDate igual à data de início)
    const currentYear = new Date().getFullYear();
    const showYear = startYear !== currentYear;
    return (
      <>
        <span className="text-3xl font-bold text-pink-600">{startDay}</span>
        <span className="text-sm font-semibold text-gray-900 mt-1">{startMonth}</span>
        {showYear && (
        <span className="text-xs font-normal text-gray-500" style={{ fontFamily: 'Montserrat, Lato, Raleway, sans-serif' }}>{startYear}</span>
        )}
      </>
    );
  };

  return (
    <Link to={`/event/${event.id}`} className="block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden group">
      {/* Mobile: data, imagem, resto (horizontal) */}
      <div className="flex flex-row items-stretch md:hidden">
        {/* Data à esquerda */}
        <div className="flex flex-col items-center justify-center bg-white p-2 rounded-md text-center min-w-[70px] mr-2">
          {renderDate()}
        </div>
        {/* Imagem ao centro (MOBILE) - Ajustada para mostrar banner completo */}
        <div className="relative w-40 flex-shrink-0">
        <img 
          src={event.image} 
          alt={event.title}
          width={400}
          height={300}
          className="w-full h-28 object-cover transition-transform duration-300 group-hover:scale-105 rounded-md"
          style={{ 
            aspectRatio: '4/3',
            objectPosition: 'center center',
            imageRendering: 'high-quality',
            filter: 'contrast(1.02) saturate(1.05)'
          }}
          loading="lazy"
        />
        </div>
        {/* Detalhes do Evento à direita (MOBILE) */}
        <div className="flex-1 flex flex-col justify-between p-2 min-w-0">
          <div className="flex items-center mb-1 min-w-0">
            <MapPin className="h-4 w-4 mr-1.5 flex-shrink-0 text-blue-500" />
            <p className="text-sm font-normal break-words truncate max-w-full" style={{ fontFamily: 'Open Sans, Nunito, Inter, Segoe UI, Helvetica, Arial, sans-serif', color: '#3B82F6', letterSpacing: '0.01em', textShadow: '0 1px 4px rgba(59,130,246,0.10)' }} title={`${event.city}, ${event.state}`}>{`${event.city}, ${event.state}`}</p>
          </div>
          <h3 className="font-bold text-gray-800 text-base leading-tight drop-shadow-md break-words line-clamp-2 max-w-full" style={{ fontFamily: 'Montserrat, Lato, Raleway, sans-serif' }} title={event.title}>
            {event.title}
          </h3>
        </div>
      </div>
      {/* Desktop: imagem em cima, linha com data à esquerda e detalhes à direita */}
      <div className="hidden md:block">
        {/* Imagem em cima - Ajustada para mostrar banner completo */}
        <div className="relative w-full">
          <img 
            src={event.image} 
            alt={event.title}
            width={400}
            height={300}
            className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-105"
            style={{ 
              aspectRatio: '4/3',
              objectPosition: 'center center',
              imageRendering: 'high-quality',
              filter: 'contrast(1.02) saturate(1.05)'
            }}
            loading="lazy"
          />
        </div>
        {/* Linha abaixo da imagem: data à esquerda, detalhes à direita */}
        <div className="flex flex-row items-stretch">
          {/* Data à esquerda */}
          <div className="flex flex-col items-center justify-center bg-white p-4 rounded-md text-center min-w-[90px]">
            {renderDate()}
          </div>
          {/* Detalhes à direita */}
          <div className="flex-1 flex flex-col justify-between p-4">
            <h3 className="font-bold text-gray-800 text-base leading-tight truncate drop-shadow-md mb-2" style={{ fontFamily: 'Montserrat, Lato, Raleway, sans-serif' }} title={event.title}>
              {event.title}
            </h3>
            <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-1.5 flex-shrink-0 text-blue-500" />
            <p className="text-sm truncate font-normal" style={{ fontFamily: 'Open Sans, Nunito, Inter, Segoe UI, Helvetica, Arial, sans-serif', color: '#3B82F6', letterSpacing: '0.01em', textShadow: '0 1px 4px rgba(59,130,246,0.10)' }} title={`${event.city}, ${event.state}`}>{`${event.city}, ${event.state}`}</p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default EventCard;