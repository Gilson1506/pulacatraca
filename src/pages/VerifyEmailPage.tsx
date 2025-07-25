import React from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';

const VerifyEmailPage = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <img
            className="mx-auto h-24 w-auto"
            src="/logo-com-qr.png"
            alt="PULACATRACA"
          />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Verifique seu Email
          </h2>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="flex justify-center mb-6">
            <Mail className="h-16 w-16 text-pink-600" />
          </div>

          <div className="text-center space-y-4">
            <p className="text-lg text-gray-700">
              Enviamos um link de confirmação para o seu email.
            </p>
            <p className="text-gray-600">
              Por favor, clique no link enviado para confirmar sua conta.
            </p>
            <p className="text-sm text-gray-500">
              Não recebeu o email? Verifique sua pasta de spam.
            </p>
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/login"
              className="text-pink-600 hover:text-pink-700 font-medium"
            >
              Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage; 