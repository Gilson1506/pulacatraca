import React from 'react';
import EventCarousel from '../components/EventCarousel';
import EventCard from '../components/EventCard';

const HomePage = () => {
  const events = [
    {
      id: '1',
      title: 'Reveillon Mil Sorrisos',
      date: '2025-12-27',
      endDate: '2026-01-02',
      location: 'Praia dos Milagres',
      city: 'São Miguel dos Milagres',
      state: 'AL',
      image: 'https://i.postimg.cc/QCJNJNgc/Imagem-Whats-App-2025-07-14-s-20-38-33-6d804a5e.jpg',
      price: 250.00,
      category: 'Réveillon'
    },
    {
      id: '2',
      title: 'MAIOR INTER',
      date: '2025-08-10',
      location: 'Arena Inter',
      city: 'São Paulo',
      state: 'SP',
      image: 'https://i.postimg.cc/xCr0rNtK/Imagem-Whats-App-2025-07-14-s-20-38-34-840bac16.jpg',
      price: 80.00,
      category: 'Show'
    },
    {
      id: '3',
      title: 'ARRAIÁ DO PULA CATRACA',
      date: '2025-07-20',
      location: 'Clube da Cidade',
      city: 'Belo Horizonte',
      state: 'MG',
      image: 'https://i.postimg.cc/x1hQHbrW/Imagem-Whats-App-2025-07-14-s-20-38-34-99ab0e70.jpg',
      price: 120.00,
      category: 'Festa'
    },
    {
      id: '4',
      title: 'FESTIVAL DE INVERNO',
      date: '2025-08-15',
      location: 'Parque da Montanha',
      city: 'Campos do Jordão',
      state: 'SP',
      image: 'https://i.postimg.cc/Y9xTXvV2/Imagem-Whats-App-2025-07-14-s-20-38-33-ff526ee2.jpg',
      price: 150.00,
      category: 'Show'
    },
    {
      id: '5',
      title: 'SAMBA PRIME',
      date: '2025-09-05',
      location: 'Sambódromo',
      city: 'Rio de Janeiro',
      state: 'RJ',
      image: 'https://i.postimg.cc/Bv0hdq2j/Imagem-Whats-App-2025-07-14-s-20-38-32-2991e2d1.jpg',
      price: 200.00,
      category: 'Samba'
    },
    {
      id: '6',
      title: 'EXPO-SERTANEJA',
      date: '2025-10-12',
      location: 'Parque de Exposições',
      city: 'Goiânia',
      state: 'GO',
      image: 'https://i.postimg.cc/k5syzWnH/Imagem-Whats-App-2025-07-14-s-20-38-32-f8777759.jpg',
      price: 60.00,
      category: 'Exposição'
    },
    {
      id: '7',
      title: 'BAILE DO DENNIS',
      date: '2025-11-22',
      location: 'Marina da Glória',
      city: 'Rio de Janeiro',
      state: 'RJ',
      image: 'https://i.postimg.cc/L4x855XM/Imagem-Whats-App-2025-07-14-s-20-53-51-f70f7ad5.jpg',
      price: 180.00,
      category: 'Baile'
    },
    {
      id: '8',
      title: 'PAGODE DO BOM',
      date: '2025-09-20',
      location: 'Casa de Shows',
      city: 'Salvador',
      state: 'BA',
      image: 'https://i.postimg.cc/wvBnGqdh/Imagem-Whats-App-2025-07-14-s-20-53-52-8ecf7238.jpg',
      price: 180.00,
      category: 'Pagode'
    },
    {
      id: '9',
      title: 'BUTECO DO GUSTTAVO LIMA',
      date: '2025-11-30',
      location: 'Estádio Mineirão',
      city: 'Belo Horizonte',
      state: 'MG',
      image: 'https://i.postimg.cc/wv7gsc38/Imagem-Whats-App-2025-07-14-s-20-53-52-faf31be5.jpg',
      price: 250.00,
      category: 'Buteco'
    },
    {
      id: '10',
      title: 'RÉVEILLON CARNEIROS',
      date: '2025-12-28',
      endDate: '2026-01-03',
      location: 'Praia dos Carneiros',
      city: 'Tamandaré',
      state: 'PE',
      image: 'https://i.postimg.cc/GmdRj19j/Imagem-Whats-App-2025-07-14-s-20-53-52-e4c957ce.jpg',
      price: 300.00,
      category: 'Réveillon'
    },
    {
      id: '11',
      title: 'RÉVEILLON NA PRAIA',
      date: '2025-12-31',
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
      endDate: '2026-02-09',
      location: 'Arena Goiânia',
      city: 'Goiânia',
      state: 'GO',
      image: 'https://i.postimg.cc/QCJNJNgc/Imagem-Whats-App-2025-07-14-s-20-38-33-6d804a5e.jpg',
      price: 120.00,
      category: 'Carnaval'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans" style={{ fontFamily: 'Inter, Segoe UI, Helvetica, Arial, sans-serif' }}>
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

        {/* Load More Button Removido */}
      </div>
    </div>
  );
};

export default HomePage;