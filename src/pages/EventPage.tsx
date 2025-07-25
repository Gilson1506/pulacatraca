import React, { useState, useRef, useEffect } from 'react';
import { Calendar, MapPin, Clock, Phone, AlertCircle, CheckCircle, Info, Share2, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import HeroContainer from '../components/HeroContainer';
import { supabase } from '../lib/supabase';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  address: string;
  dateLabel: string;
  image: string;
  tickets: {
    id: string;
    name: string;
    price: number;
    available: number;
  }[];
  sections: {
    name: string;
    details: string[];
    note?: string;
  }[];
  attractions: string[];
  importantNotes: string[];
  contactInfo: {
    phone: string;
    hours: string[];
  };
}

interface SupabaseTicket {
  id: string;
  name: string;
  price: number;
  available_quantity: number;
}

interface SupabaseSection {
  name: string;
  details: string[];
  note?: string;
}

interface SupabaseAttraction {
  name: string;
}

interface SupabaseImportantNote {
  content: string;
}

interface SupabaseContactInfo {
  phone: string;
  hours: string[];
}

interface SupabaseEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  address: string;
  date_label: string;
  image_url: string;
  tickets: SupabaseTicket[];
  sections: SupabaseSection[];
  attractions: SupabaseAttraction[];
  important_notes: SupabaseImportantNote[];
  contact_info: SupabaseContactInfo[];
}

const EventPage = () => {
  const [loading, setLoading] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);
  const navigate = useNavigate();
  const { eventId } = useParams();
  
  console.log('EventPage - ID do evento:', eventId); // Log para debug

  const [showImageModal, setShowImageModal] = useState(false);
  const imageModalRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState('');
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [event, setEvent] = useState<Event | null>(null);

  useEffect(() => {
    console.log('EventPage - useEffect executado com ID:', eventId); // Log para debug
    fetchEvent();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      setIsLoadingEvent(true);
      if (!eventId) {
        console.log('EventPage - ID do evento não fornecido'); // Log para debug
        navigate('/');
        return;
      }

      console.log('EventPage - Buscando evento com ID:', eventId); // Log para debug

      const { data: eventData, error } = await supabase
        .from('events')
        .select(`
          *,
          tickets:event_tickets(
            id,
            name,
            price,
            available_quantity
          ),
          sections:event_sections(
            name,
            details,
            note
          ),
          attractions:event_attractions(name),
          important_notes:event_important_notes(content),
          contact_info:event_contact_info(
            phone,
            hours
          )
        `)
        .eq('id', eventId)
        .single();

      if (error) {
        console.error('EventPage - Erro ao buscar evento:', error); // Log para debug
        throw error;
      }

      if (!eventData) {
        console.log('EventPage - Nenhum evento encontrado com ID:', eventId); // Log para debug
        navigate('/');
        return;
      }

      console.log('EventPage - Dados do evento encontrados:', eventData); // Log para debug

      const supabaseEvent = eventData as unknown as SupabaseEvent;

      const formattedEvent: Event = {
        id: supabaseEvent.id,
        title: supabaseEvent.title,
        description: supabaseEvent.description,
        date: supabaseEvent.date,
        time: supabaseEvent.time,
        location: supabaseEvent.location,
        address: supabaseEvent.address,
        dateLabel: supabaseEvent.date_label,
        image: supabaseEvent.image_url,
        tickets: supabaseEvent.tickets.map(ticket => ({
          id: ticket.id,
          name: ticket.name,
          price: ticket.price,
          available: ticket.available_quantity
        })),
        sections: supabaseEvent.sections.map(section => ({
          name: section.name,
          details: section.details,
          note: section.note
        })),
        attractions: supabaseEvent.attractions.map(attraction => attraction.name),
        importantNotes: supabaseEvent.important_notes.map(note => note.content),
        contactInfo: {
          phone: supabaseEvent.contact_info[0]?.phone || '',
          hours: supabaseEvent.contact_info[0]?.hours || []
        }
      };

      setEvent(formattedEvent);
    } catch (error) {
      console.error('Erro ao buscar evento:', error);
      navigate('/');
    } finally {
      setIsLoadingEvent(false);
    }
  };

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
                {event?.importantNotes.map((note, idx) => (
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
            {event?.sections.map((section, index) => (
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
                {event?.attractions.map((attraction, idx) => (
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
                    {event?.importantNotes.map((note, idx) => (
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
                  <span>{event?.contactInfo.phone}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-gray-400" />
                    <span className="font-medium">Horários de atendimento:</span>
                  </div>
                  <div className="ml-8 space-y-1">
                    {event?.contactInfo.hours.map((hour, idx) => (
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

  if (isLoadingEvent) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando evento...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans" style={{ fontFamily: 'Inter, Segoe UI, Helvetica, Arial, sans-serif' }}>
      <HeroContainer backgroundImage={event.image}>
        <div className="container mx-auto px-2 sm:px-4 py-4 flex flex-col lg:flex-row items-end gap-0 min-h-[180px] lg:min-h-[220px]">
          {/* Hero Image */}
          <div className="relative z-20 lg:-mb-44 -mb-8 lg:ml-0 flex-shrink-0 flex justify-center w-full lg:w-auto lg:justify-start">
            <div className="w-full flex flex-col items-center">
              {/* Container da imagem com aspect ratio fixo */}
              <div
                className="w-11/12 max-w-[340px] aspect-square mx-auto sm:w-[380px] sm:h-[380px] relative bg-black/10 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-lg lg:shadow-2xl overflow-hidden cursor-pointer hover:ring-1 hover:ring-pink-400 transition-all"
                onClick={() => setShowImageModal(true)}
                title="Clique para ampliar"
              >
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
          {/* Modal de visualização da imagem */}
          {showImageModal && (
            <div
              ref={imageModalRef}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
              onClick={() => setShowImageModal(false)}
            >
              <img
                src={event.image}
                alt={event.title}
                className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl border-4 border-white"
              />
              <button
                className="absolute top-4 right-4 text-white text-3xl font-bold bg-black bg-opacity-40 rounded-full px-3 py-1 hover:bg-opacity-70 transition"
                onClick={() => setShowImageModal(false)}
              >
                &times;
              </button>
            </div>
          )}
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
                    id: event.id,
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
                          id: event.id,
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
              <div className="flex lg:flex-col overflow-x-auto whitespace-nowrap scrollbar-hide">
                {tabItems.map((tab) => (
                  <a
                    key={tab.id}
                    href={`#${tab.id}`}
                    className={`flex-shrink-0 w-auto lg:w-full px-4 py-3 text-left text-sm font-semibold transition-colors ${
                      activeSection === tab.id
                        ? 'bg-gray-100 text-pink-600 border-l-4 border-pink-600'
                        : 'text-gray-700 hover:bg-gray-50 border-l-4 border-transparent'
                    }`}
                  >
                    {tab.label}
                  </a>
                ))}
              </div>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventPage;