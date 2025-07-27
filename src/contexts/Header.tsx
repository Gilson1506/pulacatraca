import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useSearch } from './SearchContext';
import LocationModal from '../components/LocationModal';
import { Search, MapPin, User, Menu, X } from 'lucide-react';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { searchQuery, setSearchQuery, selectedLocation, setSelectedLocation } = useSearch();
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearch = () => {
    if (searchQuery) {
      setSelectedLocation(searchQuery);
      setSearchQuery('');
      setIsLocationModalOpen(false);
    }
  };

  const handleLocationClick = () => {
    setIsLocationModalOpen(true);
  };

  const handleLocationSelect = (location: string) => {
    setSelectedLocation(location);
    setSearchQuery(location);
    setIsLocationModalOpen(false);
  };

  const handleCloseLocationModal = () => {
    setIsLocationModalOpen(false);
  };

  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="flex items-center">
          <h1 className="text-2xl font-bold text-gray-800">Pulacatraca</h1>
        </Link>

        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar localização..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
          </div>

          <button
            onClick={handleLocationClick}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <MapPin className="h-6 w-6 text-gray-600" />
          </button>

          <div className="relative">
            <button
              onClick={handleLogout}
              className="p-2 rounded-md hover:bg-gray-100"
            >
              <User className="h-6 w-6 text-gray-600" />
            </button>
          </div>

          <button className="p-2 rounded-md hover:bg-gray-100">
            <Menu className="h-6 w-6 text-gray-600" />
          </button>
        </div>
      </div>

      {isLocationModalOpen && (
        <LocationModal
          isOpen={isLocationModalOpen}
          onClose={handleCloseLocationModal}
          onSelect={handleLocationSelect}
          selectedLocation={selectedLocation}
        />
      )}
    </header>
  );
};

export default Header; 