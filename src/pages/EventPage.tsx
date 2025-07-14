import React, { useState } from 'react';
import { Calendar, MapPin, Clock, Phone, Mail, AlertCircle, CheckCircle, Info, Share2, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EventPageSimple = () => {
  const [activeTab, setActiveTab] = useState('informacoes');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Mock event data - adaptado para o estilo Baladapp
  const event = {
    title: 'ANGRA | TEMPLE OF SHADOWS 20th ANNIVERSARY TOUR - GOIÂNIA',
    description: 'No dia 30 de Julho, em nosso palco sagrado do Bolshoi teremos mais uma vez a honra de receber a banda Angra! O evento teve início em 2023 com a turnê histórica.',
    date: '2025-07-30',
    time: '19:00',
    location: 'Bolshoi Pub',
    address: 'Goiânia / GO',
    dateLabel: '30.07 | QUARTA - FEIRA 19h00',
    image: 'https://i.postimg.cc/t4nDCVB7/Imagem-Whats-App-2025-07-14-s-17-58-16-03e9661e.jpg',
    tickets: [
      { id: 'area-unica', name: 'ÁREA ÚNICA (não open bar)', price: 120.00, available: 150 },
    ],
    sections: [
      {
        name: 'ÁREA ÚNICA (não open bar)',
        details: ['Clube do whiskie', 'Mezanino', 'Pista', 'Salão drink', 'Salão bar'],
        note: 'Não haverá reserva de mesa, as mesas serão por ordem de chegada.'
      },
    ],
    attractions: ['Angra'],
    importantNotes: [
      'É obrigatória a apresentação do ingresso em forma digital ou impressa, juntamente com o DOCUMENTO OFICIAL COM FOTO para a entrada no evento.',
      'Os Ingressos desta oferta são referentes à ANGRA | TEMPLE OF SHADOWS 20th ANNIVERSARY TOUR - GOIÂNIA',
      'A organização do evento, possível mudança de horário ou local são de responsabilidade do ORGANIZADOR.',
      'Não comparecer no evento invalida seu ingresso e não permite reembolso.',
    ],
    contactInfo: {
      phone: '62 3434-8450',
      email: 'contato@pulacatraca.com.br',
      hours: [
        '08h00 às 20h00 - Seg a Sex',
        '10h00 às 20h00 - Sáb (Disque 3)',
        '10h00 às 14h00 - Dom (Disque 3)',
      ],
    },
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    return `${hours}h${minutes}`;
  };

  const getTabContent = (tab) => {
    switch (tab) {
      case 'informacoes':
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3">INFORMAÇÕES</h3>
              <ul className="space-y-2 text-sm">
                {event.importantNotes.map((note, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-gray-400 mt-1">•</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3">REGRAS DE TROCA DE UTILIZADOR</h3>
              <p className="text-sm">O ingresso do tipo INDIVIDUAL pode ter seu utilizador alterado até 1x no prazo máximo de 0h antes do início do evento.</p>
              <button className="mt-3 bg-pink-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-pink-600 transition-colors">
                <Share2 className="h-4 w-4 inline mr-2" />
                Como transferir o seu ingresso
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3">CONSUMIDOR</h3>
              <p className="text-sm">PROCON grandes capitais: 151</p>
              <p className="text-sm">Procure o site do PROCON do seu estado</p>
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <button className="bg-pink-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-pink-600 transition-colors w-full sm:w-auto">
                  <AlertCircle className="h-4 w-4 inline mr-2" />
                  Código de Defesa do Consumidor - L8078 Compilado
                </button>
                <button className="bg-pink-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-pink-600 transition-colors w-full sm:w-auto">
                  <Info className="h-4 w-4 inline mr-2" />
                  Lei da meia entrada
                </button>
              </div>
            </div>
          </div>
        );
      case 'setores-e-areas':
        return (
          <div className="space-y-4">
            {event.sections.map((section, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-3">{section.name}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                  {section.details.map((detail, idx) => (
                    <div key={idx} className="bg-white p-2 rounded text-sm text-center">
                      {detail}
                    </div>
                  ))}
                </div>
                {section.note && (
                  <p className="text-sm text-gray-600 italic">{section.note}</p>
                )}
              </div>
            ))}
          </div>
        );
      case 'atracoes':
        return (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3">ATRAÇÕES</h3>
              <div className="space-y-2">
                {event.attractions.map((attraction, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg font-medium">
                    {attraction}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'importante':
        return (
          <div className="space-y-4">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-lg mb-3">IMPORTANTE</h3>
                  <ul className="space-y-2 text-sm">
                    {event.importantNotes.map((note, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="text-yellow-600 mt-1">•</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );
      case 'classificacao':
        return (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-3">CLASSIFICAÇÃO</h3>
            <div className="bg-green-100 border border-green-300 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
                <span className="font-semibold text-green-800">LIVRE</span>
              </div>
            </div>
          </div>
        );
      case 'contato':
        return (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-4">Atendimento</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <span>{event.contactInfo.phone}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <span>{event.contactInfo.email}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-gray-400" />
                    <span className="font-medium">Horários de atendimento:</span>
                  </div>
                  <div className="ml-8 space-y-1">
                    {event.contactInfo.hours.map((hour, idx) => (
                      <p key={idx} className="text-sm text-gray-600">{hour}</p>
                    ))}
                  </div>
                </div>
              </div>
              <button className="mt-4 bg-pink-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-pink-600 transition-colors">
                <Info className="h-4 w-4 inline mr-2" />
                Clique aqui para ver as perguntas frequentes sobre o evento
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const tabItems = [
    { id: 'informacoes', label: 'INFORMAÇÕES' },
    { id: 'setores-e-areas', label: 'SETORES E ÁREAS' },
    { id: 'atracoes', label: 'ATRAÇÕES' },
    { id: 'importante', label: 'IMPORTANTE' },
    { id: 'classificacao', label: 'CLASSIFICAÇÃO' },
    { id: 'contato', label: 'CONTATO' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Hero Section */}
      <div
        className="relative bg-gradient-to-r from-purple-900 via-blue-900 to-indigo-900 pb-6"
        style={{
          backgroundImage: `url(${event.image})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-60"></div>
        <div className="relative container mx-auto px-4 py-4 flex flex-col lg:flex-row items-end gap-0 min-h-[180px] lg:min-h-[220px]">
          {/* Hero Image (left, mais baixa) */}
          <div className="relative z-20 lg:-mb-44 -mb-28 lg:ml-0 flex-shrink-0 flex justify-start w-full lg:w-auto lg:justify-start">
            <img
              src={event.image}
              alt={event.title}
              className="w-48 h-60 object-cover rounded-xl shadow-2xl border-4 border-white/10"
              style={{ boxShadow: '0 10px 40px 0 rgba(44,0,80,0.25)' }}
            />
          </div>
          {/* Hero Info (ao lado direito da imagem, menos centralizado) */}
          <div className="flex-1 text-white z-10 flex flex-col justify-center lg:items-start items-center text-left ml-0 lg:ml-8">
            <h1 className="text-xl lg:text-2xl font-bold mb-2 max-w-xl leading-tight">{event.title}</h1>
            <div className="text-sm mb-1">{event.address}</div>
            <div className="inline-block bg-pink-600 text-white px-3 py-1 rounded-full text-xs font-semibold mb-3">
              {event.dateLabel}
            </div>
            <div className="space-y-1 mb-2">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-300" />
                <span className="text-xs">Data: {formatDate(event.date)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-300" />
                <span className="text-xs">Local: {event.location} - {event.address}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-300" />
                <span className="text-xs">Abertura dos portões: {formatTime(event.time)}</span>
              </div>
            </div>
          </div>
          {/* Botão de compra (direita, isolado, único) */}
          <div className="relative z-20 flex-shrink-0 flex justify-center lg:justify-end w-full lg:w-auto mt-4 lg:mt-0">
            <button
              className="py-3 px-6 bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition-colors font-bold text-base shadow-2xl flex items-center justify-center min-w-[220px] w-full lg:w-auto"
              onClick={() => {
                setLoading(true);
                // Simula um tempo de carregamento e navega para o checkout
                setTimeout(() => {
                  setLoading(false);
                  // Passa os dados do evento e do primeiro tipo de ingresso para o checkout
                  navigate('/checkout', {
                    state: {
                      event: {
                        id: 'evt-angra-2025',
                        title: event.title,
                        date: event.date,
                        location: event.address,
                        image: event.image,
                      },
                      ticket: event.tickets[0], // Pega o primeiro tipo de ingresso como padrão
                    },
                  });
                }, 1400);
              }}
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                  Processando...
                </span>
              ) : (
                'COMPRAR INGRESSOS'
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 lg:py-8" style={{ marginTop: '16vh' }}>
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation - Horizontal on mobile, vertical on desktop */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow-sm lg:overflow-hidden">
              <div className="flex lg:flex-col overflow-x-auto whitespace-nowrap lg:whitespace-normal scrollbar-hide">
                {tabItems.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-shrink-0 w-full px-4 py-3 text-left text-sm font-semibold border-b-4 lg:border-b-0 lg:border-l-4 transition-colors ${
                      activeTab === tab.id
                        ? 'bg-gray-100 border-pink-600 text-pink-600'
                        : 'border-transparent text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              {getTabContent(activeTab)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventPageSimple;