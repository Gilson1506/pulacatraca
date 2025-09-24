import React, { useState } from 'react';
import { useSearch } from '../contexts/SearchContext';
import { Search, MapPin } from 'lucide-react';
import LocationModal from './LocationModal';

const MobileEventSearchBar = () => {
  const { selectedLocation, setSelectedLocation } = useSearch();
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const handleSearch = () => {
    // Navegar para a página de busca
    window.location.href = '/search';
  };

  const handleLocationClick = () => {
    setIsLocationModalOpen(true);
  };

  const handleLocationSelect = (location: string) => {
    setSelectedLocation(location);
    setIsLocationModalOpen(false);
  };

  return (
    <div className="md:hidden w-full bg-white border-b shadow">
      <div className="flex w-full px-2 py-2 gap-2">
        {/* Botão de filtro/localização */}
        <button
          type="button"
          onClick={handleLocationClick}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors rounded-lg text-sm"
        >
          <MapPin className="h-4 w-4 text-pink-600" />
          <span className="text-pink-600 truncate">{selectedLocation}</span>
        </button>
        
        {/* Botão de pesquisa - posicionado à direita */}
        <div className="ml-auto">
          <button
            type="button"
            onClick={handleSearch}
            className="p-3 text-pink-600 hover:text-pink-700 transition-colors"
            aria-label="Abrir página de busca"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Modal de localização */}
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onLocationSelect={handleLocationSelect}
        currentLocation={selectedLocation}
      />
    </div>
  );
};

export default MobileEventSearchBar; 