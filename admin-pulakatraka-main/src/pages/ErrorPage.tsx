import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function ErrorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const errorMessage = searchParams.get('message') || 'Ocorreu um erro inesperado.';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <div>
          <h1 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            PULACATRACA
          </h1>
          <h2 className="mt-6 text-center text-2xl font-bold text-red-600 dark:text-red-400">
            Erro de Configuração
          </h2>
          <div className="mt-4 text-center text-gray-600 dark:text-gray-300">
            {errorMessage}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Verifique se todas as variáveis de ambiente estão configuradas corretamente no Vercel.
          </p>
          <div className="flex justify-center">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Voltar para o início
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 