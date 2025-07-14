import React, { useState } from 'react';
import { X, MapPin } from 'lucide-react';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (location: string) => void;
  currentLocation: string;
}

const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  onClose,
  onLocationSelect,
  currentLocation
}) => {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');

  const countries = [
    { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
    { code: 'US', name: 'Estados Unidos', flag: '🇺🇸' },
    { code: 'ES', name: 'Espanha', flag: '🇪🇸' }
  ];

  const states = {
    BR: [
      'Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará', 'Distrito Federal',
      'Espírito Santo', 'Goiás', 'Maranhão', 'Mato Grosso', 'Mato Grosso do Sul',
      'Minas Gerais', 'Pará', 'Paraíba', 'Paraná', 'Pernambuco', 'Piauí',
      'Rio de Janeiro', 'Rio Grande do Norte', 'Rio Grande do Sul', 'Rondônia',
      'Roraima', 'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantins'
    ],
    US: [
      'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
      'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
      'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
      'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
      'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
      'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
      'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
      'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
      'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
      'West Virginia', 'Wisconsin', 'Wyoming'
    ],
    ES: [
      'Andalucía', 'Aragón', 'Asturias', 'Baleares', 'Canarias', 'Cantabria',
      'Castilla-La Mancha', 'Castilla y León', 'Cataluña', 'Comunidad Valenciana',
      'Extremadura', 'Galicia', 'La Rioja', 'Madrid', 'Murcia', 'Navarra', 'País Vasco'
    ]
  };

  const handleApplyFilter = () => {
    if (selectedCountry && selectedState) {
      const country = countries.find(c => c.code === selectedCountry);
      onLocationSelect(`${selectedState}, ${country?.name}`);
    } else if (selectedCountry) {
      const country = countries.find(c => c.code === selectedCountry);
      onLocationSelect(country?.name || 'Qualquer lugar');
    } else {
      onLocationSelect('Qualquer lugar');
    }
  };

  const handleReset = () => {
    setSelectedCountry('');
    setSelectedState('');
    onLocationSelect('Qualquer lugar');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Selecionar Localização</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Location */}
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4" />
            <span>Localização atual: {currentLocation}</span>
          </div>

          {/* Country Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              País
            </label>
            <div className="space-y-2">
              {countries.map((country) => (
                <button
                  key={country.code}
                  onClick={() => {
                    setSelectedCountry(country.code);
                    setSelectedState('');
                  }}
                  className={`w-full flex items-center space-x-3 p-3 border rounded-lg transition-colors ${
                    selectedCountry === country.code
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{country.flag}</span>
                  <span>{country.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* State Selection */}
          {selectedCountry && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado/Província
              </label>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {states[selectedCountry as keyof typeof states]?.map((state) => (
                  <button
                    key={state}
                    onClick={() => setSelectedState(state)}
                    className={`w-full text-left p-2 rounded hover:bg-gray-100 transition-colors ${
                      selectedState === state ? 'bg-pink-50 text-pink-600' : ''
                    }`}
                  >
                    {state}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t">
            <button
              onClick={handleReset}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Limpar
            </button>
            <button
              onClick={handleApplyFilter}
              className="flex-1 py-2 px-4 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
            >
              Aplicar Filtro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationModal;