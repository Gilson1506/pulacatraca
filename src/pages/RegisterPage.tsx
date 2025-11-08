import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Chrome, CheckCircle, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { navigateToCheckoutWithState } from '../utils/checkoutNavigation';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Garantir que a página carregue do topo
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess(false);

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      setIsLoading(false);
      return;
    }

    try {
      const redirectRoute = await register(name, email, password);
      if (redirectRoute === '/checkout') {
        console.log('🛒 Navegando para checkout após registro');
        navigateToCheckoutWithState(navigate, { delay: 100, route: redirectRoute });
      } else {
        navigate(redirectRoute);
      }
    } catch (err: any) {
      console.error(err);
      if (err instanceof Error) {
        if (err.message.includes('User already registered')) {
          setError('Este email já está cadastrado.');
        } else if (err.message.includes('Password should be at least 6 characters')) {
          setError('A senha deve ter pelo menos 6 caracteres.');
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
      if (redirectRoute === '/checkout') {
        console.log('🛒 Navegando para checkout após login com Google (registro)');
        navigateToCheckoutWithState(navigate, { delay: 100, route: redirectRoute });
      } else {
        navigate(redirectRoute);
      }
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
    <div className="min-h-screen bg-gray-100 flex items-start sm:items-center justify-center py-2 sm:py-4 px-4 sm:py-8 overflow-auto">
      <div className="max-w-md w-full my-auto flex flex-col justify-center min-h-0">
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

        {/* Register Card */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 md:p-8 w-full max-h-screen overflow-y-auto">
          <div className="text-center mb-4 sm:mb-6 md:mb-8">
            <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 mb-2">Criar Conta</h1>
            <p className="text-sm sm:text-base text-gray-600">
              Crie sua conta para acessar os melhores eventos
            </p>
          </div>

          {error && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 flex-shrink-0" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
              <p className="text-green-600 text-sm">Conta criada com sucesso!</p>
            </div>
          )}

          <div className="space-y-3 sm:space-y-4">
            {/* Google Register Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-3 py-2.5 sm:py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Chrome className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
              <span className="text-sm sm:text-base text-gray-700">
                {isLoading ? 'Registrando...' : 'Registrar com Google'}
              </span>
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">ou</span>
              </div>
            </div>

            {/* Email Registration Form */}
            <form onSubmit={handleRegister} className="space-y-3 sm:space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nome completo
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="mt-1 block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="Digite seu nome completo"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1 block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="Digite seu email"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Senha
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="Digite sua senha"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirmar senha
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="Confirme sua senha"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 sm:py-3 px-4 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Criando conta...' : 'Criar conta'}
              </button>
            </form>
          </div>

          {/* Login Link */}
          <div className="mt-6 sm:mt-8 text-center">
            <p className="text-sm sm:text-base text-gray-600">
              Já possui uma conta?{' '}
              <Link to="/login" className="text-pink-600 hover:text-pink-700 font-medium">
                Faça login
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-6 sm:mt-8 text-center space-x-4">
          <Link to="/terms" className="text-gray-500 hover:text-gray-700 text-sm">
            Termos de uso
          </Link>
          <Link to="/privacy" className="text-gray-500 hover:text-gray-700 text-sm">
            Política de privacidade
          </Link>
        </div>

        {/* Language Flags */}
        <div className="mt-3 sm:mt-4 flex justify-center space-x-2">
          <span className="text-xl sm:text-2xl">🇧🇷</span>
          <span className="text-xl sm:text-2xl">🇺🇸</span>
          <span className="text-xl sm:text-2xl">🇪🇸</span>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;