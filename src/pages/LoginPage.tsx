import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Chrome, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const { login, loginWithGoogle } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await login(email, password);
      
      // O redirecionamento é feito automaticamente pelo AuthContext
      // Não precisamos fazer redirecionamento manual aqui
      
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        if (err.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos.');
        } else if (err.message.includes('Email not confirmed')) {
          setError('Por favor, confirme seu email antes de fazer login.');
        } else {
          setError('Erro ao fazer login. Por favor, tente novamente.');
        }
      } else {
        setError('Erro ao fazer login. Por favor, tente novamente.');
      }
      setIsLoading(false); // Só desativamos o loader em caso de erro
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      await loginWithGoogle();
      // Não chamamos setIsLoading(false) aqui pois a página será recarregada
    } catch (err) {
      console.error(err);
      setError('Erro ao fazer login com Google. Por favor, tente novamente.');
      setIsLoading(false); // Só desativamos o loader em caso de erro
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Entrar</h1>
            <p className="text-gray-600">
              {showEmailForm ? 'Digite suas credenciais para entrar' : 'Escolha como deseja entrar'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {showEmailForm ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="Digite seu email"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="Digite sua senha"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition-colors font-bold text-base shadow-md flex items-center justify-center disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                    Entrando...
                  </span>
                ) : (
                  'Entrar'
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowEmailForm(false);
                  setError('');
                }}
                className="w-full text-gray-600 hover:text-gray-800 text-sm py-2"
              >
                Voltar
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => setShowEmailForm(true)}
                className="w-full flex items-center justify-center space-x-2 border border-gray-300 rounded-lg px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <Mail className="w-5 h-5 text-gray-500" />
                <span>Continuar com Email</span>
              </button>

              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 border border-gray-300 rounded-lg px-4 py-3 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                    <span>Conectando...</span>
                  </span>
                ) : (
                  <>
                    <Chrome className="w-5 h-5 text-blue-500" />
                    <span>Continuar com Google</span>
                  </>
                )}
              </button>
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Não tem uma conta?{' '}
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