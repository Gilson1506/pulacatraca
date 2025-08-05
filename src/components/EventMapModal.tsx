import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { X, Navigation, MapPin, ExternalLink } from 'lucide-react';

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
      <div className="bg-white rounded-xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-pink-600" />
            <div>
              <h3 className="font-semibold text-gray-900">{eventName}</h3>
              <p className="text-sm text-gray-600">{eventAddress}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mapa */}
        <div className="flex-1 relative">
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

        {/* Footer com botões */}
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {userLocation && eventCoords && (
              <span>Rota calculada • Toque nos marcadores para mais informações</span>
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
            <button
              onClick={openExternalNavigation}
              disabled={!eventCoords}
              className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Navegar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventMapModal;