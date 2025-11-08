import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SearchContextData {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedLocation: string;
  setSelectedLocation: (location: string) => void;
}

const SearchContext = createContext<SearchContextData>({} as SearchContextData);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('Qualquer lugar');

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        selectedLocation,
        setSelectedLocation,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch(): SearchContextData {
  const context = useContext(SearchContext);

  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }

  return context;
} 