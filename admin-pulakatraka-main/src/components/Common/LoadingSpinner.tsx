import React from 'react';

export default function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="relative mb-8">
          <div className="animate-pulse">
            <img 
              src="https://i.postimg.cc/gkmcWg5B/PULAKATACA-removebg-preview-1.png" 
              alt="PULACATRACA" 
              className="h-24 w-auto mx-auto opacity-90"
            />
          </div>
          
          {/* Animated circles around logo */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 border-2 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-40 h-40 border border-blue-100 rounded-full animate-ping"></div>
          </div>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">PULACATRACA</h2>
          <p className="text-gray-600 font-medium">Carregando painel administrativo</p>
          
          {/* Animated dots */}
          <div className="flex justify-center space-x-1">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}