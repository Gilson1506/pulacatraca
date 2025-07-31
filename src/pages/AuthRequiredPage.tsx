import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn, UserPlus, ShoppingCart, Lock, ArrowRight, CheckCircle, Clock, Shield } from 'lucide-react';
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
      <div className="container mx-auto px-4 max-w-4xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-pink-100">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-full p-4 mr-4">
                <Lock className="h-8 w-8 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-3xl font-bold text-gray-800">Acesso Necessário</h1>
                <p className="text-gray-600">Para continuar com sua compra</p>
              </div>
            </div>
            
            {eventData && (
              <div className="bg-gradient-to-r from-pink-100 to-purple-100 rounded-xl p-4 border border-pink-200">
                <div className="flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-pink-600 mr-2" />
                  <span className="text-sm text-gray-700">Comprando ingresso para:</span>
                </div>
                <h2 className="text-xl font-bold text-pink-700 mt-1">{eventData.title}</h2>
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
        <div className="grid md:grid-cols-2 gap-8">
          
          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-all duration-300">
            <div className="text-center mb-6">
              <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4 border border-green-200">
                <LogIn className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Já tenho conta</h3>
              <p className="text-gray-600 text-sm">Entre com seus dados para continuar</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                <span>Acesso rápido aos seus ingressos</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                <span>Histórico completo de compras</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                <span>Processo de compra mais rápido</span>
              </div>
            </div>

            <button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              <LogIn className="h-5 w-5 mr-3" />
              Fazer Login
              <ArrowRight className="h-5 w-5 ml-3" />
            </button>
          </div>

          {/* Register Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-all duration-300">
            <div className="text-center mb-6">
              <div className="bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4 border border-blue-200">
                <UserPlus className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Criar conta</h3>
              <p className="text-gray-600 text-sm">Cadastre-se gratuitamente</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-blue-500 mr-2" />
                <span>Cadastro rápido e gratuito</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-blue-500 mr-2" />
                <span>Gerenciar todos seus eventos</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-blue-500 mr-2" />
                <span>Notificações sobre eventos</span>
              </div>
            </div>

            <button
              onClick={handleRegister}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-600 hover:to-cyan-700 transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              <UserPlus className="h-5 w-5 mr-3" />
              Criar Conta Grátis
              <ArrowRight className="h-5 w-5 ml-3" />
            </button>
          </div>
        </div>

        {/* Security Info */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-gray-600 mr-2" />
            <h4 className="text-lg font-semibold text-gray-800">Por que preciso me cadastrar?</h4>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="bg-green-50 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <h5 className="font-semibold text-gray-800 mb-1">Segurança</h5>
              <p className="text-sm text-gray-600">Seus dados e compras protegidos</p>
            </div>
            
            <div>
              <div className="bg-blue-50 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <h5 className="font-semibold text-gray-800 mb-1">Praticidade</h5>
              <p className="text-sm text-gray-600">Acesso rápido aos seus ingressos</p>
            </div>
            
            <div>
              <div className="bg-purple-50 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
              <h5 className="font-semibold text-gray-800 mb-1">Garantia</h5>
              <p className="text-sm text-gray-600">Suporte completo pós-compra</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            🔒 Seus dados estão seguros conosco. Não compartilhamos informações pessoais.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthRequiredPage;