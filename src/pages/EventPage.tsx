<<<<<<< HEAD
import React, { useState, useRef, useEffect } from 'react';
import { Calendar, MapPin, Clock, Phone, AlertCircle, CheckCircle, Info, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import HeroContainer from '../components/HeroContainer';

const EventPageSimple = () => {
=======
import React, { useState } from 'react';
import { Calendar, MapPin, Clock, Phone, AlertCircle, CheckCircle, Info, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRef } from 'react';
import { useEffect } from 'react';

const EventPageSimple = () => {
  const [activeTab, setActiveTab] = useState('informacoes');
>>>>>>> 26cca1a0decc68183fb8792645cb76c8003d7388
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [showImageModal, setShowImageModal] = useState(false);
  const imageModalRef = useRef<HTMLDivElement>(null);
  const [showArrow, setShowArrow] = useState(false);
<<<<<<< HEAD
  const [activeSection, setActiveSection] = useState('');
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    let arrowTimeout: ReturnType<typeof setTimeout>;
    const interval: ReturnType<typeof setInterval> = setInterval(showAnimatedArrow, 20000);
=======

  useEffect(() => {
    let arrowTimeout: ReturnType<typeof setTimeout>;
    let interval: ReturnType<typeof setInterval>;
>>>>>>> 26cca1a0decc68183fb8792645cb76c8003d7388
    function showAnimatedArrow() {
      setShowArrow(true);
      arrowTimeout = setTimeout(() => setShowArrow(false), 3500);
    }
    showAnimatedArrow();
<<<<<<< HEAD
=======
    interval = setInterval(showAnimatedArrow, 20000);
>>>>>>> 26cca1a0decc68183fb8792645cb76c8003d7388
    return () => {
      clearInterval(interval);
      clearTimeout(arrowTimeout);
    };
  }, []);

<<<<<<< HEAD
  // Novo useEffect para observar as seções
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
            entry.target.classList.add('animate-highlight');
            setTimeout(() => {
              entry.target.classList.remove('animate-highlight');
            }, 1000);
          }
        });
      },
      {
        threshold: 0.5,
        rootMargin: '-100px 0px -100px 0px'
      }
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      Object.values(sectionRefs.current).forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, []);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

=======
>>>>>>> 26cca1a0decc68183fb8792645cb76c8003d7388
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
      hours: [
        '08h00 às 20h00 - Seg a Sex',
        '10h00 às 20h00 - Sáb (Disque 3)',
        '10h00 às 14h00 - Dom (Disque 3)',
      ],
    },
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    return `${hours}h${minutes}`;
  };

  const getTabContent = (tab: string) => {
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
    <div className="min-h-screen bg-gray-100 font-sans" style={{ fontFamily: 'Inter, Segoe UI, Helvetica, Arial, sans-serif' }}>
<<<<<<< HEAD
      <HeroContainer backgroundImage={event.image}>
        <div className="container mx-auto px-2 sm:px-4 py-4 flex flex-col lg:flex-row items-end gap-0 min-h-[180px] lg:min-h-[220px]">
          {/* Hero Image */}
          <div className="relative z-20 lg:-mb-44 -mb-8 lg:ml-0 flex-shrink-0 flex justify-center w-full lg:w-auto lg:justify-start">
            <div
              className="w-64 h-64 sm:w-72 sm:h-72 md:w-48 md:h-60 bg-transparent lg:bg-white rounded-xl shadow-2xl lg:border-4 border-0 border-white/10 flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 hover:ring-pink-400 transition-all"
=======
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
        <div className="relative container mx-auto px-2 sm:px-4 py-4 flex flex-col lg:flex-row items-end gap-0 min-h-[180px] lg:min-h-[220px]">
          {/* Hero Image */}
          <div className="relative z-20 lg:-mb-44 -mb-8 lg:ml-0 flex-shrink-0 flex justify-center w-full lg:w-auto lg:justify-start">
            <div
              className="w-28 h-36 sm:w-40 sm:h-52 md:w-48 md:h-60 bg-white rounded-xl shadow-2xl border-4 border-white/10 flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 hover:ring-pink-400 transition-all"
>>>>>>> 26cca1a0decc68183fb8792645cb76c8003d7388
              style={{ boxShadow: '0 10px 40px 0 rgba(44,0,80,0.25)' }}
              onClick={() => setShowImageModal(true)}
              title="Clique para ampliar"
            >
<<<<<<< HEAD
              <img
                src={event.image}
                alt={event.title}
=======
            <img
              src={event.image}
              alt={event.title}
>>>>>>> 26cca1a0decc68183fb8792645cb76c8003d7388
                className="object-cover w-full h-full"
              />
            </div>
            {/* Modal de visualização da imagem */}
            {showImageModal && (
              <div ref={imageModalRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80" onClick={() => setShowImageModal(false)}>
                <img src={event.image} alt={event.title} className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl border-4 border-white" />
                <button className="absolute top-4 right-4 text-white text-3xl font-bold bg-black bg-opacity-40 rounded-full px-3 py-1 hover:bg-opacity-70 transition" onClick={() => setShowImageModal(false)}>&times;</button>
              </div>
            )}
            {/* Seta animada para ampliar imagem (mobile only) */}
            {showArrow && (
              <div className="absolute top-2 right-0 block lg:hidden z-30 animate-bounce flex flex-col items-end">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M20 12H4m0 0l6-6m-6 6l6 6" stroke="#ec4899" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="block text-xs text-pink-500 mr-1">Clique para ampliar</span>
              </div>
            )}
          </div>
<<<<<<< HEAD
          {/* Hero Info - Apenas em desktop */}
          <div className="flex-1 text-white z-10 hidden lg:flex flex-col justify-center items-start text-left ml-8">
            <h1 className="text-2xl font-bold mb-4 max-w-xl leading-tight text-white drop-shadow-lg" style={{ fontWeight: 700 }}>
              {event.title}
            </h1>
            <div className="text-sm mb-2 text-white/90 drop-shadow-md">{event.address}</div>
            <div className="inline-block bg-pink-600 text-white px-3 py-1 rounded-full text-xs font-semibold mb-4">
              {event.dateLabel}
            </div>
            <div className="space-y-2 mb-4">
=======
          {/* Hero Info */}
          <div className="flex-1 text-white z-10 flex flex-col justify-center lg:items-start items-center text-left ml-0 lg:ml-8 mt-8 lg:mt-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 max-w-xl leading-tight text-center lg:text-left text-white drop-shadow-lg" style={{ fontWeight: 700 }}>
              {event.title}
            </h1>
            <div className="text-xs sm:text-sm mb-1 text-white/90 drop-shadow-md">{event.address}</div>
            <div className="inline-block bg-pink-600 text-white px-3 py-1 rounded-full text-xs font-semibold mb-3">
              {event.dateLabel}
            </div>
            <div className="space-y-1 mb-2">
>>>>>>> 26cca1a0decc68183fb8792645cb76c8003d7388
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-white/80" />
                <span className="text-xs text-white/90">Data: {formatDate(event.date)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-white/80" />
                <span className="text-xs text-white/90">Local: {event.location} - {event.address}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-white/80" />
                <span className="text-xs text-white/90">Abertura dos portões: {formatTime(event.time)}</span>
              </div>
            </div>
          </div>
        </div>
<<<<<<< HEAD
      </HeroContainer>

      {/* Botão de compra em desktop */}
      <div className="hidden lg:flex w-full justify-end px-4 lg:pr-16 mt-6 mb-12 relative z-30">
        <button
          className="py-3 px-6 bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition-colors font-bold text-base shadow-2xl flex items-center justify-center min-w-[220px]"
          onClick={() => {
            setLoading(true);
            setTimeout(() => {
              setLoading(false);
              navigate('/checkout', {
                state: {
                  event: {
                    id: 'evt-angra-2025',
                    title: event.title,
                    date: event.date,
                    location: event.address,
                    image: event.image,
                  },
                  ticket: event.tickets[0],
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

      {/* Conteúdo principal */}
      <div className="container mx-auto px-4 py-4 lg:py-8 lg:mt-32">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            {/* Mobile Info Section */}
            <div className="lg:hidden bg-white rounded-lg shadow-sm p-6 mb-6">
              <h1 className="text-xl font-bold mb-4 leading-tight text-gray-900" style={{ fontWeight: 700 }}>
                {event.title}
              </h1>
              <div className="text-sm mb-2 text-gray-600">{event.address}</div>
              <div className="inline-block bg-pink-600 text-white px-3 py-1 rounded-full text-xs font-semibold mb-4">
                {event.dateLabel}
              </div>
              <div className="space-y-2 mb-6">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Data: {formatDate(event.date)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Local: {event.location} - {event.address}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Abertura dos portões: {formatTime(event.time)}</span>
                </div>
              </div>
              {/* Botão de compra em mobile */}
              <button
                className="w-full py-3 px-4 bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition-colors font-bold text-base shadow-md flex items-center justify-center"
                onClick={() => {
                  setLoading(true);
                  setTimeout(() => {
                    setLoading(false);
                    navigate('/checkout', {
                      state: {
                        event: {
                          id: 'evt-angra-2025',
                          title: event.title,
                          date: event.date,
                          location: event.address,
                          image: event.image,
                        },
                        ticket: event.tickets[0],
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

            <nav className="bg-white rounded-lg shadow-sm lg:overflow-hidden sticky top-24">
              <div className="flex lg:flex-col">
                {tabItems.map((tab) => (
                  <a
                    key={tab.id}
                    href={`#${tab.id}`}
                    className={`flex-shrink-0 w-full px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold transition-colors ${
                      activeSection === tab.id
                        ? 'bg-gray-100 text-pink-600 border-l-4 border-pink-600'
                        : 'text-gray-700 hover:bg-gray-50 border-l-4 border-transparent'
                    }`}
                  >
                    {tab.label}
                  </a>
                ))}
              </div>
=======
      </div>

      {/* Botão de compra isolado, mais à direita e mais abaixo */}
      <div className="w-full flex justify-center lg:justify-end pr-0 lg:pr-16" style={{ marginTop: '1.5rem', marginBottom: '1.5rem', zIndex: 30, position: 'relative' }}>
            <button
          className="py-3 px-4 sm:px-6 bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition-colors font-bold text-base shadow-2xl flex items-center justify-center min-w-[160px] sm:min-w-[220px] w-full max-w-xs lg:w-auto"
              onClick={() => {
                setLoading(true);
                setTimeout(() => {
                  setLoading(false);
                  navigate('/checkout', {
                    state: {
                      event: {
                        id: 'evt-angra-2025',
                        title: event.title,
                        date: event.date,
                        location: event.address,
                        image: event.image,
                      },
                  ticket: event.tickets[0],
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

      <div className="container mx-auto px-4 py-4 lg:py-8" style={{ marginTop: '7vh' }}>
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation - Horizontal on mobile, vertical on desktop */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow-sm lg:overflow-hidden">
              {!showImageModal && (
                <div className="relative">
                  <div id="tab-scroll" className="flex lg:flex-col overflow-x-auto whitespace-nowrap lg:whitespace-normal scrollbar-hide gap-1 sticky top-0 z-30 bg-white/95 border-b-2 border-pink-200 shadow-md md:shadow-none md:border-0">
                {tabItems.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                        className={`flex-shrink-0 w-full px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold border-b-4 lg:border-b-0 lg:border-l-4 transition-colors ${
                      activeTab === tab.id
                        ? 'bg-gray-100 border-pink-600 text-pink-600'
                        : 'border-transparent text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
                  {/* Setas para rolar tabItems no mobile */}
                  <TabScrollArrows />
                </div>
              )}
>>>>>>> 26cca1a0decc68183fb8792645cb76c8003d7388
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
<<<<<<< HEAD
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="space-y-12">
                <div
                  id="informacoes"
                  ref={el => sectionRefs.current['informacoes'] = el}
                  className="transition-all duration-500"
                >
                  <h2 className="text-xl font-semibold mb-4">INFORMAÇÕES</h2>
                  {getTabContent('informacoes')}
                </div>

                <div
                  id="setores-e-areas"
                  ref={el => sectionRefs.current['setores-e-areas'] = el}
                  className="transition-all duration-500"
                >
                  <h2 className="text-xl font-semibold mb-4">SETORES E ÁREAS</h2>
                  {getTabContent('setores-e-areas')}
                </div>

                <div
                  id="atracoes"
                  ref={el => sectionRefs.current['atracoes'] = el}
                  className="transition-all duration-500"
                >
                  <h2 className="text-xl font-semibold mb-4">ATRAÇÕES</h2>
                  {getTabContent('atracoes')}
                </div>

                <div
                  id="importante"
                  ref={el => sectionRefs.current['importante'] = el}
                  className="transition-all duration-500"
                >
                  <h2 className="text-xl font-semibold mb-4">IMPORTANTE</h2>
                  {getTabContent('importante')}
                </div>

                <div
                  id="classificacao"
                  ref={el => sectionRefs.current['classificacao'] = el}
                  className="transition-all duration-500"
                >
                  <h2 className="text-xl font-semibold mb-4">CLASSIFICAÇÃO</h2>
                  {getTabContent('classificacao')}
                </div>

                <div
                  id="contato"
                  ref={el => sectionRefs.current['contato'] = el}
                  className="transition-all duration-500"
                >
                  <h2 className="text-xl font-semibold mb-4">CONTATO</h2>
                  {getTabContent('contato')}
                </div>
              </div>
=======
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6 overflow-x-auto">
              {getTabContent(activeTab)}
>>>>>>> 26cca1a0decc68183fb8792645cb76c8003d7388
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

<<<<<<< HEAD
=======
// Componente para as setas de rolagem do tabItems
function TabScrollArrows() {
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  React.useEffect(() => {
    const el = document.getElementById('tab-scroll');
    if (!el) return;
    function update() {
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft + el.offsetWidth < el.scrollWidth - 2);
    }
    update();
    el.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  if (typeof window === 'undefined') return null;
  return (
    <>
      {canScrollLeft && (
        <button
          type="button"
          className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1 shadow-md border border-pink-200 block md:hidden z-40"
          style={{ display: 'block' }}
          onClick={() => {
            const el = document.getElementById('tab-scroll');
            if (el) el.scrollBy({ left: -120, behavior: 'smooth' });
          }}
          aria-label="Ver abas anteriores"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="#ec4899" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1 shadow-md border border-pink-200 block md:hidden z-40"
          style={{ display: 'block' }}
          onClick={() => {
            const el = document.getElementById('tab-scroll');
            if (el) el.scrollBy({ left: 120, behavior: 'smooth' });
          }}
          aria-label="Ver mais abas"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M9 6l6 6-6 6" stroke="#ec4899" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </>
  );
}

>>>>>>> 26cca1a0decc68183fb8792645cb76c8003d7388
export default EventPageSimple;