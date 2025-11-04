import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSessionReady, setIsSessionReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        // Ao acessar via link do email, o Supabase cria uma sessão temporária
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          if (isMounted) setIsSessionReady(true);
          return;
        }
        // Em alguns casos, a sessão chega via evento
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
            if (isMounted) setIsSessionReady(true);
          }
        });
        // Pequeno timeout de segurança para evitar ficar travado
        setTimeout(() => {
          if (isMounted) setIsSessionReady(true);
        }, 800);
        return () => {
          subscription.unsubscribe();
        };
      } catch {
        if (isMounted) setIsSessionReady(true);
      }
    };

    init();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSuccess(true);
      // Opcional: sair da sessão temporária após atualizar senha
      try { await supabase.auth.signOut(); } catch {}
      setTimeout(() => {
        navigate('/login');
      }, 1200);
    } catch (err: any) {
      if (err?.message?.includes('Invalid')) {
        setError('Link inválido ou expirado. Solicite um novo email.');
      } else {
        setError('Não foi possível atualizar a senha. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-100 flex items-center justify-center py-4 px-4">
      <div className="max-w-md w-full flex flex-col justify-center">
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

        <div className="bg-white rounded-lg shadow-md p-6 w-full">
          <div className="text-center mb-6">
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Definir nova senha
            </h1>
            <p className="text-sm text-gray-600">
              Escolha uma nova senha para sua conta
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
                  Senha atualizada com sucesso!
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Redirecionando para o login...
                </p>
              </div>
              <Link
                to="/login"
                className="block w-full py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-center"
              >
                Ir para o login
              </Link>
            </div>
          ) : (
            <>
              {!isSessionReady ? (
                <div className="text-center text-sm text-gray-600">Validando link...</div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Nova senha
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="Digite a nova senha"
                    />
                  </div>
                  <div>
                    <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
                      Confirmar senha
                    </label>
                    <input
                      type="password"
                      id="confirm"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="Confirme a nova senha"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Atualizando...' : 'Atualizar senha'}
                  </button>
                </form>
              )}

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

export default ResetPasswordPage;


