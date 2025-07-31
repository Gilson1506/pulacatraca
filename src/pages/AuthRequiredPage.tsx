import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn, UserPlus, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAnalytics, usePageTracking } from '../hooks/useAnalytics';

const AuthRequiredPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { trackPurchaseFlow } = useAnalytics();

  // Track page view automaticamente
  usePageTracking('auth_required_page');

  // Dados do evento/ingresso vindos do state
  const eventData = location.state?.event;
  const ticketData = location.state?.ticket;

  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Se usuário está logado, redirecionar direto para checkout
        navigate('/checkout', {
          state: {
            event: eventData,
            ticket: ticketData,
          },
          replace: true
        });
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      setLoading(false);
    }
  };

  const handleLogin = () => {
    // Track click no login
    if (eventData?.id) {
      trackPurchaseFlow.authRequired(eventData.id, 'returning');
    }

    // Salvar dados no sessionStorage para recuperar após login
    if (eventData || ticketData) {
      sessionStorage.setItem('checkout_data', JSON.stringify({
        event: eventData,
        ticket: ticketData,
        returnTo: '/checkout'
      }));
    }
    navigate('/login');
  };

  const handleRegister = () => {
    // Track click no registro
    if (eventData?.id) {
      trackPurchaseFlow.authRequired(eventData.id, 'new');
    }

    // Salvar dados no sessionStorage para recuperar após registro
    if (eventData || ticketData) {
      sessionStorage.setItem('checkout_data', JSON.stringify({
        event: eventData,
        ticket: ticketData,
        returnTo: '/checkout'
      }));
    }
    navigate('/register');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-pink-100">
            <div className="mb-6">
              <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-full p-3 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Acesso Necessário</h1>
              <p className="text-gray-600">Para continuar com sua compra</p>
            </div>
            
            {eventData && (
              <div className="bg-gradient-to-r from-pink-100 to-purple-100 rounded-xl p-4 border border-pink-200">
                <p className="text-sm text-gray-700 mb-1">Comprando ingresso para:</p>
                <h2 className="text-lg font-bold text-pink-700">{eventData.title}</h2>
                {ticketData && (
                  <p className="text-sm text-gray-600 mt-1">
                    {ticketData.name} - R$ {ticketData.price?.toFixed(2)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-4">
          
          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center mb-4">
              <div className="bg-gradient-to-br from-pink-100 to-purple-100 rounded-xl w-12 h-12 flex items-center justify-center mr-4">
                <LogIn className="h-6 w-6 text-pink-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Já tenho conta</h3>
                <p className="text-gray-600 text-sm">Entre com seus dados</p>
              </div>
            </div>

            <button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-xl font-bold hover:from-pink-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center shadow-md"
            >
              <LogIn className="h-5 w-5 mr-2" />
              Fazer Login
            </button>
          </div>

          {/* Register Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center mb-4">
              <div className="bg-gradient-to-br from-pink-100 to-purple-100 rounded-xl w-12 h-12 flex items-center justify-center mr-4">
                <UserPlus className="h-6 w-6 text-pink-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Criar conta</h3>
                <p className="text-gray-600 text-sm">Cadastro rápido e gratuito</p>
              </div>
            </div>

            <button
              onClick={handleRegister}
              className="w-full bg-white border-2 border-pink-500 text-pink-600 py-3 rounded-xl font-bold hover:bg-pink-50 transition-all duration-200 flex items-center justify-center shadow-md"
            >
              <UserPlus className="h-5 w-5 mr-2" />
              Criar Conta Grátis
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            Seus dados estão seguros conosco
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthRequiredPage;