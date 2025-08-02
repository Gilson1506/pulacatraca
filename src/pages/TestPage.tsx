import React from 'react';

const TestPage = () => {
  const timestamp = new Date().toISOString();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-2xl p-8 text-center max-w-md mx-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          🚀 TESTE V2.0
        </h1>
        
        <div className="space-y-4">
          <div className="bg-green-100 border-2 border-green-500 rounded-lg p-4">
            <p className="text-green-800 font-bold text-xl">✅ FUNCIONANDO!</p>
            <p className="text-green-600 text-sm mt-2">
              {timestamp}
            </p>
          </div>
          
          <div className="bg-pink-100 border-2 border-pink-500 rounded-lg p-4">
            <p className="text-pink-800 font-bold">Deploy Confirmed</p>
            <p className="text-pink-600 text-sm">
              Página criada: {timestamp.slice(0, 19)}
            </p>
          </div>
          
          <button
            onClick={() => {
              alert(`Deploy funcionando! Timestamp: ${timestamp}`);
            }}
            className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-3 rounded-lg font-bold w-full hover:from-pink-700 hover:to-purple-700 transition-all"
          >
            🧪 Testar Botão
          </button>
          
          <a
            href="/checkin"
            className="block bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-all"
          >
            ➡️ Ir para Check-in V2
          </a>
        </div>
      </div>
    </div>
  );
};

export default TestPage;