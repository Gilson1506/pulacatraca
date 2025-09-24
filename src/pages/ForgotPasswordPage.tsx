import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      setSuccess(true);
    } catch (err: any) {
      console.error('Erro ao enviar email de recuperação:', err);
      if (err.message?.includes('User not found')) {
        setError('Email não encontrado. Verifique se está correto.');
      } else {
        setError('Erro ao enviar email de recuperação. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-100 flex items-center justify-center py-4 px-4">
      <div className="max-w-md w-full flex flex-col justify-center">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center justify-center text-gray-600 hover:text-gray-800 mb-6 transition-colors"
        >
          <img
            src="https://i.postimg.cc/YSKSHFBw/PULAKATACA-removebg-preview-1.png"
            alt="Logo PULACATRACA"
            className="h-32 sm:h-40 md:h-48 w-auto"
          />
        </Link>

        {/* Forgot Password Card */}
        <div className="bg-white rounded-lg shadow-md p-6 w-full">
          <div className="text-center mb-6">
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Recuperar Senha
            </h1>
            <p className="text-sm text-gray-600">
              Digite seu email para receber um link de recuperação
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {success ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Email enviado!
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Enviamos um link de recuperação para <strong>{email}</strong>
                </p>
                <p className="text-xs text-gray-500">
                  Verifique sua caixa de entrada e pasta de spam
                </p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setSuccess(false);
                    setEmail('');
                    setError('');
                  }}
                  className="w-full py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
                >
                  Enviar para outro email
                </button>
                <Link
                  to="/login"
                  className="block w-full py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Voltar para o login
                </Link>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="Digite seu email"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Enviando...' : 'Enviar link de recuperação'}
                </button>
              </form>

              {/* Back to Login */}
              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar para o login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
