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
      image: 'https://i.postimg.cc/QCJNJNgc/Imagem-Whats-App-2025-07-14-s-20-38-33-6d804a5e.jpg',
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
      image: 'https://i.postimg.cc/xCr0rNtK/Imagem-Whats-App-2025-07-14-s-20-38-34-840bac16.jpg',
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
      image: 'https://i.postimg.cc/x1hQHbrW/Imagem-Whats-App-2025-07-14-s-20-38-34-99ab0e70.jpg',
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
      image: 'https://i.postimg.cc/Y9xTXvV2/Imagem-Whats-App-2025-07-14-s-20-38-33-ff526ee2.jpg',
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
      image: 'https://i.postimg.cc/Bv0hdq2j/Imagem-Whats-App-2025-07-14-s-20-38-32-2991e2d1.jpg',
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
      image: 'https://i.postimg.cc/k5syzWnH/Imagem-Whats-App-2025-07-14-s-20-38-32-f8777759.jpg',
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
      image: 'https://i.postimg.cc/L4x855XM/Imagem-Whats-App-2025-07-14-s-20-53-51-f70f7ad5.jpg',
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
      image: 'https://i.postimg.cc/wvBnGqdh/Imagem-Whats-App-2025-07-14-s-20-53-52-8ecf7238.jpg',
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
      image: 'https://i.postimg.cc/wv7gsc38/Imagem-Whats-App-2025-07-14-s-20-53-52-faf31be5.jpg',
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
      image: 'https://i.postimg.cc/GmdRj19j/Imagem-Whats-App-2025-07-14-s-20-53-52-e4c957ce.jpg',
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
      image: 'https://i.postimg.cc/C13TB3Wk/Imagem-Whats-App-2025-07-14-s-20-53-53-9c856f06.jpg',
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
      image: 'https://i.postimg.cc/QCJNJNgc/Imagem-Whats-App-2025-07-14-s-20-38-33-6d804a5e.jpg',
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
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Eventos</h2>
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