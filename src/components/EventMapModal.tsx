import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { X, Navigation, MapPin, ExternalLink, ArrowUp, ArrowRight, ArrowLeft, ArrowDown, RotateCcw, ArrowUpRight, ArrowUpLeft, ArrowDownRight, ArrowDownLeft, Play, Pause, SkipForward, SkipBack } from 'lucide-react';

// Configurar token do Mapbox
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

interface EventMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventAddress: string;
  eventName: string;
  eventLocation?: {
    lat?: number;
    lng?: number;
  };
}

const EventMapModal: React.FC<EventMapModalProps> = ({
  isOpen,
  onClose,
  eventAddress,
  eventName,
  eventLocation
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [eventCoords, setEventCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [routeInstructions, setRouteInstructions] = useState<any[]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [showNavigation, setShowNavigation] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Geocodificar endereço do evento
  const geocodeAddress = async (address: string) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxgl.accessToken}&country=BR&limit=1`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        return { lat, lng };
      }
      return null;
    } catch (error) {
      console.error('Erro ao geocodificar endereço:', error);
      return null;
    }
  };

  // Obter localização do usuário
  const getUserLocation = () => {
    setIsLoadingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocalização não é suportada pelo seu navegador');
      setIsLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setIsLoadingLocation(false);
      },
      (error) => {
        console.error('Erro ao obter localização:', error);
        setLocationError('Não foi possível obter sua localização');
        setIsLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  // Inicializar mapa
  useEffect(() => {
    if (!isOpen || !mapContainer.current) return;

    // Inicializar o mapa
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-43.1729, -22.9068], // Rio de Janeiro como centro padrão
      zoom: 10
    });

    // Adicionar controles de navegação
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Obter localização do usuário
    getUserLocation();

    // Geocodificar endereço do evento
    if (eventLocation?.lat && eventLocation?.lng) {
      setEventCoords(eventLocation);
    } else {
      geocodeAddress(eventAddress).then((coords) => {
        if (coords) {
          setEventCoords(coords);
        }
      });
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [isOpen, eventAddress, eventLocation]);

  // Adicionar marcadores e rota quando as localizações estiverem disponíveis
  useEffect(() => {
    if (!map.current || !userLocation || !eventCoords) return;

    // Remover marcadores existentes
    const existingMarkers = document.querySelectorAll('.mapboxgl-marker');
    existingMarkers.forEach(marker => marker.remove());

    // Adicionar marcador da localização do usuário
    const userMarker = new mapboxgl.Marker({ color: '#3B82F6' })
      .setLngLat([userLocation.lng, userLocation.lat])
      .setPopup(new mapboxgl.Popup().setHTML('<div class="font-semibold">Sua localização</div>'))
      .addTo(map.current);

    // Adicionar marcador do evento
    const eventMarker = new mapboxgl.Marker({ color: '#EC4899' })
      .setLngLat([eventCoords.lng, eventCoords.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`<div class="font-semibold">${eventName}</div><div class="text-sm">${eventAddress}</div>`))
      .addTo(map.current);

    // Ajustar visualização para mostrar ambos os pontos
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend([userLocation.lng, userLocation.lat]);
    bounds.extend([eventCoords.lng, eventCoords.lat]);
    
    map.current.fitBounds(bounds, {
      padding: 50,
      maxZoom: 15
    });

    // Buscar e exibir rota
    getRoute();

  }, [userLocation, eventCoords, eventName, eventAddress]);

  // Obter rota entre usuário e evento
  const getRoute = async () => {
    if (!userLocation || !eventCoords || !map.current) return;

    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${userLocation.lng},${userLocation.lat};${eventCoords.lng},${eventCoords.lat}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`
      );
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];

        // Extrair informações da rota
        const distance = (route.distance / 1000).toFixed(1) + ' km';
        const duration = Math.round(route.duration / 60) + ' min';
        setRouteInfo({ distance, duration });

        // Extrair instruções de navegação
        const steps = route.legs[0]?.steps || [];
        const instructions = steps.map((step: any, index: number) => ({
          id: index,
          instruction: step.maneuver?.instruction || 'Continue',
          distance: step.distance ? (step.distance / 1000).toFixed(1) + ' km' : '',
          duration: step.duration ? Math.round(step.duration / 60) + ' min' : '',
          type: step.maneuver?.type || 'straight',
          modifier: step.maneuver?.modifier || '',
          coordinates: step.maneuver?.location || []
        }));
        setRouteInstructions(instructions);

        // Adicionar rota ao mapa
        if (map.current.getSource('route')) {
          map.current.removeLayer('route');
          map.current.removeSource('route');
        }

        map.current.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: route.geometry
          }
        });

        map.current.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#EC4899',
            'line-width': 4,
            'line-opacity': 0.8
          }
        });
      }
    } catch (error) {
      console.error('Erro ao obter rota:', error);
    }
  };

  // Iniciar navegação interna
  const startNavigation = () => {
    setShowNavigation(true);
    setCurrentStepIndex(0);
  };

  // Parar navegação
  const stopNavigation = () => {
    setShowNavigation(false);
    setCurrentStepIndex(0);
  };

  // Próximo passo
  const nextStep = () => {
    if (currentStepIndex < routeInstructions.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      focusOnStep(currentStepIndex + 1);
    }
  };

  // Passo anterior
  const previousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      focusOnStep(currentStepIndex - 1);
    }
  };

  // Focar no passo atual no mapa
  const focusOnStep = (stepIndex: number) => {
    if (!map.current || !routeInstructions[stepIndex]?.coordinates) return;
    
    const coords = routeInstructions[stepIndex].coordinates;
    map.current.flyTo({
      center: coords,
      zoom: 16,
      duration: 1000
    });
  };

  // Obter ícone de direção
  const getDirectionIcon = (type: string, modifier: string) => {
    const iconProps = { className: "h-5 w-5" };
    
    switch (type) {
      case 'turn':
        if (modifier.includes('right')) return <ArrowRight {...iconProps} />;
        if (modifier.includes('left')) return <ArrowLeft {...iconProps} />;
        return <ArrowUp {...iconProps} />;
      case 'merge':
        if (modifier.includes('right')) return <ArrowUpRight {...iconProps} />;
        if (modifier.includes('left')) return <ArrowUpLeft {...iconProps} />;
        return <ArrowUp {...iconProps} />;
      case 'roundabout':
        return <RotateCcw {...iconProps} />;
      case 'arrive':
        return <MapPin {...iconProps} />;
      case 'depart':
        return <Play {...iconProps} />;
      default:
        return <ArrowUp {...iconProps} />;
    }
  };

  // Abrir navegação externa
  const openExternalNavigation = () => {
    if (!eventCoords) return;

    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Tentar abrir no Google Maps mobile
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${eventCoords.lat},${eventCoords.lng}`;
      window.open(googleMapsUrl, '_blank');
    } else {
      // Abrir no Google Maps web
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${eventCoords.lat},${eventCoords.lng}`;
      window.open(googleMapsUrl, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-pink-600" />
            <div>
              <h3 className="font-semibold text-gray-900">{eventName}</h3>
              <p className="text-sm text-gray-600">{eventAddress}</p>
              {routeInfo && (
                <p className="text-xs text-gray-500">{routeInfo.distance} • {routeInfo.duration}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Conteúdo principal */}
        <div className="flex-1 flex">
          {/* Mapa */}
          <div className={`relative ${showNavigation ? 'w-2/3' : 'w-full'} transition-all duration-300`}>
            <div ref={mapContainer} className="w-full h-full" />
          
          {/* Loading overlay */}
          {isLoadingLocation && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Obtendo sua localização...</p>
              </div>
            </div>
          )}

            {/* Error overlay */}
            {locationError && (
              <div className="absolute top-4 left-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <p className="text-sm">{locationError}</p>
                <button
                  onClick={getUserLocation}
                  className="text-sm underline mt-1"
                >
                  Tentar novamente
                </button>
              </div>
            )}
          </div>

          {/* Painel de Navegação */}
          {showNavigation && (
            <div className="w-1/3 border-l bg-gray-50 flex flex-col">
              {/* Header do painel */}
              <div className="p-4 border-b bg-white">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900">Navegação</h4>
                  <button
                    onClick={stopNavigation}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {routeInfo && (
                  <p className="text-sm text-gray-600 mt-1">
                    {routeInfo.distance} • {routeInfo.duration}
                  </p>
                )}
              </div>

              {/* Passo atual */}
              {routeInstructions.length > 0 && (
                <div className="p-4 bg-blue-50 border-b">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white">
                      {getDirectionIcon(routeInstructions[currentStepIndex]?.type, routeInstructions[currentStepIndex]?.modifier)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {routeInstructions[currentStepIndex]?.instruction}
                      </p>
                      {routeInstructions[currentStepIndex]?.distance && (
                        <p className="text-sm text-gray-600">
                          em {routeInstructions[currentStepIndex]?.distance}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Controles de navegação */}
                  <div className="flex justify-center space-x-2 mt-3">
                    <button
                      onClick={previousStep}
                      disabled={currentStepIndex === 0}
                      className="p-2 bg-white rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      <SkipBack className="h-4 w-4" />
                    </button>
                    <span className="px-3 py-2 bg-white rounded-lg shadow text-sm font-medium">
                      {currentStepIndex + 1} de {routeInstructions.length}
                    </span>
                    <button
                      onClick={nextStep}
                      disabled={currentStepIndex === routeInstructions.length - 1}
                      className="p-2 bg-white rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      <SkipForward className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Lista de instruções */}
              <div className="flex-1 overflow-y-auto">
                {routeInstructions.map((step, index) => (
                  <div
                    key={step.id}
                    className={`p-3 border-b cursor-pointer hover:bg-white transition-colors ${
                      index === currentStepIndex ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => {
                      setCurrentStepIndex(index);
                      focusOnStep(index);
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        index === currentStepIndex ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {getDirectionIcon(step.type, step.modifier)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${
                          index === currentStepIndex ? 'font-medium text-gray-900' : 'text-gray-700'
                        }`}>
                          {step.instruction}
                        </p>
                        {step.distance && (
                          <p className="text-xs text-gray-500">{step.distance}</p>
                        )}
                      </div>
                      {index === currentStepIndex && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer com botões */}
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {userLocation && eventCoords && !showNavigation && (
              <span>Rota calculada • Clique no endereço para navegar</span>
            )}
            {showNavigation && (
              <span>Navegação ativa • Use as setas para navegar pelos passos</span>
            )}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={getUserLocation}
              disabled={isLoadingLocation}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              <Navigation className="h-4 w-4" />
              <span>Minha Localização</span>
            </button>
            
            {routeInstructions.length > 0 && !showNavigation && (
              <button
                onClick={startNavigation}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <Play className="h-4 w-4" />
                <span>Iniciar Navegação</span>
              </button>
            )}
            
            {showNavigation && (
              <button
                onClick={stopNavigation}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
              >
                <Pause className="h-4 w-4" />
                <span>Parar Navegação</span>
              </button>
            )}
            
            <button
              onClick={openExternalNavigation}
              disabled={!eventCoords}
              className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Google Maps</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventMapModal;