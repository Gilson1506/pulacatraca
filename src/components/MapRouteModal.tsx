import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  destinationAddress: string;
}

const MapRouteModal: React.FC<MapRouteModalProps> = ({ isOpen, onClose, destinationAddress }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const token =
    (import.meta as any).env?.VITE_MAPBOX_ACCESS_TOKEN ||
    (import.meta as any).env?.VITE_MAPBOX_TOKEN ||
    '';

  useEffect(() => {
    if (!isOpen) return;
    if (!token) {
      setError('Mapbox token ausente. Defina VITE_MAPBOX_ACCESS_TOKEN (ou VITE_MAPBOX_TOKEN) no ambiente.');
      return;
    }
    setError(null);
    setLoading(true);

    let destLngLat: [number, number] | null = null;
    let userLngLat: [number, number] | null = null;

    const initialize = async () => {
      try {
        const geoUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destinationAddress)}.json?limit=1&access_token=${token}`;
        const geoRes = await fetch(geoUrl);
        const geoJson = await geoRes.json();
        if (!geoJson?.features?.length) return;
        const [lng, lat] = geoJson.features[0].center;
        destLngLat = [lng, lat];

        (mapboxgl as any).accessToken = token;
        mapRef.current = new mapboxgl.Map({
          container: containerRef.current as HTMLDivElement,
          style: 'mapbox://styles/mapbox/streets-v11',
          center: destLngLat,
          zoom: 14
        });

        new mapboxgl.Marker({ color: '#ec4899' }).setLngLat(destLngLat).addTo(mapRef.current);

        await new Promise<void>((resolve) => {
          if (!navigator.geolocation) return resolve();
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              userLngLat = [pos.coords.longitude, pos.coords.latitude];
              resolve();
            },
            () => resolve(),
            { enableHighAccuracy: true, timeout: 5000 }
          );
        });

        if (userLngLat && destLngLat) {
          const dirUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${userLngLat[0]},${userLngLat[1]};${destLngLat[0]},${destLngLat[1]}?geometries=geojson&access_token=${token}`;
          const dirRes = await fetch(dirUrl);
          const dirJson = await dirRes.json();
          const route = dirJson?.routes?.[0]?.geometry;
          if (route) {
            const addRoute = () => {
              if (!mapRef.current.getSource('route')) {
                mapRef.current.addSource('route', {
                  type: 'geojson',
                  data: { type: 'Feature', properties: {}, geometry: route }
                });
                mapRef.current.addLayer({ id: 'route-line', type: 'line', source: 'route', paint: { 'line-color': '#ec4899', 'line-width': 4 } });
              }
              const bounds = new (mapboxgl as any).LngLatBounds();
              route.coordinates.forEach((c: [number, number]) => bounds.extend(c));
              mapRef.current.fitBounds(bounds, { padding: 40 });
            };
            if (mapRef.current.loaded()) addRoute(); else mapRef.current.on('load', addRoute);
          }
          new mapboxgl.Marker({ color: '#3b82f6' }).setLngLat(userLngLat).addTo(mapRef.current);
        }
      } catch {}
      finally {
        setLoading(false);
      }
    };

    initialize();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isOpen, destinationAddress, token]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="relative bg-white rounded-xl shadow-xl w-full sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 rounded-full bg-white/90 hover:bg-white text-gray-700 shadow p-2"
          aria-label="Fechar"
        >
          ✕
        </button>
        <div className="h-[50vh] md:h-[60vh] lg:h-[70vh]" ref={containerRef} />
      </div>
    </div>
  );
};

export default MapRouteModal;