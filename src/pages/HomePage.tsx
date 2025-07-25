import React from 'react';
import EventCarousel from '../components/EventCarousel';
import EventCard from '../components/EventCard';
import MobileEventSearchBar from '../components/MobileEventSearchBar';

const HomePage = () => {
  const events = [
    {
      id: '1',
      title: 'Reveillon Mil Sorrisos',
      date: '2025-12-27',
      endDate: '2026-01-02',
      location: 'São Miguel dos Milagres, AL',
      image: 'https://i.postimg.cc/QCJNJNgc/Imagem-Whats-App-2025-07-14-s-20-38-33-6d804a5e.jpg',
      category: 'Festa',
      city: 'São Miguel dos Milagres',
      state: 'AL',
      price: 0,
    },
    {
      id: '2',
      title: 'MAIOR INTER',
      date: '2025-08-10',
      location: 'São Paulo, SP',
      image: 'https://i.postimg.cc/xCr0rNtK/Imagem-Whats-App-2025-07-14-s-20-38-34-840bac16.jpg',
      category: 'Festival',
      city: 'São Paulo',
      state: 'SP',
      price: 0,
    },
    {
      id: '3',
      title: 'ARRAIÁ DO PULA CATRACA',
      date: '2025-07-20',
      location: 'Belo Horizonte, MG',
      image: 'https://i.postimg.cc/x1hQHbrW/Imagem-Whats-App-2025-07-14-s-20-38-34-99ab0e70.jpg',
      category: 'Festa Junina',
      city: 'Belo Horizonte',
      state: 'MG',
      price: 0,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans" style={{ fontFamily: 'Inter, Segoe UI, Helvetica, Arial, sans-serif' }}>
      {/* Mobile SearchBar sticky abaixo do Header, antes do carrossel */}
      <div className="md:hidden sticky top-20 z-40 bg-white border-b shadow">
        <MobileEventSearchBar />
      </div>
      {/* Hero Carousel */}
      <div className="container mx-auto px-4">
        <EventCarousel />
      </div>

      {/* Events Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-2" style={{ fontWeight: 600, letterSpacing: '-0.5px' }}>Eventos</h2>
          <div className="w-16 h-1 bg-pink-600"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;