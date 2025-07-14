import React from 'react';
import EventCarousel from '../components/EventCarousel';
import EventCard from '../components/EventCard';

const HomePage = () => {
  const events = [
    {
      id: '1',
      title: 'Happy Land Circus',
      date: '2025-06-28',
      time: '19:00',
      location: 'Teatro Municipal',
      city: 'Goiânia',
      state: 'GO',
      image: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=1',
      price: 45.00,
      category: 'Circo'
    },
    {
      id: '2',
      title: 'STAND UPS - Festa Julina de Sorocaba',
      date: '2025-04-08',
      time: '20:00',
      location: 'Teatro Municipal',
      city: 'Sorocaba',
      state: 'SP',
      image: 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=1',
      price: 80.00,
      category: 'Stand Up'
    },
    {
      id: '3',
      title: 'Recinto | Festa Julina Sorocaba',
      date: '2025-04-08',
      time: '21:00',
      location: 'Recinto Festa',
      city: 'Sorocaba',
      state: 'SP',
      image: 'https://images.pexels.com/photos/1684187/pexels-photo-1684187.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=1',
      price: 120.00,
      category: 'Festa'
    },
    {
      id: '4',
      title: 'Festa Julina Sorocaba - Shows Nacionais',
      date: '2025-04-08',
      time: '22:00',
      location: 'Espaço Shows',
      city: 'Sorocaba',
      state: 'SP',
      image: 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=1',
      price: 150.00,
      category: 'Show'
    },
    {
      id: '5',
      title: 'TULUM BEACH CLUB | 2025',
      date: '2025-07-20',
      time: '14:00',
      location: 'Beach Club',
      city: 'Salinópolis',
      state: 'PA',
      image: 'https://images.pexels.com/photos/1684187/pexels-photo-1684187.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=1',
      price: 200.00,
      category: 'Beach Club'
    },
    {
      id: '6',
      title: '1° MOTO ALMOÇO SHOW',
      date: '2025-12-07',
      time: '12:00',
      location: 'Espaço Eventos',
      city: 'Inhumas',
      state: 'GO',
      image: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=1',
      price: 60.00,
      category: 'Moto'
    },
    {
      id: '7',
      title: 'Toquinho em Aracaju - Só Tenho Tempo Para Ser Feliz',
      date: '2025-12-19',
      time: '20:00',
      location: 'Teatro Tobias Barreto',
      city: 'Aracaju',
      state: 'SE',
      image: 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=1',
      price: 180.00,
      category: 'Show'
    },
    {
      id: '8',
      title: 'Toquinho em Maceió - Só Tenho Tempo Para Ser Feliz',
      date: '2025-12-20',
      time: '20:00',
      location: 'Teatro Deodoro',
      city: 'Maceió',
      state: 'AL',
      image: 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=1',
      price: 180.00,
      category: 'Show'
    },
    {
      id: '9',
      title: 'Réveillon Arcanjos N°1 2026',
      date: '2025-12-31',
      time: '22:00',
      location: 'Barra de São Miguel',
      city: 'Barra de São Miguel',
      state: 'AL',
      image: 'https://images.pexels.com/photos/1684187/pexels-photo-1684187.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=1',
      price: 250.00,
      category: 'Réveillon'
    },
    {
      id: '10',
      title: 'Réveillon Zé Maria - Edição Origem',
      date: '2025-12-31',
      time: '20:00',
      location: 'Fernando de Noronha',
      city: 'Fernando de Noronha',
      state: 'PE',
      image: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=1',
      price: 300.00,
      category: 'Réveillon'
    },
    {
      id: '11',
      title: 'Réveillon Celebration 2026',
      date: '2025-12-31',
      time: '21:00',
      location: 'Centro de Eventos',
      city: 'Maceió',
      state: 'AL',
      image: 'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=1',
      price: 200.00,
      category: 'Réveillon'
    },
    {
      id: '12',
      title: 'CARNAROCK GOIÂNIA 2026',
      date: '2026-02-07',
      time: '18:00',
      location: 'Arena Goiânia',
      city: 'Goiânia',
      state: 'GO',
      image: 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&dpr=1',
      price: 120.00,
      category: 'Carnaval'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Carousel */}
      <div className="container mx-auto px-4">
        <EventCarousel />
      </div>

      {/* Events Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Eventos</h2>
          <div className="w-16 h-1 bg-pink-600"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>

        {/* Load More Button */}
        <div className="text-center mt-12">
          <button className="bg-pink-600 text-white px-8 py-3 rounded-full hover:bg-pink-700 transition-colors font-medium">
            Carregar mais eventos
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;