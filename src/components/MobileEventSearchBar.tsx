import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

const MobileEventSearchBar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = () => {
    if (searchQuery.trim().length > 0) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="md:hidden w-full py-4 bg-white border-b shadow z-50">
      <form
        className="flex w-full px-2 gap-2"
        onSubmit={e => {
          e.preventDefault();
          handleSearch();
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Digite o evento que procura"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-base"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="px-4 py-3 bg-pink-600 text-white rounded-r-lg hover:bg-pink-700 transition-colors flex items-center justify-center text-base"
          aria-label="Buscar"
        >
          <Search className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
};

export default MobileEventSearchBar; 