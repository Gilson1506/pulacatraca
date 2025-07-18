import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LocationModal from './LocationModal';

const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('Qualquer lugar');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleLocationSelect = (location: string) => {
    setSelectedLocation(location);
    setIsLocationModalOpen(false);
  };

  return (
    <>
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4">
          {/* Desktop Header */}
          <div className="hidden md:flex items-center justify-between h-20 w-full">
            <div className="flex items-center flex-shrink-0">
              <Link to="/" className="flex items-center">
                <img
                  src="https://i.postimg.cc/gkmcWg5B/PULAKATACA-removebg-preview-1.png"
                  alt="Logo PULACATRACA"
                  className="h-20 md:h-28 lg:h-32 w-auto cursor-pointer max-h-40"
                  onClick={() => navigate('/')}
                />
              </Link>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center px-4">
              <div className="flex w-full max-w-xl items-center gap-2">
                <form className="flex w-full" onSubmit={e => e.preventDefault()}>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Digite o evento que procura"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (searchQuery.trim().length > 0) {
                        navigate(`/search?q=${encodeURIComponent(searchQuery)}&location=${encodeURIComponent(selectedLocation)}`);
                      }
                    }}
                    className="px-4 py-2 bg-pink-600 text-white rounded-r-lg hover:bg-pink-700 transition-colors flex items-center justify-center"
                    aria-label="Buscar"
                  >
                    <Search className="h-5 w-5" />
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-white hover:bg-gray-50 transition-colors min-w-[180px] justify-center rounded-lg text-sm"
                >
                  <MapPin className="h-4 w-4 text-pink-600" />
                  <span className="text-gray-700 truncate">{selectedLocation}</span>
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4 flex-shrink-0">
              {user ? (
                <div className="flex items-center space-x-4">
                  <Link to="/profile" className="flex items-center space-x-2 text-gray-700 hover:text-pink-600 transition-colors">
                    <User className="h-5 w-5" />
                    <span>{user.name}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-gray-600 hover:text-pink-600 transition-colors"
                  >
                    Sair
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  {/* Link para cadastro de evento */}
                  <Link
                    to="/organizer-register"
                    className="ml-0 mr-4 px-4 py-2 bg-pink-100 text-pink-700 rounded-full font-semibold hover:bg-pink-200 transition-colors whitespace-nowrap"
                  >
                    Cadastre o seu evento
                  </Link>
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-pink-600 transition-colors font-medium"
                  >
                    MINHA CONTA
                  </Link>
                  <Link
                    to="/register"
                    className="px-6 py-2 bg-pink-600 text-white rounded-full hover:bg-pink-700 transition-colors font-medium"
                  >
                    CADASTRAR
                  </Link>
                </div>
              )}
            </div>
          </div>
          {/* Mobile Header */}
          <div className="flex md:hidden items-center justify-between h-20 w-full">
            <div className="flex-1 flex justify-start"> {/* alinhamento à esquerda no mobile */}
              <Link to="/" className="flex items-center">
                <img
                  src="https://i.postimg.cc/gkmcWg5B/PULAKATACA-removebg-preview-1.png"
                  alt="Logo PULACATRACA"
                  className="h-28 sm:h-32 w-auto cursor-pointer max-h-32 ml-0" // h-20 -> h-28 (aumento de ~30%)
                  onClick={() => navigate('/')}
                />
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              className="p-2 rounded-full hover:bg-gray-100 focus:outline-none"
              aria-label="Abrir ou fechar menu"
            >
              <User className="h-7 w-7 text-pink-600" />
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200">
              <div className="mb-4">
                {/* Campo de busca removido do menu mobile */}
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(true)}
                  className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <MapPin className="h-4 w-4 text-pink-600" />
                  <span className="truncate">{selectedLocation}</span>
                </button>
              </div>
              <div className="space-y-2">
                {!user && (
                  <Link
                    to="/organizer-register"
                    className="block py-2 px-4 bg-pink-100 text-pink-700 rounded-full font-semibold hover:bg-pink-200 transition-colors text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Cadastre o seu evento
                  </Link>
                )}
                {user ? (
                  <>
                    <Link
                      to="/profile"
                      className="flex items-center space-x-2 py-2 text-gray-700 hover:text-pink-600 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User className="h-5 w-5" />
                      <span>{user.name}</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left py-2 text-gray-600 hover:text-pink-600 transition-colors"
                    >
                      Sair
                    </button>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Link
                      to="/login"
                      className="block py-2 text-gray-700 hover:text-pink-600 transition-colors font-medium"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      MINHA CONTA
                    </Link>
                    <Link
                      to="/register"
                      className="block py-2 px-4 bg-pink-600 text-white rounded-full hover:bg-pink-700 transition-colors text-center font-medium"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      CADASTRAR
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onLocationSelect={handleLocationSelect}
        currentLocation={selectedLocation}
      />
    </>
  );
};

export default Header;