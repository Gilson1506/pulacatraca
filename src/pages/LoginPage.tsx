import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Chrome } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('Credenciais inválidas. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      setError('Erro ao fazer login com Google. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simular envio de email de recuperação
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setForgotPasswordSent(true);
    setIsLoading(false);
  };

  const resetForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotEmail('');
    setForgotPasswordSent(false);
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
<<<<<<< HEAD
            src="https://i.postimg.cc/YSKSHFBw/PULAKATACA-removebg-preview-1.png"
=======
            src="https://i.postimg.cc/gkmcWg5B/PULAKATACA-removebg-preview-1.png"
>>>>>>> 26cca1a0decc68183fb8792645cb76c8003d7388
            alt="Logo PULACATRACA"
            className="h-36 w-auto mx-auto mb-6"
          />
        </Link>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            {/* Logo removida para evitar duplicidade */}
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">Acessar Conta</h1>
            <p className="text-gray-600">
              Entre com a sua plataforma preferida para acessar sua conta
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {!showEmailForm && !showForgotPassword ? (
            <div className="space-y-4">
              {/* Email Login Button */}
              <button
                onClick={() => setShowEmailForm(true)}
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-3 py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Mail className="h-5 w-5 text-gray-600" />
                <span className="text-gray-700">Acessar com o email</span>
              </button>

              {/* Google Login Button */}
              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-3 py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Chrome className="h-5 w-5 text-gray-600" />
                <span className="text-gray-700">Acessar com o Google</span>
              </button>
            </div>
          ) : showForgotPassword ? (
            <div className="space-y-4">
              {!forgotPasswordSent ? (
                <>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Recuperar Senha</h2>
                  <p className="text-gray-600 text-sm mb-4">
                    Digite seu email para receber as instruções de recuperação de senha.
                  </p>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <label htmlFor="forgotEmail" className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        id="forgotEmail"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
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
                      {isLoading ? 'Enviando...' : 'Enviar instruções'}
                    </button>
                  </form>
                  <button
                    onClick={resetForgotPassword}
                    className="w-full text-center text-pink-600 hover:text-pink-700 text-sm"
                  >
                    Voltar ao login
                  </button>
                </>
              ) : (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Mail className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Email enviado!</h2>
                  <p className="text-gray-600 text-sm">
                    Enviamos as instruções de recuperação de senha para <strong>{forgotEmail}</strong>
                  </p>
                  <button
                    onClick={resetForgotPassword}
                    className="w-full py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
                  >
                    Voltar ao login
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => setShowEmailForm(false)}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Voltar</span>
              </button>

              <form onSubmit={handleEmailLogin} className="space-y-4">
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

                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-pink-600 hover:text-pink-700 text-sm"
                  >
                    Esqueceu a senha?
                  </button>
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
          {!showEmailForm && !showForgotPassword && (
            <div className="mt-8 text-center">
              <p className="text-gray-600">
                Ainda não possui uma conta?{' '}
                <Link to="/register" className="text-pink-600 hover:text-pink-700 font-medium">
                  Cadastre-se
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* Footer Links */}
        <div className="mt-8 text-center space-x-4">
          <Link to="/terms" className="text-gray-500 hover:text-gray-700 text-sm">
            Termos de uso
          </Link>
          <Link to="/privacy" className="text-gray-500 hover:text-gray-700 text-sm">
            Política de privacidade
          </Link>
        </div>

        {/* Language Flags */}
        <div className="mt-4 flex justify-center space-x-2">
          <span className="text-2xl">🇧🇷</span>
          <span className="text-2xl">🇺🇸</span>
          <span className="text-2xl">🇪🇸</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;