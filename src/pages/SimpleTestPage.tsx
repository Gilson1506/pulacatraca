import React, { useEffect } from 'react';

const SimpleTestPage = () => {
  useEffect(() => {
    console.log('🧪 SimpleTestPage carregada!', new Date().toISOString());
    alert('✅ SimpleTestPage funcionando! Deploy V2.0 confirmado!');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md mx-4 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          🚀 DEPLOY V2.0
        </h1>
        <div className="space-y-4">
          <div className="bg-green-100 border border-green-500 rounded-lg p-4">
            <p className="text-green-800 font-semibold">✅ Deploy Funcionando!</p>
            <p className="text-green-600 text-sm mt-1">
              Timestamp: {new Date().toLocaleString('pt-BR')}
            </p>
          </div>
          
          <div className="bg-pink-100 border border-pink-500 rounded-lg p-4">
            <p className="text-pink-800 font-semibold">🎯 Melhorias Check-in</p>
            <p className="text-pink-600 text-sm mt-1">
              Scanner QR melhorado disponível
            </p>
          </div>
          
          <button
            onClick={() => {
              window.location.href = '/checkin-test';
            }}
            className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-pink-700 hover:to-purple-700 transition-all duration-200 font-semibold w-full"
          >
            🧪 Testar Check-in V2.0
          </button>
          
          <button
            onClick={() => {
              console.log('🔍 Logs de debug:', {
                url: window.location.href,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent
              });
              alert('Verifique o console para logs detalhados!');
            }}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-all duration-200 text-sm w-full"
          >
            🔍 Debug Info
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleTestPage;