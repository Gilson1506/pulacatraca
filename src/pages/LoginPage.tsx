import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Chrome, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { navigateToCheckoutWithState } from '../utils/checkoutNavigation';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const { login, loginWithGoogle, user, loading, getDashboardRoute } = useAuth();
  const navigate = useNavigate();

  // Garantir que a página carregue do topo
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Redirecionar usuários já autenticados
  useEffect(() => {
    if (!loading && user) {
      console.log('🔐 Usuário já autenticado, redirecionando para dashboard...');
      const dashboardRoute = getDashboardRoute();
      navigate(dashboardRoute, { replace: true });
    }
  }, [user, loading, navigate, getDashboardRoute]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const redirectRoute = await login(email, password);
      console.log('🔐 LoginPage - Rota retornada do login:', redirectRoute);

      if (redirectRoute === '/checkout') {
        console.log('🛒 Navegando para checkout após login');
        navigateToCheckoutWithState(navigate, { delay: 100, route: redirectRoute });
      } else if (redirectRoute) {
        navigate(redirectRoute);
      } else {
        const checkoutRestoreData = localStorage.getItem('checkout_restore_data');
        const checkoutData = localStorage.getItem('checkout_data');

        if (checkoutRestoreData || checkoutData) {
          console.log('🛒 Dados de checkout encontrados, navegando para checkout');
          console.log('📦 checkout_restore_data:', !!checkoutRestoreData);
          console.log('📦 checkout_data:', !!checkoutData);
          navigateToCheckoutWithState(navigate);
        } else {
          console.log('👤 Nenhum dado de checkout, navegando para perfil');
          navigate('/profile');
        }
      }
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
      await loginWithGoogle();
      // Não navegar aqui: o fluxo OAuth fará o redirect
    } catch (err: any) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Erro inesperado. Tente novamente.');
      }
    }
    // Não finaliza loading aqui, pois a página será redirecionada pelo OAuth
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

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-md p-6 w-full">
          <div className="text-center mb-4">
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              {showEmailForm ? 'Acessar Conta' : 'Bem vindo'}
            </h1>
            <p className="text-sm text-gray-600">
              {showEmailForm
                ? 'Digite suas credenciais para acessar sua conta'
                : 'Escolha como deseja acessar sua conta'
              }
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {!showEmailForm ? (
            <div className="space-y-3">
              {/* Email Login Button */}
              <button
                onClick={() => setShowEmailForm(true)}
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-3 py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Mail className="h-5 w-5 text-gray-600" />
                <span className="text-base text-gray-700">Acessar com email</span>
              </button>

              {/* Google Login Button */}
              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-3 py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Chrome className="h-5 w-5 text-gray-600" />
                <span className="text-base text-gray-700">
                  {isLoading ? 'Entrando...' : 'Acessar com Google'}
                </span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowEmailForm(false);
                  setError('');
                }}
                className="text-pink-600 hover:text-pink-700 text-sm mb-3"
              >
                ← Voltar
              </button>

              <form onSubmit={handleLogin} className="space-y-3">
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

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
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
                  <div className="mt-2 text-right">
                    <Link to="/forgot-password" className="text-sm text-pink-600 hover:text-pink-700">
                      Esqueceu sua senha?
                    </Link>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 sm:py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>
            </div>
          )}

          {/* Register Link */}
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
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