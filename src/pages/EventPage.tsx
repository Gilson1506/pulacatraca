import React, { useState, useRef, useEffect } from 'react';
import { Calendar, MapPin, Clock, Phone, AlertCircle, CheckCircle, Info, Share2 } from 'lucide-react';
import ProfessionalLoader from '../components/ProfessionalLoader';
import { useNavigate, useParams } from 'react-router-dom';
// @ts-ignore
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import HeroContainer from '../components/HeroContainer';
import LoginPromptModal from '../components/LoginPromptModal';
import TicketSelectorModal from '../components/TicketSelectorModal';

import { supabase } from '../lib/supabase';
import { useAnalytics, usePageTracking } from '../hooks/useAnalytics';
import { useABTesting } from '../hooks/useABTesting';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  address: string;
  addressDetailed: string[];
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
  classification: string;
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

const MapInline: React.FC<{ destinationAddress: string }> = ({ destinationAddress }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const userLngLatRef = useRef<[number, number] | null>(null);
  const destLngLatRef = useRef<[number, number] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMap, setLoadingMap] = useState(false);

  const token = (import.meta as any).env?.VITE_MAPBOX_ACCESS_TOKEN || (import.meta as any).env?.VITE_MAPBOX_TOKEN || '';

  useEffect(() => {
    if (!token) {
      setError('Mapbox token ausente. Defina VITE_MAPBOX_ACCESS_TOKEN.');
      return;
    }
    setError(null);
    setLoadingMap(true);

    let isCancelled = false;

    const initialize = async () => {
      try {
        // Geocodifica o destino
        const geoUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destinationAddress)}.json?limit=1&access_token=${token}`;
        const geoRes = await fetch(geoUrl);
        const geoJson = await geoRes.json();
        if (!geoJson?.features?.length) return;
        const [lng, lat] = geoJson.features[0].center;
        destLngLatRef.current = [lng, lat];

        (mapboxgl as any).accessToken = token;
        mapRef.current = new mapboxgl.Map({
          container: containerRef.current as HTMLDivElement,
          style: 'mapbox://styles/mapbox/streets-v11',
          center: destLngLatRef.current,
          zoom: 14,
        });

        // Marcador do destino
        new mapboxgl.Marker({ color: '#ec4899' }).setLngLat(destLngLatRef.current).addTo(mapRef.current);

        // Pedir geolocalização do usuário
        await new Promise<void>((resolve) => {
          if (!navigator.geolocation) return resolve();
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              userLngLatRef.current = [pos.coords.longitude, pos.coords.latitude];
              resolve();
            },
            () => resolve(),
            { enableHighAccuracy: true, timeout: 6000 }
          );
        });

        // Traçar rota se usuário disponível
        if (userLngLatRef.current && destLngLatRef.current) {
          const dirUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${userLngLatRef.current[0]},${userLngLatRef.current[1]};${destLngLatRef.current[0]},${destLngLatRef.current[1]}?geometries=geojson&access_token=${token}`;
          const dirRes = await fetch(dirUrl);
          const dirJson = await dirRes.json();
          const route = dirJson?.routes?.[0]?.geometry;
          if (route) {
            const addRoute = () => {
              if (!mapRef.current.getSource('route')) {
                mapRef.current.addSource('route', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: route } });
                mapRef.current.addLayer({ id: 'route-line', type: 'line', source: 'route', paint: { 'line-color': '#ec4899', 'line-width': 4 } });
              }
              const bounds = new (mapboxgl as any).LngLatBounds();
              route.coordinates.forEach((c: [number, number]) => bounds.extend(c));
              mapRef.current.fitBounds(bounds, { padding: 40 });
            };
            if (mapRef.current.loaded()) addRoute(); else mapRef.current.on('load', addRoute);
          }

          // Marcador usuário
          new mapboxgl.Marker({ color: '#3b82f6' }).setLngLat(userLngLatRef.current).addTo(mapRef.current);
        }
      } catch (e) {
        console.error('Erro no mapa:', e);
      } finally {
        if (!isCancelled) setLoadingMap(false);
      }
    };

    initialize();

    return () => {
      isCancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [destinationAddress, token]);

  const flyToRoute = () => {
    if (!mapRef.current) return;
    if (userLngLatRef.current && destLngLatRef.current) {
      const bounds = new (mapboxgl as any).LngLatBounds();
      bounds.extend(userLngLatRef.current);
      bounds.extend(destLngLatRef.current);
      mapRef.current.fitBounds(bounds, { padding: 40, duration: 800 });
    } else if (destLngLatRef.current) {
      mapRef.current.flyTo({ center: destLngLatRef.current, zoom: 14, speed: 1.2, curve: 1.4 });
    }
  };

  return (
    <div className="relative">
      <div className="w-full h-[40vh] sm:h-[50vh] md:h-[60vh] rounded-xl overflow-hidden border border-gray-200 shadow-sm" ref={containerRef} />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-red-600 text-sm font-medium">
          {error}
        </div>
      )}
      {loadingMap && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/40">
          <ProfessionalLoader size="lg" />
        </div>
      )}
      {/* Botão bússola */}
      <button
        onClick={flyToRoute}
        className="absolute top-3 right-3 z-10 rounded-full bg-white/90 hover:bg-white text-gray-700 shadow p-2 border border-gray-200"
        aria-label="Recentrar mapa"
        title="Recentrar mapa"
      >
        🧭
      </button>
    </div>
  );
};

const EventPage = () => {
  const [loading, setLoading] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);
  const navigate = useNavigate();
  const { eventId } = useParams();
  
  console.log('EventPage - ID do evento:', eventId); // Log para debug

  const [showImageModal, setShowImageModal] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const imageModalRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState('');
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [event, setEvent] = useState<Event | null>(null);
  const [user, setUser] = useState<any>(null);
  const [availableTickets, setAvailableTickets] = useState<any[]>([]);
  const [showFloatingBar, setShowFloatingBar] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [halfPriceQuantity, setHalfPriceQuantity] = useState(0);
  const { trackPurchaseFlow } = useAnalytics();
  const { shouldUseAuthModal } = useABTesting();
  
  // Track page view automaticamente
  usePageTracking('event_page');

  useEffect(() => {
    console.log('EventPage - useEffect executado com ID:', eventId); // Log para debug
    fetchEvent();
    checkUser();
  }, [eventId]);

  // Track visualização do evento quando carregado
  useEffect(() => {
    if (event && eventId) {
      trackPurchaseFlow.eventView(eventId, event.title);
    }
  }, [event, eventId]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchEvent = async () => {
    // Declarar variáveis no escopo da função
    let attractions: string[] = [];
    let importantInfo: string[] = [];
    let classification: string = 'LIVRE';
    
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
          id,
          title,
          description,
          start_date,
          end_date,
          location,
          image,
          subject,
          subcategory,
          category,
          classification,
          important_info,
          attractions,
          price,
          status,
          organizer_id,
          available_tickets,
          total_tickets,
          tags,
          location_type,
          location_name,
          location_city,
          location_state,
          location_street,
          location_number,
          location_neighborhood,
          location_cep,
          location_complement,
          location_search,
          ticket_type,
          contact_info,
          created_at,
          updated_at
        `)
        .eq('id', eventId)
        .eq('status', 'approved') // ✅ APENAS EVENTOS APROVADOS
        .single();

      // 🎫 BUSCAR TIPOS DE INGRESSOS DO EVENTO
      console.log('EventPage - Buscando tipos de ingressos para evento:', eventId);
      
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('event_ticket_types')
        .select('*')
        .eq('event_id', eventId)
        .eq('status', 'active')
        .order('price', { ascending: true });

      // Log para debug dos tipos de ingressos
      if (ticketsError) {
        console.error('EventPage - Erro ao buscar tipos de ingressos:', ticketsError);
      } else {
        console.log('EventPage - Tipos de ingressos encontrados:', ticketsData?.length || 0);
        if (ticketsData && ticketsData.length > 0) {
          console.log('EventPage - Detalhes dos ingressos:', ticketsData.map(t => ({
            id: t.id,
            name: t.title || t.name,
            price: t.price,
            price_masculine: t.price_masculine,
            price_feminine: t.price_feminine,
            quantity: t.quantity,
            available: t.available_quantity,
            status: t.status
          })));
        }
      }

      if (error) {
        console.error('EventPage - Erro ao buscar evento:', error); // Log para debug
        throw error;
      }

      if (!eventData) {
        console.log('EventPage - Nenhum evento encontrado com ID:', eventId); // Log para debug
        navigate('/');
        return;
      }

      // Atribuir valores às variáveis declaradas no escopo da função
      attractions = eventData.attractions && eventData.attractions.length > 0 ? eventData.attractions : [];
      importantInfo = eventData.important_info && eventData.important_info.length > 0 ? eventData.important_info : [];
      classification = eventData.classification || 'LIVRE';

      // Log consolidado para debug
      console.log('EventPage - Dados processados:', {
        id: eventData.id,
        title: eventData.title,
        classification,
        attractions: attractions.length,
        importantInfo: importantInfo.length
      });

      // Log detalhado dos tipos de ingressos
      if (ticketsData && ticketsData.length > 0) {
        console.log('🎫 EventPage - Dados brutos dos tipos de ingressos:', ticketsData);
        console.log('🎫 EventPage - Quantidades disponíveis:', ticketsData.map(t => ({
          title: t.title || t.name,
          quantity: t.quantity,
          available_quantity: t.available_quantity,
          status: t.status
        })));
      } else {
        console.log('⚠️ EventPage - Nenhum tipo de ingresso encontrado em ticketsData');
      }

      // Log detalhado dos dados de contato
      console.log('📞 EventPage - Dados de contato do banco:', {
        contact_info_raw: eventData.contact_info,
        contact_info_type: typeof eventData.contact_info,
        phone: eventData.contact_info?.phone,
        hours: eventData.contact_info?.hours,
        has_contact_info: !!eventData.contact_info
      });

      // Log detalhado dos dados de localização
      console.log('📍 EventPage - Dados de localização do banco:', {
        location_type: eventData.location_type,
        location_name: eventData.location_name,
        location_city: eventData.location_city,
        location_state: eventData.location_state,
        location_street: eventData.location_street,
        location_number: eventData.location_number,
        location_neighborhood: eventData.location_neighborhood,
        location_cep: eventData.location_cep,
        location_complement: eventData.location_complement,
        location_search: eventData.location_search,
        location_fallback: eventData.location
      });

      // Processar dados formatados uma única vez (evitar duplicações)
      const formattedAddress = (() => {
        if (eventData.location_type === 'online') {
          return 'Evento Online';
        } else if (eventData.location_type === 'tbd') {
          return 'Local ainda será definido';
        } else {
          // Montar endereço físico completo com TODOS os detalhes
          const addressParts = [];
          
          // Nome do local (se existir)
          if (eventData.location_name && eventData.location_name !== eventData.location) {
            addressParts.push(eventData.location_name);
          }
          
          // Rua e número
          if (eventData.location_street) {
            let streetInfo = eventData.location_street;
            if (eventData.location_number) streetInfo += `, ${eventData.location_number}`;
            addressParts.push(streetInfo);
          }
          
          // Complemento (se existir)
          if (eventData.location_complement) {
            addressParts.push(eventData.location_complement);
          }
          
          // Bairro
          if (eventData.location_neighborhood) {
            addressParts.push(eventData.location_neighborhood);
          }
          
          // Cidade e estado
          if (eventData.location_city && eventData.location_state) {
            addressParts.push(`${eventData.location_city} - ${eventData.location_state}`);
          }
          
          // CEP
          if (eventData.location_cep) {
            addressParts.push(`CEP: ${eventData.location_cep}`);
          }
          
          // Fallback para local básico se não houver endereço detalhado
          if (addressParts.length === 0 && eventData.location) {
            addressParts.push(eventData.location);
          }
          
          return addressParts.length > 0 ? addressParts.join(', ') : 'Endereço não informado';
        }
      })();

      // Formatar endereço para exibição detalhada (com quebras de linha)
      const formattedAddressDetailed = (() => {
        if (eventData.location_type === 'online') {
          return 'Evento Online';
        } else if (eventData.location_type === 'tbd') {
          return 'Local ainda será definido';
        } else {
          const addressLines = [];
          
          // Nome do local (se existir)
          if (eventData.location_name && eventData.location_name !== eventData.location) {
            addressLines.push(eventData.location_name);
          }
          
          // Rua e número
          if (eventData.location_street) {
            let streetInfo = eventData.location_street;
            if (eventData.location_number) streetInfo += `, ${eventData.location_number}`;
            addressLines.push(streetInfo);
          }
          
          // Complemento (se existir)
          if (eventData.location_complement) {
            addressLines.push(eventData.location_complement);
          }
          
          // Bairro
          if (eventData.location_neighborhood) {
            addressLines.push(eventData.location_neighborhood);
          }
          
          // Cidade e estado
          if (eventData.location_city && eventData.location_state) {
            addressLines.push(`${eventData.location_city} - ${eventData.location_state}`);
          }
          
          // CEP
          if (eventData.location_cep) {
            addressLines.push(`CEP: ${eventData.location_cep}`);
          }
          
          // Fallback para local básico se não houver endereço detalhado
          if (addressLines.length === 0 && eventData.location) {
            addressLines.push(eventData.location);
          }
          
          return addressLines.length > 0 ? addressLines : ['Endereço não informado'];
        }
      })();

      const formattedDuration = (() => {
        if (!eventData.start_date || !eventData.end_date) return '';
        
        const start = new Date(eventData.start_date);
        const end = new Date(eventData.end_date);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return '1 dia';
        return `${diffDays} dias`;
      })();

      // Processar datas uma única vez (evitar duplicações)
      const startDate = new Date(eventData.start_date);
      const startTime = eventData.start_date?.split('T')[1]?.substring(0, 5) || '';
      const endTime = eventData.end_date?.split('T')[1]?.substring(0, 5) || '';
      const formattedStartDate = startDate.toLocaleDateString('pt-BR');
      const formattedEndDate = eventData.end_date ? new Date(eventData.end_date).toLocaleDateString('pt-BR') : '';

      const formattedEvent: Event = {
        id: eventData.id,
        title: eventData.title,
        description: eventData.description || 'Descrição não disponível',
        date: eventData.start_date?.split('T')[0] || '',
        time: startTime,
        location: eventData.location_name || eventData.location || 'Local não informado',
        address: formattedAddress,
        addressDetailed: Array.isArray(formattedAddressDetailed) ? formattedAddressDetailed : [formattedAddressDetailed],
        dateLabel: startDate.toLocaleDateString('pt-BR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }),
        image: eventData.image || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDgwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjM2OEE3Ii8+Cjx0ZXh0IHg9IjQwMCIgeT0iMjEwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMzIiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5FdmVudG88L3RleHQ+Cjwvc3ZnPgo=',
        tickets: ticketsData && ticketsData.length > 0 ? ticketsData.map(ticket => ({
          id: ticket.id,
          name: ticket.title || ticket.name,
          price: ticket.price_masculine || ticket.price,
          price_feminine: ticket.price_feminine,
          available: Math.max(ticket.available_quantity || 0, ticket.quantity || 0),
          area: ticket.area || 'Pista',
          description: ticket.description || '',
          has_half_price: ticket.has_half_price || false,
          min_quantity: ticket.min_quantity || 1,
          max_quantity: ticket.max_quantity || 5,
          batches: [],
          current_batch: null
        })) : [
          {
            id: '1',
            name: 'Ingresso Geral',
            price: eventData.price || 0,
            available: Math.max(eventData.available_tickets || 0, eventData.total_tickets || 0)
          }
        ],
        sections: [
          {
            name: 'Informações do Evento',
            details: [
              ...(eventData.subject ? [`Assunto: ${eventData.subject}`] : []),
              ...(eventData.subcategory ? [`Subcategoria: ${eventData.subcategory}`] : []),
              `Categoria: ${eventData.category || 'Não informado'}`,
              ...(eventData.ticket_type ? [`Tipo de ingresso: ${eventData.ticket_type === 'paid' ? 'Pago' : 'Gratuito'}`] : []),
              ...(formattedDuration ? [`Duração: ${formattedDuration}`] : [])
            ]
          },
          {
            name: 'Local e Data',
            details: [
              `Tipo de local: ${eventData.location_type === 'physical' ? 'Físico' : eventData.location_type === 'online' ? 'Online' : 'A definir'}`,
              ...(eventData.location_name && eventData.location_name !== eventData.location ? [`Local: ${eventData.location_name}`] : []),
              ...(formattedAddress ? [`Endereço: ${formattedAddress}`] : []),
              `Data: ${formattedStartDate} às ${startTime}`,
              ...(eventData.end_date && eventData.end_date !== eventData.start_date ? [`Término: ${formattedEndDate} às ${endTime}`] : [])
            ]
          },
          {
            name: 'Ingressos',
            details: ticketsData && ticketsData.length > 0 ? [
              `Tipos disponíveis: ${ticketsData.length}`,
              ...ticketsData.map(ticket => {
                const priceMasc = ticket.price_masculine || ticket.price;
                const priceFem = ticket.price_feminine;
                const availableQty = ticket.available_quantity || ticket.quantity || 0;
                const totalQty = ticket.quantity || 0;
                const priceText = priceMasc > 0 
                  ? `Masc: R$ ${priceMasc.toFixed(2)}${priceFem ? ` | Fem: R$ ${priceFem.toFixed(2)}` : ''}`
                  : 'Gratuito';
                const statusText = availableQty > 0 ? `${availableQty} disponíveis` : 'Esgotado';
                return `${ticket.title || ticket.name} (${ticket.area || 'Pista'}): ${statusText} - ${priceText}`;
              })
            ] : [
              `Ingressos disponíveis: ${eventData.available_tickets || eventData.total_tickets || 0}`,
              `Total de ingressos: ${eventData.total_tickets || 0}`,
              `Valor: ${eventData.ticket_type === 'free' ? 'Gratuito' : `R$ ${(eventData.price || 0).toFixed(2)}`}`
            ]
          }
        ],
        attractions: attractions,
        importantNotes: importantInfo,
        classification: classification,
        contactInfo: {
          phone: eventData.contact_info?.phone || '(11) 99999-9999',
          hours: eventData.contact_info?.hours || ['Segunda a Sexta: 9h às 18h', 'Sábados: 9h às 14h']
        }
      };

      setEvent(formattedEvent);
      
      // Processar tickets se existirem (otimizado para evitar duplicações)
      if (ticketsData && ticketsData.length > 0) {
        // Criar estrutura específica para o TicketSelectorModal
        const modalTickets = ticketsData.map(ticket => ({
          id: ticket.id,
          name: ticket.title || ticket.name,
          price: ticket.price_masculine || ticket.price,
          price_feminine: ticket.price_feminine,
          quantity: Math.max(ticket.available_quantity || 0, ticket.quantity || 0),
          description: ticket.description || '',
          area: ticket.area || 'Pista',
          sector: ticket.sector,
          benefits: ticket.benefits || [],
          has_half_price: ticket.has_half_price || false,
          min_quantity: ticket.min_quantity || 1,
          max_quantity: ticket.max_quantity || 5,
          ticket_type: ticket.ticket_type || 'paid',
          status: ticket.status || 'active',
          batches: [],
          current_batch: null,
          sale_period_type: ticket.sale_period_type || 'date',
          availability: ticket.availability || 'public'
        }));
        
        setAvailableTickets(modalTickets);
        console.log('🎫 Tipos de ingressos carregados para modal:', modalTickets.length);
        console.log('🎫 Detalhes dos ingressos:', modalTickets.map(t => ({
          id: t.id,
          name: t.name,
          price: t.price,
          quantity: t.quantity,
          status: t.status
        })));
      } else {
        setAvailableTickets([]);
        console.log('⚠️ Nenhum tipo de ingresso encontrado para este evento');
      }
      
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

  // Controle da barra flutuante baseado no scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      
      // Mostrar a barra após rolar mais que 50% da altura da tela
      if (scrollY > windowHeight * 0.5) {
        setShowFloatingBar(true);
      } else {
        setShowFloatingBar(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-lg mb-3 text-blue-800">DESCRIÇÃO DO EVENTO</h3>
              <div className="space-y-2 text-sm text-blue-700">
                {event?.description ? (
                  <div className="whitespace-pre-line">
                    {event.description.split('\n').map((line, index) => (
                      <p key={index}>{line.trim() ? line.trim() : ''}</p>
                    ))}
                  </div>
                ) : (
                  <p>Descrição não disponível para este evento.</p>
                )}
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-3">REGRAS DE TROCA DE UTILIZADOR</h3>
              <p className="text-sm">O ingresso do tipo INDIVIDUAL pode ter seu utilizador alterado até 1x no prazo máximo de 0h antes do início do evento.</p>
              <button className="mt-3 bg-pink-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-pink-600 transition-colors" onClick={() => navigate('/duvidas')}>
                <Share2 className="h-4 w-4 inline mr-2" />
                Como transferir o seu ingresso
              </button>
            </div>




          </div>
        );
      case 'setores-e-areas':
        return (
          <div className="space-y-4">
            {event?.sections.map((section, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-3">{section.name}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
                  {section.details.map((detail, idx) => (
                    <div key={idx} className="bg-white p-3 rounded text-sm text-center border border-gray-200">
                      {detail}
                    </div>
                  ))}
                </div>
                {section.note && (
                  <p className="text-sm text-gray-600 italic mt-3">{section.note}</p>
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
              {event?.attractions && event.attractions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {event.attractions.map((attraction, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-lg font-medium border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-2">
                        <span className="text-pink-500 text-lg">🎵</span>
                        <span>{attraction}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 text-center">
                    <span className="font-medium">Nenhuma atração específica foi informada para este evento.</span>
                    <br />
                    <span className="text-xs">O organizador pode adicionar atrações posteriormente.</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      case 'importante':
        return (
          <div className="space-y-4">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-3">INFORMAÇÕES IMPORTANTES</h3>
                  {event?.importantNotes && event.importantNotes.length > 0 ? (
                    <div className="space-y-3">
                      {event.importantNotes.map((note, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-lg border border-yellow-200 shadow-sm">
                          <div className="flex items-start space-x-2">
                            <span className="text-yellow-500 text-lg mt-0.5">⚠️</span>
                            <span className="text-sm text-gray-800">{note}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800 text-center">
                        <span className="font-medium">Nenhuma informação importante foi informada para este evento.</span>
                        <br />
                        <span className="text-xs">Verifique as regras gerais do evento ou entre em contato com o organizador.</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      case 'classificacao':
        return (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-3">CLASSIFICAÇÃO ETÁRIA</h3>
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-center space-x-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="text-center">
                  <span className="text-2xl font-bold text-green-800">
                    {event?.classification || 'LIVRE'}
                  </span>
                  <p className="text-sm text-green-700 mt-1">
                    {event?.classification === '18' ? 'Maiores de 18 anos' :
                     event?.classification === '16' ? 'Maiores de 16 anos' :
                     event?.classification === '14' ? 'Maiores de 14 anos' :
                     event?.classification === '12' ? 'Maiores de 12 anos' :
                     event?.classification === '10' ? 'Maiores de 10 anos' :
                     'Todas as idades'}
                  </p>
                </div>
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
                    {event?.contactInfo.hours && event.contactInfo.hours.length > 0 ? (
                      event.contactInfo.hours.map((hour, idx) => (
                        <p key={idx} className="text-sm text-gray-600">{hour}</p>
                      ))
                    ) : (
                      <p className="text-sm text-gray-600">Horários não informados</p>
                    )}
                  </div>
                </div>
              </div>
              <button className="mt-4 bg-pink-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-pink-600 transition-colors" onClick={() => navigate('/duvidas')}>
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
        <ProfessionalLoader size="lg" />
      </div>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white font-sans" style={{ fontFamily: 'Inter, Segoe UI, Helvetica, Arial, sans-serif' }}>
      <HeroContainer backgroundImage={event.image}>
        <div className="container mx-auto px-2 sm:px-4 py-4 flex flex-col lg:flex-row items-end gap-0 min-h-[180px] lg:min-h-[220px]">
          {/* Hero Image */}
          <div className="relative z-20 lg:-mb-44 -mb-8 lg:ml-0 flex-shrink-0 flex justify-center w-full lg:w-auto lg:justify-start">
            <div className="w-full flex flex-col items-center">
              {/* Container da imagem com aspect ratio fixo */}
              <div
                className="w-11/12 max-w-[340px] aspect-[4/3] mx-auto sm:w-[380px] sm:h-[285px] relative bg-black/10 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-lg lg:shadow-2xl overflow-hidden cursor-pointer hover:ring-1 hover:ring-pink-400 transition-all"
                onClick={() => setShowImageModal(true)}
                title="Clique para ampliar"
              >
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-full h-full object-cover"
                  style={{ 
                    objectPosition: 'center center',
                    filter: 'contrast(1.02) saturate(1.05) brightness(1.02)',
                    WebkitBackfaceVisibility: 'hidden',
                    backfaceVisibility: 'hidden',
                    WebkitTransform: 'translateZ(0)',
                    transform: 'translateZ(0)'
                  }}
                  loading="eager"
                />
              </div>
            </div>
          </div>
          {/* Modal de visualização da imagem */}
          {showImageModal && (
            <div
              ref={imageModalRef}
              className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
              onClick={() => setShowImageModal(false)}
            >
              <img
                src={event.image}
                alt={event.title}
                className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl border-4 border-white pointer-events-auto"
                style={{ 
                  objectPosition: 'center center',
                  filter: 'contrast(1.02) saturate(1.05) brightness(1.02)',
                  WebkitBackfaceVisibility: 'hidden',
                  backfaceVisibility: 'hidden',
                  maxWidth: '95vw',
                  maxHeight: '85vh'
                }}
                loading="eager"
              />
              <button
                className="absolute top-4 right-4 text-white text-3xl font-bold bg-pink-600 rounded-full px-3 py-1 hover:bg-pink-700 transition pointer-events-auto"
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
            <div className="text-sm mb-2 text-white/90 drop-shadow-md font-medium">{event.location}</div>
            <div className="inline-block bg-pink-600 text-white px-3 py-1 rounded-full text-xs font-semibold mb-4">
              {event.dateLabel}
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-white/80" />
                <span className="text-xs text-white/90">Data: {formatDate(event.date)}</span>
              </div>
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-white/80 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-white/80">
                  <div className="font-medium mb-1">Local e Endereço:</div>
                  <div className="text-white/70 mb-1">{event.location}</div>
                  {event.addressDetailed && event.addressDetailed.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {event.addressDetailed.map((line, idx) => (
                        <span key={idx} className="text-white/70 bg-white/10 px-2 py-1 rounded">{line}</span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-white/70">{event.address}</div>
                  )}
                </div>
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
            // Track purchase intent
            trackPurchaseFlow.purchaseIntent(
              event.id,
              'ticket_selection',
              0
            );
            
            setShowTicketModal(true);
          }}
          disabled={loading}
        >
          {loading ? (
            <ProfessionalLoader size="sm" />
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
              <h1 className="text-xl font-bold mb-4 leading-tight text-gray-800" style={{ fontWeight: 700 }}>
                {event.title}
              </h1>
              <div className="text-sm mb-2 text-gray-700 font-medium">{event.location}</div>
              <div className="inline-block bg-pink-600 text-white px-3 py-1 rounded-full text-xs font-semibold mb-4">
                {event.dateLabel}
              </div>
              <div className="space-y-2 mb-6">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-700">Data: {formatDate(event.date)}</span>
                </div>
                <div className="flex items-start space-x-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-gray-600">
                    <div className="font-medium mb-1">Local e Endereço:</div>
                    <div className="text-gray-700 mb-1">{event.location}</div>
                    {event.addressDetailed && event.addressDetailed.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {event.addressDetailed.map((line, idx) => (
                          <span key={idx} className="text-gray-500 bg-gray-100 px-2 py-1 rounded text-xs">{line}</span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500">{event.address}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-700">Abertura dos portões: {formatTime(event.time)}</span>
                </div>
              </div>
              {/* Botão de compra em mobile */}
              <button
                className="w-full py-3 px-4 bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition-colors font-bold text-base shadow-md flex items-center justify-center"
                onClick={() => {
                  // Track purchase intent
                  trackPurchaseFlow.purchaseIntent(
                    event.id,
                    'ticket_selection',
                    0
                  );
                  
                  setShowTicketModal(true);
                }}
                disabled={loading}
              >
                {loading ? (
                  <ProfessionalLoader size="sm" />
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
                        : 'text-gray-800 hover:bg-gray-50 border-l-4 border-transparent'
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
                  <h2 className="text-xl font-semibold mb-4 text-gray-800">INFORMAÇÕES</h2>
                  {getTabContent('informacoes')}
                </div>

                {/* Mapa de rota inline (Mapbox) */}
                <div className="transition-all duration-500">
                  <h2 className="text-xl font-semibold mb-4 text-gray-800">COMO CHEGAR</h2>
                  <MapInline destinationAddress={event.addressDetailed && event.addressDetailed.length > 0 ? event.addressDetailed.join(', ') : event.address} />
                </div>

                <div
                  id="setores-e-areas"
                  ref={el => sectionRefs.current['setores-e-areas'] = el}
                  className="transition-all duration-500"
                >
                  <h2 className="text-xl font-semibold mb-4 text-gray-800">SETORES E ÁREAS</h2>
                  {getTabContent('setores-e-areas')}
                </div>

                <div
                  id="atracoes"
                  ref={el => sectionRefs.current['atracoes'] = el}
                  className="transition-all duration-500"
                >
                  <h2 className="text-xl font-semibold mb-4 text-gray-800">ATRAÇÕES</h2>
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

      {/* Login Modal */}
      <LoginPromptModal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        eventTitle={event?.title}
      />

      {/* Ticket Selector Modal */}
      <TicketSelectorModal
        isOpen={showTicketModal}
        onClose={() => setShowTicketModal(false)}
        tickets={availableTickets}
        event={{
          id: event.id,
          title: event.title,
          date: event.date,
          location: event.location,
          image: event.image
        }}
        user={user}
      />

      {/* Barra Flutuante de Compra */}
      {showFloatingBar && event && (
        <>
          {/* Popup de Compra */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-40 transform transition-all duration-300 ease-in-out">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            {/* Informações do Evento */}
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <img 
                src={event.image} 
                alt={event.title}
                className="w-12 h-12 object-cover rounded-lg shadow-sm"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-900 truncate">
                  {event.title}
                </h4>
                <div className="flex items-center space-x-2 text-xs text-gray-600">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(event.date)}</span>
                  <span>•</span>
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{event.location}</span>
                </div>
              </div>
            </div>

            {/* Preço e Botão */}
            <div className="flex items-center space-x-4 ml-4">
              {availableTickets.length > 0 && (
                <div className="text-right">
                  <div className="text-xs text-gray-500">A partir de</div>
                  <div className="text-sm font-bold text-gray-900">
                    R$ {Math.min(...availableTickets.map(t => t.price)).toFixed(2).replace('.', ',')}
                  </div>
                </div>
              )}
              <button
                onClick={() => setShowTicketModal(true)}
                className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white px-6 py-2 rounded-lg font-medium text-sm transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 whitespace-nowrap"
              >
                Comprar Ingresso
              </button>
            </div>
          </div>
          </div>
        </>
      )}

    </div>
  );
};

export default EventPage;