import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Chrome, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const redirectRoute = await login(email, password);
      navigate(redirectRoute);
    } catch (err: any) {
      console.error(err);
      if (err instanceof Error) {
        if (err.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos.');
        } else if (err.message.includes('Email not confirmed')) {
          setError('Por favor, confirme seu email antes de fazer login.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Erro inesperado. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');

    try {
      const redirectRoute = await loginWithGoogle();
      navigate(redirectRoute);
    } catch (err: any) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro inesperado. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-8 transition-colors"
        >
          <img
            src="https://i.postimg.cc/YSKSHFBw/PULAKATACA-removebg-preview-1.png"
            alt="Logo PULACATRACA"
            className="h-24 md:h-32 lg:h-40 w-auto mx-auto mb-6"
          />
        </Link>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              {showEmailForm ? 'Acessar Conta' : 'Bem-vindo de volta'}
            </h1>
            <p className="text-gray-600">
              {showEmailForm 
                ? 'Digite suas credenciais para acessar sua conta' 
                : 'Escolha como deseja acessar sua conta'
              }
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {!showEmailForm ? (
            <div className="space-y-4">
              {/* Email Login Button */}
              <button
                onClick={() => setShowEmailForm(true)}
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-3 py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Mail className="h-5 w-5 text-gray-600" />
                <span className="text-gray-700">Acessar com email</span>
              </button>

              {/* Google Login Button */}
              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-3 py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Chrome className="h-5 w-5 text-gray-600" />
                <span className="text-gray-700">
                  {isLoading ? 'Entrando...' : 'Acessar com Google'}
                </span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => {
                  setShowEmailForm(false);
                  setError('');
                }}
                className="text-pink-600 hover:text-pink-700 text-sm mb-4"
              >
                ← Voltar
              </button>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
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

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Senha
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="Digite sua senha"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>
            </div>
          )}

          {/* Register Link */}
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Ainda não possui uma conta?{' '}
              <Link to="/register" className="text-pink-600 hover:text-pink-700 font-medium">
                Cadastre-se
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;