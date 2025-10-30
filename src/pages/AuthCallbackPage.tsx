import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

const AuthCallbackPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔄 Processando callback do OAuth...');

        // Obter a sessão do usuário após callback do OAuth
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('❌ Erro ao processar callback:', error);
          navigate('/login?error=auth_failed');
          return;
        }

        if (!session) {
          console.log('⚠️ Nenhuma sessão encontrada');
          navigate('/login');
          return;
        }

        console.log('✅ Login com Google bem-sucedido!', {
          email: session.user.email,
          id: session.user.id,
        });

        // Verificar se o perfil existe
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        // Se não existe perfil, criar um
        if (profileError || !profile) {
          console.log('📝 Criando perfil para novo usuário...');
          
          const newProfile = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.full_name || 
                  session.user.user_metadata?.name || 
                  session.user.email?.split('@')[0] || 
                  'Usuário',
            role: 'user',
            is_verified: true,
            is_active: true,
          };

          const { error: insertError } = await supabase
            .from('profiles')
            .insert(newProfile);

          if (insertError) {
            console.error('❌ Erro ao criar perfil:', insertError);
            // Continuar mesmo com erro - o perfil pode já existir
          } else {
            console.log('✅ Perfil criado com sucesso!');
          }
        }

        // Verificar se há checkout pendente para restaurar
        const checkoutData = localStorage.getItem('checkoutBeforeLogin');
        if (checkoutData) {
          console.log('🛒 Restaurando checkout pendente...');
          localStorage.removeItem('checkoutBeforeLogin');
          try {
            const parsed = JSON.parse(checkoutData);
            navigate(parsed.route, { state: parsed.state });
            return;
          } catch (e) {
            console.error('Erro ao parsear checkout data:', e);
          }
        }

        // Redirecionar baseado na role
        const userRole = profile?.role || session.user.user_metadata?.role || 'user';
        
        console.log('🚀 Redirecionando usuário...');
        
        if (userRole === 'organizer') {
          navigate('/organizer-dashboard');
        } else {
          navigate('/profile');
        }

      } catch (error) {
        console.error('❌ Erro inesperado no callback:', error);
        navigate('/login?error=unexpected');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center bg-white p-8 rounded-xl shadow-lg">
        <div className="mb-6">
          <Loader2 className="h-16 w-16 animate-spin text-pink-600 mx-auto" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Finalizando login...
        </h2>
        <p className="text-gray-600">
          Aguarde enquanto processamos sua autenticação com Google
        </p>
        <div className="mt-4 flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-pink-600 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-pink-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-pink-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default AuthCallbackPage;

